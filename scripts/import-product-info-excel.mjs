/**
 * import-product-info-excel.mjs
 * Converts docs/product-info.xlsx → src/data/product-info.json
 *
 * Reads the same 3-column format produced by export-product-info-excel.mjs:
 *   A: key  |  B: type (paragraph / listitem)  |  C: content
 *
 * Rules:
 *  - Row order is preserved within each key.
 *  - Empty content cells are skipped.
 *  - Unknown type values are treated as listitem.
 *  - The key column must be non-empty on every data row.
 */

import ExcelJS from 'exceljs';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const xlsxPath = resolve(root, 'docs/product-info.xlsx');
const jsonPath = resolve(root, 'src/data/product-info.json');

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(xlsxPath);

const sheet = workbook.getWorksheet('Product Info');
if (!sheet) {
  console.error('❌  Sheet "Product Info" not found in workbook.');
  process.exit(1);
}

// Find header column indices by name (tolerates reordering)
const headerRow = sheet.getRow(1);
const colIndex = {};
headerRow.eachCell((cell, colNum) => {
  const val = String(cell.value ?? '').trim().toLowerCase();
  colIndex[val] = colNum;
});

const required = ['key', 'type', 'content'];
for (const col of required) {
  if (!colIndex[col]) {
    console.error(`❌  Required column "${col}" not found in header row.`);
    process.exit(1);
  }
}

/**
 * Extract cell content preserving bold runs as **text**.
 * Handles:
 *  - Rich text cells (type 6): bold runs wrapped in **...**
 *  - Plain cells with cell-level bold font: whole text wrapped in **...**
 *  - All other plain cells: plain string
 */
function extractContent(cell) {
  // Rich text: type 6 (formula result) or type 8 (inline rich text)
  const richText = cell.value?.richText ?? (cell.type === 6 ? cell.value?.result?.richText : null)
  if (Array.isArray(richText)) {
    return richText
      .map(run => {
        const text = String(run.text ?? '');
        return run.font?.bold ? `**${text}**` : text;
      })
      .join('');
  }
  // Plain cell with cell-level bold font → wrap whole value
  const raw = String(cell.value ?? '').trim();
  if (cell.font?.bold && raw) return `**${raw}**`;
  return raw;
}

const result = {};

sheet.eachRow((row, rowNumber) => {
  if (rowNumber === 1) return; // skip header

  const key     = String(row.getCell(colIndex['key']).value     ?? '').trim();
  const type    = String(row.getCell(colIndex['type']).value    ?? '').trim().toLowerCase();
  const content = extractContent(row.getCell(colIndex['content'])).trim();

  if (!key) return;        // skip rows without a key
  if (!content) return;    // skip empty content

  if (!result[key]) {
    result[key] = { paragraphs: [], listItems: [] };
  }

  if (type === 'paragraph') {
    result[key].paragraphs.push(content);
  } else {
    // 'listitem' or anything else → listItems
    result[key].listItems.push(content);
  }
});

// ── Post-processing ──────────────────────────────────────────────────────────

// 1. Preserve existing videoId / videos fields so manual video assignments
//    are not lost every time the xlsx is re-imported.
let existing = {};
try { existing = JSON.parse(readFileSync(jsonPath, 'utf8')); } catch {}

for (const key of Object.keys(result)) {
  const old = existing[key];
  if (old?.videoId) result[key].videoId = old.videoId;
  if (old?.videos)  result[key].videos  = old.videos;
}

