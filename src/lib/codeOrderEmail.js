// "Congratulations — people are using your code!" email to an ambassador, in her
// language, listing the new orders placed with her code and the credit she earned.
// Sent by netlify/functions/send-ambassador-code-order-congrats.js.

const esc = (v) => String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const eur = (n) => `€${Number(n || 0).toFixed(2)}`

const TEXT = {
  en: {
    subject: (n) => `🎉 Congratulations ${n} — people are using your code!`,
    headline: 'Big congratulations!',
    hi: (n) => `Hi ${n},`,
    intro: (k) => k === 1
      ? 'Your posts are being noticed — a client has just placed an order with your code!'
      : `Your posts are being noticed — clients have just placed ${k} orders with your code!`,
    order: 'Order', credit: 'credit',
    earnedNow: (a) => `You earned <strong>${a}</strong> in credit.`,
    balance: (a) => `Credit available in your account: <strong>${a}</strong> — it is deducted automatically from your next order at checkout.`,
    tiers: 'Your commission is 10% of each order, rising to 15% once orders with your code reach €1,000, and 20% at €2,000.',
    button: 'See your orders',
    keep: 'Keep sharing your code and your work — your followers love it! 💖',
    love: 'With love,',
  },
  el: {
    subject: (n) => `🎉 Συγχαρητήρια ${n} — χρησιμοποιούν τον κωδικό σου!`,
    headline: 'Θερμά συγχαρητήρια!',
    hi: (n) => `Γεια σου ${n},`,
    intro: (k) => k === 1
      ? 'Οι αναρτήσεις σου γίνονται αντιληπτές — μια πελάτισσα μόλις έκανε παραγγελία με τον κωδικό σου!'
      : `Οι αναρτήσεις σου γίνονται αντιληπτές — πελάτες μόλις έκαναν ${k} παραγγελίες με τον κωδικό σου!`,
    order: 'Παραγγελία', credit: 'πίστωση',
    earnedNow: (a) => `Κέρδισες <strong>${a}</strong> σε πίστωση.`,
    balance: (a) => `Διαθέσιμη πίστωση στον λογαριασμό σου: <strong>${a}</strong> — αφαιρείται αυτόματα από την επόμενη παραγγελία σου στο ταμείο.`,
    tiers: 'Η προμήθειά σου είναι 10% κάθε παραγγελίας, ανεβαίνει στο 15% όταν οι παραγγελίες με τον κωδικό σου φτάσουν τα €1.000 και στο 20% στα €2.000.',
    button: 'Δες τις παραγγελίες σου',
    keep: 'Συνέχισε να μοιράζεσαι τον κωδικό και τη δουλειά σου — οι followers σου τα λατρεύουν! 💖',
    love: 'Με αγάπη,',
  },
  ro: {
    subject: (n) => `🎉 Felicitări ${n} — oamenii îți folosesc codul!`,
    headline: 'Felicitări din toată inima!',
    hi: (n) => `Bună, ${n},`,
    intro: (k) => k === 1
      ? 'Postările tale sunt observate — o clientă tocmai a plasat o comandă cu codul tău!'
      : `Postările tale sunt observate — clientele tocmai au plasat ${k} comenzi cu codul tău!`,
    order: 'Comandă', credit: 'credit',
    earnedNow: (a) => `Ai câștigat <strong>${a}</strong> credit.`,
    balance: (a) => `Credit disponibil în contul tău: <strong>${a}</strong> — se scade automat din următoarea ta comandă.`,
    tiers: 'Comisionul tău este 10% din fiecare comandă, crește la 15% când comenzile cu codul tău ajung la €1.000 și la 20% la €2.000.',
    button: 'Vezi comenzile tale',
    keep: 'Continuă să îți împarți codul și lucrările — urmăritorii tăi le adoră! 💖',
    love: 'Cu drag,',
  },
  pl: {
    subject: (n) => `🎉 Gratulacje ${n} — ludzie używają Twojego kodu!`,
    headline: 'Ogromne gratulacje!',
    hi: (n) => `Cześć ${n},`,
    intro: (k) => k === 1
      ? 'Twoje posty są zauważane — klientka właśnie złożyła zamówienie z Twoim kodem!'
      : `Twoje posty są zauważane — klientki właśnie złożyły ${k} zamówienia z Twoim kodem!`,
    order: 'Zamówienie', credit: 'kredytu',
    earnedNow: (a) => `Zarobiłaś <strong>${a}</strong> kredytu.`,
    balance: (a) => `Dostępny kredyt na Twoim koncie: <strong>${a}</strong> — zostanie automatycznie odjęty od Twojego następnego zamówienia.`,
    tiers: 'Twoja prowizja to 10% każdego zamówienia, rośnie do 15%, gdy zamówienia z Twoim kodem osiągną €1000, i do 20% przy €2000.',
    button: 'Zobacz swoje zamówienia',
    keep: 'Dziel się dalej swoim kodem i pracami — Twoje obserwatorki to uwielbiają! 💖',
    love: 'Serdecznie,',
  },
  fr: {
    subject: (n) => `🎉 Félicitations ${n} — on utilise votre code !`,
    headline: 'Toutes nos félicitations !',
    hi: (n) => `Bonjour ${n},`,
    intro: (k) => k === 1
      ? 'Vos publications sont remarquées — une cliente vient de passer commande avec votre code !'
      : `Vos publications sont remarquées — des clientes viennent de passer ${k} commandes avec votre code !`,
    order: 'Commande', credit: 'de crédit',
    earnedNow: (a) => `Vous avez gagné <strong>${a}</strong> de crédit.`,
    balance: (a) => `Crédit disponible sur votre compte : <strong>${a}</strong> — il est déduit automatiquement de votre prochaine commande.`,
    tiers: 'Votre commission est de 10 % de chaque commande, puis 15 % lorsque les commandes avec votre code atteignent 1 000 €, et 20 % à 2 000 €.',
    button: 'Voir vos commandes',
    keep: 'Continuez à partager votre code et votre travail — vos abonnées adorent ! 💖',
    love: 'Avec amour,',
  },
  es: {
    subject: (n) => `🎉 ¡Enhorabuena ${n}, están usando tu código!`,
    headline: '¡Muchísimas felicidades!',
    hi: (n) => `Hola ${n}:`,
    intro: (k) => k === 1
      ? 'Tus publicaciones se están notando: ¡una clienta acaba de hacer un pedido con tu código!'
      : `Tus publicaciones se están notando: ¡clientas acaban de hacer ${k} pedidos con tu código!`,
    order: 'Pedido', credit: 'de crédito',
    earnedNow: (a) => `Has ganado <strong>${a}</strong> de crédito.`,
    balance: (a) => `Crédito disponible en tu cuenta: <strong>${a}</strong>; se descuenta automáticamente de tu próximo pedido.`,
    tiers: 'Tu comisión es del 10 % de cada pedido, sube al 15 % cuando los pedidos con tu código llegan a 1.000 € y al 20 % a los 2.000 €.',
    button: 'Ver tus pedidos',
    keep: '¡Sigue compartiendo tu código y tu trabajo, a tus seguidoras les encanta! 💖',
    love: 'Con cariño,',
  },
  pt: {
    subject: (n) => `🎉 Parabéns ${n} — estão a usar o teu código!`,
    headline: 'Muitos parabéns!',
    hi: (n) => `Olá ${n},`,
    intro: (k) => k === 1
      ? 'As tuas publicações estão a ser notadas — uma cliente acabou de fazer uma encomenda com o teu código!'
      : `As tuas publicações estão a ser notadas — clientes acabaram de fazer ${k} encomendas com o teu código!`,
    order: 'Encomenda', credit: 'de crédito',
    earnedNow: (a) => `Ganhaste <strong>${a}</strong> de crédito.`,
    balance: (a) => `Crédito disponível na tua conta: <strong>${a}</strong> — é descontado automaticamente na tua próxima encomenda.`,
    tiers: 'A tua comissão é de 10% de cada encomenda, sobe para 15% quando as encomendas com o teu código chegam a €1.000 e para 20% aos €2.000.',
    button: 'Ver as tuas encomendas',
    keep: 'Continua a partilhar o teu código e o teu trabalho — as tuas seguidoras adoram! 💖',
    love: 'Com carinho,',
  },
}

