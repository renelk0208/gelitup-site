import { Link } from 'react-router-dom'
import { withCfiLink } from './cfiLink'

// Light inline formatting for blog text: **bold** and [label](url).
// Internal links (starting with "/") use the router; external links open in a new tab.
// Plain text still goes through withCfiLink so "Approved by Cruelty Free International" stays linked.
const TOKEN = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g

export function renderInline(text) {
  if (typeof text !== 'string') return text
  if (!TOKEN.test(text)) return withCfiLink(text)
  TOKEN.lastIndex = 0

  return text.split(TOKEN).filter(Boolean).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-neutral-900">{part.slice(2, -2)}</strong>
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (link) {
      const [, label, href] = link
      const className = 'font-semibold text-[#D43790] underline decoration-[#D43790]/40 underline-offset-2 hover:decoration-[#D43790]'
      return href.startsWith('/')
        ? <Link key={i} to={href} className={className}>{label}</Link>
        : <a key={i} href={href} target="_blank" rel="noopener noreferrer" className={className}>{label}</a>
    }
    return <span key={i}>{withCfiLink(part)}</span>
  })
}

// Plain-text version (for structured data): strips the markup.
export function plainText(text) {
  if (typeof text !== 'string') return ''
  return text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
}
