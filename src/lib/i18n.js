import { createContext, useContext } from 'react'

export const SUPPORTED_LANGS = ['en', 'el', 'fr', 'de', 'es', 'bg', 'pl', 'ro', 'pt', 'hu']

// Browser locale prefix → supported lang code
const BROWSER_LANG_MAP = {
  el: 'el', gr: 'el',
  fr: 'fr',
  de: 'de',
  es: 'es',
  bg: 'bg',
  pl: 'pl',
  ro: 'ro',
  pt: 'pt',
  hu: 'hu',
  it: 'it',
}

/** Detect the current language. Priority: localStorage → URL path prefix → browser language */
export function detectLang() {
  if (typeof window === 'undefined') return 'en'

  // 1. Explicit user preference stored in localStorage
  try {
    const saved = localStorage.getItem('gelitup_lang')
    if (saved && [...SUPPORTED_LANGS, 'it'].includes(saved)) return saved
  } catch { /* ignore */ }

  // 2. URL path prefix (e.g. /it/portal/login)
  const path = String(window.location.pathname || '').toLowerCase()
  for (const code of [...SUPPORTED_LANGS, 'it']) {
    if (code !== 'en' && (path === `/${code}` || path.startsWith(`/${code}/`))) return code
  }

  // 3. Browser language (navigator.language)
  const browserLang = String(
    (typeof navigator !== 'undefined' ? navigator.language || navigator.userLanguage : '') || ''
  ).toLowerCase().split('-')[0]
  return BROWSER_LANG_MAP[browserLang] || 'en'
}

/** Save language preference and reload so the whole app re-renders in the new language */
export function setLang(lang) {
  try { localStorage.setItem('gelitup_lang', lang) } catch { /* ignore */ }
  window.location.reload()
}

/** Return the translation object for a given lang code, or null for English */
export function getTranslations(lang) {
  const map = { it, el, fr, de, es, bg, pl, ro, pt, hu }
  return map[lang] || null
}

export const LangContext = createContext('en')
export const useLang = () => useContext(LangContext)

