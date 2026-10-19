// Cruelty Free International requires every visible "Approved by Cruelty Free International"
// to link to our listing. withCfiLink() turns that phrase inside plain text into the link.
// eslint-disable-next-line react-refresh/only-export-components
export const CFI_URL = 'https://www.crueltyfreeinternational.org/approved-brands/listing/gel-it-up/'

export function CfiLink({ children = 'Approved by Cruelty Free International', className = '' }) {
  return (
    <a href={CFI_URL} target="_blank" rel="noopener noreferrer" className={`font-semibold text-[#D43790] underline hover:opacity-80 ${className}`}>
      {children}
    </a>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function withCfiLink(text) {
  if (typeof text !== 'string') return text
  const parts = text.split(/(Approved by Cruelty Free International)/i)
  if (parts.length === 1) return text
  return parts.map((part, i) => (i % 2 === 1 ? <CfiLink key={i}>{part}</CfiLink> : part))
}
