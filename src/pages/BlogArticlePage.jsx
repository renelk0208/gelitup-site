import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getBlogPost } from '../data/blogPosts'

function useArticleSeo(post) {
  useEffect(() => {
    if (!post) return undefined

    const articleCanonical = `https://gelitup.com/blog/${post.slug}`
    const previousTitle = document.title
    const metaDescription = document.querySelector('meta[name="description"]')
    const canonicalLink = document.querySelector('link[rel="canonical"]')
    const previousDescription = metaDescription?.getAttribute('content')
    const previousCanonical = canonicalLink?.getAttribute('href')
    const schema = document.createElement('script')

    document.title = post.metaTitle
    metaDescription?.setAttribute('content', post.metaDescription)
    canonicalLink?.setAttribute('href', articleCanonical)
    schema.type = 'application/ld+json'
    schema.dataset.blogArticleSchema = 'true'
    schema.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.metaDescription,
      image: `https://gelitup.com${post.heroImage}`,
      datePublished: post.publishedAt,
      author: { '@type': 'Organization', name: 'GEL.IT.UP by GIUP®' },
      publisher: { '@type': 'Organization', name: 'GEL.IT.UP by GIUP®', url: 'https://gelitup.com' },
      mainEntityOfPage: articleCanonical,
    })
    document.head.appendChild(schema)

    return () => {
      document.title = previousTitle
      if (previousDescription) metaDescription?.setAttribute('content', previousDescription)
      if (previousCanonical) canonicalLink?.setAttribute('href', previousCanonical)
      schema.remove()
    }
  }, [post])
}

export default function BlogArticlePage() {
  const { slug } = useParams()
  const post = getBlogPost(slug)
  useArticleSeo(post)

  if (!post) {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center bg-[#fbf8f5] px-5 text-center text-neutral-950">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#D43790]">Article not found</p>
        <h1 className="mt-4 font-serif text-4xl font-semibold">This journal entry is unavailable.</h1>
        <Link to="/blog" className="mt-7 rounded-full bg-neutral-950 px-5 py-3 text-sm font-bold text-white">Back to all articles</Link>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#fbf8f5] text-neutral-900">
      <article>
        <header className="mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6 lg:px-8 lg:pb-14 lg:pt-12">
          <Link to="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 transition hover:text-[#D43790]">
            <span aria-hidden="true">←</span> Back to all articles
          </Link>
          <div className="mt-8 overflow-hidden rounded-[1.5rem] shadow-[0_24px_80px_rgba(46,16,36,0.18)] sm:rounded-[2rem]">
            <img src={post.heroImage} alt={post.title} className="aspect-video w-full object-contain" />
          </div>
          <div className="mx-auto mt-8 max-w-4xl">
            <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-500">
              <span className="font-bold uppercase tracking-[0.16em] text-[#D43790]">{post.category}</span>
              <span aria-hidden="true">•</span>
              <time dateTime={post.publishedAt}>{post.publishedLabel}</time>
              <span aria-hidden="true">•</span>
              <span>{post.readTime}</span>
            </div>
            <h1 className="mt-5 font-serif text-4xl font-semibold leading-[1.08] tracking-tight text-neutral-950 sm:text-5xl lg:text-6xl">
              {post.title}
            </h1>
            <div className="mt-7 flex flex-wrap gap-2">
              {(post.tags || ['HEMA-Free', 'TPO-Free', 'CPNP Notified']).map((label) => (
                <span key={label} className="rounded-full border border-[#D43790]/25 bg-[#D43790]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#9c1f61]">
                  {label}
                </span>
              ))}
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-4xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
          <div className="space-y-6 border-l-4 border-[#D43790] pl-6 text-xl leading-9 text-neutral-700 sm:pl-8">
            {post.intro.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>

          <div className="mt-14 space-y-14">
            {post.sections.map((section, index) => (
              <section key={section.title}>
                <h2 className="font-serif text-3xl font-semibold leading-tight text-neutral-950 sm:text-4xl">{section.title}</h2>
                <div className="mt-6 space-y-5 text-[1.05rem] leading-8 text-neutral-700">
                  {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </div>
                {section.takeaway && (
                  <aside className="mt-7 rounded-2xl border border-[#D43790]/20 bg-white p-6 shadow-sm sm:p-7">
                    <p className="text-base font-semibold leading-7 text-neutral-800">{section.takeaway}</p>
                  </aside>
                )}
                {index === (post.calloutAfterSection ?? 3) && (
                  <img
                    src={post.calloutImage}
                    alt={post.calloutAlt || 'Ingredient transparency turns compliance into a competitive advantage.'}
                    loading="lazy"
                    className="mt-12 w-full rounded-2xl border border-neutral-200 shadow-sm"
                  />
                )}
              </section>
            ))}
          </div>

          <section className="mt-16 rounded-[2rem] bg-neutral-950 px-6 py-10 text-white sm:px-10 sm:py-12">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#f168ae]">Professional standard</p>
            <h2 className="mt-3 font-serif text-3xl font-semibold sm:text-4xl">{post.verdict.title}</h2>
            <div className="mt-6 space-y-5 text-[1.05rem] leading-8 text-white/75">
              {post.verdict.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
          </section>

          <Link
            to="/full-catalogue"
            aria-label="Explore the full GEL.IT.UP catalogue"
            className="mt-12 block overflow-hidden rounded-2xl shadow-[0_20px_60px_rgba(24,24,27,0.16)] transition hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(24,24,27,0.22)]"
          >
            <img
              src={post.closingImage}
              alt={post.closingAlt || 'Explore the GEL.IT.UP HEMA-free, TPO-free and CPNP-notified professional gel system.'}
              loading="lazy"
              className="w-full"
            />
          </Link>

          <div className="mt-10 border-t border-neutral-200 pt-8">
            <Link to="/blog" className="inline-flex items-center gap-2 font-semibold text-neutral-700 transition hover:text-[#D43790]">
              <span aria-hidden="true">←</span> More from the GEL.IT.UP Journal
            </Link>
          </div>
        </div>
      </article>
    </main>
  )
}