/* ── Italian translations ───────────────────────────────────────────────────── */
export const it = {
  // ── Navigation
  nav: {
    home: 'Home',
    catalogue: 'Catalogo Completo',
    colours: 'Famiglie di Colori',
    about: 'Chi Siamo',
    guestbook: 'Guestbook',
    distributors: 'Distributori',
    academy: 'Per le Accademie',
    b2b: 'Portale B2B',
    login: 'Accedi',
    register: 'Registrati',
    logout: 'Esci',
    dashboard: 'Dashboard',
    cart: 'Carrello',
    search: 'Cerca prodotti…',
  },

  // ── Homepage feature cards (dark strip)
  home_features: {
    cpnp_label: 'NOTIFICATO CPNP',
    cpnp_body: 'Ogni formula dello Spettro è notificata CPNP. Questa è la tua garanzia legale che GEL.IT.UP by GIUP® è pienamente autorizzato alla vendita in ogni stato membro UE.',
    safety_label: 'MASSIMA SICUREZZA',
    safety_body: 'Operiamo secondo i più severi protocolli di sicurezza al mondo. La nostra produzione è certificata ISO, garantendo zero contaminanti pericolosi e coerenza al 100% tra i lotti.',
    clean_label: 'SCIENZA PULITA',
    clean_body: 'La nostra politica clean-science applica standard di formulazione HEMA-free e TPO-free su tutte le linee di produzione attuali, dando priorità alla sicurezza professionale.',
    cruelty_label: 'CRUELTY-FREE',
    cruelty_body: 'Etica senza compromessi. Siamo 100% approvati dal Leaping Bunny — il gold standard globale per i cosmetici cruelty-free.',
    tagline: 'SCEGLIENDO GEL.IT.UP by GIUP®, HAI LA TOTALE TRANQUILLITÀ NORMATIVA.',
  },

  // ── Homepage hero
  hero: {
    eyebrow: 'Solo per Uso Professionale',
    title: 'GEL PROFESSIONALE.\nCOLORI INFINITI.',
    subtitle: 'Oltre 1.000 sfumature di smalto gel HEMA-free, certificato EU e TPO-free — progettato per i professionisti delle unghie che non accettano compromessi.',
    cta_catalogue: 'Esplora il Catalogo',
    cta_register: 'Registrati Gratis',
    badge_hema: 'HEMA-free',
    badge_eu: 'Certificato EU',
    badge_shades: '1.000+ Sfumature',
  },

  // ── Product / Catalogue
  catalogue: {
    title: 'Catalogo Completo',
    hero_title: 'Smalto Gel & Sistemi Professionali per Unghie',
    hero_body: 'La gamma professionale completa — smalto gel, builder gel, base coat, top coat e accessori. Formule HEMA & TPO-free, certificate Cruelty-Free, progettate per l\'eccellenza professionale. Sfoglia ogni sfumatura, sistema e strumento della collezione Gel It Up.',
    search_placeholder: 'Cerca nome prodotto, codice o sottocategoria…',
    filter_all: 'Tutti',
    filter_new: 'Novità',
    filter_featured: 'In Evidenza',
    no_results: 'Nessun prodotto trovato.',
    no_results_collection: 'Nessun prodotto trovato per questa collezione.',
    load_more: 'Carica altro',
    add_to_cart: 'Aggiungi',
    in_basket: 'nel carrello',
    items_in_basket: 'articoli nel carrello',
    clear: 'Svuota',
    checkout: 'Ordina',
    view_basket: 'Vedi',
    hide_basket: 'Nascondi',
    total: 'Totale',
    price_on_request: 'Prezzo su richiesta',
    you_might_need: 'Potrebbe servirti anche',
    grid_view: 'Griglia',
    quick_order: 'Ordine Rapido',
    quick_filter: 'Filtro Rapido',
    cat_eye_collection: 'Collezione Cat Eye',
    moq_progress: (remaining, min) => `€${remaining} mancano a €${min} di ordine minimo`,
    moq_reached: 'Ordine minimo raggiunto!',
    register_as_distributor: 'Registrati come Distributore',
    nav_new: '2026 NOVITÀ! ✦',
    nav_colours: 'Colori',
    nav_bases_tops: 'Basi & Top',
    nav_builders: 'Sistemi Builder',
    nav_tools: 'Strumenti',
    nav_nail_art: 'Nail Art',
    nav_consumables: 'Consumabili',
    nav_nail_care: 'Cura Unghie',
  },

  // ── Guestbook
  guestbook: {
    hero_eyebrow: 'Solo per Uso Professionale',
    hero_title: 'Unisciti al Guestbook Globale GEL.IT.UP',
    hero_subtitle: 'Dicci da dove vieni e connettiti con professionisti di tutto il mondo! Se hai già provato GEL.IT.UP, lasciaci il tuo feedback e dicci qual è il tuo prodotto preferito.',
    section_title: 'Ultimi Messaggi',
    form_title: '✍️ Firma il Guestbook',
    form_subtitle: 'La tua iscrizione sarà visibile dopo la revisione.',
    field_name: 'Nome',
    field_country: 'Paese',
    field_role: 'Ruolo',
    field_rating: 'Valutazione',
    field_rating_optional: '(facoltativa)',
    field_comment: 'Commento',
    field_anonymous: 'Preferisco rimanere anonimo/a',
    placeholder_name: 'Il tuo nome',
    placeholder_country: 'es. Italia',
    placeholder_comment: 'Condividi la tua esperienza con i prodotti GEL.IT.UP…',
    select_role: 'Seleziona il tuo ruolo…',
    submit: '✍️ Firma il Guestbook',
    submitting: 'Invio in corso…',
    success_title: 'Grazie — ora fai parte della community GEL.IT.UP.',
    success_subtitle: 'La tua iscrizione apparirà dopo la revisione del nostro team.',
    submit_another: 'Invia un\'altra iscrizione',
    load_more: 'Carica altro',
    no_messages: 'Nessun messaggio ancora. Sii il primo a firmare il guestbook!',
    star_labels: ['', 'Scarso', 'Sufficiente', 'Discreto', 'Buono', 'Ottimo'],
    roles: ['Tecnico delle Unghie', 'Titolare di Salone', 'Distributore', 'Formatore'],
    read_more: 'Leggi di più ▼',
    show_less: 'Mostra meno ▲',
  },

  // ── About Us
  about: {
    title: 'Chi Siamo',
    subtitle: 'Il marchio professionale di smalti gel fondato da professionisti, per i professionisti.',
    mission_title: 'La Nostra Missione',
    mission_body: 'GEL.IT.UP by GIUP® è nato dalla passione per le unghie professionali e dalla convinzione che ogni tecnico meriti prodotti di qualità superiore, sicuri e conformi alle normative EU.',
  },

  // ── Common / Shared
  common: {
    loading: 'Caricamento…',
    error: 'Si è verificato un errore. Riprova.',
    close: 'Chiudi',
    back: 'Indietro',
    save: 'Salva',
    cancel: 'Annulla',
    confirm: 'Conferma',
    yes: 'Sì',
    no: 'No',
    required: '*',
    chars_remaining: 'caratteri rimanenti',
    for_professional_use: 'Solo per Uso Professionale',
    hema_free: 'HEMA-free',
    eu_certified: 'Certificato EU',
    cpnp: 'Notificato CPNP',
    tpo_free: 'TPO-free',
    learn_more: 'Scopri di più',
    register_free: 'Registrati Gratis',
    contact_us: 'Contattaci',
    whatsapp: 'WhatsApp',
    b2b_access: 'Accesso B2B',
    view_catalogue: 'Vedi Catalogo',
    wholesale_pricing: 'Prezzi all\'ingrosso',
    no_moq: 'Nessun MOQ',
    sample_packs: 'Campionature disponibili',
  },

  // ── B2B / Portal
  portal: {
    login_title: 'Accedi al Portale B2B',
    register_title: 'Registrazione Commerciale',
    email: 'Email',
    password: 'Password',
    forgot_password: 'Password dimenticata?',
    login_btn: 'Accedi',
    register_btn: 'Crea Account',
    already_account: 'Hai già un account?',
    no_account: 'Non hai ancora un account?',
    name: 'Nome',
    company: 'Azienda',
    phone: 'Telefono',
    country: 'Paese',
    vat: 'Partita IVA',
    role_label: 'Tipo di attività',
    terms: 'Accetto i termini e le condizioni',
    dashboard_title: 'Dashboard',
    orders: 'Ordini',
    products: 'Prodotti',
    account: 'Account',
    place_order: 'Effettua un Ordine',
    order_history: 'Storico Ordini',
    logout: 'Esci',
  },

  // ── Distributor
  distributor: {
    page_title: 'Diventa Distributore',
    eyebrow: 'Distribuzione',
    become_title: 'Diventa un Distributore GEL.IT.UP',
    apply_title: 'Richiesta di Distribuzione',
    apply_subtitle: 'Candidati per diventare distributore GEL.IT.UP. La tua candidatura verrà esaminata e riceverai una notifica via email una volta approvata.',
    tier_professional: 'PROFESSIONALE',
    tier_authority: 'AUTORITÀ',
    tagline_pro: 'Distribuzione regionale',
    tagline_auth: 'Dominio territoriale',
    view_options: 'Vedi Opzioni di Distribuzione',
    exclusive_rights: 'Diritti esclusivi di distribuzione regionale o nazionale',
    full_catalogue: 'Accesso completo al catalogo con prezzi da distributore',
    comarketing: 'Strumenti di co-marketing, formazione e supporto continuo',
    review_time: 'Revisione entro 1–2 giorni lavorativi',
  },

  // ── Footer / misc
  footer: {
    rights: '© 2025 GEL.IT.UP by GIUP®. Tutti i diritti riservati.',
    professional_only: 'Solo per uso professionale. Non per la vendita al dettaglio.',
    privacy: 'Privacy',
    terms: 'Termini',
    contact: 'Contatti',
  },
}

