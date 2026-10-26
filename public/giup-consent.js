/*
 * GEL.IT.UP cookie banner (replaces Cookiebot, Oct 2026).
 * Works with the consent script at the top of index.html (window.giupApplyConsent).
 *
 * - Shows Accept all / Reject all / Choose (Analytics, Marketing) until a choice is stored.
 * - Choice is kept in localStorage "giup_cookie_consent" for 12 months.
 * - Reopen the banner from anywhere: window.giupCookieSettings(),
 *   or any link/button with href="#cookie-settings" or data-cookie-settings.
 */
(function () {
  'use strict';
  if (window.__giupConsentBanner) return;
  window.__giupConsentBanner = true;

  var KEY = 'giup_cookie_consent';
  var PINK = '#D43790';

  var T = {
    en: {
      title: 'Cookies',
      msg: 'We use essential cookies to make this site work. With your permission we also use analytics cookies (Google Analytics, Microsoft Clarity) to understand how the site is used, and marketing cookies (Google Ads, Meta) to show you relevant adverts.',
      policy: 'Cookie Policy', accept: 'Accept all', reject: 'Reject all', choose: 'Choose', save: 'Save choices',
      ess: 'Essential', essD: 'Always on — needed for the site, your cart and login.',
      ana: 'Analytics', anaD: 'Helps us see which pages are visited.',
      mkt: 'Marketing', mktD: 'Lets Google and Meta measure and personalise our adverts.'
    },
    el: {
      title: 'Cookies',
      msg: 'Χρησιμοποιούμε απαραίτητα cookies για τη λειτουργία του ιστότοπου. Με τη συγκατάθεσή σας χρησιμοποιούμε επίσης cookies ανάλυσης (Google Analytics, Microsoft Clarity) για να καταλαβαίνουμε πώς χρησιμοποιείται ο ιστότοπος, και cookies μάρκετινγκ (Google Ads, Meta) για να σας δείχνουμε σχετικές διαφημίσεις.',
      policy: 'Πολιτική Cookies', accept: 'Αποδοχή όλων', reject: 'Απόρριψη όλων', choose: 'Επιλογές', save: 'Αποθήκευση επιλογών',
      ess: 'Απαραίτητα', essD: 'Πάντα ενεργά — απαραίτητα για τον ιστότοπο, το καλάθι και τη σύνδεση.',
      ana: 'Ανάλυση', anaD: 'Μας δείχνουν ποιες σελίδες επισκέπτονται.',
      mkt: 'Μάρκετινγκ', mktD: 'Επιτρέπουν στη Google και τη Meta να μετρούν και να εξατομικεύουν τις διαφημίσεις μας.'
    },
    it: {
      title: 'Cookie',
      msg: 'Utilizziamo cookie essenziali per il funzionamento del sito. Con il tuo consenso utilizziamo anche cookie analitici (Google Analytics, Microsoft Clarity) per capire come viene usato il sito e cookie di marketing (Google Ads, Meta) per mostrarti annunci pertinenti.',
      policy: 'Cookie Policy', accept: 'Accetta tutti', reject: 'Rifiuta tutti', choose: 'Personalizza', save: 'Salva scelte',
      ess: 'Essenziali', essD: "Sempre attivi — necessari per il sito, il carrello e l'accesso.",
      ana: 'Analitici', anaD: 'Ci aiutano a capire quali pagine vengono visitate.',
      mkt: 'Marketing', mktD: 'Permettono a Google e Meta di misurare e personalizzare i nostri annunci.'
    },
    fr: {
      title: 'Cookies',
      msg: "Nous utilisons des cookies essentiels au fonctionnement du site. Avec votre accord, nous utilisons aussi des cookies d'analyse (Google Analytics, Microsoft Clarity) pour comprendre l'utilisation du site, et des cookies marketing (Google Ads, Meta) pour vous montrer des publicités pertinentes.",
      policy: 'Politique cookies', accept: 'Tout accepter', reject: 'Tout refuser', choose: 'Personnaliser', save: 'Enregistrer mes choix',
      ess: 'Essentiels', essD: 'Toujours actifs — nécessaires au site, au panier et à la connexion.',
      ana: 'Analyse', anaD: 'Nous aide à voir quelles pages sont consultées.',
      mkt: 'Marketing', mktD: 'Permet à Google et Meta de mesurer et personnaliser nos publicités.'
    },
    de: {
      title: 'Cookies',
      msg: 'Wir verwenden notwendige Cookies, damit diese Website funktioniert. Mit Ihrer Zustimmung verwenden wir außerdem Analyse-Cookies (Google Analytics, Microsoft Clarity), um die Nutzung der Website zu verstehen, und Marketing-Cookies (Google Ads, Meta), um Ihnen relevante Werbung zu zeigen.',
      policy: 'Cookie-Richtlinie', accept: 'Alle akzeptieren', reject: 'Alle ablehnen', choose: 'Auswählen', save: 'Auswahl speichern',
      ess: 'Notwendig', essD: 'Immer aktiv – erforderlich für Website, Warenkorb und Anmeldung.',
      ana: 'Analyse', anaD: 'Zeigt uns, welche Seiten besucht werden.',
      mkt: 'Marketing', mktD: 'Ermöglicht Google und Meta, unsere Werbung zu messen und zu personalisieren.'
    },
    es: {
      title: 'Cookies',
      msg: 'Utilizamos cookies esenciales para que el sitio funcione. Con tu permiso, también usamos cookies de análisis (Google Analytics, Microsoft Clarity) para entender cómo se usa el sitio, y cookies de marketing (Google Ads, Meta) para mostrarte anuncios relevantes.',
      policy: 'Política de cookies', accept: 'Aceptar todas', reject: 'Rechazar todas', choose: 'Elegir', save: 'Guardar selección',
      ess: 'Esenciales', essD: 'Siempre activas: necesarias para el sitio, el carrito y el inicio de sesión.',
      ana: 'Análisis', anaD: 'Nos ayudan a ver qué páginas se visitan.',
      mkt: 'Marketing', mktD: 'Permiten a Google y Meta medir y personalizar nuestros anuncios.'
    },
    bg: {
      title: 'Бисквитки',
      msg: 'Използваме необходими бисквитки, за да работи сайтът. С ваше съгласие използваме и аналитични бисквитки (Google Analytics, Microsoft Clarity), за да разберем как се използва сайтът, и маркетингови бисквитки (Google Ads, Meta), за да ви показваме подходящи реклами.',
      policy: 'Политика за бисквитки', accept: 'Приемам всички', reject: 'Отказвам всички', choose: 'Избор', save: 'Запази избора',
      ess: 'Необходими', essD: 'Винаги активни – нужни за сайта, количката и входа.',
      ana: 'Аналитични', anaD: 'Показват ни кои страници се посещават.',
      mkt: 'Маркетингови', mktD: 'Позволяват на Google и Meta да измерват и персонализират рекламите ни.'
    },
    pl: {
      title: 'Pliki cookie',
      msg: 'Używamy niezbędnych plików cookie, aby strona działała. Za Twoją zgodą używamy też analitycznych plików cookie (Google Analytics, Microsoft Clarity), aby zrozumieć, jak korzystasz ze strony, oraz marketingowych plików cookie (Google Ads, Meta), aby wyświetlać trafne reklamy.',
      policy: 'Polityka cookies', accept: 'Akceptuj wszystkie', reject: 'Odrzuć wszystkie', choose: 'Wybierz', save: 'Zapisz wybór',
      ess: 'Niezbędne', essD: 'Zawsze aktywne – potrzebne do działania strony, koszyka i logowania.',
      ana: 'Analityczne', anaD: 'Pokazują nam, które strony są odwiedzane.',
      mkt: 'Marketingowe', mktD: 'Pozwalają Google i Meta mierzyć i dopasowywać nasze reklamy.'
    },
    ro: {
      title: 'Cookie-uri',
      msg: 'Folosim cookie-uri esențiale pentru funcționarea site-ului. Cu acordul tău, folosim și cookie-uri de analiză (Google Analytics, Microsoft Clarity) pentru a înțelege cum este folosit site-ul și cookie-uri de marketing (Google Ads, Meta) pentru a-ți arăta reclame relevante.',
      policy: 'Politica cookies', accept: 'Accept toate', reject: 'Refuz toate', choose: 'Alege', save: 'Salvează alegerea',
      ess: 'Esențiale', essD: 'Mereu active – necesare pentru site, coș și autentificare.',
      ana: 'Analiză', anaD: 'Ne arată ce pagini sunt vizitate.',
      mkt: 'Marketing', mktD: 'Permit Google și Meta să măsoare și să personalizeze reclamele noastre.'
    },
    pt: {
      title: 'Cookies',
      msg: 'Utilizamos cookies essenciais para o funcionamento do site. Com a sua autorização, utilizamos também cookies de análise (Google Analytics, Microsoft Clarity) para perceber como o site é usado, e cookies de marketing (Google Ads, Meta) para lhe mostrar anúncios relevantes.',
      policy: 'Política de cookies', accept: 'Aceitar todos', reject: 'Rejeitar todos', choose: 'Escolher', save: 'Guardar escolhas',
      ess: 'Essenciais', essD: 'Sempre ativos – necessários para o site, o carrinho e o início de sessão.',
      ana: 'Análise', anaD: 'Mostram-nos que páginas são visitadas.',
      mkt: 'Marketing', mktD: 'Permitem à Google e à Meta medir e personalizar os nossos anúncios.'
    },
    hu: {
      title: 'Sütik',
      msg: 'Az oldal működéséhez szükséges sütiket használunk. Az Ön hozzájárulásával elemző sütiket (Google Analytics, Microsoft Clarity) is használunk, hogy megértsük az oldal használatát, valamint marketing sütiket (Google Ads, Meta), hogy releváns hirdetéseket mutassunk.',
      policy: 'Cookie-szabályzat', accept: 'Összes elfogadása', reject: 'Összes elutasítása', choose: 'Beállítások', save: 'Választás mentése',
      ess: 'Szükséges', essD: 'Mindig aktív – az oldalhoz, a kosárhoz és a bejelentkezéshez kell.',
      ana: 'Elemző', anaD: 'Megmutatják, mely oldalakat látogatják.',
      mkt: 'Marketing', mktD: 'Lehetővé teszik a Google és a Meta számára hirdetéseink mérését és személyre szabását.'
    }
  };

  // Same order as src/lib/i18n.js detectLang(): saved choice → URL prefix → browser.
  function detectLang() {
    try {
      var saved = localStorage.getItem('gelitup_lang');
      if (saved && T[saved]) return saved;
    } catch (e) {}
    var path = String(location.pathname || '').toLowerCase();
    for (var code in T) {
      if (code !== 'en' && (path === '/' + code || path.indexOf('/' + code + '/') === 0)) return code;
    }
    var b = String(navigator.language || navigator.userLanguage || '').toLowerCase().split('-')[0];
    if (b === 'gr') b = 'el';
    return T[b] ? b : 'en';
  }

  function save(c) {
    var prev = window.giupConsent;
    var choice = { v: 1, analytics: !!c.analytics, marketing: !!c.marketing, ts: Date.now() };
    try { localStorage.setItem(KEY, JSON.stringify(choice)); } catch (e) {}
    window.giupApplyConsent(choice);
    close();
    // Withdrawing consent after a tracker has loaded: reload so it stops running.
    if (prev && ((prev.analytics && !choice.analytics) || (prev.marketing && !choice.marketing))) {
      location.reload();
    }
  }

  var root = null;

  function css() {
    if (document.getElementById('giup-cc-style')) return;
    var s = document.createElement('style');
    s.id = 'giup-cc-style';
    s.textContent =
      '#giup-cc{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;background:rgba(36,36,39,.97);color:#cfcfd4;' +
      'border-top:1px solid rgba(255,255,255,.12);font:14px/1.45 Arial,Helvetica,sans-serif;box-shadow:0 -6px 24px rgba(0,0,0,.25)}' +
      '#giup-cc *{box-sizing:border-box}' +
      '#giup-cc .giup-cc-in{max-width:1180px;margin:0 auto;padding:20px 24px;display:flex;gap:20px;align-items:center;flex-wrap:wrap}' +
      '#giup-cc .giup-cc-txt{flex:1 1 420px;min-width:0}' +
      '#giup-cc h2{margin:0 0 4px;font-size:15px;color:#fff;font-weight:700}' +
      '#giup-cc p{margin:0}' +
      '#giup-cc a{color:' + PINK + ';font-weight:700;text-decoration:underline}' +
      '#giup-cc a:hover{color:#fff}' +
      '#giup-cc .giup-cc-btns{display:flex;gap:10px;flex-wrap:wrap}' +
      '#giup-cc button{font:inherit;font-size:15px;font-weight:700;border-radius:4px;padding:11px 22px;cursor:pointer;min-height:44px;transition:background .2s,color .2s,border-color .2s}' +
      '#giup-cc .giup-cc-acc{background:' + PINK + ';color:#fff;border:1px solid ' + PINK + '}' +
      '#giup-cc .giup-cc-acc:hover{background:#c0236f;border-color:#c0236f}' +
      '#giup-cc .giup-cc-sec{background:transparent;color:#fff;border:1px solid #8a8a92}' +
      '#giup-cc .giup-cc-sec:hover{border-color:#fff}' +
      '#giup-cc button:focus-visible{outline:2px solid #fff;outline-offset:2px}' +
      '#giup-cc .giup-cc-opts{flex:1 1 100%;display:none;border-top:1px solid rgba(255,255,255,.12);padding-top:14px;gap:10px;flex-direction:column}' +
      '#giup-cc.giup-cc-open .giup-cc-opts{display:flex}' +
      '#giup-cc label{display:flex;gap:12px;align-items:flex-start;cursor:pointer}' +
      '#giup-cc label strong{color:#fff;display:block}' +
      '#giup-cc input[type=checkbox]{width:20px;height:20px;margin:2px 0 0;accent-color:' + PINK + ';flex:0 0 auto}' +
      '#giup-cc .giup-cc-save{display:none}' +
      '#giup-cc.giup-cc-open .giup-cc-save{display:inline-block}' +
      '#giup-cc.giup-cc-open .giup-cc-choose{display:none}' +
      '@media (max-width:720px){#giup-cc .giup-cc-in{padding:16px 16px calc(16px + env(safe-area-inset-bottom))}' +
      '#giup-cc .giup-cc-btns{width:100%;flex-direction:column}#giup-cc button{width:100%}' +
      '#giup-cc .giup-cc-opts{order:2}#giup-cc .giup-cc-btns{order:3}}';
    document.head.appendChild(s);
  }

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }

  function open(showChoices) {
    if (!document.body) return;
    css();
    if (root) root.remove();
    var t = T[detectLang()];
    var cur = window.giupConsent || { analytics: false, marketing: false };

    root = el('div', { id: 'giup-cc', role: 'dialog', 'aria-live': 'polite', 'aria-label': t.title });
    var inner = el('div', { 'class': 'giup-cc-in' });

    var txt = el('div', { 'class': 'giup-cc-txt' });
    txt.appendChild(el('h2', {}, t.title));
    var p = el('p', {}, t.msg + ' ');
    var a = el('a', { href: '/cookie-policy' }, t.policy);
    p.appendChild(a);
    txt.appendChild(p);

    var opts = el('div', { 'class': 'giup-cc-opts' });
    function row(id, title, desc, checked, disabled) {
      var l = el('label', { 'for': id });
      var cb = el('input', { type: 'checkbox', id: id });
      cb.checked = !!checked;
      if (disabled) cb.disabled = true;
      var d = el('span');
      d.appendChild(el('strong', {}, title));
      d.appendChild(document.createTextNode(desc));
      l.appendChild(cb); l.appendChild(d);
      opts.appendChild(l);
      return cb;
    }
    row('giup-cc-ess', t.ess, t.essD, true, true);
    var cbA = row('giup-cc-ana', t.ana, t.anaD, cur.analytics);
    var cbM = row('giup-cc-mkt', t.mkt, t.mktD, cur.marketing);

    var btns = el('div', { 'class': 'giup-cc-btns' });
    var bReject = el('button', { type: 'button', 'class': 'giup-cc-sec' }, t.reject);
    var bChoose = el('button', { type: 'button', 'class': 'giup-cc-sec giup-cc-choose' }, t.choose);
    var bSave = el('button', { type: 'button', 'class': 'giup-cc-sec giup-cc-save' }, t.save);
    var bAccept = el('button', { type: 'button', 'class': 'giup-cc-acc' }, t.accept);
    bReject.onclick = function () { save({ analytics: false, marketing: false }); };
    bAccept.onclick = function () { save({ analytics: true, marketing: true }); };
    bChoose.onclick = function () { root.classList.add('giup-cc-open'); cbA.focus(); };
    bSave.onclick = function () { save({ analytics: cbA.checked, marketing: cbM.checked }); };
    btns.appendChild(bReject); btns.appendChild(bChoose); btns.appendChild(bSave); btns.appendChild(bAccept);

    inner.appendChild(txt); inner.appendChild(opts); inner.appendChild(btns);
    root.appendChild(inner);
    if (showChoices) root.classList.add('giup-cc-open');
    document.body.appendChild(root);
  }

  function close() { if (root) { root.remove(); root = null; } }

  window.giupCookieSettings = function () { open(true); };

  document.addEventListener('click', function (e) {
    var target = e.target && e.target.closest && e.target.closest('a[href="#cookie-settings"],[data-cookie-settings]');
    if (target) { e.preventDefault(); window.giupCookieSettings(); }
  });

  function init() { if (!window.giupConsent) open(false); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
