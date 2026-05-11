import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const BASE = 'public/gelitup-content/product-images/COLORS/SOLID GEL POLISH';
const priceList = JSON.parse(readFileSync('public/gelitup-content/b2b-price-list.json', 'utf8'));
const { PRODUCT_ALIAS_GROUPS } = await import('../src/data/productAliases.js');

// Build lookup: price-list name prefix → full name
// e.g. "100" → "100 Baby Blush -HTF"
const nameByPrefix = new Map();
for (const item of priceList.items) {
  const spaceIdx = item.name.indexOf(' ');
  if (spaceIdx > 0) {
    const prefix = item.name.slice(0, spaceIdx);
    if (!nameByPrefix.has(prefix)) nameByPrefix.set(prefix, item.name);
  }
  // Also index by full name for alias target lookups
  nameByPrefix.set(item.name, item.name);
}

// Build alias lookup: any code → price-list target name
const aliasMap = new Map();
for (const { codes, target } of PRODUCT_ALIAS_GROUPS) {
  for (const code of codes) {
    aliasMap.set(code.toUpperCase(), target);
  }
}

const families = readdirSync(BASE, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .sort();

const rows = ['code,product_name,colour_family'];

for (const family of families) {
  const files = readdirSync(join(BASE, family)).filter(f => f.endsWith('.webp'));
  for (const file of files) {
    const code = file.replace(/^GIUP-/i, '').replace(/\.webp$/i, '');

    // 1. Direct prefix match in price list (e.g. "100" → "100 Baby Blush -HTF")
    let name = nameByPrefix.get(code) ?? nameByPrefix.get(code.toUpperCase());

    // 2. Alias lookup: try "GIUP-{code}" or "GIUP {code}" or bare code
    if (!name) {
      const candidates = [
        `GIUP-${code}`.toUpperCase(),
        `GIUP ${code}`.toUpperCase(),
        code.toUpperCase(),
      ];
      for (const c of candidates) {
        const target = aliasMap.get(c);
        if (target) { name = target; break; }
      }
    }

    const nameCsv = name
      ? (name.includes(',') ? `"${name.replace(/"/g, '""')}"` : name)
      : '';
    const familyCsv = family.includes(',') ? `"${family}"` : family;

    rows.push(`${code},${nameCsv},${familyCsv}`);
  }
}

writeFileSync('solid-gel-polish-colour-families.csv', rows.join('\n'));
const unresolved = rows.slice(1).filter(r => r.split(',')[1] === '').length;
console.log(`Done: ${rows.length - 1} rows written. Unresolved names: ${unresolved}`);