// ─── Greek ────────────────────────────────────────────────────────────────────
export const el = {
  nav: {
    home: 'Αρχική', catalogue: 'Πλήρης Κατάλογος', colours: 'Οικογένειες Χρωμάτων',
    about: 'Σχετικά με εμάς', guestbook: 'Βιβλίο Επισκεπτών', distributors: 'Διανομείς',
    academy: 'Για Ακαδημίες', b2b: 'B2B Portal', login: 'Σύνδεση', register: 'Εγγραφή',
    logout: 'Αποσύνδεση', dashboard: 'Πίνακας Ελέγχου', cart: 'Καλάθι', search: 'Αναζήτηση προϊόντων…',
  },
  portal: {
    login_title: 'Σύνδεση στο B2B Portal', register_title: 'Εγγραφή Επαγγελματία',
    email: 'Email', password: 'Κωδικός', forgot_password: 'Ξεχάσατε τον κωδικό;',
    login_btn: 'Σύνδεση', register_btn: 'Δημιουργία Λογαριασμού',
    already_account: 'Έχετε ήδη λογαριασμό;', no_account: 'Δεν έχετε λογαριασμό;',
    name: 'Όνομα', company: 'Εταιρεία', phone: 'Τηλέφωνο', country: 'Χώρα', vat: 'ΑΦΜ',
    role_label: 'Τύπος επαγγέλματος', terms: 'Αποδέχομαι τους όρους και προϋποθέσεις',
    dashboard_title: 'Πίνακας Ελέγχου', orders: 'Παραγγελίες', products: 'Προϊόντα',
    account: 'Λογαριασμός', place_order: 'Υποβολή Παραγγελίας',
    order_history: 'Ιστορικό Παραγγελιών', logout: 'Αποσύνδεση',
    create_password: 'Δημιουργία Κωδικού', confirm_password: 'Επιβεβαίωση Κωδικού',
    signing_in: 'Σύνδεση…', creating_pw: 'Δημιουργία κωδικού…',
    create_pw_continue: 'Δημιουργία Κωδικού & Συνέχεια',
    err_rejected: 'Η αίτησή σας απορρίφθηκε. Επικοινωνήστε με την υποστήριξη για τα επόμενα βήματα.',
    err_pending: 'Η αίτησή σας εκκρεμεί έγκριση. Θα ειδοποιηθείτε με email μόλις εγκριθεί.',
    err_submitted: 'Το αίτημά σας επεξεργάζεται. Η σύνδεση ενεργοποιείται μετά την έγκριση.',
    err_bad_password: 'Λανθασμένα στοιχεία σύνδεσης. Χρησιμοποιήστε «Ξεχάσατε τον κωδικό;» για επαναφορά.',
    err_generic: 'Παρουσιάστηκε απροσδόκητο σφάλμα. Δοκιμάστε ξανά.',
  },
  common: {
    loading: 'Φόρτωση…', error: 'Παρουσιάστηκε σφάλμα. Δοκιμάστε ξανά.',
    close: 'Κλείσιμο', back: 'Πίσω', save: 'Αποθήκευση', cancel: 'Ακύρωση',
    confirm: 'Επιβεβαίωση', yes: 'Ναι', no: 'Όχι', required: '*',
    learn_more: 'Μάθετε περισσότερα', register_free: 'Δωρεάν Εγγραφή',
    contact_us: 'Επικοινωνία', whatsapp: 'WhatsApp', b2b_access: 'B2B Πρόσβαση',
    view_catalogue: 'Δείτε τον Κατάλογο',
  },
}

