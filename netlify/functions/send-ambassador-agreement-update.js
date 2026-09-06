import { createClient } from '@supabase/supabase-js'

export const config = {
  // Scheduled for 07:00 UTC (10:00 AM Athens / Greek time) on 7 September 2026
  schedule: '0 7 7 9 *',
}

const AMBASSADOR_TABLE = process.env.AMBASSADOR_TABLE || 'ambassador_applications'
const EMAIL_WEBHOOK_URL = process.env.VITE_EMAIL_WEBHOOK_URL || process.env.EMAIL_WEBHOOK_URL || ''
const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || ''
const SEND_DATE_UTC = '2026-09-07'
const MESSAGE_MARKER = '[AMBASSADOR_AGREEMENT_V8_UPDATE_SENT]'

const LOGO_BLACK_URL = 'https://www.gelitup.com/gelitup-content/ambassador-logo-black.png'
const LOGO_WHITE_URL = 'https://www.gelitup.com/gelitup-content/ambassador-logo-white.png'

const COUNTRY_TO_LANG = {
  romania: 'ro', românia: 'ro', roumanie: 'ro', rumänien: 'ro', rumanien: 'ro', rumania: 'ro', ro: 'ro',
  france: 'fr', frankreich: 'fr', francia: 'fr', frankrijk: 'fr', fr: 'fr',
  germany: 'de', deutschland: 'de', allemagne: 'de', alemania: 'de', germania: 'de', de: 'de',
  austria: 'de', österreich: 'de', osterreich: 'de', autriche: 'de', at: 'de',
  spain: 'es', españa: 'es', espana: 'es', espagne: 'es', spanien: 'es', spagna: 'es', es: 'es',
  portugal: 'pt', brazil: 'pt', brasil: 'pt', portogallo: 'pt', pt: 'pt', br: 'pt',
  poland: 'pl', polska: 'pl', pologne: 'pl', polen: 'pl', polonia: 'pl', pl: 'pl',
  hungary: 'hu', magyarország: 'hu', magyarorszag: 'hu', hongrie: 'hu', ungarn: 'hu', ungheria: 'hu', hu: 'hu',
  greece: 'el', ελλάδα: 'el', ellada: 'el', hellas: 'el', grèce: 'el', grece: 'el', griechenland: 'el', grecia: 'el', gr: 'el', el: 'el',
  bulgaria: 'bg', българия: 'bg', bulgarie: 'bg', bulgarien: 'bg', bg: 'bg',
  albania: 'sq', shqipëri: 'sq', shqiperi: 'sq', albanie: 'sq', al: 'sq', sq: 'sq',
  italy: 'it', italia: 'it', it: 'it',
}

