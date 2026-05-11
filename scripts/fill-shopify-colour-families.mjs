import { readFileSync, writeFileSync } from 'fs';

// ── helpers ────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') { inQ = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQ = true; }
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (ch !== '\r') { field += ch; }
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function toCSVField(v) {
  if (v == null) return '';
  const s = String(v);
  return (s.includes(',') || s.includes('"') || s.includes('\n'))
    ? '"' + s.replace(/"/g, '""') + '"'
    : s;
}

function normalize(s) {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

// ── build colour-family lookup from our CSV ────────────────────────────────
// solid-gel-polish-colour-families.csv columns: code, product_name, colour_family
const familyRows = parseCSV(readFileSync('solid-gel-polish-colour-families.csv', 'utf8'));
// key: normalized product_name → colour_family
const familyByName = new Map();
for (const [, productName, colourFamily] of familyRows.slice(1)) {
  if (productName && colourFamily) {
    familyByName.set(normalize(productName), colourFamily);
  }
}

// ── process Shopify export ─────────────────────────────────────────────────
const shopifyRows = parseCSV(readFileSync('products_export_1.csv', 'utf8'));
const header = shopifyRows[0];
// Column B = index 1 (Title), Column K = index 10 (Colour Family)
const titleIdx = 1;
const familyIdx = 10;

let filled = 0, skipped = 0;

const output = [header];
for (const row of shopifyRows.slice(1)) {
  // Ensure row is long enough
  while (row.length <= familyIdx) row.push('');

  const title = row[titleIdx] ?? '';
  const existing = row[familyIdx] ?? '';

  if (!existing && title) {
    const match = familyByName.get(normalize(title));
    if (match) {
      row[familyIdx] = match;
      filled++;
    } else {
      skipped++;
    }
  }
  output.push(row);
}

const outText = output.map(r => r.map(toCSVField).join(',')).join('\n');
writeFileSync('products_export_1_with_families.csv', outText);
console.log(`Done. Filled: ${filled} | No match found: ${skipped}`);
