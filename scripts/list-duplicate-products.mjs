import fs from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()

// Read image map
const imageMapPath = path.join(projectRoot, 'public/gelitup-content/product-image-map.json')
const imageMap = JSON.parse(fs.readFileSync(imageMapPath, 'utf8'))

// Read price list
const priceListPath = path.join(projectRoot, 'public/gelitup-content/b2b-price-list.json')
const priceList = JSON.parse(fs.readFileSync(priceListPath, 'utf8'))

// Build sets of SKUs with images and prices
const skusWithImages = new Set()
const skusWithPrices = new Set(priceList.items.map(item => item.sku.toUpperCase()))

Object.entries(imageMap).forEach(([key]) => {
  const sku = key.toUpperCase()
  skusWithImages.add(sku)
  // Also add partial matches (first word)
  const firstWord = sku.split(' ')[0]
  skusWithImages.add(firstWord)
})

// Find duplicates - products missing BOTH images AND prices
const duplicates = []
priceList.items.forEach(item => {
  const sku = item.sku.toUpperCase()
  const hasImage = Array.from(skusWithImages).some(imgSku => 
    imgSku === sku || imgSku.includes(sku) || sku.includes(imgSku)
  )
  
  if (!hasImage) {
    duplicates.push({
      name: item.name,
      sku: item.sku,
      price: item.price
    })
  }
})

// Group by category
const grouped = {}
duplicates.forEach(product => {
  const category = product.name.split(' ')[0] || 'OTHER'
  if (!grouped[category]) grouped[category] = []
  grouped[category].push(product)
})

console.log(`📋 DUPLICATE PRODUCTS (NO IMAGES) - ${duplicates.length} total\n`)
console.log('=' .repeat(80))

Object.entries(grouped).sort().forEach(([category, products]) => {
  console.log(`\n[${category}] — ${products.length} products\n`)
  products.forEach(p => {
    console.log(`  • ${p.name} [${p.sku}] — €${p.price}`)
  })
})

console.log('\n' + '='.repeat(80))
console.log(`\nTotal: ${duplicates.length} products missing images (likely duplicates)`)