// ─── French ───────────────────────────────────────────────────────────────────
export const fr = {
  nav: {
    home: 'Accueil', catalogue: 'Catalogue complet', colours: 'Familles de couleurs',
    about: 'À propos', guestbook: 'Livre d\'or', distributors: 'Distributeurs',
    academy: 'Pour les académies', b2b: 'Portail B2B', login: 'Connexion',
    register: 'S\'inscrire', logout: 'Se déconnecter', dashboard: 'Tableau de bord',
    cart: 'Panier', search: 'Rechercher des produits…',
  },
  portal: {
    login_title: 'Connexion au portail B2B', register_title: 'Inscription professionnelle',
    email: 'E-mail', password: 'Mot de passe', forgot_password: 'Mot de passe oublié ?',
    login_btn: 'Se connecter', register_btn: 'Créer un compte',
    already_account: 'Vous avez déjà un compte ?', no_account: 'Pas encore de compte ?',
    name: 'Nom', company: 'Société', phone: 'Téléphone', country: 'Pays', vat: 'Numéro de TVA',
    role_label: 'Type d\'activité', terms: 'J\'accepte les termes et conditions',
    dashboard_title: 'Tableau de bord', orders: 'Commandes', products: 'Produits',
    account: 'Compte', place_order: 'Passer une commande',
    order_history: 'Historique des commandes', logout: 'Se déconnecter',
    create_password: 'Créer un mot de passe', confirm_password: 'Confirmer le mot de passe',
    signing_in: 'Connexion…', creating_pw: 'Création du mot de passe…',
    create_pw_continue: 'Créer le mot de passe & continuer',
    err_rejected: 'Votre demande a été refusée. Contactez le support pour la suite.',
    err_pending: 'Votre demande est en attente d\'approbation. Vous serez notifié par e-mail.',
    err_submitted: 'Votre demande est en cours de traitement. La connexion sera activée après approbation.',
    err_bad_password: 'Identifiants invalides. Utilisez « Mot de passe oublié ? » pour réinitialiser.',
    err_generic: 'Une erreur inattendue est survenue. Veuillez réessayer.',
  },
  common: {
    loading: 'Chargement…', error: 'Une erreur est survenue. Réessayez.',
    close: 'Fermer', back: 'Retour', save: 'Enregistrer', cancel: 'Annuler',
    confirm: 'Confirmer', yes: 'Oui', no: 'Non', required: '*',
    learn_more: 'En savoir plus', register_free: 'S\'inscrire gratuitement',
    contact_us: 'Nous contacter', whatsapp: 'WhatsApp', b2b_access: 'Accès B2B',
    view_catalogue: 'Voir le catalogue',
  },
}

