/*!
 * World of GEL.IT.UP — embeddable competition widget
 *
 * Paste this where the widget should appear on any GEL.IT.UP website:
 *
 *   <div data-gelitup-world data-country="GR" data-lang="el"></div>
 *   <script src="https://gelitup.com/world-embed.js" async></script>
 *
 * Options (all optional) on the div:
 *   data-country  two-letter country code: shows that country's looks first (e.g. GR, BG, IT, ES)
 *   data-lang     en, el, bg, it, es, ro, pl, fr, de, pt, hu
 *   data-limit    number of looks to show (3–24, default 9)
 *   data-hero     "0" to hide the big competition banner
 *
 * Without a div, the widget is inserted right where the script tag is.
 */
(function () {
  var ORIGIN = 'https://gelitup.com'
  var current = document.currentScript
  try {
    if (current && current.src) ORIGIN = new URL(current.src).origin
  } catch { /* keep default */ }

  function mount(host) {
    if (host.getAttribute('data-gelitup-world-mounted')) return
    host.setAttribute('data-gelitup-world-mounted', '1')
    var qs = new URLSearchParams()
    var country = (host.getAttribute('data-country') || '').toUpperCase()
    if (/^[A-Z]{2}$/.test(country)) qs.set('country', country)
    var lang = host.getAttribute('data-lang') || (document.documentElement.lang || '').slice(0, 2).toLowerCase()
    if (lang) qs.set('lang', lang)
    var limit = host.getAttribute('data-limit')
    if (limit) qs.set('limit', limit)
    if (host.getAttribute('data-hero') === '0') qs.set('hero', '0')
    qs.set('src', location.hostname.replace(/^www\./, ''))

    var iframe = document.createElement('iframe')
    iframe.src = ORIGIN + '/world-embed.html?' + qs.toString()
    iframe.title = 'World of GEL.IT.UP'
    iframe.loading = 'lazy'
    iframe.setAttribute('scrolling', 'no')
    iframe.style.cssText = 'display:block;width:100%;border:0;min-height:480px;overflow:hidden;background:transparent'
    host.appendChild(iframe)

    window.addEventListener('message', function (ev) {
      if (ev.origin !== ORIGIN || ev.source !== iframe.contentWindow) return
      var d = ev.data
      if (d && d.type === 'gelitup-world:height' && typeof d.height === 'number') {
        iframe.style.height = Math.max(200, Math.min(d.height + 4, 20000)) + 'px'
        iframe.style.minHeight = '0'
      }
    })
  }

  function init() {
    var hosts = document.querySelectorAll('[data-gelitup-world]')
    if (hosts.length) {
      for (var i = 0; i < hosts.length; i++) mount(hosts[i])
    } else if (current && current.parentNode) {
      var div = document.createElement('div')
      div.setAttribute('data-gelitup-world', '')
      ;['country', 'lang', 'limit', 'hero'].forEach(function (k) {
        var v = current.getAttribute('data-' + k)
        if (v) div.setAttribute('data-' + k, v)
      })
      current.parentNode.insertBefore(div, current)
      mount(div)
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()
