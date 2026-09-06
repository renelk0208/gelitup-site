import { createClient } from '@supabase/supabase-js'

// PAUSED: Automatic email send disabled per admin instruction pending new logo clause & updated contract.
// export const config = {
//   schedule: '0 7 7 9 *',
// }

const AMBASSADOR_TABLE = process.env.AMBASSADOR_TABLE || 'ambassador_applications'
const EMAIL_WEBHOOK_URL = process.env.VITE_EMAIL_WEBHOOK_URL || process.env.EMAIL_WEBHOOK_URL || ''
const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || ''
const SEND_DATE_UTC = '2026-09-07'
const MESSAGE_MARKER = '[AMBASSADOR_AGREEMENT_V7_UPDATE_SENT]'

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
    subject: 'Important update regarding your GEL.IT.UP Ambassador Agreement (v7-2026-09)',
    greeting: (name) => `Hi ${name},`,
    p1: `We hope you're doing well and creating gorgeous sets!`,
    p2: `As our international community of nail artists continues to grow across multiple countries, we have made a few minor but important updates to the GEL.IT.UP Ambassador Agreement (Version v7-2026-09).`,
    p3: `We value complete transparency with all our ambassadors, so we wanted to share what has been updated and why:`,
    bullet1Title: '1. International Reposts & Mentions:',
    bullet1Body: `When GEL.IT.UP teams in other countries upload or share your photos and videos, they are entitled to do so provided they credit and tag your social media handles. Please note that when this happens, your personal 20% discount code applies exclusively to purchases on www.gelitup.com and does not apply in other countries.`,
    bullet2Title: '2. Content with the GEL.IT.UP Logo:',
    bullet2Body: `You continue to keep ownership of your original nail work and creations. Please note that any content or media uploaded featuring the official GEL.IT.UP logo becomes the property of GEL.IT.UP by GIUP®, as the name and logo are registered trademarks.`,
    agreementLinkText: 'The full updated agreement is available to view anytime at:',
    actionText: `You don't need to do anything. If you have any questions, just reply to this email or message us on WhatsApp/Viber at +30 694 071 5234.`,
    thanks: 'Thank you for being such an essential part of the GEL.IT.UP family!',
    signoff: 'The GEL.IT.UP Team',
  },
  ro: {
    subject: 'Actualizare importantă privind Acordul de Ambasador GEL.IT.UP (v7-2026-09)',
    greeting: (name) => `Bună ${name},`,
    p1: `Sperăm că ești bine și că realizezi creații minunate!`,
    p2: `Pe măsură ce comunitatea noastră internațională continuă să se extindă în mai multe țări, am adus câteva actualizări importante Acordului de Ambasador GEL.IT.UP (Versiunea v7-2026-09).`,
    p3: `Dorim să fim 100% transparenți cu toți ambasadorii noștri — atât cei noi, cât și cei existenți — așa că îți prezentăm ce s-a actualizat:`,
    bullet1Title: '1. Repostări Internaționale și Mențiuni (Tag):',
    bullet1Body: `Atunci când echipele sau distribuitorii GEL.IT.UP din alte țări încarcă sau distribuie fotografiile și videoclipurile tale, au dreptul să o facă cu condiția să eticheteze (tag) contul tău de social media, pentru ca vizibilitatea ta internațională să crească. Reține că în acest caz, codul tău personal de 20% reducere se aplică exclusiv pe www.gelitup.com și nu este valabil la achizițiile din alte țări.`,
    bullet2Title: '2. Conținut cu Sigla GEL.IT.UP:',
    bullet2Body: `Păstrezi pe deplin dreptul de proprietate asupra lucrărilor și creațiilor tale originale. Te rugăm să reții că orice material sau conținut încărcat care conține sigla oficială GEL.IT.UP devine proprietatea GEL.IT.UP by GIUP®, numele și sigla fiind mărci înregistrate.`,
    agreementLinkText: 'Acordul complet actualizat poate fi consultat oricând la:',
    actionText: `Nu este nevoie de nicio acțiune din partea ta. Dacă ai întrebări sau dorești lămuriri, răspunde la acest email sau scrie-ne pe WhatsApp/Viber la +30 694 071 5234.`,
    thanks: 'Îți mulțumim din suflet pentru că faci parte din familia GEL.IT.UP!',
    signoff: 'Echipa GEL.IT.UP',
  },
  sq: {
    subject: 'Përditësim i rëndësishëm lidhur me Marrëveshjen e Ambasadorit GEL.IT.UP (v7-2026-09)',
    greeting: (name) => `Përshëndetje ${name},`,
    p1: `Shpresojmë të jeni mirë dhe të vazhdoni të krijoni punime të mrekullueshme!`,
    p2: `Ndërsa komuniteti ynë ndërkombëtar i artistëve të thonjve po rritet në shumë shtete, kemi bërë disa përditësime të rëndësishme në Marrëveshjen e Ambasadorit GEL.IT.UP (Versioni v7-2026-09).`,
    p3: `Transparenca me të gjithë ambasadorët tanë është thelbësore për ne, prandaj dëshirojmë t'ju njoftojmë me ndryshimet kryesore:`,
    bullet1Title: '1. Ripostimet Ndërkombëtare dhe Përmendja (Tag):',
    bullet1Body: `Kur ekipet apo distributorët e GEL.IT.UP në shtete të tjera ngarkojnë ose shpërndajnë fotot dhe videot tuaja, ata kanë të drejtë ta bëjnë këtë me kusht që të etiketojnë (tag) profilin tuaj në rrjetet sociale, duke ju dhënë shikueshmëri ndërkombëtare. Ju lutemi vini re se kodi juaj personal me 20% zbritje është i vlefshëm ekskluzivisht për porositë në www.gelitup.com dhe nuk aplikohet për blerjet në shtete të tjera.`,
    bullet2Title: '2. Përmbajtja me Logon e GEL.IT.UP:',
    bullet2Body: `Ju ruani plotësisht pronësinë mbi punimet dhe krijimet tuaja origjinale. Ju lutemi kini parasysh se çdo material i ngarkuar që përmban logon zyrtare të GEL.IT.UP bëhet pronë e GEL.IT.UP by GIUP®, pasi emri dhe logoja janë marka të regjistruara tregtare.`,
    agreementLinkText: 'Marrëveshjen e plotë dhe të përditësuar mund ta shikoni në çdo kohë te:',
    actionText: `Nuk keni nevojë të bëni asnjë veprim. Nëse keni ndonjë pyetje, thjesht përgjigjuni këtij emaili ose na shkruani në WhatsApp/Viber në +30 694 071 5234.`,
    thanks: 'Ju falënderojmë përzemërsisht që jeni pjesë e familjes GEL.IT.UP!',
    signoff: 'Ekipi i GEL.IT.UP',
  },
  el: {
    subject: 'Σημαντική ενημέρωση για τη Σύμβαση Πρεσβευτή GEL.IT.UP (v7-2026-09)',
    greeting: (name) => `Γεια σου ${name},`,
    p1: `Ελπίζουμε να είσαι καλά και να δημιουργείς υπέροχα σετ νυχιών!`,
    p2: `Καθώς η διεθνής μας κοινότητα μεγαλώνει σε πολλές χώρες, προχωρήσαμε σε μερικές μικρές αλλά σημαντικές ανανεώσεις στη Σύμβαση Πρεσβευτή GEL.IT.UP (Έκδοση v7-2026-09).`,
    p3: `Θέλουμε να είμαστε απόλυτα ξεκάθαροι με όλους τους ambassadors μας, γι' αυτό μοιραζόμαστε τις αλλαγές:`,
    bullet1Title: '1. Διεθνείς Αναδημοσιεύσεις & Αναφορά (Tag):',
    bullet1Body: `Όταν οι ομάδες της GEL.IT.UP σε άλλες χώρες αναρτούν ή αναδημοσιεύουν τις φωτογραφίες και τα βίντεό σου, έχουν το δικαίωμα να το κάνουν εφόσον αναφέρουν (tag) το δικό σου προφίλ. Σημείωσε ότι σε αυτή την περίπτωση, ο προσωπικός σου εκπτωτικός κωδικός 20% ισχύει αποκλειστικά για αγορές στο www.gelitup.com και δεν εφαρμόζεται σε άλλες χώρες.`,
    bullet2Title: '2. Περιεχόμενο με το Λογότυπο GEL.IT.UP:',
    bullet2Body: `Διατηρείς πλήρως την κυριότητα των πρωτότυπων δημιουργιών σου. Παρακαλούμε σημείωσε ότι οτιδήποτε αναρτάται με το επίσημο λογότυπο της GEL.IT.UP αποτελεί ιδιοκτησία της GEL.IT.UP by GIUP®, καθώς το όνομα και το σήμα είναι κατοχυρωμένα εμπορικά σήματα.`,
    agreementLinkText: 'Μπορείς να διαβάσεις την πλήρη ανανεωμένη σύμβαση οποιαδήποτε στιγμή εδώ:',
    actionText: `Δεν χρειάζεται να κάνεις καμία ενέργεια. Εάν έχεις οποιαδήποτε απορία, απλά απάντησε σε αυτό το email ή στείλε μας μήνυμα στο WhatsApp/Viber στο +30 694 071 5234.`,
    thanks: 'Σε ευχαριστούμε θερμά για την εξαιρετική συνεργασία!',
    signoff: 'Η ομάδα της GEL.IT.UP',
  },
  fr: {
    subject: 'Mise à jour importante de votre Contrat d’Ambassadeur GEL.IT.UP (v7-2026-09)',
    greeting: (name) => `Bonjour ${name},`,
    p1: `Nous espérons que vous allez bien et que vous réalisez de superbes poses !`,
    p2: `À mesure que notre communauté internationale d’artistes ongulaires s’agrandit dans plusieurs pays, nous avons apporté quelques mises à jour importantes au Contrat d’Ambassadeur GEL.IT.UP (Version v7-2026-09).`,
    p3: `Nous souhaitons être totalement transparents avec vous :`,
    bullet1Title: '1. Repartages Internationaux et Mentions :',
    bullet1Body: `Lorsque les équipes GEL.IT.UP d’autres pays publient ou partagent vos photos et vidéos, elles sont autorisées à le faire à condition de mentionner et d’identifier (tag) votre compte. Veuillez noter que dans ce cas, votre code promo personnel de 20% s'applique exclusivement aux achats sur www.gelitup.com et n'est pas applicable dans d'autres pays.`,
    bullet2Title: '2. Contenu avec le Logo GEL.IT.UP :',
    bullet2Body: `Vous conservez la pleine propriété de votre travail et de vos créations d'ongles originales. Veuillez noter que tout contenu mis en ligne comportant le logo officiel GEL.IT.UP devient la propriété de GEL.IT.UP by GIUP®, le nom et le logo étant des marques déposées.`,
    agreementLinkText: 'Le contrat complet mis à jour est consultable à tout moment sur :',
    actionText: `Aucune démarche n'est requise de votre part. Si vous avez la moindre question, répondez simplement à cet e-mail ou écrivez-nous sur WhatsApp/Viber au +30 694 071 5234.`,
    thanks: 'Merci pour votre précieuse collaboration !',
    signoff: `L'équipe GEL.IT.UP`,
  },
  de: {
    subject: 'Wichtiges Update zu deiner GEL.IT.UP Ambassador-Vereinbarung (v7-2026-09)',
    greeting: (name) => `Hallo ${name},`,
    p1: `wir hoffen, es geht dir gut und du kreierst wunderschöne Nagelsets!`,
    p2: `Da unsere internationale Community stetig wächst, haben wir einige wichtige Aktualisierungen an der GEL.IT.UP Ambassador-Vereinbarung vorgenommen (Version v7-2026-09).`,
    p3: `Transparenz ist uns besonders wichtig, daher möchten wir dir die Neuerungen kurz erläutern:`,
    bullet1Title: '1. Internationale Reposts & Markierungen:',
    bullet1Body: `Wenn GEL.IT.UP-Teams in anderen Ländern deine Fotos und Videos teilen oder hochladen, sind sie dazu berechtigt, sofern sie dein Social-Media-Profil markieren und nennen. Bitte beachte, dass dein persönlicher 20%-Rabattcode ausschließlich für Bestellungen auf www.gelitup.com gilt und nicht in anderen Ländern eingelöst werden kann.`,
    bullet2Title: '2. Inhalte mit dem GEL.IT.UP-Logo:',
    bullet2Body: `Du behältst weiterhin das volle Eigentum an deinen originären Nageldesigns. Bitte beachte jedoch, dass alle hochgeladenen Inhalte, die das offizielle GEL.IT.UP-Logo tragen, Eigentum von GEL.IT.UP by GIUP® sind, da der Markenname und das Logo eingetragene Warenzeichen sind.`,
    agreementLinkText: 'Die vollständige Vereinbarung kannst du jederzeit hier einsehen:',
    actionText: `Du musst nichts weiter tun. Bei Fragen antworte einfach auf diese E-Mail oder schreibe uns per WhatsApp/Viber unter +30 694 071 5234.`,
    thanks: 'Vielen Dank, dass du Teil der GEL.IT.UP-Familie bist!',
    signoff: 'Dein GEL.IT.UP-Team',
  },
  es: {
    subject: 'Actualización importante sobre tu Acuerdo de Embajador/a GEL.IT.UP (v7-2026-09)',
    greeting: (name) => `Hola ${name},`,
    p1: `¡Esperamos que estés muy bien y creando diseños increíbles!`,
    p2: `A medida que nuestra comunidad internacional crece en varios países, hemos realizado algunas actualizaciones importantes en el Acuerdo de Embajador/a GEL.IT.UP (Versión v7-2026-09).`,
    p3: `Queremos ser completamente transparentes con todos nuestros embajadores:`,
    bullet1Title: '1. Republicaciones Internacionales y Menciones (Tag):',
    bullet1Body: `Cuando los equipos o distribuidores de GEL.IT.UP en otros países suban o compartan tus fotos y vídeos, están autorizados a hacerlo siempre que etiqueten (tag) y den crédito a tus redes sociales. Ten en cuenta que, en este caso, tu código de descuento personal del 20% es válido exclusivamente en www.gelitup.com y no aplica a compras en otros países.`,
    bullet2Title: '2. Contenido con el Logotipo de GEL.IT.UP:',
    bullet2Body: `Conservas plenamente la propiedad de tus creaciones y diseños originales de uñas. Ten en cuenta que cualquier material subido que contenga el logotipo oficial de GEL.IT.UP pasa a ser propiedad de GEL.IT.UP by GIUP®, ya que el nombre y el logotipo son marcas registradas.`,
    agreementLinkText: 'Puedes consultar el acuerdo completo actualizado en:',
    actionText: `No necesitas realizar ninguna acción. Si tienes cualquier duda, responde a este correo o escríbenos por WhatsApp/Viber al +30 694 071 5234.`,
    thanks: '¡Muchas gracias por formar parte de la familia GEL.IT.UP!',
    signoff: 'El equipo de GEL.IT.UP',
  },
  bg: {
    subject: 'Важна актуализация относно договора за посланик на GEL.IT.UP (v7-2026-09)',
    greeting: (name) => `Здравей ${name},`,
    p1: `Надяваме се, че си добре и създаваш прекрасни маникюри!`,
    p2: `Тъй като нашата международна общност се разраства в редица държави, направихме няколко важни актуализации в Договора за посланик на GEL.IT.UP (Версия v7-2026-09).`,
    p3: `Държим на пълна прозрачност с всички наши посланици, затова споделяме промените:`,
    bullet1Title: '1. Международно споделяне и отбелязване (Tag):',
    bullet1Body: `Когато екипите на GEL.IT.UP в други държави споделят или качват твои снимки и видеа, те имат право да го правят, при условие че отбележат (tag) твоя профил в социалните мрежи. Моля, обърни внимание, че в този случай твоят личен промокод за 20% отстъпка важи единствено за покупки от www.gelitup.com и не се прилага в други държави.`,
    bullet2Title: '2. Съдържание с логото на GEL.IT.UP:',
    bullet2Body: `Запазваш пълна собственост върху авторските си творения. Моля, имай предвид, че всички качени материали с официалното лого на GEL.IT.UP стават собственост на GEL.IT.UP by GIUP®, тъй като името и логото са регистрирани търговски марки.`,
    agreementLinkText: 'Пълният актуализиран договор е достъпен по всяко време на:',
    actionText: `Не е необходимо действие от твоя страна. При въпроси просто отговори на този имейл или ни пиши във WhatsApp/Viber на +30 694 071 5234.`,
    thanks: 'Благодарим ти, че си част от семейството на GEL.IT.UP!',
    signoff: 'Екипът на GEL.IT.UP',
  },
  pl: {
    subject: 'Ważna aktualizacja Umowy Ambasadorskiej GEL.IT.UP (v7-2026-09)',
    greeting: (name) => `Cześć ${name},`,
    p1: `Mamy nadzieję, że wszystko u Ciebie dobrze i tworzysz wspaniałe stylizacje!`,
    p2: `W miarę jak nasza międzynarodowa społeczność rozwija się w wielu krajach, wprowadziliśmy kilka ważnych aktualizacji do Umowy Ambasadorskiej GEL.IT.UP (Wersja v7-2026-09).`,
    p3: `Zależy nam na pełnej przejrzystości, dlatego przedstawiamy kluczowe zmiany:`,
    bullet1Title: '1. Międzynarodowe publikacje i oznaczanie (Tag):',
    bullet1Body: `Gdy zespoły GEL.IT.UP w innych krajach udostępniają Twoje zdjęcia i filmy, mają do tego prawo pod warunkiem oznaczenia (tag) Twojego profilu. Pamiętaj, że w takim przypadku Twój osobisty 20% kod zniżkowy obowiązuje wyłącznie na www.gelitup.com i nie działa w innych krajach.`,
    bullet2Title: '2. Treści z logo GEL.IT.UP:',
    bullet2Body: `Zachowujesz pełne prawa autorskie do swoich oryginalnych stylizacji paznokci. Pamiętaj jednak, że wszelkie materiały przesyłane z oficjalnym logo GEL.IT.UP stają się własnością GEL.IT.UP by GIUP®, jako że nazwa i logo są zastrzeżonymi znakami towarowymi.`,
    agreementLinkText: 'Pełną treść zaktualizowanej umowy możesz sprawdzić w każdej chwili na:',
    actionText: `Nie musisz podejmować żadnych działań. W razie pytań odpowiedz na ten e-mail lub napisz do nas na WhatsApp/Viber pod numerem +30 694 071 5234.`,
    thanks: 'Dziękujemy, że jesteś z nami w rodzinie GEL.IT.UP!',
    signoff: 'Zespół GEL.IT.UP',
  },
  pt: {
    subject: 'Atualização importante sobre o seu Contrato de Embaixador/a GEL.IT.UP (v7-2026-09)',
    greeting: (name) => `Olá ${name},`,
    p1: `Esperamos que esteja tudo bem e que continue a criar designs fantásticos!`,
    p2: `À medida que a nossa comunidade internacional de nail artists continua a crescer, fizemos algumas atualizações importantes no Contrato de Embaixador/a GEL.IT.UP (Versão v7-2026-09).`,
    p3: `Valorizamos a total transparência com todos os nossos embaixadores:`,
    bullet1Title: '1. Repostagens Internacionais e Menções (Tag):',
    bullet1Body: `Quando as equipas da GEL.IT.UP noutros países partilham as suas fotos e vídeos, têm o direito de o fazer desde que identifiquem (tag) o seu perfil. Tenha em atenção que o seu código de desconto pessoal de 20% é válido exclusivamente em www.gelitup.com e não se aplica a compras noutros países.`,
    bullet2Title: '2. Conteúdo com o Logótipo GEL.IT.UP:',
    bullet2Body: `Mantém a total titularidade das suas criações e trabalhos originais. Tenha em atenção que qualquer conteúdo partilhado com o logótipo oficial da GEL.IT.UP torna-se propriedade da GEL.IT.UP by GIUP®, sendo o nome e o logótipo marcas registadas.`,
    agreementLinkText: 'O contrato completo e atualizado está disponível em:',
    actionText: `Não precisa de realizar qualquer ação. Se tiver dúvidas, responda a este email ou envie mensagem por WhatsApp/Viber para +30 694 071 5234.`,
    thanks: 'Muito obrigado por fazer parte da família GEL.IT.UP!',
    signoff: 'A equipa GEL.IT.UP',
  },
  hu: {
    subject: 'Fontos frissítés a GEL.IT.UP Nagyköveti Megállapodáshoz (v7-2026-09)',
    greeting: (name) => `Kedves ${name}!`,
    p1: `Reméljük, jól vagy és csodás körmöket készítesz!`,
    p2: `Nemzetközi közösségünk növekedésével néhány fontos frissítést vezettünk be a GEL.IT.UP Nagyköveti Megállapodásban (v7-2026-09 verzió).`,
    p3: `A teljes átláthatóság érdekében szeretnénk összefoglalni a legfontosabb változásokat:`,
    bullet1Title: '1. Nemzetközi megosztások és megjelölés (Tag):',
    bullet1Body: `Amennyiben a GEL.IT.UP más országokbeli csapatai megosztják a képeidet vagy videóidat, jogosultak erre a profilod megjelölése (tag) mellett. Kérjük, vedd figyelembe, hogy a személyes 20%-os kuponkódod kizárólag a www.gelitup.com oldalon érvényes, más országok vásárlásainál nem használható.`,
    bullet2Title: '2. GEL.IT.UP logóval ellátott tartalmak:',
    bullet2Body: `Eredeti körömdíszítéseid és munkáid tulajdonjoga továbbra is teljes mértékben a tiéd marad. Kérjük, vedd figyelembe, hogy a hivatalos GEL.IT.UP logót tartalmazó feltöltött tartalmak a GEL.IT.UP by GIUP® tulajdonát képezik, mivel a név és a logó bejegyzett védjegyek.`,
    agreementLinkText: 'A teljes frissített megállapodás bármikor megtekinthető itt:',
    actionText: `Semmilyen teendőd nincs. Ha bármilyen kérdésed merülne fel, válaszolj erre az e-mailre vagy írj nekünk WhatsApp/Viberen a +30 694 071 5234 számon.`,
    thanks: 'Köszönjük, hogy a GEL.IT.UP család tagja vagy!',
    signoff: 'A GEL.IT.UP csapata',
  },
  it: {
    subject: 'Aggiornamento importante relativo al Contratto di Ambassador GEL.IT.UP (v7-2026-09)',
    greeting: (name) => `Ciao ${name},`,
    p1: `Ci auguriamo che tutto vada per il meglio e che tu stia creando splendidi lavori!`,
    p2: `Poiché la nostra community internazionale continua a crescere in molti paesi, abbiamo apportato alcuni importanti aggiornamenti al Contratto di Ambassador GEL.IT.UP (Versione v7-2026-09).`,
    p3: `Ci teniamo alla massima trasparenza con tutti i nostri ambassador, ecco le novità principali:`,
    bullet1Title: '1. Ripubblicazioni Internazionali e Menzioni (Tag):',
    bullet1Body: `Quando i team o distributori GEL.IT.UP di altri paesi condividono o caricano le tue foto e i tuoi video, hanno il diritto di farlo a condizione di menzionare e taggare il tuo profilo social. Ti ricordiamo che il tuo codice sconto personale del 20% è valido esclusivamente per gli ordini su www.gelitup.com e non è applicabile in altri paesi.`,
    bullet2Title: '2. Contenuti con il Logo GEL.IT.UP:',
    bullet2Body: `Mantieni la totale titolarità delle tue creazioni originali di nail art. Ti informiamo che qualsiasi contenuto o materiale caricato recante il logo ufficiale GEL.IT.UP diventa di proprietà di GEL.IT.UP by GIUP®, essendo il nome e il logo marchi registrati.`,
    agreementLinkText: 'Il contratto completo aggiornato è sempre consultabile qui:',
    actionText: `Non devi compiere alcuna azione. Per qualsiasi domanda o chiarimento, rispondi semplicemente a questa email o scrivici su WhatsApp/Viber al +30 694 071 5234.`,
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
  const firstName = String(row?.full_name || '').trim().split(/\s+/)[0] || 'there'

  return `<div style="background-color:#f9fafb;padding:30px 15px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background-color:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
      <tr>
        <td style="background-color:#C34283;padding:26px 32px;text-align:center;">
          <span style="font-size:24px;font-weight:bold;color:#ffffff;letter-spacing:1.5px;">GEL.IT.UP</span>
          <div style="color:#ffffff;font-size:13px;margin-top:4px;letter-spacing:0.5px;opacity:0.95;">Ambassador Programme · Notice v7-2026-09</div>
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

          <div style="background-color:#fdf2f8;border-left:4px solid #C34283;padding:14px 18px;border-radius:0 8px 8px 0;margin-bottom:20px;">
            <p style="margin:0 0 6px 0;font-weight:700;color:#9d174d;">${escapeHtml(t.bullet2Title)}</p>
            <p style="margin:0;font-size:14px;color:#374151;">${escapeHtml(t.bullet2Body)}</p>
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
      eventType: 'ambassador_agreement_v7_update',
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