// 2. Key normalisations — xlsx uses human-readable names that differ from
//    the image-folder-derived subcategory tokens used at runtime.
//
//    After the TOOLS/EQUIPMENT/BRUSHES merge into 'TOOLS & EQUIPMENT', the
//    lookup key is built from normalizeCatalogueToken on both category and
//    subcategory.  normalizeCatalogueToken('TOOLS & EQUIPMENT') → 'TOOLS EQUIPMENT'
//    normalizeCatalogueToken('LAMPS & CURING') → 'LAMPS CURING'  (& stripped)
//
//    EQUIPMENT sub-folders (AIRBRUSH, DUST COLLECTOR, LAMPS & CURING) become
//    individual subcategory pills, so each needs its own key in normalized form.
//    BRUSHES sub-folders collapse into one BRUSHES pill (fixed subcategory),
//    so a single combined key is built via DERIVED_ENTRIES below.
const KEY_RENAMES = {
  'EQUIPMENT::AIR BRUSH':     'EQUIPMENT::AIRBRUSH',           // xlsx name → canonical name
  'EQUIPMENT::AIRBRUSH':      'TOOLS EQUIPMENT::AIRBRUSH',     // canonical → merged-category lookup key
  'EQUIPMENT::DUST COLLECTOR':'TOOLS EQUIPMENT::DUST COLLECTOR',
  'EQUIPMENT::LAMPS & CURING':'TOOLS EQUIPMENT::LAMPS CURING', // & normalizes away in lookup
};
for (const [from, to] of Object.entries(KEY_RENAMES)) {
  if (result[from] && !result[to]) {
    result[to] = result[from];
    delete result[from];
  }
}

// 3. Derived entries — subcategory aliases whose descriptions mirror a parent
//    key but have their own video assignments. Keyed by image folder structure
//    (e.g. MULTIMIX/30gr → subcategory token 30GR), not present in the xlsx.
//
//    BRUSHES: all brush sub-folders (ACRYLIC BRUSHES, GEL BRUSHES, etc.) are
//    collapsed into a single BRUSHES pill under 'TOOLS & EQUIPMENT', so their
//    descriptions are combined into one key.
const DERIVED_ENTRIES = [
  {
    source: 'BUILDER GEL SYSTEMS::MULTIMIX',
    targets: ['BUILDER GEL SYSTEMS::30GR', 'BUILDER GEL SYSTEMS::60GR'],
  },
];
for (const { source, targets } of DERIVED_ENTRIES) {
  if (!result[source]) continue;
  for (const target of targets) {
    const oldVideo = existing[target];
    result[target] = {
      ...(oldVideo?.videos  ? { videos:  oldVideo.videos  } : {}),
      ...(oldVideo?.videoId ? { videoId: oldVideo.videoId } : {}),
      paragraphs: result[source].paragraphs,
      listItems:  result[source].listItems,
    };
  }
}

// 4. BRUSHES combined description — all brush sub-folder descriptions merged
//    into one entry for the single BRUSHES pill under 'TOOLS & EQUIPMENT'.
//    normalizeCatalogueToken('BRUSHES') → 'BRUSHES', so key is 'TOOLS EQUIPMENT::BRUSHES'.
{
  const brushSources = [
    'BRUSHES::ACRYLIC BRUSHES',
    'BRUSHES::GEL BRUSHES',
    'BRUSHES::SYNTHOGEL & POLYGEL',
    'BRUSHES::NAIL ART BRUSHES',
  ];
  const paragraphs = [];
  const listItems  = [];
  for (const k of brushSources) {
    if (result[k]) {
      paragraphs.push(...result[k].paragraphs);
      listItems.push(...result[k].listItems);
    }
  }
  if (paragraphs.length || listItems.length) {
    const oldVideo = existing['TOOLS EQUIPMENT::BRUSHES'];
    result['TOOLS EQUIPMENT::BRUSHES'] = {
      ...(oldVideo?.videos  ? { videos:  oldVideo.videos  } : {}),
      ...(oldVideo?.videoId ? { videoId: oldVideo.videoId } : {}),
      paragraphs,
      listItems,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────

const json = JSON.stringify(result, null, 2);
writeFileSync(jsonPath, json, 'utf8');

console.log(`✅  Imported ${Object.keys(result).length} product groups → ${jsonPath}`);
