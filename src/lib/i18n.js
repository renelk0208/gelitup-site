import { createContext, useContext } from 'react'

/* Detect Italian context: gelitup.eu domain */
export function detectLang() {
  if (typeof window === 'undefined') return 'en'
  const host = window.location.hostname
  if (host === 'gelitup.eu' || host === 'www.gelitup.eu') return 'it'
  return 'en'
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
    search_placeholder: 'Cerca per nome o codice colore…',
    filter_all: 'Tutti',
    filter_new: 'Novità',
    filter_featured: 'In Evidenza',
    no_results: 'Nessun prodotto trovato.',
    load_more: 'Carica altro',
    add_to_cart: 'Aggiungi al carrello',
    in_stock: 'Disponibile',
    out_of_stock: 'Esaurito',
    view_details: 'Vedi dettagli',
    sku: 'Codice',
    category: 'Categoria',
    colour_family: 'Famiglia Colori',
    size: 'Formato',
    price: 'Prezzo',
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

/* English fallback — returns the key path for anything not translated */
export const en = null // use existing hardcoded strings

/* Hook: returns the translation object for the current language */
export function useTranslations() {
  const lang = useLang()
  return lang === 'it' ? it : null
}
