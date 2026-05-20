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

const json = JSON.stringify(result, null, 2);
writeFileSync(jsonPath, json, 'utf8');

console.log(`✅  Imported ${Object.keys(result).length} product groups → ${jsonPath}`);
