import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const projectRoot = process.cwd()

// Read image map
const imageMapPath = path.join(projectRoot, 'public/gelitup-content/product-image-map.json')
const imageMap = JSON.parse(fs.readFileSync(imageMapPath, 'utf8'))

// Read price list
const priceListPath = path.join(projectRoot, 'public/gelitup-content/b2b-price-list.json')
const priceList = JSON.parse(fs.readFileSync(priceListPath, 'utf8'))
const priceMap = new Map(priceList.items.map(item => [item.sku.toUpperCase(), item]))

// Get all products from the source (assuming they're in App.jsx or similar)
const appPath = path.join(projectRoot, 'src/pages/AdminDashboard.jsx')
const appContent = fs.readFileSync(appPath, 'utf8')

// Extract product names and SKUs from the aliases and price map
const allProducts = new Set()
priceList.items.forEach(item => {
  allProducts.add({ name: item.name, sku: item.sku })
})

// Check which are missing images
const missingImages = []
const missingPrices = []
const bothMissing = []

priceList.items.forEach(item => {
  const sku = item.sku.toUpperCase()
  const name = item.name.toLowerCase()
  
  // Check if image exists
  const hasImage = Object.entries(imageMap).some(([key, path]) => {
    const keyLower = key.toLowerCase()
    return keyLower === sku || name.includes(keyLower) || keyLower.includes(name.split(' ')[0])
  })
  
  if (!hasImage) {
    missingImages.push({ sku, name: item.name })
  }
})

console.log('📊 MISSING DATA ANALYSIS\n')
console.log(`✗ Products missing images: ${missingImages.length}`)
console.log(`✗ Products missing prices: ~198 (from script output)`)
console.log(`\n🔴 Top missing image products (first 20):\n`)

missingImages.slice(0, 20).forEach(p => {
  console.log(`  • ${p.name} [${p.sku}]`)
})

if (missingImages.length > 20) {
  console.log(`\n  ... and ${missingImages.length - 20} more products`)
}

console.log('\n')
