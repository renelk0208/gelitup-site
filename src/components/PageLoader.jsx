import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import appLogo from '/gelitup_logo.png'

export default function PageLoader() {
  const location = useLocation()
  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    setVisible(true)
    setProgress(30)
    const t1 = setTimeout(() => setProgress(70), 100)
    const t2 = setTimeout(() => setProgress(100), 250)
    const t3 = setTimeout(() => { setVisible(false); setProgress(0) }, 400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [location.pathname])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/90"
      style={{ transition: 'opacity 0.3s', opacity: progress >= 100 ? 0 : 1 }}
    >
      <img src={appLogo} alt="GEL.IT.UP" className="mb-6 h-12 w-auto" />
      <div className="h-1 w-48 overflow-hidden rounded-full bg-white/20">
        <div
          className="h-full rounded-full bg-fuchsia-500"
          style={{ width: `${progress}%`, transition: 'width 0.3s ease' }}
        />
      </div>
    </div>
  )
}