// ─── German ───────────────────────────────────────────────────────────────────
export const de = {
  nav: {
    home: 'Startseite', catalogue: 'Vollständiger Katalog', colours: 'Farbfamilien',
    about: 'Über uns', guestbook: 'Gästebuch', distributors: 'Distributoren',
    academy: 'Für Akademien', b2b: 'B2B-Portal', login: 'Anmelden',
    register: 'Registrieren', logout: 'Abmelden', dashboard: 'Dashboard',
    cart: 'Warenkorb', search: 'Produkte suchen…',
  },
  portal: {
    login_title: 'B2B-Portal Anmeldung', register_title: 'Gewerbliche Registrierung',
    email: 'E-Mail', password: 'Passwort', forgot_password: 'Passwort vergessen?',
    login_btn: 'Anmelden', register_btn: 'Konto erstellen',
    already_account: 'Haben Sie bereits ein Konto?', no_account: 'Noch kein Konto?',
    name: 'Name', company: 'Unternehmen', phone: 'Telefon', country: 'Land', vat: 'USt-IdNr.',
    role_label: 'Unternehmensart', terms: 'Ich akzeptiere die Allgemeinen Geschäftsbedingungen',
    dashboard_title: 'Dashboard', orders: 'Bestellungen', products: 'Produkte',
    account: 'Konto', place_order: 'Bestellung aufgeben',
    order_history: 'Bestellhistorie', logout: 'Abmelden',
    create_password: 'Passwort erstellen', confirm_password: 'Passwort bestätigen',
    signing_in: 'Anmelden…', creating_pw: 'Passwort wird erstellt…',
    create_pw_continue: 'Passwort erstellen & weiter',
    err_rejected: 'Ihr Antrag wurde abgelehnt. Bitte kontaktieren Sie den Support.',
    err_pending: 'Ihr Antrag wartet auf Genehmigung. Sie werden per E-Mail benachrichtigt.',
    err_submitted: 'Ihre Anfrage wird bearbeitet. Zugang wird nach Genehmigung freigeschaltet.',
    err_bad_password: 'Ungültige Anmeldedaten. Nutzen Sie „Passwort vergessen?" zum Zurücksetzen.',
    err_generic: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
  },
  common: {
    loading: 'Wird geladen…', error: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
    close: 'Schließen', back: 'Zurück', save: 'Speichern', cancel: 'Abbrechen',
    confirm: 'Bestätigen', yes: 'Ja', no: 'Nein', required: '*',
    learn_more: 'Mehr erfahren', register_free: 'Kostenlos registrieren',
    contact_us: 'Kontakt', whatsapp: 'WhatsApp', b2b_access: 'B2B-Zugang',
    view_catalogue: 'Katalog ansehen',
  },
}

// ─── Spanish ──────────────────────────────────────────────────────────────────
export const es = {
  nav: {
    home: 'Inicio', catalogue: 'Catálogo completo', colours: 'Familias de colores',
    about: 'Sobre nosotros', guestbook: 'Libro de visitas', distributors: 'Distribuidores',
    academy: 'Para academias', b2b: 'Portal B2B', login: 'Iniciar sesión',
    register: 'Registrarse', logout: 'Cerrar sesión', dashboard: 'Panel de control',
    cart: 'Carrito', search: 'Buscar productos…',
  },
  portal: {
    login_title: 'Acceso al Portal B2B', register_title: 'Registro Comercial',
    email: 'Correo electrónico', password: 'Contraseña', forgot_password: '¿Olvidó su contraseña?',
    login_btn: 'Iniciar sesión', register_btn: 'Crear cuenta',
    already_account: '¿Ya tiene una cuenta?', no_account: '¿No tiene cuenta aún?',
    name: 'Nombre', company: 'Empresa', phone: 'Teléfono', country: 'País', vat: 'NIF/CIF',
    role_label: 'Tipo de negocio', terms: 'Acepto los términos y condiciones',
    dashboard_title: 'Panel de control', orders: 'Pedidos', products: 'Productos',
    account: 'Cuenta', place_order: 'Realizar un pedido',
    order_history: 'Historial de pedidos', logout: 'Cerrar sesión',
    create_password: 'Crear contraseña', confirm_password: 'Confirmar contraseña',
    signing_in: 'Iniciando sesión…', creating_pw: 'Creando contraseña…',
    create_pw_continue: 'Crear contraseña y continuar',
    err_rejected: 'Su solicitud fue rechazada. Contacte con soporte para los próximos pasos.',
    err_pending: 'Su solicitud está pendiente de aprobación. Recibirá un correo electrónico.',
    err_submitted: 'Su solicitud está en proceso. El acceso se activará tras la aprobación.',
    err_bad_password: 'Credenciales incorrectas. Use «¿Olvidó su contraseña?» para restablecer.',
    err_generic: 'Se produjo un error inesperado. Inténtelo de nuevo.',
  },
  common: {
    loading: 'Cargando…', error: 'Se produjo un error. Inténtelo de nuevo.',
    close: 'Cerrar', back: 'Volver', save: 'Guardar', cancel: 'Cancelar',
    confirm: 'Confirmar', yes: 'Sí', no: 'No', required: '*',
    learn_more: 'Más información', register_free: 'Registrarse gratis',
    contact_us: 'Contáctenos', whatsapp: 'WhatsApp', b2b_access: 'Acceso B2B',
    view_catalogue: 'Ver catálogo',
  },
}

