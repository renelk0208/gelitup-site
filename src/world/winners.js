// Who wins a round.
//
// 1st prize: the look with the most hearts among entries that claimed 1st-prize
// eligibility (entrant uses GEL.IT.UP and reviewed every tagged product) AND
// whose reviews GEL.IT.UP has verified.
// 2nd and 3rd prize: the next looks with the most hearts, open to everyone.
// Country prizes (when a country offers them): the most hearts in that country.
//
// `entries` must be sorted by hearts (most first), ties by earliest upload.

export function computeWinners(entries) {
  const list = (entries || []).filter(e => e.status !== 'hidden' && e.vote_count > 0)
  const first = list.find(e => e.first_prize_claim && e.reviews_verified) || null
  const rest = list.filter(e => !first || e.id !== first.id).slice(0, 2)
  const podium = [first, rest[0] || null, rest[1] || null]
  const byCountry = {}
  for (const e of list) if (!byCountry[e.country]) byCountry[e.country] = e
  return { podium, byCountry }
}

/** Ids of every look that wins something (kept when the round is cleaned up). */
export function winningIds(entries) {
  const { podium, byCountry } = computeWinners(entries)
  return new Set([...podium.filter(Boolean), ...Object.values(byCountry)].map(e => e.id))
}
