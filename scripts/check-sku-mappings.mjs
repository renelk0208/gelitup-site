import fs from 'node:fs'

const map = JSON.parse(fs.readFileSync('public/gelitup-content/product-image-map.json', 'utf8'))

// Check if any of our 'duplicate' SKUs are mapped
const testSkus = ['127', '128', '140', '141', '142', 'GIUP 127', 'GIUP-127', '127 PURPLE HEARTS']
const found = []

Object.entries(map).forEach(([key, path]) => {
  testSkus.forEach(sku => {
    if (key.toUpperCase().includes(sku.toUpperCase()) || sku.toUpperCase().includes(key.toUpperCase())) {
      found.push({ key, path })
    }
  })
})

if (found.length > 0) {
  console.log('Found mappings:\n')
  found.forEach(f => console.log(`  ${f.key} -> ${f.path}`))
} else {
  console.log('No mappings found for test SKUs')
}

console.log(`\nTotal entries in map: ${Object.keys(map).length}`)
