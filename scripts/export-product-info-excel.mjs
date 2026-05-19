/**
 * export-product-info-excel.mjs
 * Converts src/data/product-info.json → docs/product-info.xlsx
 *
 * Columns:
 *   A: key        — e.g. "BASES::SUPERBOND"  (category::subcategory in uppercase)
 *   B: type       — "paragraph" or "listitem"
 *   C: content    — the text
 *
 * To re-import after editing: npm run import:product-info-excel
 */

import ExcelJS from 'exceljs';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const jsonPath = resolve(root, 'src/data/product-info.json');
const xlsxPath = resolve(root, 'docs/product-info.xlsx');

const data = JSON.parse(readFileSync(jsonPath, 'utf8'));

const workbook = new ExcelJS.Workbook();
workbook.creator = 'GEL.IT.UP export script';
workbook.created = new Date();

const sheet = workbook.addWorksheet('Product Info', {
  views: [{ state: 'frozen', ySplit: 1 }],
});

// Column definitions
sheet.columns = [
  { header: 'key',     key: 'key',     width: 42 },
  { header: 'type',    key: 'type',    width: 14 },
  { header: 'content', key: 'content', width: 100 },
];

// Style header row
const headerRow = sheet.getRow(1);
headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E4057' } };
headerRow.alignment = { vertical: 'middle' };
headerRow.height = 22;

// Add data rows
for (const [key, entry] of Object.entries(data)) {
  const paragraphs = entry.paragraphs || [];
  const listItems  = entry.listItems  || [];

  if (paragraphs.length === 0 && listItems.length === 0) {
    // Keep an empty placeholder row so the key still appears in Excel
    sheet.addRow({ key, type: 'paragraph', content: '' });
    continue;
  }

  for (const text of paragraphs) {
    sheet.addRow({ key, type: 'paragraph', content: text });
  }
  for (const text of listItems) {
    sheet.addRow({ key, type: 'listitem', content: text });
  }
}

// Zebra striping + wrap text on content column
let prevKey = null;
let shade = false;
sheet.eachRow((row, rowNumber) => {
  if (rowNumber === 1) return;
  const key = row.getCell('key').value;
  if (key !== prevKey) { shade = !shade; prevKey = key; }
  const bg = shade ? 'FFF5F5F5' : 'FFFFFFFF';
  ['key', 'type', 'content'].forEach(col => {
    const cell = row.getCell(col);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    cell.alignment = { wrapText: col === 'content', vertical: 'top' };
  });
  // Colour-code the type cell
  const typeCell = row.getCell('type');
  if (typeCell.value === 'paragraph') {
    typeCell.font = { color: { argb: 'FF1A5C99' } };
  } else {
    typeCell.font = { color: { argb: 'FF5C3D1A' } };
  }
});

// Auto-filter
sheet.autoFilter = { from: 'A1', to: 'C1' };

await workbook.xlsx.writeFile(xlsxPath);
console.log(`✅  Exported ${Object.keys(data).length} product groups → ${xlsxPath}`);