const TEMPLATES = {
  en: {
    subject: 'Important update: Ambassador Agreement & Official Brand Logos (v8-2026-09)',
    greeting: (name) => `Hi ${name},`,
    p1: `We hope you're doing well and creating gorgeous sets!`,
    p2: `As our international community of nail artists continues to grow across multiple countries, we have updated the GEL.IT.UP Ambassador Agreement (Version v8-2026-09) with key clarifications regarding official logo usage, monthly commitments, and international reposts.`,
    p3: `Here is a summary of the key updates:`,
    bullet1Title: '1. Official Brand Logos Provided (Black & White):',
    bullet1Body: `Do not create your own GEL.IT.UP logos — this is strictly against brand policy. We have attached the official GEL.IT.UP Ambassador logos in black and white (PNG format with transparent background). No colour changes, distortions, or alterations are permitted, and they may only be used on media created with GEL.IT.UP products. Anything uploaded with our logo becomes property of GEL.IT.UP by GIUP®, as the brand name and logo are registered trademarks.`,
    bullet2Title: '2. Monthly Content Commitments:',
    bullet2Body: `To match the quality of the PR kits provided, ambassadors share at least 10 pieces of original content each month using GEL.IT.UP products, including a minimum of 4 videos/reels across Instagram and TikTok. Please tag #gelitup and @gelitupinternational on Instagram or @gelitupofficial on TikTok, and send creations to our WhatsApp/Viber (+30 694 071 5234).`,
    bullet3Title: '3. International Reposts & Discount Code:',
    bullet3Body: `When GEL.IT.UP teams in other countries upload or share your media, they are entitled to do so provided they credit and tag your handle. Please note that your personal 20% discount code applies exclusively on www.gelitup.com and does not apply in other countries.`,
    logoDownloadsTitle: 'Download Official Logos:',
    downloadBlack: 'Download Black Logo (PNG)',
    downloadWhite: 'Download White Logo (PNG)',
    agreementLinkText: 'The full updated agreement is available to view anytime at:',
    actionText: `You don't need to do anything. If you have any questions, just reply to this email or message us on WhatsApp/Viber at +30 694 071 5234.`,
    thanks: 'Thank you for being such an essential part of the GEL.IT.UP family!',
    signoff: 'The GEL.IT.UP Team',
  },
  ro: {
    subject: 'Actualizare importantă: Acordul de Ambasador și Siglele Oficiale (v8-2026-09)',
    greeting: (name) => `Bună ${name},`,
    p1: `Sperăm că ești bine și că realizezi creații minunate!`,
    p2: `Pe măsură ce comunitatea noastră internațională continuă să se extindă în mai multe țări, am actualizat Acordul de Ambasador GEL.IT.UP (Versiunea v8-2026-09) cu precizări esențiale privind utilizarea siglelor oficiale, angajamentele lunare și repostările internaționale.`,
    p3: `Iată principalele actualizări:`,
    bullet1Title: '1. Sigle Oficiale puse la dispoziție (Alb și Negru):',
    bullet1Body: `Nu crea propriile sigle GEL.IT.UP — acest lucru este strict interzis. Am atașat siglele oficiale GEL.IT.UP în alb și negru (format PNG cu fundal transparent). Nu sunt permise modificări, schimbări de culoare sau deformări, iar sigla poate fi folosită doar pe materiale create cu produse GEL.IT.UP. Orice material încărcat cu sigla noastră devine proprietatea GEL.IT.UP by GIUP®, numele și sigla fiind mărci înregistrate.`,
    bullet2Title: '2. Angajamentul lunar de conținut:',
    bullet2Body: `Având în vedere calitatea pachetelor PR primite, ambasadorii publică cel puțin 10 postări originale pe lună cu produse GEL.IT.UP, inclusiv minimum 4 videoclipuri/reels pe Instagram și TikTok. Te rugăm să etichetezi #gelitup și @gelitupinternational pe Instagram sau @gelitupofficial pe TikTok și să trimiți creațiile pe WhatsApp/Viber (+30 694 071 5234).`,
    bullet3Title: '3. Repostări internaționale și codul de reducere:',
    bullet3Body: `Echipele GEL.IT.UP din alte țări au dreptul să distribuie fotografiile și videoclipurile tale cu condiția să te eticheteze. Reține că în acest caz, codul tău personal de 20% reducere este valabil exclusiv pe www.gelitup.com și nu se aplică în alte țări.`,
    logoDownloadsTitle: 'Descarcă siglele oficiale:',
    downloadBlack: 'Descarcă Sigla Neagră (PNG)',
    downloadWhite: 'Descarcă Sigla Albă (PNG)',
    agreementLinkText: 'Acordul complet actualizat poate fi consultat oricând la:',
    actionText: `Nu este nevoie de nicio acțiune din partea ta. Dacă ai întrebări sau dorești lămuriri, răspunde la acest email sau scrie-ne pe WhatsApp/Viber la +30 694 071 5234.`,
    thanks: 'Îți mulțumim din suflet pentru că faci parte din familia GEL.IT.UP!',
    signoff: 'Echipa GEL.IT.UP',
  },
  sq: {
    subject: 'Përditësim i rëndësishëm: Marrëveshja e Ambasadorit & Logot Zyrtare (v8-2026-09)',
    greeting: (name) => `Përshëndetje ${name},`,
    p1: `Shpresojmë të jeni mirë dhe të vazhdoni të krijoni punime të mrekullueshme!`,
    p2: `Ndërsa komuniteti ynë ndërkombëtar rritet në shumë shtete, kemi përditësuar Marrëveshjen e Ambasadorit GEL.IT.UP (Versioni v8-2026-09) me sqarime kryesore mbi përdorimin e logove zyrtare, postimet mujore dhe ripostimet ndërkombëtare.`,
    p3: `Ja përmbledhja e ndryshimeve kryesore:`,
    bullet1Title: '1. Logot Zyrtare të Siguruara (Bardh e Zi):',
    bullet1Body: `Mos krijoni logot tuaja GEL.IT.UP — kjo është rreptësisht e ndaluar. Kemi bashkëngjitur logot zyrtare bardh e zi (format PNG me sfond transparent). Nuk lejohet asnjë ndryshim ngjyre apo modifikim, dhe ato lejohen vetëm në materiale me produkte GEL.IT.UP. Çdo material i ngarkuar me logon tonë bëhet pronë e GEL.IT.UP by GIUP®, pasi emri dhe logoja janë marka të regjistruara.`,
    bullet2Title: '2. Angazhimi mujor i përmbajtjes:',
    bullet2Body: `Për të pasqyruar cilësinë e paketave PR që merrni, ambasadorët ndajnë të paktën 10 postime origjinale çdo muaj me produktet GEL.IT.UP, duke përfshirë të paktën 4 video/reels në Instagram dhe TikTok. Gjithmonë shënoni #gelitup dhe @gelitupinternational (IG) / @gelitupofficial (TikTok) dhe dërgoni krijimet në WhatsApp/Viber (+30 694 071 5234).`,
    bullet3Title: '3. Ripostimet ndërkombëtare dhe kodi i zbritjes:',
    bullet3Body: `Kur ekipet e GEL.IT.UP në shtete të tjera shpërndajnë materialet tuaja, ata duhet t'ju etiketojnë (tag). Kodi juaj personal 20% është i vlefshëm ekskluzivisht në www.gelitup.com dhe nuk zbatohet në shtete të tjera.`,
    logoDownloadsTitle: 'Shkarkoni logot zyrtare:',
    downloadBlack: 'Shkarko Logon e Zezë (PNG)',
    downloadWhite: 'Shkarko Logon e Bardhë (PNG)',
    agreementLinkText: 'Marrëveshjen e plotë mund ta shikoni në çdo kohë te:',
    actionText: `Nuk keni nevojë të bëni asnjë veprim. Nëse keni pyetje, thjesht përgjigjuni këtij emaili ose na shkruani në WhatsApp/Viber në +30 694 071 5234.`,
    thanks: 'Ju falënderojmë përzemërsisht që jeni pjesë e familjes GEL.IT.UP!',
    signoff: 'Ekipi i GEL.IT.UP',
  },
  el: {
    subject: 'Σημαντική ενημέρωση: Σύμβαση Πρεσβευτή & Επίσημα Λογότυπα (v8-2026-09)',
    greeting: (name) => `Γεια σου ${name},`,
    p1: `Ελπίζουμε να είσαι καλά και να δημιουργείς υπέροχα σετ νυχιών!`,
    p2: `Καθώς η διεθνής μας κοινότητα μεγαλώνει σε πολλές χώρες, ανανεώσαμε τη Σύμβαση Πρεσβευτή GEL.IT.UP (Έκδοση v8-2026-09) με βασικές διευκρινίσεις σχετικά με τη χρήση των επίσημων λογοτύπων, τις μηνιαίες αναρτήσεις και τις διεθνείς αναδημοσιεύσεις.`,
    p3: `Ακολουθεί σύνοψη των βασικών αλλαγών:`,
    bullet1Title: '1. Επίσημα Λογότυπα (Μαύρο & Λευκό):',
    bullet1Body: `Μη δημιουργείς δικά σου λογότυπα GEL.IT.UP — αυτό απαγορεύεται ρητά. Επισυνάπτουμε τα επίσημα λογότυπα GEL.IT.UP σε μαύρο και λευκό χρώμα (μορφή PNG με διαφανές φόντο). Δεν επιτρέπεται καμία αλλαγή χρώματος ή παραμόρφωση και επιτρέπεται η χρήση τους αποκλειστικά σε περιεχόμενο με προϊόντα GEL.IT.UP. Οτιδήποτε αναρτάται με το λογότυπό μας αποτελεί ιδιοκτησία της GEL.IT.UP by GIUP®, καθώς είναι κατοχυρωμένο εμπορικό σήμα.`,
    bullet2Title: '2. Μηνιαία Δέσμευση Περιεχομένου:',
    bullet2Body: `Αντάξια των πακέτων PR που λαμβάνεις, οι ambassadors δημοσιεύουν τουλάχιστον 10 πρωτότυπες αναρτήσεις το μήνα με προϊόντα GEL.IT.UP, συμπεριλαμβανομένων τουλάχιστον 4 βίντεο/reels σε Instagram και TikTok. Βάζε πάντα #gelitup και αναφορά @gelitupinternational στο Instagram ή @gelitupofficial στο TikTok, και στέλνε τα στο WhatsApp/Viber (+30 694 071 5234).`,
    bullet3Title: '3. Διεθνείς Αναδημοσιεύσεις & Κωδικός Έκπτωσης:',
    bullet3Body: `Οι ομάδες της GEL.IT.UP σε άλλες χώρες δικαιούνται να αναδημοσιεύουν τις φωτογραφίες και τα βίντεό σου εφόσον αναφέρουν (tag) το προφίλ σου. Ο προσωπικός σου κωδικός έκπτωσης 20% ισχύει αποκλειστικά για αγορές στο www.gelitup.com και δεν εφαρμόζεται σε άλλες χώρες.`,
    logoDownloadsTitle: 'Κατέβασε τα επίσημα λογότυπα:',
    downloadBlack: 'Κατέβασε το Μαύρο Λογότυπο (PNG)',
    downloadWhite: 'Κατέβασε το Λευκό Λογότυπο (PNG)',
    agreementLinkText: 'Μπορείς να διαβάσεις την πλήρη ανανεωμένη σύμβαση εδώ:',
    actionText: `Δεν χρειάζεται να κάνεις καμία ενέργεια. Εάν έχεις οποιαδήποτε απορία, απλά απάντησε σε αυτό το email ή στείλε μας μήνυμα στο WhatsApp/Viber στο +30 694 071 5234.`,
    thanks: 'Σε ευχαριστούμε θερμά για την εξαιρετική συνεργασία!',
    signoff: 'Η ομάδα της GEL.IT.UP',
  },
  fr: {
    subject: 'Mise à jour importante : Contrat d’Ambassadeur & Logos Officiels (v8-2026-09)',
    greeting: (name) => `Bonjour ${name},`,
    p1: `Nous espérons que vous allez bien et que vous réalisez de superbes poses !`,
    p2: `À mesure que notre communauté internationale d’artistes ongulaires s’agrandit, nous avons mis à jour le Contrat d’Ambassadeur GEL.IT.UP (Version v8-2026-09) avec des précisions essentielles concernant l'utilisation des logos officiels, les publications mensuelles et les repartages internationaux.`,
    p3: `Voici un résumé des points clés :`,
    bullet1Title: '1. Logos officiels fournis (Noir et Blanc) :',
    bullet1Body: `Ne créez pas vos propres logos GEL.IT.UP — cela est strictement interdit. Nous vous fournissons en pièce jointe les logos officiels en noir et blanc (format PNG avec fond transparent). Aucune modification de couleur ou altération n’est permise, et ils doivent être utilisés uniquement sur des médias créés avec les produits GEL.IT.UP. Tout contenu avec notre logo devient propriété de GEL.IT.UP by GIUP®, le nom et le logo étant des marques déposées.`,
    bullet2Title: '2. Engagement mensuel de contenu :',
    bullet2Body: `Compte tenu de la qualité des colis PR fournis, les ambassadeurs publient au moins 10 contenus originaux par mois avec les produits GEL.IT.UP, dont au moins 4 vidéos/reels sur Instagram et TikTok. N'oubliez pas d'identifier #gelitup et @gelitupinternational (IG) / @gelitupofficial (TikTok) et d'envoyer vos créations sur WhatsApp/Viber (+30 694 071 5234).`,
    bullet3Title: '3. Repartages internationaux & Code promo :',
    bullet3Body: `Les équipes GEL.IT.UP d'autres pays sont autorisées à repartager vos médias à condition de vous identifier. Votre code promo de 20% s'applique exclusivement aux achats sur www.gelitup.com et n'est pas applicable dans d'autres pays.`,
    logoDownloadsTitle: 'Télécharger les logos officiels :',
    downloadBlack: 'Télécharger le Logo Noir (PNG)',
    downloadWhite: 'Télécharger le Logo Blanc (PNG)',
    agreementLinkText: 'Le contrat complet mis à jour est consultable sur :',
    actionText: `Aucune démarche n'est requise. Si vous avez la moindre question, répondez simplement à cet e-mail ou écrivez-nous sur WhatsApp/Viber au +30 694 071 5234.`,
    thanks: 'Merci pour votre précieuse collaboration !',
    signoff: `L'équipe GEL.IT.UP`,
  },
  de: {
    subject: 'Wichtiges Update: Ambassador-Vereinbarung & Offizielle Logos (v8-2026-09)',
    greeting: (name) => `Hallo ${name},`,
    p1: `wir hoffen, es geht dir gut und du kreierst wunderschöne Nagelsets!`,
    p2: `Da unsere internationale Community stetig wächst, haben wir die GEL.IT.UP Ambassador-Vereinbarung (Version v8-2026-09) mit wichtigen Klarstellungen zur offiziellen Logonutzung, zu den monatlichen Mindestposts und zu internationalen Reposts aktualisiert.`,
    p3: `Hier ist eine Übersicht der wichtigsten Änderungen:`,
    bullet1Title: '1. Bereitgestellte offizielle Logos (Schwarz & Weiß):',
    bullet1Body: `Erstelle keine eigenen GEL.IT.UP-Logos — dies ist strengstens untersagt. Im Anhang findest du die offiziellen Logos in Schwarz und Weiß (PNG-Format mit transparentem Hintergrund). Farbänderungen oder Verzerrungen sind nicht gestattet; die Logos dürfen nur auf Medien mit GEL.IT.UP-Produkten verwendet werden. Alle Inhalte mit unserem Logo werden Eigentum von GEL.IT.UP by GIUP®, da der Name und das Logo eingetragene Warenzeichen sind.`,
    bullet2Title: '2. Monatliche Content-Verpflichtungen:',
    bullet2Body: `Passend zur Qualität der PR-Kits teilen Ambassadors jeden Monat mindestens 10 eigene Inhalte mit GEL.IT.UP-Produkten, darunter mindestens 4 Videos/Reels auf Instagram und TikTok. Markiere stets #gelitup und @gelitupinternational auf Instagram oder @gelitupofficial auf TikTok und sende deine Kreationen an unser WhatsApp/Viber (+30 694 071 5234).`,
    bullet3Title: '3. Internationale Reposts & Rabattcode:',
    bullet3Body: `GEL.IT.UP-Teams in anderen Ländern dürfen deine Medien teilen, sofern sie dein Profil markieren. Bitte beachte, dass dein persönlicher 20%-Rabattcode ausschließlich für www.gelitup.com gilt und nicht in anderen Ländern eingelöst werden kann.`,
    logoDownloadsTitle: 'Offizielle Logos herunterladen:',
    downloadBlack: 'Schwarzes Logo herunterladen (PNG)',
    downloadWhite: 'Weißes Logo herunterladen (PNG)',
    agreementLinkText: 'Die vollständige Vereinbarung kannst du jederzeit hier einsehen:',
    actionText: `Du musst nichts weiter tun. Bei Fragen antworte einfach auf diese E-Mail oder schreibe uns per WhatsApp/Viber unter +30 694 071 5234.`,
    thanks: 'Vielen Dank, dass du Teil der GEL.IT.UP-Familie bist!',
    signoff: 'Dein GEL.IT.UP-Team',
  },
  es: {
    subject: 'Actualización importante: Acuerdo de Embajador/a y Logotipos Oficiales (v8-2026-09)',
    greeting: (name) => `Hola ${name},`,
    p1: `¡Esperamos que estés muy bien y creando diseños increíbles!`,
    p2: `A medida que nuestra comunidad internacional crece, hemos actualizado el Acuerdo de Embajador/a GEL.IT.UP (Versión v8-2026-09) con aclaraciones clave sobre el uso de logotipos oficiales, compromisos mensuales y republicaciones internacionales.`,
    p3: `Resumen de las principales actualizaciones:`,
    bullet1Title: '1. Logotipos oficiales proporcionados (Blanco y Negro):',
    bullet1Body: `No crees tus propios logotipos de GEL.IT.UP — está estrictamente prohibido. Adjuntamos los logotipos oficiales en blanco y negro (formato PNG con fondo transparente). No se permiten alteraciones ni cambios de color, y solo pueden usarse en contenidos con productos GEL.IT.UP. Cualquier material con nuestro logotipo pasa a ser propiedad de GEL.IT.UP by GIUP®, al ser marcas registradas.`,
    bullet2Title: '2. Compromisos mensuales de contenido:',
    bullet2Body: `Acorde a la calidad de los kits de PR, los embajadores comparten al menos 10 contenidos propios al mes usando productos GEL.IT.UP, incluyendo al menos 4 vídeos/reels en Instagram y TikTok. Etiqueta siempre #gelitup y @gelitupinternational (IG) / @gelitupofficial (TikTok) y envía tus creaciones a nuestro WhatsApp/Viber (+30 694 071 5234).`,
    bullet3Title: '3. Republicaciones internacionales y código de descuento:',
    bullet3Body: `Los equipos de GEL.IT.UP en otros países pueden compartir tus fotos y vídeos siempre que te etiqueten. Tu código de descuento del 20% es válido exclusivamente en www.gelitup.com y no aplica a otros países.`,
    logoDownloadsTitle: 'Descargar logotipos oficiales:',
    downloadBlack: 'Descargar Logotipo Negro (PNG)',
    downloadWhite: 'Descargar Logotipo Blanco (PNG)',
    agreementLinkText: 'Puedes consultar el acuerdo completo actualizado en:',
    actionText: `No necesitas realizar ninguna acción. Si tienes dudas, responde a este correo o escríbenos por WhatsApp/Viber al +30 694 071 5234.`,
    thanks: '¡Muchas gracias por formar parte de la familia GEL.IT.UP!',
    signoff: 'El equipo de GEL.IT.UP',
  },
  bg: {
    subject: 'Важна актуализация: Договор за посланик и официални лога (v8-2026-09)',
    greeting: (name) => `Здравей ${name},`,
    p1: `Надяваме се, че си добре и създаваш прекрасни маникюри!`,
    p2: `С разрастването на международната ни общност актуализирахме Договора за посланик на GEL.IT.UP (Версия v8-2026-09) с важни разяснения относно официалните лога, месечните публикации и международните споделяния.`,
    p3: `Ето обобщение на ключовите промени:`,
    bullet1Title: '1. Предоставени официални лога (Черно и Бяло):',
    bullet1Body: `Не създавай собствени лога на GEL.IT.UP — това е строго забранено. Прикачваме официалните лога в черно и бяло (PNG формат с прозрачен фон). Не се разрешават промени в цвета или деформации, и те могат да се използват единствено върху материали с продукти на GEL.IT.UP. Всички качени материали с нашето лого стават собственост на GEL.IT.UP by GIUP®, тъй като са регистрирани търговски марки.`,
    bullet2Title: '2. Месечен ангажимент за съдържание:',
    bullet2Body: `Предвид качеството на предоставяните PR пакети, посланиците споделят поне 10 авторски съдържания на месец с продукти на GEL.IT.UP, включително минимум 4 видеа/reels в Instagram и TikTok. Винаги отбелязвай #gelitup и @gelitupinternational (IG) / @gelitupofficial (TikTok) и изпращай видеата/снимките на WhatsApp/Viber (+30 694 071 5234).`,
    bullet3Title: '3. Международни споделяния и промокод:',
    bullet3Body: `Екипите на GEL.IT.UP в други държави могат да споделят твоите публикации, при условие че отбележат профила ти. Личният ти код за 20% отстъпка важи единствено за покупки от www.gelitup.com.`,
    logoDownloadsTitle: 'Изтегли официалните лога:',
    downloadBlack: 'Изтегли Черно Лого (PNG)',
    downloadWhite: 'Изтегли Бяло Лого (PNG)',
    agreementLinkText: 'Пълният актуализиран договор е достъпен на:',
    actionText: `Не е необходимо действие от твоя страна. При въпроси отговори на този имейл или ни пиши във WhatsApp/Viber на +30 694 071 5234.`,
    thanks: 'Благодарим ти, че си част от семейството на GEL.IT.UP!',
    signoff: 'Екипът на GEL.IT.UP',
  },
  pl: {
    subject: 'Ważna aktualizacja: Umowa Ambasadorska i Oficjalne Logo (v8-2026-09)',
    greeting: (name) => `Cześć ${name},`,
    p1: `Mamy nadzieję, że wszystko u Ciebie dobrze i tworzysz wspaniałe stylizacje!`,
    p2: `W miarę rozwoju naszej międzynarodowej społeczności zaktualizowaliśmy Umowę Ambasadorską GEL.IT.UP (Wersja v8-2026-09) o kluczowe zasady korzystania z logo, miesięczne zobowiązania i międzynarodowe publikacje.`,
    p3: `Oto podsumowanie najważniejszych zmian:`,
    bullet1Title: '1. Oficjalne Logo (Czarny i Biały):',
    bullet1Body: `Nie twórz własnych logo GEL.IT.UP — jest to surowo zabronione. W załączniku przesyłamy oficjalne logo w kolorze czarnym i białym (format PNG z przezroczystym tłem). Zabrania się zmian kolorów i zniekształceń; logo może być używane wyłącznie w materiałach z produktami GEL.IT.UP. Materiały z naszym logo stają się własnością GEL.IT.UP by GIUP® jako zarejestrowane znaki towarowe.`,
    bullet2Title: '2. Miesięczne zobowiązanie dotyczące treści:',
    bullet2Body: `Biorąc pod uwagę jakość otrzymywanych paczek PR, ambasadorzy publikują co najmniej 10 własnych treści miesięcznie z produktami GEL.IT.UP, w tym minimum 4 filmy/rolki na Instagramie i TikToku. Zawsze oznaczaj #gelitup i @gelitupinternational (IG) / @gelitupofficial (TikTok) oraz przesyłaj materiały na WhatsApp/Viber (+30 694 071 5234).`,
    bullet3Title: '3. Międzynarodowe publikacje i kod zniżkowy:',
    bullet3Body: `Zespoły GEL.IT.UP w innych krajach mają prawo udostępniać Twoje prace pod warunkiem oznaczenia Twojego profilu. Twój 20% kod zniżkowy obowiązuje wyłącznie na www.gelitup.com i nie działa w innych krajach.`,
    logoDownloadsTitle: 'Pobierz oficjalne logo:',
    downloadBlack: 'Pobierz Czarne Logo (PNG)',
    downloadWhite: 'Pobierz Białe Logo (PNG)',
    agreementLinkText: 'Pełną treść zaktualizowanej umowy znajdziesz na:',
    actionText: `Nie musisz podejmować żadnych działań. W razie pytań odpowiedz na ten e-mail lub napisz do nas na WhatsApp/Viber pod numerem +30 694 071 5234.`,
    thanks: 'Dziękujemy, że jesteś z nami w rodzinie GEL.IT.UP!',
    signoff: 'Zespół GEL.IT.UP',
  },
  pt: {
    subject: 'Atualização importante: Contrato de Embaixador/a e Logótipos Oficiais (v8-2026-09)',
    greeting: (name) => `Olá ${name},`,
    p1: `Esperamos que esteja tudo bem e que continue a criar designs fantásticos!`,
    p2: `Com o crescimento da nossa comunidade internacional, atualizámos o Contrato de Embaixador/a GEL.IT.UP (Versão v8-2026-09) com diretrizes essenciais sobre o uso de logótipos oficiais, publicações mensais e partilhas internacionais.`,
    p3: `Eis o resumo das principais atualizações:`,
    bullet1Title: '1. Logótipos oficiais fornecidos (Preto e Branco):',
    bullet1Body: `Não crie os seus próprios logótipos da GEL.IT.UP — é estritamente proibido. Enviamos em anexo os logótipos oficiais em preto e branco (formato PNG com fundo transparente). Não são permitidas alterações de cor ou distorções, e o logótipo só pode ser utilizado em conteúdos com produtos GEL.IT.UP. Qualquer material com o nosso logótipo torna-se propriedade da GEL.IT.UP by GIUP®, sendo marcas registadas.`,
    bullet2Title: '2. Compromissos mensais de conteúdo:',
    bullet2Body: `Dada a qualidade dos kits de PR enviados, os embaixadores partilham pelo menos 10 conteúdos próprios por mês com produtos GEL.IT.UP, incluindo pelo menos 4 vídeos/reels no Instagram e TikTok. Identifique sempre #gelitup e @gelitupinternational (IG) / @gelitupofficial (TikTok) e envie as criações para o nosso WhatsApp/Viber (+30 694 071 5234).`,
    bullet3Title: '3. Repostagens internacionais e código de desconto:',
    bullet3Body: `As equipas da GEL.IT.UP noutros países têm o direito de partilhar os seus conteúdos desde que identifiquem o seu perfil. O seu código pessoal de 20% de desconto é válido exclusivamente em www.gelitup.com.`,
    logoDownloadsTitle: 'Descarregar logótipos oficiais:',
    downloadBlack: 'Descarregar Logótipo Preto (PNG)',
    downloadWhite: 'Descarregar Logótipo Branco (PNG)',
    agreementLinkText: 'O contrato completo e atualizado está disponível em:',
    actionText: `Não precisa de realizar qualquer ação. Se tiver dúvidas, responda a este email ou envie mensagem por WhatsApp/Viber para +30 694 071 5234.`,
    thanks: 'Muito obrigado por fazer parte da família GEL.IT.UP!',
    signoff: 'A equipa GEL.IT.UP',
  },
  hu: {
    subject: 'Fontos frissítés: Nagyköveti Megállapodás és Hivatalos Logók (v8-2026-09)',
    greeting: (name) => `Kedves ${name}!`,
    p1: `Reméljük, jól vagy és csodás körmöket készítesz!`,
    p2: `Nemzetközi közösségünk növekedésével frissítettük a GEL.IT.UP Nagyköveti Megállapodást (v8-2026-09 verzió) a hivatalos logóhasználatra, a havi posztokra és a nemzetközi megosztásokra vonatkozó iránymutatásokkal.`,
    p3: `A legfontosabb változások összefoglalása:`,
    bullet1Title: '1. Biztosított hivatalos logók (Fekete és Fehér):',
    bullet1Body: `Ne készíts saját GEL.IT.UP logókat — ez szigorúan tilos. Csatoltuk a hivatalos fekete és fehér logókat (PNG formátum, átlátszó háttér). Semmilyen színmódosítás vagy torzítás nem megengedett, és a logók kizárólag GEL.IT.UP termékekkel készült tartalmakhoz használhatók. Minden feltöltött logós anyag a GEL.IT.UP by GIUP® tulajdonát képezi, mivel védjegyoltalom alatt áll.`,
    bullet2Title: '2. Havi tartalomkötelezettség:',
    bullet2Body: `A PR-csomagok minőségének megfelelően a nagykövetek havonta legalább 10 saját tartalmat tesznek közzé GEL.IT.UP termékekkel, ebből legalább 4 videót/reelt az Instagramon és a TikTokon. Mindig használd a #gelitup hashtaget és jelöld meg a @gelitupinternational (IG) / @gelitupofficial (TikTok) fiókot, a médiákat pedig küldd el WhatsApp/Viber számunkra (+30 694 071 5234).`,
    bullet3Title: '3. Nemzetközi megosztások és kedvezménykód:',
    bullet3Body: `A GEL.IT.UP külföldi csapatai megoszthatják a munkáidat, ha megjelölik a profilodat. A személyes 20%-os kuponkódod kizárólag a www.gelitup.com oldalon érvényes.`,
    logoDownloadsTitle: 'Hivatalos logók letöltése:',
    downloadBlack: 'Fekete Logó Letöltése (PNG)',
    downloadWhite: 'Fehér Logó Letöltése (PNG)',
    agreementLinkText: 'A teljes frissített megállapodás elérhető itt:',
    actionText: `Semmilyen teendőd nincs. Kérdés esetén válaszolj erre az e-mailre vagy írj WhatsApp/Viberen a +30 694 071 5234 számon.`,
    thanks: 'Köszönjük, hogy a GEL.IT.UP család tagja vagy!',
    signoff: 'A GEL.IT.UP csapata',
  },
  it: {
    subject: 'Aggiornamento importante: Contratto di Ambassador e Loghi Ufficiali (v8-2026-09)',
    greeting: (name) => `Ciao ${name},`,
    p1: `Ci auguriamo che tutto vada per il meglio e che tu stia creando splendidi lavori!`,
    p2: `Con la crescita della nostra community internazionale, abbiamo aggiornato il Contratto di Ambassador GEL.IT.UP (Versione v8-2026-09) con chiarimenti fondamentali sull'uso dei loghi ufficiali, i contenuti mensili e le ripubblicazioni internazionali.`,
    p3: `Ecco una sintesi dei punti principali:`,
    bullet1Title: '1. Loghi Ufficiali Forniti (Nero e Bianco):',
    bullet1Body: `Non creare loghi GEL.IT.UP personalizzati — è severamente vietato. Alleghiamo i loghi ufficiali in bianco e nero (formato PNG con sfondo trasparente). Non sono consentite modifiche o cambi di colore e i loghi possono essere usati solo su contenuti con prodotti GEL.IT.UP. Qualsiasi materiale con il nostro logo diventa di proprietà di GEL.IT.UP by GIUP®, trattandosi di marchi registrati.`,
    bullet2Title: '2. Impegno mensile sui contenuti:',
    bullet2Body: `In linea con la qualità dei kit PR ricevuti, gli ambassador condividono almeno 10 contenuti originali al mese con prodotti GEL.IT.UP, tra cui almeno 4 video/reel su Instagram e TikTok. Taggate sempre #gelitup e @gelitupinternational (IG) / @gelitupofficial (TikTok) e inviate i contenuti al nostro WhatsApp/Viber (+30 694 071 5234).`,
    bullet3Title: '3. Ripubblicazioni internazionali e codice sconto:',
    bullet3Body: `I team GEL.IT.UP di altri paesi possono ripubblicare le tue foto e video a condizione di taggare il tuo profilo. Il tuo codice sconto del 20% è valido esclusivamente su www.gelitup.com.`,
    logoDownloadsTitle: 'Scarica i loghi ufficiali:',
    downloadBlack: 'Scarica Logo Nero (PNG)',
    downloadWhite: 'Scarica Logo Bianco (PNG)',
    agreementLinkText: 'Il contratto completo aggiornato è sempre consultabile qui:',
    actionText: `Non devi compiere alcuna azione. Per qualsiasi domanda, rispondi semplicemente a questa email o scrivici su WhatsApp/Viber al +30 694 071 5234.`,
    thanks: 'Grazie di cuore per far parte della famiglia GEL.IT.UP!',
    signoff: 'Il team GEL.IT.UP',
  },
}