export function codeOrderEmailLang(lang) {
  const code = String(lang || '').trim().toLowerCase().slice(0, 2)
  return TEXT[code] ? code : 'en'
}

// orders: [{ ordered_at, order_total_eur, commission_amount_eur }]
export function buildCodeOrderCongratsEmail({ fullName, email, language, code, orders, availableEur }) {
  const t = TEXT[codeOrderEmailLang(language)]
  const first = String(fullName || '').trim().split(/\s+/)[0] || ''
  const name = first ? first.charAt(0).toUpperCase() + first.slice(1) : ''
  const earned = (orders || []).reduce((s, o) => s + Number(o.commission_amount_eur || 0), 0)
  const rows = (orders || []).map((o) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f0e4ec;color:#1a1a1a">${esc(t.order)} · ${esc(new Date(o.ordered_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }))}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f0e4ec;text-align:right;color:#1a1a1a">${eur(o.order_total_eur)}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f0e4ec;text-align:right;color:#d43790;font-weight:700">+${eur(o.commission_amount_eur)} ${esc(t.credit)}</td>
      </tr>`).join('')
  const portal = `https://gelitup.com/portal/login?email=${encodeURIComponent(email || '')}`
  return {
    subject: t.subject(name),
    html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#4a4a4a;line-height:1.6;max-width:600px">
      <div style="background:#1a1a1a;border-radius:14px;padding:26px 22px;text-align:center;margin-bottom:18px">
        <div style="font-size:40px;line-height:1">🎉</div>
        <div style="color:#ffffff;font-size:24px;font-weight:800;margin-top:8px">${esc(t.headline)}</div>
        <div style="color:#e879c4;font-size:15px;font-weight:700;margin-top:6px;letter-spacing:1px">${esc(code)}</div>
      </div>
      <p style="color:#1a1a1a">${t.hi(esc(name))}</p>
      <p style="font-size:16px;color:#1a1a1a"><strong>${t.intro((orders || []).length)}</strong></p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:14px 0;font-size:14px">${rows}</table>
      <p>${t.earnedNow(eur(earned))}<br/>${t.balance(eur(availableEur))}</p>
      <p style="text-align:center;margin:22px 0"><a href="${esc(portal)}" style="display:inline-block;background:#d43790;color:#ffffff;padding:12px 22px;border-radius:9999px;text-decoration:none;font-weight:700">${esc(t.button)}</a></p>
      <p style="font-size:12px;color:#777">${t.tiers}</p>
      <p>${t.keep}</p>
      <p>${t.love}<br/>René Krallis<br/>Marketing Director, GEL.IT.UP International</p>
    </div>`,
  }
}
