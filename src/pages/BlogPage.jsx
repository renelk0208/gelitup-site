import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { blogPosts } from '../data/blogPosts'

const SEO = {
  title: 'Professional Nail Industry Blog | GEL.IT.UP by GIUP®',
  description: 'Professional guidance for nail salons and technicians on gel safety, EU compliance, ingredients, business protection and product performance.',
  canonical: 'https://gelitup.com/blog',
}

function usePageSeo() {
  useEffect(() => {
    const previousTitle = document.title
    const description = document.querySelector('meta[name="description"]')
    const canonical = document.querySelector('link[rel="canonical"]')
    const previousDescription = description?.getAttribute('content')
    const previousCanonical = canonical?.getAttribute('href')

    document.title = SEO.title
    description?.setAttribute('content', SEO.description)
    canonical?.setAttribute('href', SEO.canonical)

    return () => {
      document.title = previousTitle
      if (previousDescription) description?.setAttribute('content', previousDescription)
      if (previousCanonical) canonical?.setAttribute('href', previousCanonical)
    }
  }, [])
}

function BlogCard({ post }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_10px_30px_rgba(24,24,27,0.06)] transition hover:-translate-y-1 hover:border-[#D43790]/40 hover:shadow-[0_16px_42px_rgba(24,24,27,0.1)]"
    >
      <div className="aspect-[16/10] overflow-hidden bg-white">
        <img
          src={post.heroImage}
          alt=""
          className="h-full w-full object-contain p-2 transition duration-500 group-hover:scale-[1.02] sm:p-3"
        />
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#D43790]">{post.category}</p>
          {post.featured && (
            <span className="rounded-full bg-[#D43790]/10 px-2 py-1 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-[#9c1f61]">
              Featured
            </span>
          )}
        </div>
        <h2 className="mt-3 text-lg font-bold leading-tight tracking-tight text-neutral-950 sm:text-xl">
          {post.shortTitle || post.title}
        </h2>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-neutral-600">{post.excerpt}</p>
        <div className="mt-5 flex flex-wrap items-center gap-2 text-[0.72rem] text-neutral-500">
          <time dateTime={post.publishedAt}>{post.publishedLabel}</time>
          <span aria-hidden="true">•</span>
          <span>{post.readTime}</span>
        </div>
        <span className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-bold text-[#B32373] transition group-hover:text-[#D43790]">
          Open article <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  )
}

export default function BlogPage() {
  usePageSeo()

  const posts = [...blogPosts].sort(
    (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
  )

  return (
    <main className="min-h-screen bg-[#f8f4f1] text-neutral-950">
      <section className="relative isolate overflow-hidden border-b border-white/10 bg-neutral-950 px-5 py-12 text-white sm:px-8 sm:py-16 lg:py-20">
        <div className="absolute -right-24 -top-28 -z-10 h-80 w-80 rounded-full border-[48px] border-[#D43790]/20" aria-hidden="true" />
        <div className="absolute -bottom-40 -left-24 -z-10 h-72 w-72 rounded-full border border-[#D43790]/50" aria-hidden="true" />
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#f168ae] sm:text-sm">The GEL.IT.UP Journal</p>
          <h1 className="heading-on-dark mt-4 max-w-4xl text-4xl font-black leading-tight tracking-[0.02em] sm:text-5xl lg:text-6xl">
            Knowledge for safer, stronger salons.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">
            Professional insight on product safety, salon compliance, ingredients and the standards shaping the nail industry.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        {posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/60 p-16 text-center text-neutral-500">
            No published articles yet.
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between gap-4 text-sm text-neutral-500">
              <p>{posts.length} article{posts.length === 1 ? '' : 's'}</p>
              <span className="hidden sm:inline">Fresh advice for technicians, salons and product buyers</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {posts.map((post) => (
                <BlogCard key={post.slug} post={post} />
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  )
}