// ─── Bulgarian ────────────────────────────────────────────────────────────────
export const bg = {
  nav: {
    home: 'Начало', catalogue: 'Пълен каталог', colours: 'Цветови семейства',
    about: 'За нас', guestbook: 'Книга за гости', distributors: 'Дистрибутори',
    academy: 'За академии', b2b: 'B2B Portal', login: 'Вход',
    register: 'Регистрация', logout: 'Изход', dashboard: 'Табло',
    cart: 'Кошница', search: 'Търсене на продукти…',
  },
  portal: {
    login_title: 'Вход в B2B Portal', register_title: 'Бизнес регистрация',
    email: 'Имейл', password: 'Парола', forgot_password: 'Забравена парола?',
    login_btn: 'Влез', register_btn: 'Създай акаунт',
    already_account: 'Вече имате акаунт?', no_account: 'Нямате акаунт?',
    name: 'Ime', company: 'Компания', phone: 'Телефон', country: 'Държава', vat: 'ДДС номер',
    role_label: 'Вид дейност', terms: 'Приемам общите условия',
    dashboard_title: 'Табло', orders: 'Поръчки', products: 'Продукти',
    account: 'Акаунт', place_order: 'Направи поръчка',
    order_history: 'История на поръчките', logout: 'Изход',
    create_password: 'Създай парола', confirm_password: 'Потвърди паролата',
    signing_in: 'Влизане…', creating_pw: 'Създаване на парола…',
    create_pw_continue: 'Създай парола и продължи',
    err_rejected: 'Заявката ви беше отхвърлена. Свържете се с поддръжката за следващи стъпки.',
    err_pending: 'Заявката ви очаква одобрение. Ще получите имейл известие.',
    err_submitted: 'Заявката ви се обработва. Достъпът ще се активира след одобрение.',
    err_bad_password: 'Грешни данни за вход. Използвайте „Забравена парола?" за нулиране.',
    err_generic: 'Възникна неочаквана грешка. Моля, опитайте отново.',
  },
  common: {
    loading: 'Зареждане…', error: 'Възникна грешка. Моля, опитайте отново.',
    close: 'Затвори', back: 'Назад', save: 'Запази', cancel: 'Отказ',
    confirm: 'Потвърди', yes: 'Да', no: 'Не', required: '*',
    learn_more: 'Научете повече', register_free: 'Регистрирайте се безплатно',
    contact_us: 'Свържете се с нас', whatsapp: 'WhatsApp', b2b_access: 'B2B достъп',
    view_catalogue: 'Вижте каталога',
  },
}

// ─── Polish ───────────────────────────────────────────────────────────────────
export const pl = {
  nav: {
    home: 'Strona główna', catalogue: 'Pełny katalog', colours: 'Rodziny kolorów',
    about: 'O nas', guestbook: 'Księga gości', distributors: 'Dystrybutorzy',
    academy: 'Dla akademii', b2b: 'Portal B2B', login: 'Zaloguj się',
    register: 'Zarejestruj się', logout: 'Wyloguj się', dashboard: 'Pulpit',
    cart: 'Koszyk', search: 'Szukaj produktów…',
  },
  portal: {
    login_title: 'Logowanie do portalu B2B', register_title: 'Rejestracja handlowa',
    email: 'E-mail', password: 'Hasło', forgot_password: 'Zapomniałeś hasła?',
    login_btn: 'Zaloguj się', register_btn: 'Utwórz konto',
    already_account: 'Masz już konto?', no_account: 'Nie masz jeszcze konta?',
    name: 'Imię i nazwisko', company: 'Firma', phone: 'Telefon', country: 'Kraj', vat: 'NIP',
    role_label: 'Rodzaj działalności', terms: 'Akceptuję regulamin',
    dashboard_title: 'Pulpit', orders: 'Zamówienia', products: 'Produkty',
    account: 'Konto', place_order: 'Złóż zamówienie',
    order_history: 'Historia zamówień', logout: 'Wyloguj się',
    create_password: 'Utwórz hasło', confirm_password: 'Potwierdź hasło',
    signing_in: 'Logowanie…', creating_pw: 'Tworzenie hasła…',
    create_pw_continue: 'Utwórz hasło i kontynuuj',
    err_rejected: 'Twoja aplikacja została odrzucona. Skontaktuj się z pomocą techniczną.',
    err_pending: 'Twoja aplikacja oczekuje na zatwierdzenie. Zostaniesz powiadomiony e-mailem.',
    err_submitted: 'Twoje zgłoszenie jest przetwarzane. Dostęp zostanie aktywowany po zatwierdzeniu.',
    err_bad_password: 'Nieprawidłowe dane logowania. Użyj „Zapomniałeś hasła?" aby je zresetować.',
    err_generic: 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.',
  },
  common: {
    loading: 'Ładowanie…', error: 'Wystąpił błąd. Spróbuj ponownie.',
    close: 'Zamknij', back: 'Wróć', save: 'Zapisz', cancel: 'Anuluj',
    confirm: 'Potwierdź', yes: 'Tak', no: 'Nie', required: '*',
    learn_more: 'Dowiedz się więcej', register_free: 'Zarejestruj się za darmo',
    contact_us: 'Skontaktuj się z nami', whatsapp: 'WhatsApp', b2b_access: 'Dostęp B2B',
    view_catalogue: 'Zobacz katalog',
  },
}

