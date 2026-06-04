import { useEffect } from 'react'

/**
 * Microsoft Clarity — gelitup.com
 * Project ID: x1qbjkk609
 */
export default function ClarityScript() {
  useEffect(() => {
    // Delay 2s so Clarity never interferes with React mounting
    const timer = setTimeout(() => {
      try {
        if (window.clarity) return
        ;(function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)}
          t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)
        })(window,document,'clarity','script','x1qbjkk609')
      } catch(e) {
        console.warn('Clarity failed to load:', e)
      }
    }, 2000)
    return () => clearTimeout(timer)
  }, [])
  return null
}
