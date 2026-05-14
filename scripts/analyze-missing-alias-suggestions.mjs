import fs from 'node:fs'

const missingReportPath =
  'c:/Users/renek/AppData/Roaming/Code/User/workspaceStorage/dcf183a1e44db4197f0f2b5fb30cca19/GitHub.copilot-chat/chat-session-resources/7f35a7ba-3d06-4b5a-97d4-2314b78595e7/call_wZmUiC90JQXUBGoac9h82Tl8__vscode-1778739954529/content.txt'

function normalize(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/\s*[-—]\s*(HTF|HTE|HEMA[- ]FREE|NEW)\s*$/i, '')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
}

function scoreOverlap(a, b) {
  const wordsA = new Set(a.split(/\s+/).filter((word) => word.length > 2))
  const wordsB = new Set(b.split(/\s+/).filter((word) => word.length > 2))

  if (!wordsA.size || !wordsB.size) return 0

  let overlap = 0
  for (const word of wordsA) {
    if (wordsB.has(word)) overlap += 1
  }

  return overlap / Math.max(wordsA.size, wordsB.size)
}

const missingText = fs.readFileSync(missingReportPath, 'utf8')
const missingLines = missingText.split(/\r?\n/)
const missingItems = []

for (const line of missingLines) {
  const match = line.match(/^\s*name="(.+)"\s+code="(.+)"/)
  if (!match) continue
  missingItems.push({ name: match[1], code: match[2] })
}

const pricePayload = JSON.parse(fs.readFileSync('public/gelitup-content/b2b-price-list.json', 'utf8'))
const priceItems = Array.isArray(pricePayload) ? pricePayload : pricePayload.items || []
const normalizedPriceItems = priceItems.map((item) => ({
  name: item.name,
  normalizedName: normalize(item.name),
}))

const suggestions = []
for (const missing of missingItems) {
  const normalizedMissingName = normalize(missing.name)
  let best = { score: 0, target: '' }

  for (const item of normalizedPriceItems) {
    const overlapScore = scoreOverlap(normalizedMissingName, item.normalizedName)
    if (overlapScore > best.score) {
      best = { score: overlapScore, target: item.name }
    }
  }

  if (best.score >= 0.55) {
    suggestions.push({
      code: missing.code,
      name: missing.name,
      target: best.target,
      score: best.score,
    })
  }
}

suggestions.sort((left, right) => right.score - left.score)

console.log(`Missing items: ${missingItems.length}`)
console.log(`High-confidence suggestions: ${suggestions.length}`)
for (const suggestion of suggestions.slice(0, 200)) {
  console.log(
    `${suggestion.score.toFixed(2)}\t${suggestion.code}\t=>\t${suggestion.target}\t(${suggestion.name})`,
  )
}
