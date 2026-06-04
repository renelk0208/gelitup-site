import { useEffect } from 'react'

export default function ClarityScript({ projectId }) {
  useEffect(() => {
    if (!projectId || projectId === 'YOUR_CLARITY_PROJECT_ID') return
    if (window.clarity) return // already loaded
    ;(function (c, l, a, r, i, t, y) {
      c[a] =
        c[a] ||
        function () {
          ;(c[a].q = c[a].q || []).push(arguments)
        }
      t = l.createElement(r)
      t.async = 1
      t.src = 'https://www.clarity.ms/tag/' + i
      y = l.getElementsByTagName(r)[0]
      y.parentNode.insertBefore(t, y)
    })(window, document, 'clarity', 'script', projectId)
  }, [projectId])

  return null
}
