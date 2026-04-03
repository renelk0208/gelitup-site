import { useCallback, useEffect, useState } from 'react'
import { inspirationCategories } from '../data/inspirationData'

/* ── Lightbox: full-screen image viewer with prev / next ─────────────── */
function Lightbox({ images, index, onClose, onPrev, onNext }) {
  useEffect(() => {
    const handle = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrev()
      if (e.key === 'ArrowRight') onNext()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handle)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handle)
    }
  }, [onClose, onPrev, onNext])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={onClose}>
      <button type="button" onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/20 px-3 py-2 text-sm font-medium text-white backdrop-blur hover:bg-white/30">
        Close
      </button>

      {images.length > 1 && (
        <>
          <button type="button" onClick={(e) => { e.stopPropagation(); onPrev() }}
            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/20 p-3 text-white backdrop-blur hover:bg-white/30">
            ‹
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onNext() }}
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/20 p-3 text-white backdrop-blur hover:bg-white/30">
            ›
          </button>
        </>
      )}

      <img
        src={images[index]}
        alt={`Image ${index + 1}`}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl"
      />

      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1.5 text-xs font-medium text-white/80 backdrop-blur">
        {index + 1} / {images.length}
      </p>
    </div>
  )
}

/* ── Category card on the main grid ──────────────────────────────────── */
function CategoryCard({ category, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(category)}
      className="group overflow-hidden rounded-3xl bg-neutral-100 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="aspect-[4/5] overflow-hidden">
        <img
          src={category.cover}
          alt={category.label}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="px-4 py-3">
        <h3 className="text-base font-semibold text-neutral-900">{category.label}</h3>
        <p className="mt-0.5 text-sm text-neutral-500">
          {category.images.length} image{category.images.length === 1 ? '' : 's'}{category.videos?.length ? ` · ${category.videos.length} video${category.videos.length === 1 ? '' : 's'}` : ''} · Tap to view
        </p>
      </div>
    </button>
  )
}

/* ── Category gallery view (all images in a category) ────────────────── */
function CategoryGallery({ category, onBack }) {
  const [lightboxIndex, setLightboxIndex] = useState(null)

  const openLightbox = useCallback((i) => setLightboxIndex(i), [])
  const closeLightbox = useCallback(() => setLightboxIndex(null), [])
  const prev = useCallback(() => setLightboxIndex((i) => (i > 0 ? i - 1 : category.images.length - 1)), [category.images.length])
  const next = useCallback(() => setLightboxIndex((i) => (i < category.images.length - 1 ? i + 1 : 0)), [category.images.length])

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <button type="button" onClick={onBack}
          className="mb-6 inline-flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-200">
          ← Back to Categories
        </button>

        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">{category.label}</h2>
        <p className="mt-2 max-w-xl text-base text-neutral-600">{category.description}</p>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {category.images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => openLightbox(i)}
              className="group overflow-hidden rounded-2xl bg-neutral-100 shadow-sm transition hover:shadow-lg"
            >
              <img
                src={src}
                alt={`${category.label} ${i + 1}`}
                loading="lazy"
                className="w-full rounded-2xl object-contain transition duration-300 group-hover:scale-105"
              />
            </button>
          ))}
        </div>

        {category.videos?.length > 0 && (
          <div className="mt-10">
            <h3 className="text-xl font-semibold text-neutral-900">Videos</h3>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {category.videos.map((src, i) => (
                <video
                  key={src}
                  controls
                  preload="metadata"
                  playsInline
                  className="w-full rounded-2xl bg-black shadow-lg"
                >
                  <source src={src} />
                </video>
              ))}
            </div>
          </div>
        )}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          images={category.images}
          index={lightboxIndex}
          onClose={closeLightbox}
          onPrev={prev}
          onNext={next}
        />
      )}
    </>
  )
}

/* ── Main page ───────────────────────────────────────────────────────── */
export default function InspirationPage() {
  const [openCategory, setOpenCategory] = useState(null)

  return (
    <div className="bg-white text-neutral-900">
      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-[#D43790] via-[#8e1650] to-[#1A1A1A]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.3em] text-white/80">
              GEL.IT.UP Inspiration
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Results That Sell
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/85">
              Real application. Real performance. Professional results created with
              GEL.IT.UP systems.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/full-catalogue"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100">
                Explore Products
              </a>
              <a href="/b2b-solid-colour"
                className="inline-flex items-center justify-center rounded-2xl border border-white/40 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20">
                Enter B2B Portal
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Content: category grid or gallery ───────────────────────── */}
      {openCategory ? (
        <CategoryGallery
          category={openCategory}
          onBack={() => setOpenCategory(null)}
        />
      ) : (
        <>
          <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
            <h2 className="text-2xl font-semibold text-neutral-900">Browse by Category</h2>
            <p className="mt-2 text-sm text-neutral-500">
              {inspirationCategories.length} categories · {inspirationCategories.reduce((s, c) => s + c.images.length, 0)} images
            </p>
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...inspirationCategories].sort((a, b) => {
                  if (a.pinFirst && !b.pinFirst) return -1;
                  if (!a.pinFirst && b.pinFirst) return 1;
                  return a.label.localeCompare(b.label);
                }).map((cat) => (
                <CategoryCard key={cat.key} category={cat} onClick={setOpenCategory} />
              ))}
            </div>
          </section>

          {/* ── CTA ─────────────────────────────────────────────────── */}
          <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
            <div className="rounded-[2rem] border border-neutral-200 bg-neutral-50 px-6 py-10 text-center md:px-10">
              <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
                Ready to Build Your Range?
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-neutral-900">
                Explore the professional side of GEL.IT.UP
              </h2>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <a href="/b2b-solid-colour"
                  className="inline-flex rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white">
                  Enter B2B Portal
                </a>
                <a href="/register"
                  className="inline-flex rounded-2xl border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-900">
                  Register
                </a>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