function resolveLang(lang, country) {
  const c = String(country || '').trim().toLowerCase()
  if (COUNTRY_TO_LANG[c] && TEMPLATES[COUNTRY_TO_LANG[c]]) return COUNTRY_TO_LANG[c]
  const l = String(lang || '').trim().toLowerCase()
  if (TEMPLATES[l]) return l
  return 'en'
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildEmailHtml(row, t) {
  const firstName = String(row?.full_name || '').trim().split(/s+/)[0] || 'there'

  return `<div style="background-color:#f9fafb;padding:30px 15px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:620px;background-color:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
      <tr>
        <td style="background-color:#C34283;padding:26px 32px;text-align:center;">
          <span style="font-size:24px;font-weight:bold;color:#ffffff;letter-spacing:1.5px;">GEL.IT.UP</span>
          <div style="color:#ffffff;font-size:13px;margin-top:4px;letter-spacing:0.5px;opacity:0.95;">Ambassador Programme · Notice v8-2026-09</div>
        </td>
      </tr>
      <tr>
        <td style="padding:32px 32px 24px 32px;font-size:15px;color:#1f2937;line-height:1.65;">
          <p style="margin:0 0 16px 0;font-size:16px;font-weight:600;color:#111827;">${escapeHtml(t.greeting(firstName))}</p>
          <p style="margin:0 0 14px 0;">${escapeHtml(t.p1)}</p>
          <p style="margin:0 0 14px 0;">${escapeHtml(t.p2)}</p>
          <p style="margin:0 0 18px 0;">${escapeHtml(t.p3)}</p>

          <div style="background-color:#fdf2f8;border-left:4px solid #C34283;padding:14px 18px;border-radius:0 8px 8px 0;margin-bottom:14px;">
            <p style="margin:0 0 6px 0;font-weight:700;color:#9d174d;">${escapeHtml(t.bullet1Title)}</p>
            <p style="margin:0;font-size:14px;color:#374151;">${escapeHtml(t.bullet1Body)}</p>
          </div>

          <div style="background-color:#fdf2f8;border-left:4px solid #C34283;padding:14px 18px;border-radius:0 8px 8px 0;margin-bottom:14px;">
            <p style="margin:0 0 6px 0;font-weight:700;color:#9d174d;">${escapeHtml(t.bullet2Title)}</p>
            <p style="margin:0;font-size:14px;color:#374151;">${escapeHtml(t.bullet2Body)}</p>
          </div>

          <div style="background-color:#fdf2f8;border-left:4px solid #C34283;padding:14px 18px;border-radius:0 8px 8px 0;margin-bottom:20px;">
            <p style="margin:0 0 6px 0;font-weight:700;color:#9d174d;">${escapeHtml(t.bullet3Title)}</p>
            <p style="margin:0;font-size:14px;color:#374151;">${escapeHtml(t.bullet3Body)}</p>
          </div>

          <!-- Logo Download Buttons -->
          <div style="background-color:#fafafa;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin-bottom:22px;text-align:center;">
            <p style="margin:0 0 12px 0;font-weight:700;color:#111827;font-size:14px;">${escapeHtml(t.logoDownloadsTitle)}</p>
            <a href="${LOGO_BLACK_URL}" style="display:inline-block;background-color:#111827;color:#ffffff;text-decoration:none;font-size:13px;font-weight:bold;padding:10px 18px;border-radius:6px;margin:4px 6px;">${escapeHtml(t.downloadBlack)}</a>
            <a href="${LOGO_WHITE_URL}" style="display:inline-block;background-color:#C34283;color:#ffffff;text-decoration:none;font-size:13px;font-weight:bold;padding:10px 18px;border-radius:6px;margin:4px 6px;">${escapeHtml(t.downloadWhite)}</a>
          </div>

          <p style="margin:0 0 10px 0;">${escapeHtml(t.agreementLinkText)}</p>
          <p style="margin:0 0 20px 0;">
            <a href="https://www.gelitup.com/ambassador-agreement" style="color:#C34283;font-weight:600;text-decoration:underline;">www.gelitup.com/ambassador-agreement</a>
          </p>

          <p style="margin:0 0 16px 0;font-size:14px;color:#4b5563;">${escapeHtml(t.actionText)}</p>
          <p style="margin:0 0 24px 0;font-weight:600;color:#111827;">${escapeHtml(t.thanks)}</p>

          <p style="margin:0;color:#6b7280;font-size:14px;">${escapeHtml(t.signoff)}<br/><strong style="color:#111827;">GEL.IT.UP by GIUP®</strong></p>
        </td>
      </tr>
      <tr>
        <td style="background-color:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #f3f4f6;font-size:12px;color:#9ca3af;">
          GEL.IT.UP · info@gelitup.com · WhatsApp/Viber: +30 694 071 5234
        </td>
      </tr>
    </table>
  </div>`
}

async function sendUpdateEmail(row) {
  const langKey = resolveLang(row.language, row.country)
  const t = TEMPLATES[langKey] || TEMPLATES.en
  const subject = t.subject

  const response = await fetch(EMAIL_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventType: 'ambassador_agreement_v8_update',
      to: row.email,
      subject: subject,
      html: buildEmailHtml(row, t),
      from: 'GEL.IT.UP <info@gelitup.com>',
      replyTo: 'info@gelitup.com',
      lang: langKey,
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Email webhook failed with ${response.status}: ${text.slice(0, 200)}`)
  }

  return { langKey, subject }
}

function buildLogEntry(row, meta) {
  const stamp = new Date().toISOString()
  return `[${stamp}] 📧 Sent to ${row.email} (${meta.langKey}) · “${meta.subject}” ${MESSAGE_MARKER}`
}

async function appendSendLog(supabase, row, meta) {
  const entry = buildLogEntry(row, meta)
  const nextMessageLog = row.message_log ? `${row.message_log}\n${entry}` : entry
  const { error } = await supabase
    .from(AMBASSADOR_TABLE)
    .update({ message_log: nextMessageLog })
    .eq('id', row.id)

  if (!error) return

  const nextAdminComment = row.admin_comment ? `${row.admin_comment}\n${entry}` : entry
  const { error: fallbackError } = await supabase
    .from(AMBASSADOR_TABLE)
    .update({ admin_comment: nextAdminComment })
    .eq('id', row.id)

  if (fallbackError) {
    throw new Error(`Email sent but send log failed: ${fallbackError.message}`)
  }
}

export async function handler(event) {
  const currentDateUtc = new Date().toISOString().slice(0, 10)
  const isScheduledDate = currentDateUtc >= SEND_DATE_UTC
  const isManualTrigger = event?.httpMethod === 'POST' || event?.queryStringParameters?.trigger === 'now'

  if (!isScheduledDate && !isManualTrigger) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        skipped: true,
        reason: `scheduled_for_${SEND_DATE_UTC}`,
        currentDateUtc,
      }),
    }
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing Supabase service credentials' }),
    }
  }
  if (!EMAIL_WEBHOOK_URL) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing email webhook URL' }),
    }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
  const { data, error } = await supabase
    .from(AMBASSADOR_TABLE)
    .select('id,full_name,email,status,language,country,message_log,admin_comment')
    .eq('status', 'approved')
    .not('email', 'is', null)
    .neq('email', '')

  if (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Failed to load approved ambassadors: ${error.message}` }),
    }
  }

  const recipientsByEmail = new Map()
  for (const row of data || []) {
    const email = String(row.email || '').trim().toLowerCase()
    if (!email || recipientsByEmail.has(email)) continue
    recipientsByEmail.set(email, { ...row, email })
  }

  const results = []
  for (const row of recipientsByEmail.values()) {
    const priorLogs = `${row.message_log || ''}\n${row.admin_comment || ''}`
    if (priorLogs.includes(MESSAGE_MARKER)) {
      results.push({ id: row.id, email: row.email, status: 'skipped_already_sent' })
      continue
    }

    try {
      const meta = await sendUpdateEmail(row)
      await appendSendLog(supabase, row, meta)
      results.push({ id: row.id, email: row.email, lang: meta.langKey, status: 'sent' })
    } catch (sendError) {
      results.push({
        id: row.id,
        email: row.email,
        status: 'failed',
        error: sendError instanceof Error ? sendError.message : String(sendError),
      })
    }
  }

  const failed = results.filter((result) => result.status === 'failed')
  return {
    statusCode: failed.length ? 500 : 200,
    body: JSON.stringify({
      ok: failed.length === 0,
      approvedRecipients: recipientsByEmail.size,
      sent: results.filter((result) => result.status === 'sent').length,
      skipped: results.filter((result) => result.status === 'skipped_already_sent').length,
      failed: failed.length,
      results,
    }),
  }
}
