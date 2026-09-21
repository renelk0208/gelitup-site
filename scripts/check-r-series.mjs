import { readFileSync } from 'fs'
const pl = JSON.parse(readFileSync('./public/gelitup-content/b2b-price-list.json', 'utf8'))
function normalizeProductName(v) {
  return String(v||'').trim().toUpperCase()
    .replace(/GEL\.?IT\.?UP|GEL\s*IT\s*UP|GIUP/gi,' ')
    .replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim()
}
pl.items.filter(i => /GEL\.IT\.UP 1 R\d+/i.test(i.name)).slice(0,3).forEach(i => {
  console.log(i.name, '->', normalizeProductName(i.name))
})
const pnKey = normalizeProductName('GEL.IT.UP 1 R01 11ml -HTF')
console.log('pnKey for R01 target:', pnKey)
console.log('pnKey for GIUP R01:', normalizeProductName('GIUP R01'))
console.log('GIUP131 norm:', normalizeProductName('GIUP131'))
pl.items.filter(i => /\b131\b/.test(i.name)).forEach(i => console.log('131 match:', i.name, '->', normalizeProductName(i.name)))