// ─── Romanian ─────────────────────────────────────────────────────────────────
export const ro = {
  nav: {
    home: 'Acasă', catalogue: 'Catalog complet', colours: 'Familii de culori',
    about: 'Despre noi', guestbook: 'Carte de oaspeți', distributors: 'Distribuitori',
    academy: 'Pentru academii', b2b: 'Portal B2B', login: 'Autentificare',
    register: 'Înregistrare', logout: 'Deconectare', dashboard: 'Panou de control',
    cart: 'Coș', search: 'Caută produse…',
  },
  portal: {
    login_title: 'Autentificare Portal B2B', register_title: 'Înregistrare comercială',
    email: 'Email', password: 'Parolă', forgot_password: 'Ați uitat parola?',
    login_btn: 'Autentificare', register_btn: 'Creare cont',
    already_account: 'Aveți deja un cont?', no_account: 'Nu aveți încă un cont?',
    name: 'Nume', company: 'Companie', phone: 'Telefon', country: 'Țară', vat: 'CUI/CIF',
    role_label: 'Tip de activitate', terms: 'Accept termenii și condițiile',
    dashboard_title: 'Panou de control', orders: 'Comenzi', products: 'Produse',
    account: 'Cont', place_order: 'Plasați o comandă',
    order_history: 'Istoricul comenzilor', logout: 'Deconectare',
    create_password: 'Creați parola', confirm_password: 'Confirmați parola',
    signing_in: 'Autentificare…', creating_pw: 'Se creează parola…',
    create_pw_continue: 'Creați parola și continuați',
    err_rejected: 'Cererea dvs. a fost respinsă. Contactați suportul pentru pașii următori.',
    err_pending: 'Cererea dvs. este în așteptarea aprobării. Veți fi notificat prin e-mail.',
    err_submitted: 'Cererea dvs. este în curs de procesare. Accesul va fi activat după aprobare.',
    err_bad_password: 'Date de autentificare incorecte. Folosiți „Ați uitat parola?" pentru resetare.',
    err_generic: 'A apărut o eroare neașteptată. Vă rugăm să încercați din nou.',
  },
  common: {
    loading: 'Se încarcă…', error: 'A apărut o eroare. Vă rugăm să încercați din nou.',
    close: 'Închide', back: 'Înapoi', save: 'Salvare', cancel: 'Anulare',
    confirm: 'Confirmare', yes: 'Da', no: 'Nu', required: '*',
    learn_more: 'Aflați mai multe', register_free: 'Înregistrare gratuită',
    contact_us: 'Contactați-ne', whatsapp: 'WhatsApp', b2b_access: 'Acces B2B',
    view_catalogue: 'Vizualizați catalogul',
  },
}

