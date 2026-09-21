import fs from 'node:fs'

const priceListPath = 'public/gelitup-content/b2b-price-list.json'
const imageMapPath = 'public/gelitup-content/product-image-map.json'

const priceList = JSON.parse(fs.readFileSync(priceListPath, 'utf8'))
const imageMap = JSON.parse(fs.readFileSync(imageMapPath, 'utf8'))

let added = 0

priceList.items.forEach(item => {
  const sku = item.sku.toUpperCase()
  const shortSku = sku.split(' ')[0] // Get first word like "127"
  
  // Check if this SKU already has a direct mapping
  if (imageMap[item.sku]) return // Already mapped
  
  // Look for a GIUP-prefixed variant
  const giupKey = `GIUP ${shortSku}`
  const giupKeyDash = `GIUP-${shortSku}`
  
  if (imageMap[giupKey]) {
    imageMap[item.sku] = imageMap[giupKey]
    added++
    console.log(`Added: ${item.sku} -> ${imageMap[giupKey]}`)
  } else if (imageMap[giupKeyDash]) {
    imageMap[item.sku] = imageMap[giupKeyDash]
    added++
    console.log(`Added: ${item.sku} -> ${imageMap[giupKeyDash]}`)
  }
})

// Sort and save
const sortedMap = Object.fromEntries(Object.entries(imageMap).sort())
fs.writeFileSync(imageMapPath, JSON.stringify(sortedMap, null, 2))

console.log(`\nTotal aliases added: ${added}`)
