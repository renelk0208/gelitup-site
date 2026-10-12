// Wording of the ambassador review email in each ambassador's language
// (taken from the language she used on her application form).
// The shop's product page is in English, so its "Write a review" button is
// named in English in every version.

export const REVIEW_EMAIL_LANGUAGES = [
  ['en', 'English'], ['el', 'Greek'], ['ro', 'Romanian'], ['pl', 'Polish'],
  ['fr', 'French'], ['es', 'Spanish'], ['pt', 'Portuguese'],
]

const TEXT = {
  en: {
    subject: (n) => `${n}, how are you finding your GEL.IT.UP products? 💖`,
    hi: (n) => `Hi ${n},`,
    thanks: "Thank you for being part of the GEL.IT.UP Ambassador family! We hope you're enjoying the products from your PR package, and we'd love to hear what you think.",
    ask: 'Please leave an honest review of each product below — what you loved, how it worked for you, and any tips for other nail techs. Photos of your work are very welcome!',
    button: 'Review ★',
    howTitle: 'How it works:',
    how: (e) => `tap <strong>Review</strong>, then <strong>Write a review</strong> on the product page. Our review system (Judge.me) will ask for your email address and send you a secure link to finish your review — please use <strong>${e}</strong>.`,
    gifted: 'As these products were gifted to you as an ambassador, please mention <strong>"gifted product"</strong> in your review.',
    closing: 'It only takes a minute, and it really helps other nail professionals choose with confidence. Thank you! 💖',
    love: 'With love,',
  },
  el: {
    subject: (n) => `${n}, πώς σου φαίνονται τα προϊόντα GEL.IT.UP; 💖`,
    hi: (n) => `Γεια σου ${n},`,
    thanks: 'Σε ευχαριστούμε που είσαι μέλος της οικογένειας των Ambassadors της GEL.IT.UP! Ελπίζουμε να απολαμβάνεις τα προϊόντα από το PR πακέτο σου και θα θέλαμε πολύ να μάθουμε τη γνώμη σου.',
    ask: 'Άφησε μια ειλικρινή κριτική για κάθε προϊόν παρακάτω — τι σου άρεσε, πώς λειτούργησε για σένα και τυχόν συμβουλές για άλλες nail techs. Οι φωτογραφίες από τη δουλειά σου είναι πάντα ευπρόσδεκτες!',
    button: 'Κριτική ★',
    howTitle: 'Πώς λειτουργεί:',
    how: (e) => `πάτησε <strong>Κριτική</strong> και μετά <strong>Write a review</strong> στη σελίδα του προϊόντος. Το σύστημα κριτικών μας (Judge.me) θα σου ζητήσει το email σου και θα σου στείλει έναν ασφαλή σύνδεσμο για να ολοκληρώσεις την κριτική — χρησιμοποίησε το <strong>${e}</strong>.`,
    gifted: 'Επειδή τα προϊόντα αυτά σου δόθηκαν δώρο ως Ambassador, ανέφερε στην κριτική σου ότι πρόκειται για <strong>«δώρο» (gifted product)</strong>.',
    closing: 'Χρειάζεται μόνο ένα λεπτό και βοηθά πραγματικά άλλες επαγγελματίες να επιλέξουν με σιγουριά. Σε ευχαριστούμε! 💖',
    love: 'Με αγάπη,',
  },
  ro: {
    subject: (n) => `${n}, cum ți se par produsele GEL.IT.UP? 💖`,
    hi: (n) => `Bună, ${n},`,
    thanks: 'Îți mulțumim că faci parte din familia de Ambasadori GEL.IT.UP! Sperăm că te bucuri de produsele din pachetul tău PR și ne-ar plăcea mult să aflăm părerea ta.',
    ask: 'Te rugăm să lași o recenzie sinceră pentru fiecare produs de mai jos — ce ți-a plăcut, cum a funcționat pentru tine și orice sfaturi pentru alte nail tehniciene. Fotografiile cu lucrările tale sunt binevenite!',
    button: 'Recenzie ★',
    howTitle: 'Cum funcționează:',
    how: (e) => `apasă <strong>Recenzie</strong>, apoi <strong>Write a review</strong> pe pagina produsului. Sistemul nostru de recenzii (Judge.me) îți va cere adresa de email și îți va trimite un link securizat pentru a finaliza recenzia — te rugăm să folosești <strong>${e}</strong>.`,
    gifted: 'Deoarece aceste produse ți-au fost oferite cadou ca ambasador, te rugăm să menționezi în recenzie că este un <strong>„produs primit cadou” (gifted product)</strong>.',
    closing: 'Durează doar un minut și îi ajută cu adevărat pe alți profesioniști să aleagă cu încredere. Mulțumim! 💖',
    love: 'Cu drag,',
  },
  pl: {
    subject: (n) => `${n}, jak sprawdzają się produkty GEL.IT.UP? 💖`,
    hi: (n) => `Cześć ${n},`,
    thanks: 'Dziękujemy, że jesteś częścią rodziny Ambasadorek GEL.IT.UP! Mamy nadzieję, że produkty z Twojej paczki PR przypadły Ci do gustu – bardzo chcemy poznać Twoją opinię.',
    ask: 'Zostaw szczerą opinię o każdym produkcie poniżej – co Ci się spodobało, jak się sprawdził i jakie masz wskazówki dla innych stylistek paznokci. Zdjęcia Twoich prac są bardzo mile widziane!',
    button: 'Opinia ★',
    howTitle: 'Jak to działa:',
    how: (e) => `kliknij <strong>Opinia</strong>, a potem <strong>Write a review</strong> na stronie produktu. Nasz system opinii (Judge.me) poprosi o Twój adres e-mail i wyśle Ci bezpieczny link do dokończenia opinii – użyj adresu <strong>${e}</strong>.`,
    gifted: 'Ponieważ otrzymałaś te produkty w prezencie jako Ambasadorka, wspomnij w opinii, że to <strong>„produkt otrzymany w prezencie” (gifted product)</strong>.',
    closing: 'To zajmie tylko chwilę, a naprawdę pomaga innym profesjonalistkom w wyborze. Dziękujemy! 💖',
    love: 'Serdecznie,',
  },
  fr: {
    subject: (n) => `${n}, comment trouves-tu tes produits GEL.IT.UP ? 💖`,
    hi: (n) => `Bonjour ${n},`,
    thanks: "Merci de faire partie de la famille des Ambassadrices GEL.IT.UP ! Nous espérons que tu apprécies les produits de ton colis PR, et nous aimerions beaucoup avoir ton avis.",
    ask: "Laisse un avis sincère sur chaque produit ci-dessous : ce que tu as aimé, comment il a fonctionné pour toi et tes conseils pour les autres prothésistes ongulaires. Les photos de tes réalisations sont les bienvenues !",
    button: 'Avis ★',
    howTitle: 'Comment ça marche :',
    how: (e) => `appuie sur <strong>Avis</strong>, puis sur <strong>Write a review</strong> sur la page du produit. Notre système d'avis (Judge.me) te demandera ton adresse e-mail et t'enverra un lien sécurisé pour terminer ton avis — utilise bien <strong>${e}</strong>.`,
    gifted: "Ces produits t'ayant été offerts en tant qu'ambassadrice, merci de préciser dans ton avis qu'il s'agit d'un <strong>« produit offert » (gifted product)</strong>.",
    closing: "Cela ne prend qu'une minute et aide vraiment les autres professionnelles à choisir en toute confiance. Merci ! 💖",
    love: 'Avec amour,',
  },
  es: {
    subject: (n) => `${n}, ¿qué te parecen tus productos GEL.IT.UP? 💖`,
    hi: (n) => `Hola ${n},`,
    thanks: '¡Gracias por formar parte de la familia de Embajadoras de GEL.IT.UP! Esperamos que estés disfrutando de los productos de tu paquete PR y nos encantaría saber tu opinión.',
    ask: 'Deja una reseña sincera de cada producto: qué te encantó, cómo te funcionó y cualquier consejo para otras técnicas de uñas. ¡Las fotos de tus trabajos son muy bienvenidas!',
    button: 'Reseña ★',
    howTitle: 'Cómo funciona:',
    how: (e) => `pulsa <strong>Reseña</strong> y luego <strong>Write a review</strong> en la página del producto. Nuestro sistema de reseñas (Judge.me) te pedirá tu correo electrónico y te enviará un enlace seguro para terminar tu reseña; usa <strong>${e}</strong>.`,
    gifted: 'Como estos productos te fueron regalados como embajadora, menciona en tu reseña que se trata de un <strong>«producto regalado» (gifted product)</strong>.',
    closing: 'Solo te llevará un minuto y ayuda muchísimo a otras profesionales a elegir con confianza. ¡Gracias! 💖',
    love: 'Con cariño,',
  },
  pt: {
    subject: (n) => `${n}, o que estás a achar dos produtos GEL.IT.UP? 💖`,
    hi: (n) => `Olá ${n},`,
    thanks: 'Obrigada por fazeres parte da família de Embaixadoras GEL.IT.UP! Esperamos que estejas a gostar dos produtos do teu pacote PR e adorávamos saber a tua opinião.',
    ask: 'Deixa uma avaliação sincera de cada produto abaixo — o que adoraste, como funcionou para ti e dicas para outras técnicas de unhas. Fotos dos teus trabalhos são muito bem-vindas!',
    button: 'Avaliar ★',
    howTitle: 'Como funciona:',
    how: (e) => `toca em <strong>Avaliar</strong> e depois em <strong>Write a review</strong> na página do produto. O nosso sistema de avaliações (Judge.me) vai pedir o teu e-mail e enviar-te um link seguro para terminares a avaliação — usa <strong>${e}</strong>.`,
    gifted: 'Como estes produtos te foram oferecidos enquanto embaixadora, menciona na tua avaliação que se trata de um <strong>«produto oferecido» (gifted product)</strong>.',
    closing: 'Demora só um minuto e ajuda mesmo outras profissionais a escolher com confiança. Obrigada! 💖',
    love: 'Com carinho,',
  },
}

export function reviewEmailLang(lang) {
  const code = String(lang || '').trim().toLowerCase().slice(0, 2)
  return TEXT[code] ? code : 'en'
}

export function reviewEmailText(lang) {
  return TEXT[reviewEmailLang(lang)]
}
