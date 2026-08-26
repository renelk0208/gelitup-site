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
      <div className="aspect-video overflow-hidden bg-neutral-100">
        <img
          src={post.heroImage}
          alt=""
          className="h-full w-full object-contain transition duration-500 group-hover:scale-[1.02]"
        />
      </div>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#D43790]">{post.category}</p>
        <h2 className="mt-3 text-xl font-bold leading-tight tracking-tight text-neutral-950 sm:text-2xl">
          {post.shortTitle || post.title}
        </h2>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-neutral-600">{post.excerpt}</p>
        <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
          <time dateTime={post.publishedAt}>{post.publishedLabel}</time>
          <span aria-hidden="true">•</span>
          <span>{post.readTime}</span>
        </div>
        <span className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-bold text-[#B32373] transition group-hover:text-[#D43790]">
          Read article <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  )
}

export default function BlogPage() {
  usePageSeo()

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

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#D43790]">The journal</p>
            <h2 className="mt-2 font-serif text-3xl font-semibold sm:text-4xl">All articles</h2>
          </div>
          <p className="hidden text-sm text-neutral-500 sm:block">{blogPosts.length} article{blogPosts.length === 1 ? '' : 's'}</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {blogPosts.map((post) => <BlogCard key={post.slug} post={post} />)}
        </div>
      </section>
    </main>
  )
}
