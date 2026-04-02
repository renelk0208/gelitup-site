import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { inspirationCategories, inspirationItems } from '../data/inspirationData'

function InspirationModal({ item, onClose, onShopLook, onCopyLook }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!item) return

    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose()
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleEsc)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleEsc)
    }
  }, [item, onClose])

  if (!item) return null

  const hasShades = item.shades?.length > 0

  const handleCopy = async () => {
    if (!hasShades) return
    try {
      await navigator.clipboard.writeText(item.shades.join(', '))
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      console.warn('Could not copy shades.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close modal"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-white/90 px-3 py-2 text-sm font-medium text-black shadow"
        >
          Close
        </button>

        <div className="grid max-h-[92vh] grid-cols-1 overflow-y-auto lg:grid-cols-2">
          <div className="bg-neutral-100">
            <img
              src={item.image}
              alt={item.title}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>

          <div className="flex flex-col justify-between p-6 md:p-8">
            <div>
              {item.collection ? (
                <p className="mb-2 text-sm uppercase tracking-[0.25em] text-neutral-500">
                  {item.collection}
                </p>
              ) : null}

              <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">
                {item.title}
              </h2>

              <p className="mt-4 text-base leading-7 text-neutral-600">
                {item.description}
              </p>

              <div className="mt-6 space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                    System
                  </p>
                  <p className="text-sm font-semibold text-neutral-900">
                    {item.collection || 'Professional GEL.IT.UP system'}
                  </p>
                </div>

                {hasShades ? (
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                      Shades in this Look
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.shades.map((sku) => (
                        <span
                          key={sku}
                          className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800"
                        >
                          {sku}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {hasShades ? (
                <>
                  <button
                    type="button"
                    onClick={() => onShopLook(item)}
                    className="inline-flex items-center justify-center rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    Shop This Look
                  </button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center justify-center rounded-2xl border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
                  >
                    {copied ? 'Copied!' : 'Copy Look'}
                  </button>
                </>
              ) : null}
              {item.products?.map((product) => (
                <a
                  key={`${item.id}-${product.label}`}
                  href={product.href}
                  className="inline-flex items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100"
                >
                  {product.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InspirationTile({ item, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(item)}
      className="group relative overflow-hidden rounded-3xl bg-neutral-100 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="aspect-[4/5] overflow-hidden">
        <img
          src={item.image}
          alt={item.title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-100" />

      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
        {item.collection ? (
          <p className="text-xs uppercase tracking-[0.25em] text-white/80">
            {item.collection}
          </p>
        ) : null}

        <h3 className="mt-2 text-xl font-semibold">{item.title}</h3>

        <p className="mt-1 text-sm text-white/85">
          {item.shades?.length
            ? `${item.shades.length} shade${item.shades.length === 1 ? '' : 's'} · Tap to shop`
            : 'Professional result'}
        </p>
      </div>
    </button>
  )
}

export default function InspirationPage() {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('all')
  const [selectedItem, setSelectedItem] = useState(null)

  const filteredItems = useMemo(() => {
    if (activeCategory === 'all') return inspirationItems
    return inspirationItems.filter((item) => item.category === activeCategory)
  }, [activeCategory])

  const handleShopLook = (item) => {
    if (!item.shades?.length) return
    navigate(`/b2b-solid-colour?look=${item.shades.join(',')}`)
  }

  return (
    <div className="bg-white text-neutral-900">
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/img/inspiration/inspiration-hero.webp"
            alt="GEL.IT.UP professional inspiration"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/45" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
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
              <a
                href="/collections"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100"
              >
                Explore Colours
              </a>
              <a
                href="/b2b-solid-colour"
                className="inline-flex items-center justify-center rounded-2xl border border-white/40 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                Enter B2B Portal
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="sticky top-0 z-20 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex gap-3 overflow-x-auto">
            {inspirationCategories.map((category) => {
              const isActive = category.key === activeCategory

              return (
                <button
                  key={category.key}
                  type="button"
                  onClick={() => setActiveCategory(category.key)}
                  className={[
                    'whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition',
                    isActive
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200',
                  ].join(' ')}
                >
                  {category.label}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item) => (
            <InspirationTile
              key={item.id}
              item={item}
              onClick={(clickedItem) => setSelectedItem(clickedItem)}
            />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-3xl bg-neutral-100">
            <img
              src="/img/inspiration/shop-vitro.webp"
              alt="Vitro Collection"
              loading="lazy"
              className="aspect-[16/10] w-full object-cover"
            />
            <div className="p-6">
              <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                Shop the Look
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Vitro Glass Effect</h2>
              <p className="mt-3 text-neutral-600">
                Sheer depth, modern layering, and refined glass-effect finishes.
              </p>
              <a
                href="/collections/vitro"
                className="mt-5 inline-flex rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white"
              >
                Shop Vitro Collection
              </a>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl bg-neutral-100">
            <img
              src="/img/inspiration/shop-flash.webp"
              alt="Flash Glitters"
              loading="lazy"
              className="aspect-[16/10] w-full object-cover"
            />
            <div className="p-6">
              <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                Shop the Look
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Flash Glitter Impact</h2>
              <p className="mt-3 text-neutral-600">
                High-reflective sparkle designed for professional salon performance.
              </p>
              <a
                href="/collections/flash-glitters"
                className="mt-5 inline-flex rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white"
              >
                Shop Flash Glitters
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="rounded-[2rem] bg-neutral-900 px-6 py-10 text-white md:px-10">
          <p className="text-sm uppercase tracking-[0.3em] text-white/70">
            Professional Proof
          </p>
          <h2 className="mt-3 text-3xl font-semibold">Used by Professionals</h2>
          <p className="mt-4 max-w-2xl text-white/80">
            Real salon work, collection results, and professional application examples
            designed to show performance, finish, and range.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
        <div className="rounded-[2rem] border border-neutral-200 bg-neutral-50 px-6 py-10 text-center md:px-10">
          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            Ready to Build Your Range?
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-neutral-900">
            Explore the professional side of GEL.IT.UP
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/b2b-solid-colour"
              className="inline-flex rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white"
            >
              Enter B2B Portal
            </a>
            <a
              href="/register"
              className="inline-flex rounded-2xl border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-900"
            >
              Register
            </a>
          </div>
        </div>
      </section>

      <InspirationModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onShopLook={handleShopLook}
      />
    </div>
  )
}
