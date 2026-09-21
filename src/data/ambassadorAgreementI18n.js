// Full translations of the GEL.IT.UP Ambassador Agreement body, section by
// section, so the generated contract PDF can be rendered in the applicant's own
// language. English (src/data/ambassadorAgreement.js → AGREEMENT_SECTIONS) is
// the GOVERNING version and is always included after the translation.
//
// Keys map to SUPPORTED_LANGS in src/lib/i18n.js (el, fr, de, es, bg, pl, ro, pt,
// hu, sq). English is intentionally omitted — the PDF renders it from the source.
// Numbers, hashtags, handles and URLs are interpolated from the source constants
// so translations stay in sync.

import {
  POST_MIN_PER_MONTH as POST_MIN,
  VIDEO_MIN_PER_MONTH as VIDEO_MIN,
  CONTENT_SUBMISSION_NUMBER as NUM,
  FOLLOWER_DISCOUNT_PCT as PCT,
} from './ambassadorAgreement.js'

export const AGREEMENT_I18N = {
  ro: {
    title: 'Contract de Ambasador',
    referenceNote: 'Traducere pentru referința ta. Versiunea în limba engleză care urmează este versiunea care guvernează contractul.',
    governingNote: 'Versiunea în limba engleză care urmează este versiunea juridică ce guvernează acest acord. Prin trimiterea cererii tale ești de acord cu ea; numele tău scris reprezintă semnătura ta.',
    sections: [
      { heading: 'Bun venit', points: [
        'Acesta este un acord de colaborare prietenos între tine și GEL.IT.UP (GIUP®), ca parte a Programului nostru de Ambasadori — o colaborare între profesioniști, nu un loc de muncă. Iată ce face fiecare dintre noi.',
      ] },
      { heading: 'Pentru cine este', points: [
        'Programul de Ambasadori este exclusiv pentru tehnicieni de unghii calificați. Pentru a fi acceptat, fiecare aplicant trebuie să îndeplinească toate cele trei cerințe — sunt ferme și nenegociabile:',
        'Ești tehnician de unghii calificat, deținând o calificare sau certificare recunoscută în domeniul unghiilor.',
        'Îți prezinți activ propriile lucrări de unghii pe profilurile tale publice de social media — modele create de tine, nu repostate.',
        'Ai peste 500 de urmăritori pe profilul unde îți postezi lucrările de unghii.',
        'A deveni ambasador este o colaborare profesională serioasă, nu o simplă promovare de tip influencer. Aplicanții care nu îndeplinesc toate cele trei cerințe nu pot fi acceptați.',
      ] },
      { heading: 'Ce faci tu', points: [
        `Publică cel puțin ${POST_MIN} conținuturi proprii în fiecare lună folosind produsele GEL.IT.UP, incluzând cel puțin ${VIDEO_MIN} videoclipuri/reels pe Instagram și TikTok (dacă ai un cont TikTok).`,
        'Acest minim este stabilit având în vedere cantitatea de produse primită în fiecare pachet PR.',
        'Fiecare postare trebuie să includă hashtagul #gelitup și să menționeze @gelitupinternational pe Instagram sau @gelitupofficial pe TikTok.',
        `Trimite conținutul pe care îl creezi pe WhatsApp/Viber-ul nostru (${NUM}) ca să îl putem salva și promova.`,
        'Când distribui codul tău de reducere, te rugăm să reții că este valabil doar pentru site-ul www.gelitup.com.',
        'De asemenea, ești binevenit(ă) să adaugi GEL.IT.UP ca și colaborator la postările tale de pe Instagram și TikTok, astfel încât acestea să fie distribuite direct și pe profilurile noastre.',
        'Acolo unde regulile o cer (de ex. pentru că un produs a fost primit cadou), marchează pur și simplu ca parteneriat — #ad sau „gifted”.',
      ] },
      { heading: 'Codul tău de reducere și câștigurile', points: [
        `Primești un cod personal de reducere pe care să îl oferi urmăritorilor tăi care sunt tehnicieni de unghii reali, astfel încât să poată cumpăra GEL.IT.UP cu ${PCT}% reducere fixă.`,
        'Ești binevenit(ă) să distribui și să postezi codul public. Orice link folosit alături de el trebuie să ducă doar către www.gelitup.com — niciodată către site-uri de cupoane, oferte sau revânzare. Codurile folosite abuziv vor fi dezactivate.',
        'Primești automat un cont B2B pe Portalul GEL.IT.UP (gelitup.com/portal/login) — fără înregistrare separată. Vei primi un email pentru a-ți activa contul și a-ți seta parola.',
        'Fiecare comandă plasată cu codul tău îți aduce comision sub formă de credit în cont, aplicat automat la următoarea ta comandă. Comisionul începe de la 10%, crește la 15% odată ce totalul comenzilor plasate prin codul tău ajunge la €1,000, și la 20% odată ce ajunge la €2,000.',
      ] },
      { heading: 'Cum ne reprezinți', points: [
        'Ca ambasador ești o imagine a GEL.IT.UP, așa că îți cerem ca tot ceea ce faci cu produsele noastre să reflecte bine brandul.',
        'Folosește produsele profesional și conform instrucțiunilor, respectând ghidurile corecte de aplicare și siguranță. Nu revinde, nu transfera în alte recipiente, nu reeticheta și nu modifica produsele și nu face afirmații medicale sau înșelătoare.',
        'Păstrează conținutul și conduita ta publică respectuoase și în ton cu brandul — nimic care ar putea dăuna în mod rezonabil numelui sau reputației GEL.IT.UP. Dacă ceva ce postezi nu este în ton cu brandul, îți putem cere să ajustezi sau să elimini, iar dacă brandul este reprezentat greșit putem încheia parteneriatul.',
        'Nu crea propriile logo-uri GEL.IT.UP — acest lucru este strict interzis. Vei primi logo-uri oficiale în alb și negru. Nu sunt permise modificări, schimbări de culoare sau deformări, iar logo-ul poate fi utilizat doar pe conținutul creat cu produsele GEL.IT.UP.',
      ] },
      { heading: 'Ce facem noi', points: [
        'Îți promovăm lucrările pe canalele noastre și îți oferim codul personal de reducere pe care să îl distribui.',
        'Îți trimitem pachete PR cu care să creezi — de obicei aproximativ o dată pe lună, iar uneori mai des când apare un produs nou. Acestea sunt cadouri pentru a-ți susține conținutul, nu o vânzare, și depind de îndeplinirea minimului tău lunar de postări de mai sus. Acest lucru este corect având în vedere calitatea kiturilor pe care le oferim — dacă aceste minime nu sunt respectate, putem încheia colaborarea cu efect imediat.',
      ] },
      { heading: 'Utilizarea conținutului tău', points: [
        'Ne permiți să salvăm, repostăm, edităm pentru format și reutilizăm conținutul pe care ni-l trimiți sau în care ne etichetezi — pe canalele noastre, site, marketing și alte platforme, întotdeauna cu menționarea etichetelor tale.',
        'Dacă o altă țară încarcă sau distribuie materialele tale (fotografii/video), are dreptul să o facă cu condiția să te eticheteze. Reține că în acest caz codul tău de reducere nu se va aplica în acea țară.',
        'Conținutul tău poate fi de asemenea încărcat pe un drive central comun, accesibil echipelor GEL.IT.UP din alte țări, care îl pot reposta pe rețelele lor locale de social media, cu condiția să te menționeze folosind propriile tale nume de utilizator.',
        'Lucrarea trebuie să îți aparțină; păstrezi dreptul de proprietate, iar acest lucru rămâne valabil pentru orice a fost deja distribuit, chiar dacă ulterior te oprești.',
        'Te rugăm să reții că orice material încărcat care conține sigla noastră devine proprietatea GEL.IT.UP by GIUP®, numele și sigla fiind mărci înregistrate.',
      ] },
      { heading: 'Aspectele simple', points: [
        'Ești liber(ă) să lucrezi cu alte branduri — aceasta nu este o relație de muncă și nu există o plată garantată.',
        'Se desfășoară de la lună la lună și oricare dintre noi poate opri oricând. Dacă te oprești, codul tău de reducere este dezactivat; permisiunea pentru conținutul deja distribuit continuă.',
      ] },
      { heading: 'Semnătura ta', points: [
        'Prin bifarea căsuței și trimiterea cererii tale, ești de acord cu acestea. Numele tău scris reprezintă semnătura ta, datată în ziua în care aplici.',
      ] },
    ],
  },

  sq: {
    title: 'Marrëveshja e Ambasadorit',
    referenceNote: 'Përkthim për referencën tuaj. Versioni në gjuhën angleze që vijon është versioni zyrtar që rregullon kontratën.',
    governingNote: 'Versioni në gjuhën angleze që vijon është versioni ligjërisht i detyrueshëm. Duke dërguar aplikimin tuaj ju e pranoni atë; emri juaj i shkruar përbën nënshkrimin tuaj.',
    sections: [
      { heading: 'Mirë se vini', points: [
        'Kjo është një marrëveshje bashkëpunimi miqësore ndërmjet jush dhe GEL.IT.UP (GIUP®) si pjesë e Programit të Ambasadorëve — një bashkëpunim midis profesionistëve, jo një marrëdhënie pune.',
      ] },
      { heading: 'Për kë është', points: [
        'Programi i Ambasadorëve është ekskluzivisht për teknikë të kualifikuar të thonjve. Për t’u pranuar, çdo aplikant duhet të plotësojë këto tri kushte të panegociueshme:',
        'Jeni teknik/e i/e kualifikuar me një certifikatë ose diplomë të njohur.',
        'Tregoni aktivisht punën tuaj origjinale në profilet tuaja publike në rrjetet sociale.',
        'Keni mbi 500 ndjekës në profilin ku publikoni punimet tuaja.',
      ] },
      { heading: 'Çfarë bëni ju', points: [
        `Publikoni të paktën ${POST_MIN} postime origjinale çdo muaj me produktet GEL.IT.UP, duke përfshirë të paktën ${VIDEO_MIN} video/reels në Instagram dhe TikTok (nëse keni llogari TikTok).`,
        'Ky minimum pasqyron sasinë e produkteve të dhuruara në çdo paketë PR.',
        'Çdo postim duhet të përfshijë hashtagun #gelitup dhe të përmendë @gelitupinternational në Instagram ose @gelitupofficial në TikTok.',
        `Dërgoni materialet e krijuara në WhatsApp/Viber-in tonë (${NUM}) që t’i ruajmë dhe promovojmë.`,
        'Kodi juaj i zbritjes është i vlefshëm vetëm për faqen www.gelitup.com.',
        'Jeni të mirëpritur të shtoni GEL.IT.UP si bashkëpunëtor (collaborator) në postimet tuaja në Instagram dhe TikTok.',
        'Kur rregullat e kërkojnë, shënoni partneritetin me #ad ose «gifted».',
      ] },
      { heading: 'Kodi i zbritjes dhe fitimet tuaja', points: [
        `Merrni një kod personal zbritjeje për ndjekësit tuaj teknikë thonjsh, me një zbritje fikse prej ${PCT}%.`,
        'Kodi mund të ndahet publikisht, por lidhjet duhet të çojnë vetëm në www.gelitup.com — kurrë në faqe kuponësh apo rishitjesh.',
        'Përfitoni automatikisht një llogari B2B në Portalin GEL.IT.UP (gelitup.com/portal/login).',
        'Çdo porosi e bërë me kodin tuaj ju sjell komision në formë krediti në llogari (nga 10% deri në 20%).',
      ] },
      { heading: 'Përfaqësimi i markës', points: [
        'Si ambasador jeni imazh i GEL.IT.UP; gjithçka që bëni me produktet tona duhet të pasqyrojë cilësinë e markës.',
        'Përdorni produktet në mënyrë profesionale dhe sipas udhëzimeve. Mos i rishitni, mos ndryshoni etiketat dhe mos bëni pretendime mjekësore apo mashtruese.',
        'Mbani një sjellje publike korrekte dhe me respekt.',
        'Mos krijoni logot tuaja GEL.IT.UP — kjo është rreptësisht e ndaluar. Do t’ju sigurohen logot zyrtare bardh e zi pa asnjë ndryshim ngjyre apo modifikim, të cilat lejohen vetëm në materialet me produkte GEL.IT.UP.',
      ] },
      { heading: 'Çfarë bëjmë ne', points: [
        'Promovojmë punimet tuaja në kanalet tona dhe ju pajisim me kodin personal të zbritjes.',
        'Ju dërgojmë paketa PR mujore si dhurata për të mbështetur krijimtarinë tuaj.',
      ] },
      { heading: 'Përdorimi i përmbajtjes suaj', points: [
        'Na lejoni të ruajmë, ripostojmë dhe përdorim përmbajtjen që na dërgoni, gjithmonë duke ju kredituar me etiketimet tuaja.',
        'Nëse një shtet tjetër ngarkon materialet tuaja, ata kanë të drejtë ta bëjnë këtë me kusht që t’ju etiketojnë. Në këtë rast, kodi juaj i zbritjes nuk zbatohet në atë shtet.',
        'Përmbajtja juaj mund të ndahet në diskun qendror për ekipet ndërkombëtare të GEL.IT.UP.',
        'Puna mbetet e juaja; ju ruani pronësinë e krijimeve tuaja.',
        'Ju lutemi kini parasysh se çdo material i ngarkuar me logon tonë bëhet pronë e GEL.IT.UP by GIUP®, pasi emri dhe logoja janë marka të regjistruara tregtare.',
      ] },
      { heading: 'Kushtet e thjeshta', points: [
        'Jeni të lirë të punoni me marka të tjera — kjo nuk është marrëdhënie pune dhe nuk ka pagesë të garantuar.',
        'Marrëveshja është mujore dhe secila palë mund ta ndërpresë në çdo moment.',
      ] },
      { heading: 'Nënshkrimi juaj', points: [
        'Duke shënuar kutinë dhe dërguar aplikimin tuaj, ju pranoni këto kushte. Emri juaj i shkruar shërben si nënshkrimi juaj.',
      ] },
    ],
  },

  fr: {
    title: 'Contrat d’Ambassadeur',
    referenceNote: 'Traduction fournie à titre indicatif. La version anglaise qui suit est la version qui fait foi du contrat.',
    governingNote: 'La version anglaise qui suit est la version juridiquement contraignante de cet accord. En soumettant votre candidature, vous l’acceptez ; votre nom saisi constitue votre signature.',
    sections: [
      { heading: 'Bienvenue', points: [
        'Ceci est un accord de collaboration convivial entre vous et GEL.IT.UP (GIUP®), dans le cadre de notre Programme Ambassadeurs — une collaboration entre professionnels, pas un emploi. Voici ce que chacun fait.',
      ] },
      { heading: 'À qui cela s’adresse', points: [
        'Le Programme Ambassadeurs est réservé exclusivement aux prothésistes ongulaires qualifié·e·s. Pour être accepté·e, chaque candidat·e doit remplir ces trois conditions — elles sont fermes et non négociables :',
        'Vous êtes prothésiste ongulaire qualifié·e, titulaire d’une qualification ou certification reconnue.',
        'Vous montrez activement vos propres réalisations d’ongles sur vos profils publics — des créations réalisées par vous, non repartagées.',
        'Vous avez plus de 500 abonnés sur le profil où vous publiez vos réalisations d’ongles.',
        'Devenir ambassadeur est une collaboration professionnelle sérieuse, pas une simple promotion d’influenceur. Les candidat·e·s qui ne remplissent pas les trois conditions ne peuvent pas être accepté·e·s.',
      ] },
      { heading: 'Ce que vous faites', points: [
        `Publiez au moins ${POST_MIN} contenus originaux chaque mois avec les produits GEL.IT.UP, dont au moins ${VIDEO_MIN} vidéos/reels sur Instagram et TikTok (si vous avez un compte TikTok).`,
        'Ce minimum reflète la quantité de produit offerte dans chaque colis PR.',
        'Chaque publication doit inclure le hashtag #gelitup et mentionner @gelitupinternational sur Instagram ou @gelitupofficial sur TikTok.',
        `Envoyez le contenu que vous créez à notre WhatsApp/Viber (${NUM}) afin que nous puissions l’enregistrer et le mettre en avant.`,
        'Lorsque vous partagez votre code de réduction, veuillez noter qu’il est uniquement valable sur le site www.gelitup.com.',
        'Vous pouvez aussi ajouter GEL.IT.UP comme collaborateur à vos publications Instagram et TikTok, afin qu’elles soient partagées directement sur nos profils.',
        'Lorsque les règles l’exigent (par ex. parce qu’un produit a été offert), indiquez simplement le partenariat — #ad ou « gifted ».',
      ] },
      { heading: 'Votre code de réduction et vos gains', points: [
        `Vous recevez un code de réduction personnel à donner à vos abonnés qui sont de vrais prothésistes ongulaires, pour qu’ils achètent GEL.IT.UP avec ${PCT}% de remise fixe.`,
        'Vous pouvez partager et publier votre code publiquement. Tout lien utilisé avec celui-ci doit renvoyer uniquement vers www.gelitup.com — jamais vers des sites de coupons, de bons plans ou de revente. Les codes utilisés de manière abusive seront désactivés.',
        'Un compte B2B sur le Portail GEL.IT.UP (gelitup.com/portal/login) vous est attribué automatiquement — aucune inscription séparée. Vous recevrez un e-mail pour activer votre compte et définir votre mot de passe.',
        'Chaque commande passée avec votre code vous rapporte une commission sous forme de crédit sur votre compte, appliqué automatiquement à votre prochaine commande. La commission démarre à 10%, passe à 15% lorsque le total des commandes passées avec votre code atteint €1,000, et à 20% lorsqu’il atteint €2,000.',
      ] },
      { heading: 'Bien nous représenter', points: [
        'En tant qu’ambassadeur, vous êtes un visage de GEL.IT.UP ; nous vous demandons donc que tout ce que vous faites avec nos produits reflète bien la marque.',
        'Utilisez les produits de manière professionnelle et conforme aux instructions, en suivant les consignes d’application et de sécurité. Ne revendez pas, ne transvasez pas, ne réétiquetez pas et n’altérez pas les produits, et ne faites pas d’allégations médicales ou trompeuses.',
        'Gardez votre contenu et votre conduite publique respectueux et fidèles à la marque — rien qui puisse raisonnablement nuire au nom ou à la réputation de GEL.IT.UP. Si une publication est hors-marque, nous pouvons vous demander de l’ajuster ou de la retirer, et nous pouvons mettre fin au partenariat si la marque est mal représentée.',
        'Ne créez pas vos propres logos GEL.IT.UP — cela est strictement interdit. Des logos officiels en noir et blanc vous sont fournis. Aucune modification de couleur ou altération n’est permise, et le logo doit être utilisé uniquement sur des contenus créés avec les produits GEL.IT.UP.',
      ] },
      { heading: 'Ce que nous faisons', points: [
        'Nous mettons en avant votre travail sur nos canaux et vous fournissons votre code de réduction personnel à partager.',
        'Nous vous envoyons des colis presse (PR) pour créer — généralement environ une fois par mois, et parfois plus souvent lors d’un nouveau lancement. Ce sont des cadeaux pour soutenir votre contenu, pas une vente, et ils dépendent du respect de vos minimums de publication mensuels ci-dessus. C’est équitable compte tenu de la qualité des kits fournis — si ces minimums ne sont pas respectés, nous pouvons mettre fin à la collaboration avec effet immédiat.',
      ] },
      { heading: 'Utilisation de votre contenu', points: [
        'Vous nous autorisez à enregistrer, repartager, adapter au format et réutiliser le contenu que vous nous envoyez ou dans lequel vous nous identifiez — sur nos canaux, notre site, notre marketing et d’autres plateformes, toujours crédité avec vos identifiants.',
        'Si un autre pays téléverse ou partage vos médias (photos/vidéos), il est autorisé à le faire à condition de vous identifier. Veuillez noter que dans ce cas, votre code de réduction ne s’appliquera pas à ce pays.',
        'Votre contenu peut également être téléversé sur un drive central partagé, accessible aux équipes GEL.IT.UP d’autres pays, qui peuvent le repartager sur leurs réseaux sociaux locaux, à condition de vous créditer avec vos propres identifiants.',
        'Le travail doit être le vôtre ; vous en conservez la propriété, et cela reste valable pour tout contenu déjà partagé même si vous arrêtez par la suite.',
        'Veuillez noter que tout contenu mis en ligne comportant notre logo devient la propriété de GEL.IT.UP by GIUP®, le nom et le logo étant des marques déposées.',
      ] },
      { heading: 'Les points simples', points: [
        'Vous êtes libre de travailler avec d’autres marques — ce n’est pas un emploi et il n’y a aucune rémunération garantie.',
        'Cela fonctionne au mois le mois et chacun peut arrêter à tout moment. Si vous arrêtez, votre code de réduction est désactivé ; l’autorisation pour le contenu déjà partagé demeure.',
      ] },
      { heading: 'Votre signature', points: [
        'En cochant la case et en soumettant votre candidature, vous acceptez ceci. Votre nom saisi est votre signature, datée du jour de votre candidature.',
      ] },
    ],
  },

  de: {
    title: 'Ambassador-Vertrag',
    referenceNote: 'Übersetzung zu deiner Information. Die nachfolgende englische Fassung ist die maßgebliche Vertragsfassung.',
    governingNote: 'Die nachfolgende englische Fassung ist die rechtlich maßgebliche Fassung dieser Vereinbarung. Mit dem Absenden deiner Bewerbung stimmst du ihr zu; dein eingegebener Name gilt als deine Unterschrift.',
    sections: [
      { heading: 'Willkommen', points: [
        'Dies ist eine freundschaftliche Arbeitsvereinbarung zwischen dir und GEL.IT.UP (GIUP®) im Rahmen unseres Ambassador-Programms — eine Zusammenarbeit zwischen Profis, kein Job. Hier ist, was jede Seite tut.',
      ] },
      { heading: 'Für wen das ist', points: [
        'Das Ambassador-Programm ist ausschließlich für qualifizierte Nageldesigner:innen. Um angenommen zu werden, muss jede:r Bewerber:in alle drei Voraussetzungen erfüllen — sie sind verbindlich und nicht verhandelbar:',
        'Du bist qualifizierte:r Nageldesigner:in mit einer anerkannten Nagelqualifikation oder Zertifizierung.',
        'Du zeigst aktiv deine eigene Nagelarbeit auf deinen öffentlichen Profilen — von dir selbst erstellte Sets, keine Reposts.',
        'Du hast mehr als 500 Follower auf dem Profil, auf dem du deine Nagelarbeit postest.',
        'Ambassador zu werden ist eine ernsthafte professionelle Zusammenarbeit, keine allgemeine Influencer-Werbung. Bewerber:innen, die nicht alle drei Voraussetzungen erfüllen, können nicht angenommen werden.',
      ] },
      { heading: 'Was du tust', points: [
        `Teile jeden Monat mindestens ${POST_MIN} eigene Inhalte mit GEL.IT.UP-Produkten, darunter mindestens ${VIDEO_MIN} Videos/Reels auf Instagram und TikTok (falls du ein TikTok-Konto hast).`,
        'Dieses Minimum spiegelt die Menge an Produkten wider, die in jedem PR-Paket enthalten sind.',
        'Jeder Beitrag muss den Hashtag #gelitup enthalten und @gelitupinternational auf Instagram bzw. @gelitupofficial auf TikTok erwähnen.',
        `Sende die von dir erstellten Inhalte an unser WhatsApp/Viber (${NUM}), damit wir sie speichern und zeigen können.`,
        'Bitte beachte bei der Weitergabe deines Rabattcodes, dass dieser ausschließlich für www.gelitup.com gilt.',
        'Du kannst GEL.IT.UP auch als Mitwirkende:n zu deinen Instagram- und TikTok-Beiträgen hinzufügen, damit sie direkt auf unseren Profilen geteilt werden.',
        'Wo die Regeln es verlangen (z. B. weil ein Produkt geschenkt wurde), kennzeichne es einfach als Partnerschaft — #ad oder „gifted“.',
      ] },
      { heading: 'Dein Rabattcode & Verdienst', points: [
        `Du erhältst einen persönlichen Rabattcode für deine Follower, die echte Nageldesigner:innen sind, damit sie GEL.IT.UP mit ${PCT}% pauschalem Rabatt kaufen können.`,
        'Du darfst deinen Code öffentlich teilen und posten. Jeder Link, den du dazu verwendest, muss ausschließlich zu www.gelitup.com führen — niemals zu Gutschein-, Deal- oder Wiederverkaufsseiten. Missbräuchlich verwendete Codes werden deaktiviert.',
        'Du erhältst automatisch ein B2B-Konto im GEL.IT.UP-Portal (gelitup.com/portal/login) — keine separate Registrierung nötig. Du bekommst eine E-Mail, um dein Konto zu aktivieren und dein Passwort festzulegen.',
        'Jede mit deinem Code aufgegebene Bestellung bringt dir eine Provision als Guthaben, das automatisch auf deine nächste Bestellung angerechnet wird. Die Provision beginnt bei 10%, steigt auf 15%, sobald die gesamten über deinen Code aufgegebenen Bestellungen €1,000 erreichen, und auf 20% bei €2,000.',
      ] },
      { heading: 'Uns gut vertreten', points: [
        'Als Ambassador bist du ein Gesicht von GEL.IT.UP, daher bitten wir dich, dass alles, was du mit unseren Produkten tust, die Marke gut widerspiegelt.',
        'Verwende die Produkte professionell und wie angegeben und befolge die korrekte Anwendungs- und Sicherheitsanleitung. Verkaufe sie nicht weiter, fülle sie nicht um, etikettiere sie nicht neu und manipuliere sie nicht, und mache keine medizinischen oder irreführenden Aussagen.',
        'Halte deine Inhalte und dein öffentliches Verhalten respektvoll und markenkonform — nichts, was dem Namen oder Ruf von GEL.IT.UP vernünftigerweise schaden könnte. Ist ein Beitrag off-brand, können wir dich bitten, ihn anzupassen oder zu entfernen, und wir können die Partnerschaft beenden, wenn die Marke falsch dargestellt wird.',
        'Erstelle keine eigenen GEL.IT.UP-Logos — dies ist strengstens untersagt. Es werden offizielle Logos in Schwarz und Weiß bereitgestellt. Farbänderungen oder Verzerrungen sind nicht gestattet; das Logo darf nur auf Medien mit GEL.IT.UP-Produkten verwendet werden.',
      ] },
      { heading: 'Was wir tun', points: [
        'Wir stellen deine Arbeit auf unseren Kanälen vor und geben dir deinen persönlichen Rabattcode zum Teilen.',
        'Wir senden dir PR-Pakete zum Gestalten — meist etwa einmal im Monat und manchmal häufiger bei einem neuen Produkt-Launch. Diese sind Geschenke zur Unterstützung deiner Inhalte, kein Verkauf, und hängen davon ab, dass du deine oben genannten monatlichen Mindestposts einhältst. Das ist angesichts der Qualität der bereitgestellten Kits fair — werden diese Mindestwerte nicht erreicht, können wir die Zusammenarbeit mit sofortiger Wirkung beenden.',
      ] },
      { heading: 'Nutzung deiner Inhalte', points: [
        'Du erlaubst uns, die Inhalte, die du uns sendest oder in denen du uns markierst, zu speichern, erneut zu posten, für das Format zu bearbeiten und wiederzuverwenden — auf unseren Kanälen, unserer Website, im Marketing und auf anderen Plattformen, stets mit Nennung deiner Tags.',
        'Sollte ein anderes Land deine Medien (Fotos/Videos) hochladen oder teilen, ist es dazu berechtigt, sofern du markiert wirst. Beachte bitte, dass dein Rabattcode in diesem Fall nicht für dieses Land gilt.',
        'Deine Inhalte können außerdem in ein gemeinsames zentrales Laufwerk hochgeladen werden, auf das GEL.IT.UP-Teams in anderen Ländern zugreifen können, die sie auf ihren lokalen Social-Media-Kanälen erneut posten dürfen, sofern sie dich mit deinen eigenen Handles nennen.',
        'Die Arbeit muss deine eigene sein; du behältst das Eigentum, und dies gilt auch für bereits Geteiltes, selbst wenn du später aufhörst.',
        'Bitte beachte, dass alle mit unserem Logo hochgeladenen Inhalte Eigentum von GEL.IT.UP by GIUP® werden, da der Name und das Logo eingetragene Warenzeichen sind.',
      ] },
      { heading: 'Das Einfache', points: [
        'Es steht dir frei, mit anderen Marken zu arbeiten — dies ist kein Arbeitsverhältnis und es gibt keine garantierte Bezahlung.',
        'Es läuft monatlich und beide Seiten können jederzeit aufhören. Wenn du aufhörst, wird dein Rabattcode deaktiviert; die Erlaubnis für bereits geteilte Inhalte bleibt bestehen.',
      ] },
      { heading: 'Deine Unterschrift', points: [
        'Indem du das Kästchen ankreuzt und deine Bewerbung absendest, stimmst du dem zu. Dein eingegebener Name ist deine Unterschrift, datiert auf den Tag deiner Bewerbung.',
      ] },
    ],
  },

  es: {
    title: 'Contrato de Embajador/a',
    referenceNote: 'Traducción para tu referencia. La versión en inglés que sigue es la versión que rige el contrato.',
    governingNote: 'La versión en inglés que sigue es la versión legalmente vinculante de este acuerdo. Al enviar tu solicitud, la aceptas; tu nombre escrito constituye tu firma.',
    sections: [
      { heading: 'Bienvenida', points: [
        'Este es un acuerdo de colaboración cercano entre tú y GEL.IT.UP (GIUP®), como parte de nuestro Programa de Embajadores — una colaboración entre profesionales, no un empleo. Esto es lo que hace cada parte.',
      ] },
      { heading: 'Para quién es', points: [
        'El Programa de Embajadores es exclusivamente para técnicos/as de uñas cualificados/as. Para ser aceptado/a, cada solicitante debe cumplir los tres requisitos — son firmes y no negociables:',
        'Eres técnico/a de uñas cualificado/a, con una cualificación o certificación de uñas reconocida.',
        'Muestras activamente tu propio trabajo de uñas en tus perfiles públicos — diseños creados por ti, no reposteados.',
        'Tienes más de 500 seguidores en el perfil donde publicas tu trabajo de uñas.',
        'Ser embajador/a es una colaboración profesional seria, no una promoción de influencer general. No se puede aceptar a solicitantes que no cumplan los tres requisitos.',
      ] },
      { heading: 'Lo que haces', points: [
        `Publica al menos ${POST_MIN} contenidos propios cada mes usando productos GEL.IT.UP, incluyendo al menos ${VIDEO_MIN} vídeos/reels en Instagram y TikTok (si tienes una cuenta de TikTok).`,
        'Este mínimo refleja la cantidad de producto incluida en cada paquete de PR.',
        'Cada publicación debe incluir el hashtag #gelitup y mencionar a @gelitupinternational en Instagram o @gelitupofficial en TikTok.',
        `Envía el contenido que crees a nuestro WhatsApp/Viber (${NUM}) para que podamos guardarlo y destacarlo.`,
        'Ten en cuenta que tu código de descuento es válido únicamente en www.gelitup.com.',
        'También puedes añadir a GEL.IT.UP como colaborador en tus publicaciones de Instagram y TikTok, para que se compartan directamente en nuestros perfiles.',
        'Cuando las normas lo exijan (p. ej. porque un producto fue un regalo), simplemente márcalo como colaboración — #ad o «gifted».',
      ] },
      { heading: 'Tu código de descuento y ganancias', points: [
        `Obtienes un código de descuento personal para dar a tus seguidores que sean técnicos/as de uñas reales, para que compren GEL.IT.UP con un ${PCT}% de descuento fijo.`,
        'Puedes compartir y publicar tu código públicamente. Cualquier enlace que uses junto a él debe llevar solo a www.gelitup.com — nunca a sitios de cupones, ofertas o reventa. Los códigos usados de forma indebida se desactivarán.',
        'Se te asigna automáticamente una cuenta B2B en el Portal GEL.IT.UP (gelitup.com/portal/login) — sin registro aparte. Recibirás un correo para activar tu cuenta y establecer tu contraseña.',
        'Cada pedido realizado con tu código te genera comisión como crédito en tu cuenta, aplicado automáticamente a tu propio próximo pedido. La comisión empieza en 10%, sube a 15% cuando el total de pedidos realizados con tu código alcanza €1,000, y a 20% cuando alcanza €2,000.',
      ] },
      { heading: 'Representarnos bien', points: [
        'Como embajador/a eres una cara de GEL.IT.UP, así que te pedimos que todo lo que hagas con nuestros productos refleje bien la marca.',
        'Usa los productos de forma profesional y según las indicaciones, siguiendo la guía correcta de aplicación y seguridad. No los revendas, trasvases, reetiquetes ni manipules, y no hagas afirmaciones médicas o engañosas.',
        'Mantén tu contenido y tu conducta pública respetuosos y acordes con la marca — nada que pueda dañar razonablemente el nombre o la reputación de GEL.IT.UP. Si algo que publicas no encaja con la marca, podemos pedirte que lo ajustes o elimines, y podemos terminar la colaboración si se tergiversa la marca.',
        'No crees tus propios logotipos de GEL.IT.UP — está estrictamente prohibido. Se te proporcionarán logotipos oficiales en blanco y negro sin alteraciones ni cambios de color, permitidos únicamente en medios con productos GEL.IT.UP.',
      ] },
      { heading: 'Lo que hacemos', points: [
        'Destacamos tu trabajo en nuestros canales y te damos tu código de descuento personal para compartir.',
        'Te enviamos paquetes de PR para crear — normalmente una vez al mes, y a veces con más frecuencia cuando hay un nuevo lanzamiento. Son regalos para apoyar tu contenido, no una venta, y dependen de que cumplas tus mínimos mensuales de publicación indicados arriba. Esto es justo dada la calidad de los kits que ofrecemos — si no se cumplen esos mínimos, podemos terminar la colaboración con efecto inmediato.',
      ] },
      { heading: 'Uso de tu contenido', points: [
        'Nos permites guardar, repostear, editar para el formato y reutilizar el contenido que nos envías o en el que nos etiquetas — en nuestros canales, web, marketing y otras plataformas, siempre acreditado con tus etiquetas.',
        'Si otro país sube o comparte tus contenidos (fotos/vídeos), tiene derecho a hacerlo siempre que te etiquete. En ese caso, tu código de descuento no se aplicará a ese país.',
        'Tu contenido también puede subirse a una unidad central compartida, accesible por los equipos de GEL.IT.UP de otros países, que pueden repostearlo en sus redes sociales locales, siempre que te acrediten con tus propios usuarios.',
        'El trabajo debe ser tuyo; conservas la propiedad, y esto sigue siendo válido para lo ya compartido aunque después lo dejes.',
        'Ten en cuenta que cualquier material subido con nuestro logotipo pasa a ser propiedad de GEL.IT.UP by GIUP®, ya que el nombre y el logotipo son marcas registradas.',
      ] },
      { heading: 'Lo sencillo', points: [
        'Eres libre de trabajar con otras marcas — esto no es un empleo y no hay pago garantizado.',
        'Funciona mes a mes y cualquiera de las partes puede terminarlo en cualquier momento. Si lo dejas, tu código de descuento se desactiva; el permiso para el contenido ya compartido continúa.',
      ] },
      { heading: 'Tu firma', points: [
        'Al marcar la casilla y enviar tu solicitud, aceptas esto. Tu nombre escrito es tu firma, fechada el día en que te postulas.',
      ] },
    ],
  },

  pt: {
    title: 'Contrato de Embaixador/a',
    referenceNote: 'Tradução para tua referência. A versão em inglês que se segue é a versão que rege o contrato.',
    governingNote: 'A versão em inglês que se segue é a versão juridicamente vinculativa deste acordo. Ao submeteres a tua candidatura, aceita-la; o teu nome escrito constitui a tua assinatura.',
    sections: [
      { heading: 'Bem-vindo/a', points: [
        'Este é um acordo de colaboração próximo entre ti e a GEL.IT.UP (GIUP®), no âmbito do nosso Programa de Embaixadores — uma colaboração entre profissionais, não um emprego. Eis o que cada parte faz.',
      ] },
      { heading: 'Para quem é', points: [
        'O Programa de Embaixadores é exclusivamente para técnicos/as de unhas qualificados/as. Para seres aceite, cada candidato/a tem de cumprir os três requisitos — são firmes e não negociáveis:',
        'És técnico/a de unhas qualificado/a, com uma qualificação ou certificação reconhecida na área.',
        'Mostras ativamente o teu próprio trabalho de unhas nos teus perfis públicos — trabalhos criados por ti, não repostados.',
        'Tens mais de 500 seguidores no perfil onde publicas o teu trabalho de unhas.',
        'Tornar-se embaixador/a é uma colaboração profissional séria, não uma promoção de influenciador comum. Candidatos/as que não cumpram os três requisitos não podem ser aceites.',
      ] },
      { heading: 'O que tu fazes', points: [
        `Publica pelo menos ${POST_MIN} conteúdos próprios por mês usando produtos GEL.IT.UP, incluindo pelo menos ${VIDEO_MIN} vídeos/reels no Instagram e no TikTok (se tiveres conta de TikTok).`,
        'Este mínimo reflete a quantidade de produto incluída em cada pacote de PR.',
        'Cada publicação deve incluir o hashtag #gelitup e mencionar @gelitupinternational no Instagram ou @gelitupofficial no TikTok.',
        `Envia o conteúdo que crias para o nosso WhatsApp/Viber (${NUM}) para que o possamos guardar e destacar.`,
        'Tem em atenção que o teu código de desconto é válido apenas em www.gelitup.com.',
        'Também podes adicionar a GEL.IT.UP como colaborador nas tuas publicações de Instagram e TikTok, para que sejam partilhadas diretamente nos nossos perfis.',
        'Quando as regras o exigirem (por ex. porque um produto foi oferecido), basta assinalar como parceria — #ad ou «gifted».',
      ] },
      { heading: 'O teu código de desconto e ganhos', points: [
        `Recebes um código de desconto pessoal para dar aos teus seguidores que sejam técnicos/as de unhas reais, para que comprem GEL.IT.UP com ${PCT}% de desconto fixo.`,
        'Podes partilhar e publicar o teu código publicamente. Qualquer link que uses com ele deve levar apenas a www.gelitup.com — nunca a sites de cupões, promoções ou revenda. Códigos usados indevidamente serão desativados.',
        'É-te atribuída automaticamente uma conta B2B no Portal GEL.IT.UP (gelitup.com/portal/login) — sem registo separado. Receberás um email para ativar a conta e definir a palavra-passe.',
        'Cada encomenda feita com o teu código gera comissão como crédito na conta, aplicado automaticamente à tua próxima encomenda. A comissão começa em 10%, sobe para 15% quando o total de encomendas feitas com o teu código atinge €1,000, e para 20% quando atinge €2,000.',
      ] },
      { heading: 'Representar-nos bem', points: [
        'Como embaixador/a és um rosto da GEL.IT.UP, por isso pedimos que tudo o que fazes com os nossos produtos reflita bem a marca.',
        'Usa os produtos de forma profissional e conforme indicado, seguindo as orientações corretas de aplicação e segurança. Não os revendas, transfiras, reetiquetes nem adulteres, e não faças alegações médicas ou enganosas.',
        'Mantém o teu conteúdo e conduta pública respeitosos e alinhados com a marca — nada que possa razoavelmente prejudicar o nome ou a reputação da GEL.IT.UP. Se algo que publicas estiver fora da marca, podemos pedir-te que ajustes ou removas, e podemos terminar a parceria se a marca for deturpada.',
        'Não cries os teus próprios logótipos da GEL.IT.UP — é estritamente proibido. Serão fornecidos logótipos oficiais em preto e branco sem alterações, permitidos apenas em conteúdos com produtos GEL.IT.UP.',
      ] },
      { heading: 'O que nós fazemos', points: [
        'Destacamos o teu trabalho nos nossos canais e damos-te o teu código de desconto pessoal para partilhares.',
        'Enviamos-te pacotes de PR para criares — normalmente cerca de uma vez por mês, e por vezes mais quando há um novo lançamento. São ofertas para apoiar o teu conteúdo, não uma venda, e dependem de cumprires os teus mínimos mensais de publicação acima. Isto é justo dada a qualidade dos kits que fornecemos — se esses mínimos não forem cumpridos, podemos terminar a colaboração com efeito imediato.',
      ] },
      { heading: 'Utilização do teu conteúdo', points: [
        'Autorizas-nos a guardar, repostar, editar para o formato e reutilizar o conteúdo que nos envias ou em que nos marcas — nos nossos canais, site, marketing e outras plataformas, sempre creditado com as tuas tags.',
        'Se outro país publicar os teus conteúdos (fotos/vídeos), tem o direito de o fazer desde que te identifique. Nota que, nesse caso, o teu código de desconto não se aplicará nesse país.',
        'O teu conteúdo também pode ser carregado numa drive central partilhada, acessível às equipas GEL.IT.UP de outros países, que o podem repostar nas suas redes sociais locais, desde que te creditem com os teus próprios nomes de utilizador.',
        'O trabalho deve ser teu; manténs a propriedade, e isto mantém-se válido para o que já foi partilhado mesmo que mais tarde deixes.',
        'Tem em atenção que qualquer conteúdo partilhado com o nosso logótipo torna-se propriedade da GEL.IT.UP by GIUP®, sendo o nome e o logótipo marcas registadas.',
      ] },
      { heading: 'As coisas simples', points: [
        'És livre de trabalhar com outras marcas — isto não é um emprego e não há pagamento garantido.',
        'Funciona mês a mês e qualquer das partes pode terminar a qualquer momento. Se parares, o teu código de desconto é desativado; a permissão para o conteúdo já partilhado continua.',
      ] },
      { heading: 'A tua assinatura', points: [
        'Ao assinalar a caixa e submeter a tua candidatura, concordas com isto. O teu nome escrito é a tua assinatura, datada do dia em que te candidatas.',
      ] },
    ],
  },

  pl: {
    title: 'Umowa Ambasadora',
    referenceNote: 'Tłumaczenie do Twojej wiadomości. Poniższa wersja angielska jest wiążącą wersją umowy.',
    governingNote: 'Poniższa wersja angielska jest prawnie wiążącą wersją tej umowy. Wysyłając zgłoszenie, akceptujesz ją; Twoje wpisane imię i nazwisko stanowi Twój podpis.',
    sections: [
      { heading: 'Witaj', points: [
        'To przyjazna umowa o współpracy między Tobą a GEL.IT.UP (GIUP®) w ramach naszego Programu Ambasadorów — współpraca między profesjonalistami, a nie zatrudnienie. Oto co robi każda ze stron.',
      ] },
      { heading: 'Dla kogo to jest', points: [
        'Program Ambasadorów jest przeznaczony wyłącznie dla wykwalifikowanych stylistek/ów paznokci. Aby zostać przyjętym, każdy kandydat musi spełnić wszystkie trzy wymagania — są one stanowcze i nienegocjowalne:',
        'Jesteś wykwalifikowaną/ym stylistką/em paznokci, posiadającą/ym uznane kwalifikacje lub certyfikat.',
        'Aktywnie pokazujesz własne prace paznokciowe na swoich publicznych profilach — zestawy stworzone przez Ciebie, nie udostępnione ponownie.',
        'Masz ponad 500 obserwujących na profilu, na którym publikujesz swoje prace paznokciowe.',
        'Zostanie ambasadorem to poważna współpraca zawodowa, a nie zwykła promocja influencerska. Kandydaci, którzy nie spełniają wszystkich trzech wymagań, nie mogą zostać przyjęci.',
      ] },
      { heading: 'Co robisz', points: [
        `Publikuj co najmniej ${POST_MIN} własnych treści miesięcznie z produktami GEL.IT.UP, w tym co najmniej ${VIDEO_MIN} filmów/rolek na Instagramie i TikToku (jeśli masz konto na TikToku).`,
        'To minimum odzwierciedla ilość produktów otrzymywanych w każdej paczce PR.',
        'Każdy post musi zawierać hashtag #gelitup oraz oznaczać @gelitupinternational na Instagramie lub @gelitupofficial na TikToku.',
        `Wysyłaj tworzone treści na nasz WhatsApp/Viber (${NUM}), abyśmy mogli je zapisać i wyróżnić.`,
        'Pamiętaj, że Twój kod rabatowy obowiązuje wyłącznie na stronie www.gelitup.com.',
        'Możesz też dodać GEL.IT.UP jako współautora swoich postów na Instagramie i TikToku, aby były udostępniane bezpośrednio na naszych profilach.',
        'Gdy wymagają tego przepisy (np. ponieważ produkt był prezentem), po prostu oznacz to jako współpracę — #ad lub „gifted”.',
      ] },
      { heading: 'Twój kod rabatowy i zarobki', points: [
        `Otrzymujesz osobisty kod rabatowy dla obserwujących, którzy są prawdziwymi stylistkami/ami paznokci, aby mogli kupić GEL.IT.UP z ${PCT}% stałym rabatem.`,
        'Możesz udostępniać i publikować swój kod publicznie. Każdy link użyty razem z nim musi prowadzić wyłącznie do www.gelitup.com — nigdy do stron z kuponami, ofertami czy odsprzedażą. Kody używane niewłaściwie zostaną dezaktywowane.',
        'Automatycznie otrzymujesz konto B2B w Portalu GEL.IT.UP (gelitup.com/portal/login) — bez osobnej rejestracji. Otrzymasz e-mail, aby aktywować konto i ustawić hasło.',
        'Każde zamówienie złożone z Twoim kodem daje Ci prowizję w postaci kredytu na koncie, automatycznie naliczaną na Twoje kolejne zamówienie. Prowizja zaczyna się od 10%, rośnie do 15%, gdy łączna wartość zamówień złożonych z Twoim kodem osiągnie €1,000, i do 20%, gdy osiągnie €2,000.',
      ] },
      { heading: 'Dobre reprezentowanie nas', points: [
        'Jako ambasador jesteś twarzą GEL.IT.UP, dlatego prosimy, aby wszystko, co robisz z naszymi produktami, dobrze odzwierciedlało markę.',
        'Używaj produktów profesjonalnie i zgodnie z zaleceniami, przestrzegając prawidłowych wskazówek dotyczących aplikacji i bezpieczeństwa. Nie odsprzedawaj, nie przelewaj, nie zmieniaj etykiet ani nie modyfikuj produktów i nie składaj twierdzeń medycznych ani wprowadzających w błąd.',
        'Utrzymuj swoje treści i publiczne zachowanie z szacunkiem i zgodnie z marką — nic, co mogłoby rozsądnie zaszkodzić nazwie lub reputacji GEL.IT.UP. Jeśli coś, co publikujesz, jest niezgodne z marką, możemy poprosić o dostosowanie lub usunięcie, a jeśli marka jest przedstawiana błędnie, możemy zakończyć współpracę.',
        'Nie twórz własnych logo GEL.IT.UP — jest to surowo zabronione. Otrzymasz oficjalne logo w kolorze czarnym i białym bez żadnych modyfikacji, dozwolone wyłącznie w materiałach z produktami GEL.IT.UP.',
      ] },
      { heading: 'Co my robimy', points: [
        'Wyróżniamy Twoje prace na naszych kanałach i dajemy Ci osobisty kod rabatowy do udostępniania.',
        'Wysyłamy Ci paczki PR do tworzenia — zwykle mniej więcej raz w miesiącu, a czasem częściej przy premierze nowego produktu. Są to prezenty wspierające Twoje treści, a nie sprzedaż, i zależą od spełniania powyższych miesięcznych minimów publikacji. To uczciwe, biorąc pod uwagę jakość dostarczanych zestawów — jeśli te minima nie są spełniane, możemy zakończyć współpracę ze skutkiem natychmiastowym.',
      ] },
      { heading: 'Wykorzystanie Twoich treści', points: [
        'Zezwalasz nam na zapisywanie, ponowne publikowanie, edytowanie pod kątem formatu i ponowne wykorzystywanie treści, które nam przesyłasz lub w których nas oznaczasz — na naszych kanałach, stronie, w marketingu i na innych platformach, zawsze z podaniem Twoich oznaczeń.',
        'Gdy zespoły GEL.IT.UP w innych krajach udostępniają Twoje zdjęcia i filmy, mają do tego prawo pod warunkiem oznaczenia Twojego profilu. Pamiętaj, że w takim przypadku Twój kod rabatowy nie będzie obowiązywał w tym kraju.',
        'Twoje treści mogą być również przesyłane na wspólny dysk centralny dostępny dla zespołów GEL.IT.UP w innych krajach, które mogą je ponownie publikować w swoich lokalnych mediach społecznościowych, pod warunkiem oznaczenia Cię Twoimi własnymi nazwami użytkownika.',
        'Praca musi być Twoja własna; zachowujesz prawo własności, a dotyczy to również treści już udostępnionych, nawet jeśli później zrezygnujesz.',
        'Pamiętaj, że wszelkie materiały przesyłane z naszym logo stają się własnością GEL.IT.UP by GIUP®, jako że nazwa i logo są zastrzeżonymi znakami towarowymi.',
      ] },
      { heading: 'Proste sprawy', points: [
        'Możesz współpracować z innymi markami — to nie jest zatrudnienie i nie ma gwarantowanej zapłaty.',
        'Obowiązuje z miesiąca na miesiąc i każda ze stron może zrezygnować w dowolnym momencie. Jeśli zrezygnujesz, Twój kod rabatowy zostanie dezaktywowany; zgoda na już udostępnione treści pozostaje w mocy.',
      ] },
      { heading: 'Twój podpis', points: [
        'Zaznaczając pole i wysyłając zgłoszenie, wyrażasz na to zgodę. Twoje wpisane imię i nazwisko jest Twoim podpisem, opatrzonym datą dnia, w którym składasz zgłoszenie.',
      ] },
    ],
  },

  hu: {
    title: 'Nagyköveti Szerződés',
    referenceNote: 'Fordítás tájékoztatásul. Az alábbi angol változat a szerződés irányadó változata.',
    governingNote: 'Az alábbi angol változat e megállapodás jogilag irányadó változata. A jelentkezésed elküldésével elfogadod; a beírt neved az aláírásodnak minősül.',
    sections: [
      { heading: 'Üdvözlünk', points: [
        'Ez egy baráti együttműködési megállapodás közted és a GEL.IT.UP (GIUP®) között a Nagykövet Programunk keretében — szakemberek közötti együttműködés, nem munkaviszony. Íme, mit tesz mindkét fél.',
      ] },
      { heading: 'Kinek szól', points: [
        'A Nagykövet Program kizárólag képzett műkörmösöknek szól. Az elfogadáshoz minden jelentkezőnek mindhárom feltételt teljesítenie kell — ezek szilárdak és nem alku tárgyai:',
        'Képzett műkörmös vagy, elismert körmös képesítéssel vagy tanúsítvánnyal.',
        'Aktívan bemutatod saját körmös munkáidat a nyilvános profiljaidon — általad készített munkák, nem újraosztott tartalmak.',
        'Több mint 500 követőd van azon a profilon, ahol a körmös munkáidat közzéteszed.',
        'A nagykövetté válás komoly szakmai együttműködés, nem általános influencer-promóció. Azok a jelentkezők, akik nem teljesítik mindhárom feltételt, nem fogadhatók el.',
      ] },
      { heading: 'Amit te teszel', points: [
        `Havonta legalább ${POST_MIN} saját tartalmat tegyél közzé GEL.IT.UP termékekkel, ebből legalább ${VIDEO_MIN} videó/reel az Instagramon és a TikTokon (ha van TikTok-fiókod).`,
        'Ez a minimum tükrözi a PR-csomagokban kapott termékek mennyiségét.',
        'Minden posztnak tartalmaznia kell a #gelitup hashtaget, és meg kell jelölnie a @gelitupinternational fiókot az Instagramon vagy a @gelitupofficial fiókot a TikTokon.',
        `Küldd el az általad készített tartalmat a WhatsApp/Viber számunkra (${NUM}), hogy elmenthessük és kiemelhessük.`,
        'Kérjük, vedd figyelembe, hogy a kedvezménykódod kizárólag a www.gelitup.com oldalon érvényes.',
        'Hozzáadhatod a GEL.IT.UP-ot közreműködőként az Instagram- és TikTok-posztjaidhoz is, hogy közvetlenül a mi profiljainkon is megjelenjenek.',
        'Ahol a szabályok megkövetelik (pl. mert egy terméket ajándékba kaptál), egyszerűen jelöld együttműködésként — #ad vagy „gifted”.',
      ] },
      { heading: 'Kedvezménykódod és bevételed', points: [
        `Személyes kedvezménykódot kapsz, amelyet a valódi műkörmös követőidnek adhatsz, hogy ${PCT}% fix kedvezménnyel vásárolhassák meg a GEL.IT.UP termékeit.`,
        'Nyilvánosan is megoszthatod és közzéteheted a kódodat. A mellette használt bármely linknek kizárólag a www.gelitup.com oldalra kell mutatnia — soha nem kupon-, akció- vagy viszonteladói oldalakra. A visszaélésszerűen használt kódokat kikapcsoljuk.',
        'Automatikusan B2B-fiókot kapsz a GEL.IT.UP Portálon (gelitup.com/portal/login) — külön regisztráció nélkül. E-mailt kapsz a fiók aktiválásához és a jelszavad beállításához.',
        'A kódoddal leadott minden rendelés jutalékot hoz számládra jóváírásként, amely automatikusan beszámít a saját következő rendelésedbe. A jutalék 10%-ról indul, 15%-ra emelkedik, amint a kódoddal leadott rendelések összege eléri az €1,000-t, és 20%-ra, amint eléri az €2,000-t.',
      ] },
      { heading: 'Képviselj minket jól', points: [
        'Nagykövetként a GEL.IT.UP egyik arca vagy, ezért kérjük, hogy minden, amit a termékeinkkel teszel, jól tükrözze a márkát.',
        'Használd a termékeket szakszerűen és az utasításoknak megfelelően, a helyes alkalmazási és biztonsági útmutatót követve. Ne értékesítsd tovább, ne töltsd át, ne címkézd újra és ne módosítsd őket, és ne tegyél orvosi vagy félrevezető állításokat.',
        'Tartalmaid és nyilvános magatartásod maradjon tiszteletteljes és márkahű — semmi olyan, ami észszerűen árthat a GEL.IT.UP nevének vagy hírnevének. Ha valami, amit közzéteszel, nem márkahű, kérhetjük, hogy módosítsd vagy távolítsd el, és megszüntethetjük az együttműködést, ha a márkát félrevezetően jelenítik meg.',
        'Ne készíts saját GEL.IT.UP logókat — ez szigorúan tilos. Hivatalos fekete és fehér logókat biztosítunk számodra módosítás nélkül, kizárólag GEL.IT.UP termékekkel készült médiatartalmakhoz.',
      ] },
      { heading: 'Amit mi teszünk', points: [
        'Kiemeljük a munkádat a csatornáinkon, és megadjuk a személyes kedvezménykódodat megosztásra.',
        'PR-csomagokat küldünk neked alkotáshoz — általában havonta egyszer, és néha gyakrabban egy új termék megjelenésekor. Ezek ajándékok a tartalmaid támogatására, nem eladás, és a fenti havi közzétételi minimumaid teljesítésétől függenek. Ez a biztosított készletek minőségét tekintve méltányos — ha ezek a minimumok nem teljesülnek, azonnali hatállyal megszüntethetjük az együttműködést.',
      ] },
      { heading: 'Tartalmad felhasználása', points: [
        'Engedélyezed, hogy elmentsük, újraposztoljuk, formátumra szerkesszük és újrahasznosítsuk a nekünk küldött vagy minket megjelölő tartalmat — csatornáinkon, weboldalunkon, marketingünkben és más platformokon, mindig a megjelöléseiddel feltüntetve.',
        'Amennyiben a GEL.IT.UP más országokbeli csapatai megosztják a képeidet vagy videóidat, jogosultak erre a profilod megjelölése mellett. Kérjük, vedd figyelembe, hogy a kedvezménykódod ebben az esetben nem érvényes az adott országban.',
        'Tartalmad feltölthető egy közös központi meghajtóra is, amelyhez más országok GEL.IT.UP csapatai hozzáférnek, és amelyet a saját helyi közösségi médiájukban újraposztolhatnak, feltéve, hogy a saját felhasználóneveiddel feltüntetnek téged.',
        'A munkának a sajátodnak kell lennie; megtartod a tulajdonjogot, és ez a már megosztott tartalmakra is érvényes marad, még ha később abba is hagyod.',
        'Kérjük, vedd figyelembe, hogy a hivatalos logónkat tartalmazó feltöltött tartalmak a GEL.IT.UP by GIUP® tulajdonát képezik, mivel a név és a logó bejegyzett védjegyek.',
      ] },
      { heading: 'Az egyszerű dolgok', points: [
        'Szabadon dolgozhatsz más márkákkal is — ez nem munkaviszony, és nincs garantált fizetés.',
        'Hónapról hónapra működik, és bármelyik fél bármikor abbahagyhatja. Ha abbahagyod, a kedvezménykódodat kikapcsoljuk; a már megosztott tartalmakra vonatkozó engedély továbbra is érvényben marad.',
      ] },
      { heading: 'Az aláírásod', points: [
        'A négyzet bejelölésével és a jelentkezésed elküldésével elfogadod ezt. A beírt neved az aláírásod, a jelentkezés napjával keltezve.',
      ] },
    ],
  },

  el: {
    title: 'Συμφωνία Πρεσβευτή',
    referenceNote: 'Μετάφραση για δική σου αναφορά. Η αγγλική έκδοση που ακολουθεί είναι η ισχύουσα έκδοση της συμφωνίας.',
    governingNote: 'Η αγγλική έκδοση που ακολουθεί είναι η νομικά δεσμευτική έκδοση αυτής της συμφωνίας. Με την υποβολή της αίτησής σου την αποδέχεσαι· το πληκτρολογημένο όνομά σου αποτελεί την υπογραφή σου.',
    sections: [
      { heading: 'Καλώς ήρθες', points: [
        'Αυτή είναι μια φιλική συμφωνία συνεργασίας ανάμεσα σε εσένα και την GEL.IT.UP (GIUP®), στο πλαίσιο του Προγράμματος Πρεσβευτών μας — μια συνεργασία μεταξύ επαγγελματιών, όχι εργασία. Να τι κάνει η κάθε πλευρά.',
      ] },
      { heading: 'Σε ποιους απευθύνεται', points: [
        'Το Πρόγραμμα Πρεσβευτών απευθύνεται αποκλειστικά σε πιστοποιημένους/ες τεχνίτες/τριες νυχιών. Για να γίνει δεκτός/ή, κάθε αιτών/ούσα πρέπει να πληροί και τις τρεις προϋποθέσεις — είναι απαρέγκλιτες και μη διαπραγματεύσιμες:',
        'Είσαι πιστοποιημένος/η τεχνίτης/τρια νυχιών, με αναγνωρισμένη κατάρτιση ή πιστοποίηση.',
        'Παρουσιάζεις ενεργά τη δική σου δουλειά στα νύχια στα δημόσια προφίλ σου — δημιουργίες δικές σου, όχι αναδημοσιεύσεις.',
        'Έχεις πάνω από 500 ακόλουθους στο προφίλ όπου δημοσιεύεις τη δουλειά σου στα νύχια.',
        'Το να γίνεις πρεσβευτής είναι μια σοβαρή επαγγελματική συνεργασία, όχι απλή προώθηση influencer. Οι αιτούντες που δεν πληρούν και τις τρεις προϋποθέσεις δεν μπορούν να γίνουν δεκτοί.',
      ] },
      { heading: 'Τι κάνεις εσύ', points: [
        `Δημοσίευε τουλάχιστον ${POST_MIN} δικά σου περιεχόμενα κάθε μήνα με προϊόντα GEL.IT.UP, συμπεριλαμβανομένων τουλάχιστον ${VIDEO_MIN} βίντεο/reels σε Instagram και TikTok (αν έχεις λογαριασμό TikTok).`,
        'Αυτό το ελάχιστο αντικατοπτρίζει την ποσότητα των προϊόντων που παρέχονται σε κάθε πακέτο PR.',
        'Κάθε ανάρτηση πρέπει να περιλαμβάνει το hashtag #gelitup και να αναφέρει το @gelitupinternational στο Instagram ή το @gelitupofficial στο TikTok.',
        `Στείλε το περιεχόμενο που δημιουργείς στο WhatsApp/Viber μας (${NUM}) ώστε να μπορούμε να το αποθηκεύσουμε και να το προβάλουμε.`,
        'Σημείωσε ότι ο εκπτωτικός σου κωδικός ισχύει αποκλειστικά για τον ιστότοπο www.gelitup.com.',
        'Μπορείς επίσης να προσθέσεις την GEL.IT.UP ως συνεργάτη (collaborator) στις αναρτήσεις σου στο Instagram και το TikTok, ώστε να μοιράζονται απευθείας και στα δικά μας προφίλ.',
        'Όπου το απαιτούν οι κανόνες (π.χ. επειδή ένα προϊόν ήταν δώρο), απλώς σημείωσέ το ως συνεργασία — #ad ή «gifted».',
      ] },
      { heading: 'Ο κωδικός έκπτωσής σου & τα κέρδη', points: [
        `Λαμβάνεις έναν προσωπικό κωδικό έκπτωσης για να δίνεις στους ακόλουθούς σου που είναι πραγματικοί τεχνίτες νυχιών, ώστε να αγοράζουν GEL.IT.UP με ${PCT}% σταθερή έκπτωση.`,
        'Μπορείς να μοιράζεσαι και να δημοσιεύεις τον κωδικό σου δημόσια. Οποιοσδήποτε σύνδεσμος χρησιμοποιείς μαζί του πρέπει να οδηγεί μόνο στο www.gelitup.com — ποτέ σε ιστότοπους κουπονιών, προσφορών ή μεταπώλησης. Κωδικοί που χρησιμοποιούνται καταχρηστικά θα απενεργοποιούνται.',
        'Σου δίνεται αυτόματα λογαριασμός B2B στο Portal της GEL.IT.UP (gelitup.com/portal/login) — χωρίς ξεχωριστή εγγραφή. Θα λάβεις email για να ενεργοποιήσεις τον λογαριασμό σου και να ορίσεις τον κωδικό πρόσβασης.',
        'Κάθε παραγγελία που γίνεται με τον κωδικό σου σού αποφέρει προμήθεια ως πίστωση λογαριασμού, που εφαρμόζεται αυτόματα στη δική σου επόμενη παραγγελία. Η προμήθεια ξεκινά από 10%, ανεβαίνει στο 15% μόλις το σύνολο των παραγγελιών μέσω του κωδικού σου φτάσει τα €1,000, και στο 20% μόλις φτάσει τα €2,000.',
      ] },
      { heading: 'Να μας εκπροσωπείς σωστά', points: [
        'Ως πρεσβευτής είσαι ένα πρόσωπο της GEL.IT.UP, γι’ αυτό σου ζητάμε ό,τι κάνεις με τα προϊόντα μας να αντικατοπτρίζει καλά τη μάρκα.',
        'Χρησιμοποίησε τα προϊόντα επαγγελματικά και σύμφωνα με τις οδηγίες, ακολουθώντας τη σωστή καθοδήγηση εφαρμογής και ασφάλειας. Μην τα μεταπωλείς, μην τα μεταγγίζεις, μην τα επανασημαίνεις και μην τα παραποιείς, και μην κάνεις ιατρικούς ή παραπλανητικούς ισχυρισμούς.',
        'Διατήρησε το περιεχόμενο και τη δημόσια συμπεριφορά σου με σεβασμό και σύμφωνα με τη μάρκα — τίποτα που θα μπορούσε εύλογα να βλάψει το όνομα ή τη φήμη της GEL.IT.UP. Αν κάτι που δημοσιεύεις δεν ταιριάζει με τη μάρκα, ενδέχεται να σου ζητήσουμε να το προσαρμόσεις ή να το αφαιρέσεις, και μπορούμε να τερματίσουμε τη συνεργασία αν η μάρκα παρουσιάζεται εσφαλμένα.',
        'Μη δημιουργείς δικά σου λογότυπα GEL.IT.UP — αυτό απαγορεύεται ρητά. Θα σου δοθούν επίσημα λογότυπα σε μαύρο και λευκό χρώμα. Δεν επιτρέπεται καμία τροποποίηση ή αλλαγή χρώματος και επιτρέπεται η χρήση τους μόνο σε περιεχόμενο με προϊόντα GEL.IT.UP.',
      ] },
      { heading: 'Τι κάνουμε εμείς', points: [
        'Προβάλλουμε τη δουλειά σου στα κανάλια μας και σου δίνουμε τον προσωπικό σου κωδικό έκπτωσης για να τον μοιράζεσαι.',
        'Σου στέλνουμε πακέτα PR για να δημιουργείς — συνήθως περίπου μία φορά τον μήνα, και ενίοτε συχνότερα όταν υπάρχει νέα κυκλοφορία. Είναι δώρα για την υποστήριξη του περιεχομένου σου, όχι πώληση, και εξαρτώνται από την τήρηση των παραπάνω μηνιαίων ελάχιστων δημοσιεύσεών σου. Αυτό είναι δίκαιο δεδομένης της ποιότητας των κιτ που παρέχουμε — αν δεν τηρούνται αυτά τα ελάχιστα, μπορούμε να τερματίσουμε τη συνεργασία με άμεση ισχύ.',
      ] },
      { heading: 'Χρήση του περιεχομένου σου', points: [
        'Μας επιτρέπεις να αποθηκεύουμε, να αναδημοσιεύουμε, να επεξεργαζόμαστε ως προς τη μορφή και να επαναχρησιμοποιούμε το περιεχόμενο που μας στέλνεις ή στο οποίο μας κάνεις tag — στα κανάλια μας, τον ιστότοπο, το μάρκετινγκ και άλλες πλατφόρμες, πάντα με αναφορά στα tags σου.',
        'Όταν οι ομάδες της GEL.IT.UP σε άλλες χώρες αναρτούν ή αναδημοσιεύουν τις φωτογραφίες και τα βίντεό σου, έχουν το δικαίωμα να το κάνουν εφόσον αναφέρουν το προφίλ σου. Σημείωσε ότι σε αυτή την περίπτωση, ο εκπτωτικός σου κωδικός δεν εφαρμόζεται σε αυτή τη χώρα.',
        'Το περιεχόμενό σου μπορεί επίσης να ανέβει σε έναν κοινόχρηστο κεντρικό δίσκο, προσβάσιμο από ομάδες της GEL.IT.UP σε άλλες χώρες, οι οποίες μπορούν να το αναδημοσιεύσουν στα τοπικά τους μέσα κοινωνικής δικτύωσης, εφόσον σε αναφέρουν με τα δικά σου ονόματα χρήστη.',
        'Η δουλειά πρέπει να είναι δική σου· διατηρείς την ιδιοκτησία, και αυτό ισχύει για ό,τι έχει ήδη κοινοποιηθεί ακόμη κι αν αργότερα σταματήσεις.',
        'Παρακαλούμε σημείωσε ότι οτιδήποτε αναρτάται με το επίσημο λογότυπό μας αποτελεί ιδιοκτησία της GEL.IT.UP by GIUP®, καθώς το όνομα και το σήμα είναι κατοχυρωμένα εμπορικά σήματα.',
      ] },
      { heading: 'Τα απλά', points: [
        'Είσαι ελεύθερος/η να συνεργάζεσαι με άλλες μάρκες — αυτό δεν είναι απασχόληση και δεν υπάρχει εγγυημένη πληρωμή.',
        'Λειτουργεί από μήνα σε μήνα και οποιαδήποτε πλευρά μπορεί να σταματήσει οποτεδήποτε. Αν σταματήσεις, ο κωδικός έκπτωσής σου απενεργοποιείται· η άδεια για περιεχόμενο που έχει ήδη κοινοποιηθεί συνεχίζει να ισχύει.',
      ] },
      { heading: 'Η υπογραφή σου', points: [
        'Τσεκάροντας το κουτί και υποβάλλοντας την αίτησή σου, συμφωνείς με αυτά. Το πληκτρολογημένο όνομά σου είναι η υπογραφή σου, με ημερομηνία την ημέρα που κάνεις αίτηση.',
      ] },
    ],
  },

  bg: {
    title: 'Договор за посланик',
    referenceNote: 'Превод за твоя информация. Следващата версия на английски е меродавната версия на договора.',
    governingNote: 'Следващата версия на английски е правно обвързващата версия на това споразумение. С подаването на заявлението си го приемаш; изписаното ти име представлява твоят подпис.',
    sections: [
      { heading: 'Добре дошъл/дошла', points: [
        'Това е приятелско споразумение за сътрудничество между теб и GEL.IT.UP (GIUP®) като част от нашата Програма за посланици — сътрудничество между професионалисти, а не работа. Ето какво прави всяка страна.',
      ] },
      { heading: 'За кого е', points: [
        'Програмата за посланици е предназначена изключително за квалифицирани маникюристи. За да бъде приет, всеки кандидат трябва да отговаря и на трите изисквания — те са твърди и не подлежат на договаряне:',
        'Ти си квалифициран маникюрист с призната квалификация или сертификат.',
        'Активно показваш собствената си работа върху ноктите в публичните си профили — авторски дизайни, а не препубликувани.',
        'Имаш повече от 500 последователи в профила, в който публикуваш работата си върху ноктите.',
        'Да станеш посланик е сериозно професионално сътрудничество, а не обикновена инфлуенсър промоция. Кандидати, които не отговарят и на трите изисквания, не могат да бъдат приети.',
      ] },
      { heading: 'Какво правиш ти', points: [
        `Публикувай поне ${POST_MIN} собствени съдържания всеки месец с продукти на GEL.IT.UP, включително поне ${VIDEO_MIN} видеа/reels в Instagram и TikTok (ако имаш TikTok профил).`,
        'Този минимум отразява количеството продукти, предоставени във всеки PR пакет.',
        'Всяка публикация трябва да включва хаштага #gelitup и да отбелязва @gelitupinternational в Instagram или @gelitupofficial в TikTok.',
        `Изпращай съдържанието, което създаваш, на нашия WhatsApp/Viber (${NUM}), за да можем да го запазим и представим.`,
        'Моля, обърни внимание, че промокодът ти за отстъпка е валиден само за сайта www.gelitup.com.',
        'Можеш също да добавиш GEL.IT.UP като сътрудник (collaborator) към публикациите си в Instagram и TikTok, за да се споделят директно и в нашите профили.',
        'Където правилата го изискват (напр. защото продукт е бил подарък), просто отбележи го като партньорство — #ad или „gifted“.',
      ] },
      { heading: 'Твоят код за отстъпка и печалби', points: [
        `Получаваш личен код за отстъпка, който да даваш на последователите си, които са истински маникюристи, за да купуват GEL.IT.UP с ${PCT}% фиксирана отстъпка.`,
        'Можеш да споделяш и публикуваш кода си публично. Всеки линк, който използваш заедно с него, трябва да води само към www.gelitup.com — никога към сайтове за купони, оферти или препродажба. Кодове, използвани неправомерно, ще бъдат деактивирани.',
        'Автоматично получаваш B2B акаунт в Портала на GEL.IT.UP (gelitup.com/portal/login) — без отделна регистрация. Ще получиш имейл, за да активираш акаунта си и да зададеш паролата си.',
        'Всяка поръчка, направена с твоя код, ти носи комисиона под формата на кредит по акаунта, който автоматично се прилага към собствената ти следваща поръчка. Комисионата започва от 10%, нараства до 15%, когато общата стойност на поръчките с твоя код достигне €1,000, и до 20%, когато достигне €2,000.',
      ] },
      { heading: 'Да ни представяш добре', points: [
        'Като посланик ти си лице на GEL.IT.UP, затова те молим всичко, което правиш с продуктите ни, да представя марката добре.',
        'Използвай продуктите професионално и по предназначение, спазвайки правилните указания за приложение и безопасност. Не ги препродавай, не ги преливай, не ги преетикетирай и не ги подправяй, и не прави медицински или подвеждащи твърдения.',
        'Поддържай съдържанието и публичното си поведение почтени и в съответствие с марката — нищо, което разумно би могло да навреди на името или репутацията на GEL.IT.UP. Ако нещо, което публикуваш, не съответства на марката, можем да те помолим да го коригираш или премахнеш, и можем да прекратим партньорството, ако марката е представена подвеждащо.',
        'Не създавай собствени лога на GEL.IT.UP — това е строго забранено. Ще ти бъдат предоставени официални лога в черно и бяло без модификации, разрешени само върху материали с продукти на GEL.IT.UP.',
      ] },
      { heading: 'Какво правим ние', points: [
        'Представяме работата ти в нашите канали и ти даваме личния ти код за отстъпка, който да споделяш.',
        'Изпращаме ти PR пакети, с които да твориш — обикновено около веднъж месечно, а понякога по-често при пускане на нов продукт. Това са подаръци в подкрепа на съдържанието ти, а не продажба, и зависят от спазването на месечните ти минимуми за публикуване по-горе. Това е справедливо предвид качеството на комплектите, които предоставяме — ако тези минимуми не се спазват, можем да прекратим сътрудничеството с незабавно действие.',
      ] },
      { heading: 'Използване на твоето съдържание', points: [
        'Позволяваш ни да запазваме, препубликуваме, редактираме за формат и използваме повторно съдържанието, което ни изпращаш или в което ни отбелязваш — в нашите канали, уебсайт, маркетинг и други платформи, винаги с посочване на твоите тагове.',
        'Когато екипите на GEL.IT.UP в други държави споделят или качват твои снимки и видеа, те имат право да го правят, при условие че отбележат твоя профил. В този случай промокодът ти няма да важи за тази държава.',
        'Твоето съдържание може също да бъде качено в споделен централен диск, достъпен за екипите на GEL.IT.UP в други държави, които могат да го препубликуват в своите местни социални мрежи, при условие че те посочват с твоите собствени потребителски имена.',
        'Работата трябва да е твоя собствена; запазваш собствеността, и това остава валидно за вече споделеното, дори ако по-късно спреш.',
        'Моля, имай предвид, че всички качени материали с официалното лого на GEL.IT.UP стават собственост на GEL.IT.UP by GIUP®, тъй като името и логото са регистрирани търговски марки.',
      ] },
      { heading: 'Простите неща', points: [
        'Свободен/на си да работиш с други марки — това не е трудово правоотношение и няма гарантирано плащане.',
        'Действа на месечна база и всяка страна може да спре по всяко време. Ако спреш, кодът ти за отстъпка се деактивира; разрешението за вече споделено съдържание продължава.',
      ] },
      { heading: 'Твоят подпис', points: [
        'С отмятането на полето и подаването на заявлението си се съгласяваш с това. Изписаното ти име е твоят подпис, с дата деня, в който кандидатстваш.',
      ] },
    ],
  },
}
