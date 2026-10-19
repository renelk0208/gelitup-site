// How a round is decided.
//
// The final: when the round closes, the approved looks with the most hearts
// (round.finalists, 10 by default) plus the jury's wildcards (up to
// round.max_wildcards, outstanding looks from outside the top 10).
//
// The jury chooses 1st, 2nd and 3rd place from the finalists (world_placements).
// 1st place needs the 1st-prize claim with reviews verified by GEL.IT.UP; the
// database enforces this. The winners become the GEL.IT.UP Icons of the month.
//
// Country prizes (when a country offers them): the most hearts in that country.
//
// `entries` must be sorted by hearts (most first), ties by earliest upload.

export const DEFAULT_FINALISTS = 10

const isApproved = (e) => e && e.status === 'published'

/** The final: top looks by hearts plus wildcards (wildcards never duplicate the top list). */
export function computeFinalists(entries, wildcardIds = [], size = DEFAULT_FINALISTS) {
  const list = (entries || []).filter(isApproved)
  const top = list.filter(e => e.vote_count > 0).slice(0, size)
  const topIds = new Set(top.map(e => e.id))
  const wild = new Set(wildcardIds || [])
  const wildcards = list.filter(e => wild.has(e.id) && !topIds.has(e.id))
  return { top, wildcards, all: [...top, ...wildcards] }
}

/** Podium from the jury's placings, plus the best look per country by hearts. */
export function computeWinners(entries, placements = []) {
  const list = (entries || []).filter(isApproved)
  const byId = new Map((entries || []).map(e => [e.id, e]))
  const podium = [1, 2, 3].map(place => {
    const p = (placements || []).find(x => x.place === place)
    return (p && byId.get(p.entry_id)) || null
  })
  const byCountry = {}
  for (const e of list) if (e.vote_count > 0 && !byCountry[e.country]) byCountry[e.country] = e
  return { podium, byCountry }
}

/** Ids of every look that wins or reached the final as a wildcard (kept when the round is cleaned up). */
export function winningIds(entries, placements = [], wildcardIds = []) {
  const { podium, byCountry } = computeWinners(entries, placements)
  return new Set([
    ...podium.filter(Boolean).map(e => e.id),
    ...Object.values(byCountry).map(e => e.id),
    ...(placements || []).map(p => p.entry_id),
    ...(wildcardIds || []),
  ])
}
