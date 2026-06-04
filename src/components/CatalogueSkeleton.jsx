export default function CatalogueSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-4 sm:p-8">
      {/* Search bar skeleton */}
      <div className="h-11 w-full rounded-[14px] bg-slate-200" />

      {/* Category pills skeleton */}
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-8 w-20 shrink-0 rounded-full bg-slate-200" />
        ))}
      </div>

      {/* Product grid skeleton */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-100 bg-white p-2">
            <div className="aspect-square w-full rounded-xl bg-slate-200" />
            <div className="mt-2 h-3 w-3/4 rounded bg-slate-200" />
            <div className="mt-1.5 h-3 w-1/2 rounded bg-slate-200" />
            <div className="mt-2 h-7 w-full rounded-lg bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  )
}
