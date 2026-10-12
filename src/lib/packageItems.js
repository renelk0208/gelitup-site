// Compare package items loosely so "1x Pink Buffer", "1 Pink Buffer" and
// "pink buffer" count as the same thing, and find whether an item already went
// out to an ambassador in an earlier package.

export function normItem(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/^\s*\d+\s*x?\s+/, '') // leading quantity: "1x ", "3 x ", "2 "
    .replace(/^\s*x\s+/, '')
    .replace(/[^\p{L}\p{N}]+/gu, '')
}

// shipments: the ambassador's sent packages (any order).
// Returns [{ number, sent_at, item }] for every earlier package that had it.
export function whereAlreadySent(item, shipments) {
  const key = normItem(item)
  if (!key) return []
  const ordered = [...(shipments || [])]
    .filter((s) => s && (s.status ? s.status === 'sent' : true))
    .sort((a, b) => new Date(a.sent_at || 0) - new Date(b.sent_at || 0))
  const hits = []
  ordered.forEach((s, i) => {
    const match = (Array.isArray(s.items) ? s.items : []).find((it) => normItem(it) === key)
    if (match) hits.push({ number: i + 1, sent_at: s.sent_at, item: match })
  })
  return hits
}
