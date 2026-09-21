import { PRODUCT_ALIAS_GROUPS } from '../src/data/productAliases.js';
import { writeFileSync } from 'fs';

function csvField(value) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

const rows = ['codes,target'];
for (const { codes, target } of PRODUCT_ALIAS_GROUPS) {
  rows.push(csvField(codes.join('|')) + ',' + csvField(target));
}

writeFileSync('product-aliases.csv', rows.join('\n'));
console.log(`Done: ${rows.length - 1} alias rows written to product-aliases.csv`);
