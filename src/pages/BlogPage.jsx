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
      className="group grid overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-[0_12px_40px_rgba(24,24,27,0.07)] transition hover:-translate-y-0.5 hover:border-[#D43790]/40 hover:shadow-[0_16px_48px_rgba(24,24,27,0.1)] md:grid-cols-[minmax(280px,38%)_1fr]"
    >
      <div className="m-3 aspect-video self-center overflow-hidden rounded-2xl bg-neutral-100 sm:m-4">
        <img
          src={post.heroImage}
          alt=""
          className="h-full w-full object-contain transition duration-500 group-hover:scale-[1.02]"
        />
      </div>
      <div className="flex flex-col justify-center px-6 pb-7 pt-3 md:px-4 md:py-8 md:pr-10 lg:pr-12">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D43790]">{post.category}</p>
        <h2 className="mt-4 font-serif text-2xl font-semibold leading-[1.08] tracking-tight text-neutral-950 sm:text-3xl lg:text-4xl">
          {post.title}
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-neutral-600">{post.excerpt}</p>
        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-neutral-500">
          <time dateTime={post.publishedAt}>{post.publishedLabel}</time>
          <span aria-hidden="true">•</span>
          <span>{post.readTime}</span>
        </div>
        <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#B32373] transition group-hover:text-[#D43790]">
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
      <section className="relative isolate overflow-hidden border-b border-white/10 bg-neutral-950 px-5 py-16 text-white sm:px-8 sm:py-20 lg:py-24">
        <div className="absolute -right-24 -top-28 -z-10 h-80 w-80 rounded-full border-[48px] border-[#D43790]/20" aria-hidden="true" />
        <div className="absolute -bottom-40 -left-24 -z-10 h-72 w-72 rounded-full border border-[#D43790]/50" aria-hidden="true" />
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#f168ae] sm:text-sm">The GEL.IT.UP Journal</p>
          <h1 className="mt-5 max-w-4xl font-serif text-5xl font-semibold leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl">
            Knowledge for safer, stronger salons.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-white/70">
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
        <div className="space-y-6">
          {blogPosts.map((post) => <BlogCard key={post.slug} post={post} />)}
        </div>
      </section>
    </main>
  )
}