// ─── Portuguese ───────────────────────────────────────────────────────────────
export const pt = {
  nav: {
    home: 'Início', catalogue: 'Catálogo completo', colours: 'Famílias de cores',
    about: 'Sobre nós', guestbook: 'Livro de visitas', distributors: 'Distribuidores',
    academy: 'Para academias', b2b: 'Portal B2B', login: 'Entrar',
    register: 'Registar', logout: 'Sair', dashboard: 'Painel',
    cart: 'Carrinho', search: 'Pesquisar produtos…',
  },
  portal: {
    login_title: 'Acesso ao Portal B2B', register_title: 'Registo Comercial',
    email: 'E-mail', password: 'Senha', forgot_password: 'Esqueceu a senha?',
    login_btn: 'Entrar', register_btn: 'Criar conta',
    already_account: 'Já tem uma conta?', no_account: 'Ainda não tem conta?',
    name: 'Nome', company: 'Empresa', phone: 'Telefone', country: 'País', vat: 'NIF/NIPC',
    role_label: 'Tipo de atividade', terms: 'Aceito os termos e condições',
    dashboard_title: 'Painel', orders: 'Pedidos', products: 'Produtos',
    account: 'Conta', place_order: 'Fazer um pedido',
    order_history: 'Histórico de pedidos', logout: 'Sair',
    create_password: 'Criar senha', confirm_password: 'Confirmar senha',
    signing_in: 'A entrar…', creating_pw: 'A criar senha…',
    create_pw_continue: 'Criar senha e continuar',
    err_rejected: 'A sua candidatura foi rejeitada. Contacte o suporte para os próximos passos.',
    err_pending: 'A sua candidatura está pendente de aprovação. Será notificado por e-mail.',
    err_submitted: 'O seu pedido está a ser processado. O acesso será ativado após aprovação.',
    err_bad_password: 'Credenciais inválidas. Use „Esqueceu a senha?" para redefinir o acesso.',
    err_generic: 'Ocorreu um erro inesperado. Por favor, tente novamente.',
  },
  common: {
    loading: 'A carregar…', error: 'Ocorreu um erro. Tente novamente.',
    close: 'Fechar', back: 'Voltar', save: 'Guardar', cancel: 'Cancelar',
    confirm: 'Confirmar', yes: 'Sim', no: 'Não', required: '*',
    learn_more: 'Saber mais', register_free: 'Registar gratuitamente',
    contact_us: 'Contacte-nos', whatsapp: 'WhatsApp', b2b_access: 'Acesso B2B',
    view_catalogue: 'Ver catálogo',
  },
}

// ─── Hungarian ────────────────────────────────────────────────────────────────
export const hu = {
  nav: {
    home: 'Főoldal', catalogue: 'Teljes katalógus', colours: 'Színcsaládok',
    about: 'Rólunk', guestbook: 'Vendégkönyv', distributors: 'Viszonteladók',
    academy: 'Akadémiáknak', b2b: 'B2B portál', login: 'Bejelentkezés',
    register: 'Regisztráció', logout: 'Kijelentkezés', dashboard: 'Irányítópult',
    cart: 'Kosár', search: 'Termékek keresése…',
  },
  portal: {
    login_title: 'B2B portál belépés', register_title: 'Üzleti regisztráció',
    email: 'E-mail', password: 'Jelszó', forgot_password: 'Elfelejtette jelszavát?',
    login_btn: 'Bejelentkezés', register_btn: 'Fiók létrehozása',
    already_account: 'Már van fiókja?', no_account: 'Még nincs fiókja?',
    name: 'Név', company: 'Cég', phone: 'Telefon', country: 'Ország', vat: 'Adószám',
    role_label: 'Vállalkozás típusa', terms: 'Elfogadom a feltételeket',
    dashboard_title: 'Irányítópult', orders: 'Rendelések', products: 'Termékek',
    account: 'Fiók', place_order: 'Rendelés leadása',
    order_history: 'Rendelési előzmények', logout: 'Kijelentkezés',
    create_password: 'Jelszó létrehozása', confirm_password: 'Jelszó megerősítése',
    signing_in: 'Bejelentkezés…', creating_pw: 'Jelszó létrehozása…',
    create_pw_continue: 'Jelszó létrehozása és folytatás',
    err_rejected: 'Kérelmét elutasítottuk. Vegye fel a kapcsolatot az ügyfélszolgálattal.',
    err_pending: 'Kérelme jóváhagyásra vár. E-mailben értesítjük.',
    err_submitted: 'Kérelmét feldolgozzuk. A hozzáférés jóváhagyás után aktiválódik.',
    err_bad_password: 'Érvénytelen bejelentkezési adatok. Használja az „Elfelejtette jelszavát?" funkciót.',
    err_generic: 'Váratlan hiba történt. Kérjük, próbálja újra.',
  },
  common: {
    loading: 'Betöltés…', error: 'Hiba történt. Kérjük, próbálja újra.',
    close: 'Bezárás', back: 'Vissza', save: 'Mentés', cancel: 'Mégse',
    confirm: 'Megerősítés', yes: 'Igen', no: 'Nem', required: '*',
    learn_more: 'Tudjon meg többet', register_free: 'Ingyenes regisztráció',
    contact_us: 'Kapcsolat', whatsapp: 'WhatsApp', b2b_access: 'B2B hozzáférés',
    view_catalogue: 'Katalógus megtekintése',
  },
}

/* English fallback — returns the key path for anything not translated */
export const en = null // use existing hardcoded strings

/* Hook: returns the translation object for the current language */
export function useTranslations() {
  const lang = useLang()
  return lang === 'it' ? it : null
}
