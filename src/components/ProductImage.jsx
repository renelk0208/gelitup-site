import { useState } from 'react'

// Falls back to the existing branded placeholder already in the repo
const PLACEHOLDER_SRC = '/gelitup-media/images/placeholder-cfbb2811.png'

export default function ProductImage({ src, alt, className, style, ...props }) {
  const [failed, setFailed] = useState(false)

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1 bg-zinc-100 text-zinc-400 ${className || ''}`}
        style={style}
      >
        <img
          src={PLACEHOLDER_SRC}
          alt={alt || 'Image coming soon'}
          className="h-4/5 w-full object-contain opacity-40"
        />
        <span className="text-xs font-medium">Image coming soon</span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={() => setFailed(true)}
      {...props}
    />
  )
}
