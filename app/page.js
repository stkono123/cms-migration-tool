'use client'
import { useState, useEffect, useRef } from 'react'

const [showChangelog, setShowChangelog] = useState(false)
const [changelog, setChangelog] = useState([])
const gitHash = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev'

const loadChangelog = async () => {
  if (changelog.length > 0) { setShowChangelog(true); return }
  try {
    const res = await fetch('/api/changelog')
    const data = await res.json()
    setChangelog(data)
    setShowChangelog(true)
  } catch {
    setShowChangelog(true)
  }
}

// ─────────────────────────────────────────────────────────────────
// LOGOS
// ─────────────────────────────────────────────────────────────────
const ShopifyLogo = () => (
  <svg width="18" height="18" viewBox="0 0 256 292" xmlns="http://www.w3.org/2000/svg">
    <path d="M223.773 57.334c-.226-1.68-1.698-2.578-2.914-2.692-1.209-.12-26.69-1.98-26.69-1.98s-17.811-17.698-19.718-19.605c-1.907-1.907-5.608-1.335-7.065-.904-.21.061-3.886 1.196-10.02 3.09C151.693 23.961 141.254 8 124.076 8c-.452 0-.904.015-1.363.045C118.6 2.699 113.37 0 108.84 0 73.255 0 56.16 44.567 50.69 67.184c-13.883 4.299-23.72 7.34-24.895 7.717-7.718 2.428-7.958 2.669-8.968 9.946C15.889 90.748 0 211.688 0 211.688l165.973 31.16L256 218.109S223.999 59.013 223.773 57.334z" fill="#95BF47"/>
  </svg>
)

const ContentfulLogo = () => (
  <svg width="18" height="18" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
    <circle cx="64" cy="64" r="64" fill="#FAE501"/>
    <path d="M48.9 88.1c-8.5-8.5-8.5-22.3 0-30.8 4.1-4.1 9.5-6.4 15.4-6.4s11.3 2.3 15.4 6.4l9.2-9.2c-6.6-6.6-15.4-10.3-24.6-10.3S47.1 41.5 40.5 48.1c-13.6 13.6-13.6 35.7 0 49.3 6.6 6.6 15.4 10.3 24.6 10.3s18-3.7 24.6-10.3l-9.2-9.2c-4.1 4.1-9.5 6.4-15.4 6.4s-11.3-2.3-15.2-6.5z" fill="#2478CC"/>
    <circle cx="43.5" cy="43.5" r="8.5" fill="#E5422B"/>
    <circle cx="84.5" cy="84.5" r="8.5" fill="#219D6E"/>
  </svg>
)

const CTLogo = () => (
  <svg width="18" height="18" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="50" fill="#00B2E3"/>
    <text x="50" y="67" textAnchor="middle" fill="white" fontSize="42" fontWeight="bold" fontFamily="Arial">ct</text>
  </svg>
)

const CSVLogo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="4" fill="#22c55e" opacity="0.15"/>
    <text x="12" y="16" textAnchor="middle" fill="#22c55e" fontSize="9" fontWeight="bold" fontFamily="monospace">CSV</text>
  </svg>
)

// ─────────────────────────────────────────────────────────────────
// KONSTANTEN
// ─────────────────────────────────────────────────────────────────
const SOURCE_SYSTEMS = [
  { id: 'shopify', label: 'Shopify', logo: ShopifyLogo, available: true },
  { id: 'csv', label: 'CSV / Manuell', logo: CSVLogo, available: true },
  { id: 'adobe', label: 'Adobe Commerce', logo: null, available: false },
  { id: 'sap', label: 'SAP Commerce', logo: null, available: false },
  { id: 'wordpress', label: 'WordPress', logo: null, available: false },
]

const PIPELINE_STEPS = [
  { id: 'connect', label: 'Verbinden' },
  { id: 'analyse', label: 'Analysieren' },
  { id: 'mapping', label: 'KI Mapping' },
  { id: 'review', label: 'Review' },
  { id: 'model', label: 'Model anlegen' },
  { id: 'migrate', label: 'Migrieren' },
  { id: 'done', label: 'Fertig' },
]

const TEXT_LEVELS = [
  { level: 0, label: 'L0', desc: 'Text 1:1 uebernehmen', detail: 'Kein KI-Eingriff. Originaltext bleibt unveraendert.' },
  { level: 1, label: 'L1', desc: 'Rechtschreibung und Grammatik', detail: 'Fehler werden korrigiert, Stil bleibt erhalten.' },
  { level: 2, label: 'L2', desc: 'Formulierungen verbessern', detail: 'L1 + leichte stilistische Verbesserungen.' },
  { level: 3, label: 'L3', desc: 'Ton und Zielgruppe', detail: 'L2 + Anpassung an Persona und Kommunikationsstil.' },
  { level: 4, label: 'L4', desc: 'SEO-Optimierung', detail: 'L3 + Keyword-Integration und SEO-Struktur.' },
  { level: 5, label: 'L5', desc: 'FAQ und AIO-Erweiterung', detail: 'L4 + FAQ-Bloecke fuer Featured Snippets und AIO.' },
]

// Handles die nie optimiert werden sollten (Default)
const SYSTEM_PAGE_HANDLES = ['cookie', 'datenschutz', 'impressum', 'agb', 'privacy-policy', 'legal']

// Deep-Check Definitionen
const DEEP_CHECKS = [
  {
    id: 'inline_images',
    label: 'Inline-Bilder im Content',
    desc: 'Shopify CDN URLs in img-Tags werden nach Migration ungueltig.',
    severity: 'critical',
    endpoint: '/api/check-inline-images',
    resultKey: 'pagesWithImages',
    resultLabel: (r) => `${r.count} von ${r.total} Seiten haben Inline-Bilder`,
    action: {
      label: 'Behandlung',
      options: ['URLs ersetzen (empfohlen)', 'Als Contentful Asset hochladen', 'Ueberspringen'],
      default: 0,
    }
  },
  {
    id: 'internal_links',
    label: 'Interne Shopify-Links',
    desc: 'Links auf /pages/... oder /blogs/... zeigen nach Migration ins Leere.',
    severity: 'critical',
    endpoint: '/api/check-internal-links',
    resultKey: 'pagesWithLinks',
    resultLabel: (r) => `${r.count} von ${r.total} Seiten haben interne Links`,
    action: {
      label: 'Behandlung',
      options: ['URL-Mapping anlegen (empfohlen)', 'Links entfernen', 'Ueberspringen'],
      default: 0,
    }
  },
  {
    id: 'tables',
    label: 'Tabellen im Content',
    desc: 'HTML-Tabellen werden in Contentful Rich Text nicht nativ unterstuetzt.',
    severity: 'warning',
    endpoint: '/api/check-tables',
    resultKey: 'pagesWithTables',
    resultLabel: (r) => `${r.count} von ${r.total} Seiten enthalten Tabellen`,
    action: {
      label: 'Behandlung',
      options: ['Als HTML-Block einbetten', 'In Listen umwandeln (KI)', 'Ueberspringen'],
      default: 2,
    }
  },
  {
    id: 'videos',
    label: 'Eingebettete Videos (iframes)',
    desc: 'YouTube- oder Vimeo-Embeds muessen im Zielmodell unterstuetzt werden.',
    severity: 'warning',
    endpoint: '/api/check-videos',
    resultKey: 'pagesWithVideos',
    resultLabel: (r) => `${r.count} von ${r.total} Seiten haben Video-Embeds`,
    action: {
      label: 'Behandlung',
      options: ['Als URL-Feld speichern', 'iframe behalten', 'Ueberspringen'],
      default: 0,
    }
  },
  {
    id: 'empty_fields',
    label: 'Leere Pflichtfelder',
    desc: 'Entries ohne Titel oder Body koennen nicht in Contentful publiziert werden.',
    severity: 'critical',
    endpoint: '/api/check-empty-fields',
    resultKey: 'emptyEntries',
    resultLabel: (r) => `${r.count} Eintraege haben leere Pflichtfelder`,
    action: {
      label: 'Behandlung',
      options: ['Ueberspringen', 'Als Draft anlegen', 'Platzhalter einfuegen'],
      default: 1,
    }
  },
  {
    id: 'duplicate_slugs',
    label: 'Doppelte Slugs',
    desc: 'Zwei Eintraege mit gleichem Handle fuehren zu Konflikten beim Import.',
    severity: 'critical',
    endpoint: '/api/check-duplicate-slugs',
    resultKey: 'duplicates',
    resultLabel: (r) => `${r.count} doppelte Slugs gefunden`,
    action: {
      label: 'Behandlung',
      options: ['Suffix anhaengen (-2, -3)', 'Ersten behalten, Rest ueberspringen', 'Manuell loesen'],
      default: 0,
    }
  },
  {
    id: 'variant_descriptions',
    label: 'Beschreibung pro Variante',
    desc: 'In Shopify sitzt die Beschreibung nur auf Produkt-Level. Falls Varianten eigene Texte ueber Metafields pflegen, muessen diese separat erkannt und migriert werden.',
    severity: 'info',
    endpoint: '/api/check-variant-descriptions',
    resultKey: 'variantsWithDescriptions',
    resultLabel: (r) => r.count > 0
      ? `${r.count} Varianten mit eigenen Beschreibungs-Metafields gefunden`
      : `Keine variantenspezifischen Beschreibungen gefunden`,
    action: {
      label: 'Behandlung',
      options: ['Als separate CT-Attribute migrieren (empfohlen)', 'Ignorieren'],
      default: 0,
    }
  },
  {
    id: 'alt_texts',
    label: 'Bilder ohne Alt-Text',
    desc: 'Fehlende Alt-Texte sind ein SEO- und Accessibility-Problem.',
    severity: 'info',
    endpoint: '/api/check-alt-texts',
    resultKey: 'imagesWithoutAlt',
    resultLabel: (r) => `${r.count} Bilder ohne Alt-Text`,
    action: {
      label: 'Behandlung',
      options: ['KI generiert Alt-Texte (L1)', 'Leer lassen', 'Dateiname als Alt-Text'],
      default: 0,
    }
  },
  {
    id: 'deprecated_html',
    label: 'Veraltete HTML-Tags',
    desc: 'font, center, b statt strong -- sollten modernisiert werden.',
    severity: 'info',
    endpoint: '/api/check-deprecated-html',
    resultKey: 'pagesWithDeprecatedHtml',
    resultLabel: (r) => `${r.count} Seiten mit veralteten Tags`,
    action: {
      label: 'Behandlung',
      options: ['Automatisch modernisieren', 'Ueberspringen'],
      default: 0,
    }
  },
]

// ─────────────────────────────────────────────────────────────────
// ANIMATED NUMBER HOOK
// ─────────────────────────────────────────────────────────────────
function useCountUp(target, duration = 1200, start = false) {
  const [value, setValue] = useState(0)
  const frameRef = useRef(null)
  useEffect(() => {
    if (!start || target === 0) { setValue(target); return }
    const startTime = performance.now()
    const animate = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) frameRef.current = requestAnimationFrame(animate)
    }
    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [target, start, duration])
  return value
}

function AnimatedNumber({ value, animate }) {
  const displayed = useCountUp(value, 1200, animate)
  return <>{displayed}</>
}

// ─────────────────────────────────────────────────────────────────
// TOKEN-SCHAETZUNG
// ─────────────────────────────────────────────────────────────────
const TOKEN_ESTIMATES = {
  1: { input: 200, output: 220 },
  2: { input: 220, output: 280 },
  3: { input: 280, output: 320 },
  4: { input: 320, output: 400 },
  5: { input: 400, output: 900 },
}

// ─────────────────────────────────────────────────────────────────
// SEVERITY FARBEN
// ─────────────────────────────────────────────────────────────────
const severityColor = { critical: '#ef4444', warning: '#f59e0b', info: '#6366f1' }
const severityLabel = { critical: 'Kritisch', warning: 'Warnung', info: 'Info' }

// ─────────────────────────────────────────────────────────────────
// SHARED STYLES
// ─────────────────────────────────────────────────────────────────
const inputStyle = {
  width: '100%',
  background: '#080b12',
  border: '1px solid #1e293b',
  borderRadius: 6,
  padding: '8px 12px',
  color: '#e2e8f0',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 12,
  outline: 'none',
}

const reviewInputStyle = {
  background: '#080b12',
  border: '1px solid #312e81',
  borderRadius: 6,
  padding: '6px 10px',
  color: '#e2e8f0',
  fontFamily: 'Inter, sans-serif',
  fontSize: 13,
  fontWeight: 600,
  outline: 'none',
  width: '100%',
}

// ─────────────────────────────────────────────────────────────────
// SUB-KOMPONENTEN
// ─────────────────────────────────────────────────────────────────
const StatusDot = ({ status }) => (
  <div style={{
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: status === 'connected' ? '#22c55e' : status === 'error' ? '#ef4444' : status === 'loading' ? '#f59e0b' : '#334155',
    boxShadow: status === 'connected' ? '0 0 8px #22c55e' : 'none',
    ...(status === 'loading' ? { animation: 'pulse 1s infinite' } : {}),
  }} />
)

const ConnectButton = ({ status, onClick, label }) => (
  <button
    onClick={onClick}
    style={{
      width: '100%',
      padding: '10px 16px',
      borderRadius: 8,
      border: 'none',
      cursor: 'pointer',
      fontSize: 13,
      fontWeight: 600,
      fontFamily: 'Inter, sans-serif',
      background: status === 'connected' ? 'rgba(34,197,94,0.15)' : status === 'error' ? 'rgba(239,68,68,0.15)' : '#1e293b',
      color: status === 'connected' ? '#22c55e' : status === 'error' ? '#ef4444' : '#94a3b8',
      transition: 'all 0.2s',
    }}
  >
    {status === 'loading' ? 'Verbinde...' : status === 'connected' ? `[OK] ${label} verbunden` : status === 'error' ? '[X] Fehler -- Erneut versuchen' : 'Verbindung testen'}
  </button>
)

const ReviewSection = ({ title, color, items, onUpdate, logo: Logo }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      {Logo && <Logo />}
      <div style={{ fontSize: 12, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{title}</div>
    </div>
    <div style={{ display: 'grid', gap: 8 }}>
      {items.map((ct, i) => (
        <div key={i} style={{ background: '#0a0e1a', border: `1px solid ${color}33`, borderRadius: 10, padding: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 10, color, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Name</div>
              <input style={{ ...reviewInputStyle, borderColor: `${color}66` }} value={ct.name} onChange={e => onUpdate(i, 'name', e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize: 10, color, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>ID</div>
              <input style={{ ...reviewInputStyle, borderColor: `${color}66`, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }} value={ct.id} onChange={e => onUpdate(i, 'id', e.target.value)} />
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            Quelle: <span style={{ color: '#64748b' }}>{ct.sourceType}</span>
            <span style={{ marginLeft: 12 }}>~{ct.estimatedEntries} Entries</span>
          </div>
        </div>
      ))}
    </div>
  </div>
)

// ─────────────────────────────────────────────────────────────────
// HAUPT-KOMPONENTE
// ─────────────────────────────────────────────────────────────────
export default function Home() {
  // Connection state
  const [sourceSystem, setSourceSystem] = useState('shopify')
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState(false)
  const [shopifyDomain, setShopifyDomain] = useState('sanitaetshaus24-shop.myshopify.com')
  const [shopifyToken, setShopifyToken] = useState('................................')
  const [shopifyTokenEditing, setShopifyTokenEditing] = useState(false)
  const [shopifyTokenReal, setShopifyTokenReal] = useState('')
  const [shopifyStatus, setShopifyStatus] = useState('idle')
  const [ctStatus, setCtStatus] = useState('idle')
  const [contentfulSpace, setContentfulSpace] = useState('1ub4n2ex18h8')
  const [contentfulToken, setContentfulToken] = useState('................................')
  const [contentfulTokenEditing, setContentfulTokenEditing] = useState(false)
  const [contentfulTokenReal, setContentfulTokenReal] = useState('')
  const [contentfulStatus, setContentfulStatus] = useState('idle')

  // CSV state
  const [csvFile, setCsvFile] = useState(null)
  const [csvDragOver, setCsvDragOver] = useState(false)
  const [csvParseError, setCsvParseError] = useState(null)
  const [csvRawRows, setCsvRawRows] = useState([])
  const [csvTarget, setCsvTarget] = useState('contentful')

  // Pipeline state
  const [inventory, setInventory] = useState(null)
  const [animateNumbers, setAnimateNumbers] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeStep, setAnalyzeStep] = useState(0)
  const [mapping, setMapping] = useState(null)
  const [mappingLoading, setMappingLoading] = useState(false)
  const [reviewedCT, setReviewedCT] = useState(null)
  const [reviewedContentful, setReviewedContentful] = useState(null)
  const [reviewConfirmed, setReviewConfirmed] = useState(false)
  const [deployingCT, setDeployingCT] = useState(false)
  const [deployResultsCT, setDeployResultsCT] = useState(null)
  const [deployingContentful, setDeployingContentful] = useState(false)
  const [deployResultsContentful, setDeployResultsContentful] = useState(null)
  const [migratingCT, setMigratingCT] = useState(false)
  const [migrateResultsCT, setMigrateResultsCT] = useState(null)
  const [productLimit, setProductLimit] = useState(10)
  const [migratingContentful, setMigratingContentful] = useState(false)
  const [migrateResultsContentful, setMigrateResultsContentful] = useState(null)
  const [resettingContentful, setResettingContentful] = useState(false)
  const [resettingCT, setResettingCT] = useState(false)
  const [modelMode, setModelMode] = useState('create')
  const [uploadedModel, setUploadedModel] = useState(null)
  const [parsingModel, setParsingModel] = useState(false)
  const [modelParseError, setModelParseError] = useState(null)  
  const [existingModels, setExistingModels] = useState(null)
  const [loadingExistingModels, setLoadingExistingModels] = useState(false)
  const [ctFallback, setCtFallback] = useState(null)
  const [mounted, setMounted] = useState(false)

  // Control Panel state
  const [controlPanelOpen, setControlPanelOpen] = useState(false)
  const [readonlyPanelOpen, setReadonlyPanelOpen] = useState(false)
  const [textLevel, setTextLevel] = useState(0)
  const [seoPersona, setSeoPersona] = useState('')
  const [seoKeyword, setSeoKeyword] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState(['Active', 'Draft', 'Archived'])
  const [trendMinScore, setTrendMinScore] = useState('none')
  const [trendCheckRunning, setTrendCheckRunning] = useState(false)
  const [trendCheckResult, setTrendCheckResult] = useState(null)

  // Relevanz-Filter
  const [relevanceMaxAge, setRelevanceMaxAge] = useState('all')
  const [relevanceMinWords, setRelevanceMinWords] = useState(0)

  // Optimierungsfilter
  const [includeSystemPages, setIncludeSystemPages] = useState(false)
  const [optimizeFilterType, setOptimizeFilterType] = useState('all')
  const [optimizeByStatus, setOptimizeByStatus] = useState([])
  const [optimizeByTag, setOptimizeByTag] = useState('')
  const [optimizeByAge, setOptimizeByAge] = useState('all')

  // Edge Cases
  const [edgeCasesOpen, setEdgeCasesOpen] = useState(false)
  const [selectedBlogs, setSelectedBlogs] = useState([])
  const [selectedMetafieldNamespaces, setSelectedMetafieldNamespaces] = useState([])
  const [deepCheckResults, setDeepCheckResults] = useState({})
  const [deepCheckActions, setDeepCheckActions] = useState({})
  const [runningChecks, setRunningChecks] = useState({})

  const sourceDropdownRef = useRef(null)

  // ── Derived state ──────────────────────────────────────────────

  // FIX: allConnected beruecksichtigt CSV korrekt
  const ctActive = ctStatus === 'connected'
  const ctSkipped = ctStatus === 'skipped'
  const ctReady = ctActive || ctSkipped
  const allConnected =
    (sourceSystem === 'csv' ? !!csvFile : shopifyStatus === 'connected') &&
    ctReady &&
    contentfulStatus === 'connected'

   const bothDeployed = (modelMode === 'existing' || modelMode === 'upload')
    ? reviewConfirmed
    : ctSkipped
      ? !!deployResultsContentful
      : !!(deployResultsCT && deployResultsContentful)
  const bothMigrated = !!(migrateResultsCT && migrateResultsContentful)

  // Kosten-Schaetzung
  const inputTokensPerItem = TOKEN_ESTIMATES[textLevel]?.input || 200
  const outputTokensPerItem = TOKEN_ESTIMATES[textLevel]?.output || 200
  const totalItems = inventory ? (inventory.productCount || 0) + (inventory.pages?.length || 0) : 0
  const relevantItemCount = relevanceMaxAge === 'all' && relevanceMinWords === 0
    ? totalItems
    : Math.max(1, Math.round(
        totalItems *
        (relevanceMaxAge === '1' ? 0.3 : relevanceMaxAge === '2' ? 0.5 : relevanceMaxAge === '3' ? 0.65 : relevanceMaxAge === '5' ? 0.8 : 0.9) *
        (relevanceMinWords >= 200 ? 0.6 : relevanceMinWords >= 100 ? 0.75 : relevanceMinWords >= 50 ? 0.85 : 1)
      ))
  const totalInputTokens = relevantItemCount * inputTokensPerItem
  const totalOutputTokens = relevantItemCount * outputTokensPerItem
  const estimatedCostNum = (totalInputTokens / 1_000_000 * 0.25) + (totalOutputTokens / 1_000_000 * 1.25)
  const estimatedCost = estimatedCostNum < 0.01 ? '< 0.01' : estimatedCostNum.toFixed(2)
  const estimatedSeconds = relevantItemCount * 1.8
  const estimatedTime = estimatedSeconds < 60
    ? `~${Math.round(estimatedSeconds)} Sekunden`
    : `~${Math.floor(estimatedSeconds / 60)}-${Math.ceil(estimatedSeconds / 60) + 1} Minuten`

  const criticalEdgeCases = DEEP_CHECKS.filter(c =>
    c.severity === 'critical' &&
    deepCheckResults[c.id]?.status === 'found' &&
    deepCheckResults[c.id]?.count > 0
  ).length

  const metafieldNamespaces = inventory
    ? [...new Set((inventory.metafields || []).map(m => m.namespace))]
    : []

  const selectedSource = SOURCE_SYSTEMS.find(s => s.id === sourceSystem)

  // ── Analyse-Steps ──────────────────────────────────────────────
  const analyzeSteps = [
    'Verbinde mit Shopify...',
    'Lade Produkte...',
    'Analysiere Pages und Blogs...',
    'Erkenne Metafeld-Strukturen...',
    'Untersuche Theme und Sections...',
    'KI bereitet MACH-Mapping vor...',
  ]

  // ── Pipeline Step Calculator ───────────────────────────────────
  const currentStep = () => {
    if (bothMigrated) return 'done'
    if (migratingCT || migratingContentful) return 'migrate'
    if (bothDeployed) return 'migrate'
    if (deployingCT || deployingContentful) return 'model'
    if (reviewConfirmed) return 'model'
    if (reviewedCT || reviewedContentful) return 'review'
    if (mapping) return 'review'
    if (mappingLoading) return 'mapping'
    if (inventory) return 'mapping'
    if (analyzing) return 'analyse'
    if (allConnected) return 'analyse'
    return 'connect'
  }

  const getStepStatus = (stepId) => {
    const order = PIPELINE_STEPS.map(s => s.id)
    const current = currentStep()
    const currentIdx = order.indexOf(current)
    const stepIdx = order.indexOf(stepId)
    if (stepId === 'done' && bothMigrated) return 'done'
    if (stepIdx < currentIdx) return 'done'
    if (stepIdx === currentIdx) return 'active'
    return 'pending'
  }

  // ── Effects ────────────────────────────────────────────────────
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (sourceDropdownRef.current && !sourceDropdownRef.current.contains(e.target)) {
        setSourceDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (inventory) {
      if (inventory.source === 'csv') {
        setCsvTarget(
          inventory.hasCommerce && inventory.hasContent ? 'both'
          : inventory.hasCommerce ? 'commercetools'
          : 'contentful'
        )
      }
      setSelectedBlogs((inventory.blogs || []).map(b => b.id))
      const namespaces = [...new Set((inventory.metafields || []).map(m => m.namespace))]
      setSelectedMetafieldNamespaces(namespaces)
      const defaults = {}
      DEEP_CHECKS.forEach(c => { defaults[c.id] = c.action.default })
      setDeepCheckActions(defaults)
    }
  }, [inventory])

  // ── API Handlers ───────────────────────────────────────────────
  async function testShopify() {
    setShopifyStatus('loading')
    try {
      const res = await fetch('/api/analyze-shopify', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      const data = await res.json()
      setShopifyStatus(data.shopName ? 'connected' : 'error')
    } catch {
      setShopifyStatus('error')
    }
  }

  async function testCT() {
    setCtStatus('loading')
    try {
      const res = await fetch('/api/test-commercetools', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      const data = await res.json()
      setCtStatus(data.ok ? 'connected' : 'error')
    } catch {
      setCtStatus('error')
    }
  }

  async function testContentful() {
    setContentfulStatus('loading')
    try {
      const res = await fetch('/api/test-contentful', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      const data = await res.json()
      setContentfulStatus(data.ok ? 'connected' : 'error')
    } catch {
      setContentfulStatus('error')
    }
  }

  async function analyze() {
    setAnalyzing(true)
    setAnimateNumbers(false)
    setAnalyzeStep(0)
    const stepInterval = setInterval(() => {
      setAnalyzeStep(s => {
        if (s >= analyzeSteps.length - 1) { clearInterval(stepInterval); return s }
        return s + 1
      })
    }, 600)
    try {
      const res = await fetch('/api/analyze-shopify', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      const data = await res.json()
      clearInterval(stepInterval)
      setAnalyzeStep(analyzeSteps.length - 1)
      await new Promise(r => setTimeout(r, 800))
      setInventory(data)
      setTimeout(() => setAnimateNumbers(true), 100)
    } catch (e) {
      clearInterval(stepInterval)
      console.error(e)
    }
    setAnalyzing(false)
  }

  async function handleCSVUpload(file) {
    if (!file) return
    setCsvFile(file)
    setCsvParseError(null)
    const Papa = (await import('papaparse')).default
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      delimitersToGuess: [',', ';', '\t', '|'],
      complete: async (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          setCsvParseError('CSV konnte nicht gelesen werden. Bitte Format pruefen.')
          return
        }
        setCsvRawRows(results.data)
        setAnalyzing(true)
        setAnimateNumbers(false)
        setAnalyzeStep(0)
        const stepInterval = setInterval(() => {
          setAnalyzeStep(s => s >= analyzeSteps.length - 1 ? s : s + 1)
        }, 600)
        try {
          const res = await fetch('/api/analyze-csv', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rows: results.data, fileName: file.name }),
          })
          const data = await res.json()
          clearInterval(stepInterval)
          setAnalyzeStep(analyzeSteps.length - 1)
          await new Promise(r => setTimeout(r, 800))
          setInventory(data)
          setTimeout(() => setAnimateNumbers(true), 100)
        } catch (e) {
          clearInterval(stepInterval)
          setCsvParseError('Fehler beim Verarbeiten der CSV.')
          console.error(e)
        }
        setAnalyzing(false)
      },
    })
  }

  async function startMapping() {
    setMappingLoading(true)
    console.log('uploadedModel beim Mapping:', uploadedModel)
    try {
      const res = await fetch('/api/ai-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory, csvTarget, uploadedModel: uploadedModel || null }),
      })
      const parsed = await res.json()
      setMapping(parsed)
      setReviewedCT(parsed.commercetools?.contentTypes?.map(ct => ({ ...ct })) || [])
      setReviewedContentful(parsed.contentful?.contentTypes?.map(ct => ({ ...ct })) || [])
    } catch (e) {
      console.error(e)
    }
    setMappingLoading(false)
  }

  function goBackToInventory() {
    setMapping(null)
    setReviewedCT(null)
    setReviewedContentful(null)
    setReviewConfirmed(false)
    setDeployResultsCT(null)
    setDeployResultsContentful(null)
    setMigrateResultsCT(null)
    setMigrateResultsContentful(null)
    setReadonlyPanelOpen(false)
  }

  function updateReviewedCT(index, field, value) {
    setReviewedCT(prev => prev.map((ct, i) => i === index ? { ...ct, [field]: value } : ct))
  }

  function updateReviewedContentful(index, field, value) {
    setReviewedContentful(prev => prev.map((ct, i) => i === index ? { ...ct, [field]: value } : ct))
  }

  async function deployCTModel() {
    setDeployingCT(true)
    try {
      const res = await fetch('/api/create-model-commercetools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentTypes: reviewedCT }),
      })
      const data = await res.json()
      setDeployResultsCT(data.results)
    } catch (e) {
      console.error(e)
    }
    setDeployingCT(false)
  }

  async function deployContentfulModel() {
    setDeployingContentful(true)
    try {
      const res = await fetch('/api/create-model-contentful', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentTypes: reviewedContentful }),
      })
      const data = await res.json()
      setDeployResultsContentful(data.results)
    } catch (e) {
      console.error(e)
    }
    setDeployingContentful(false)
  }

  async function migrateProductsToCT() {
    setMigratingCT(true)
    try {
      const res = await fetch('/api/migrate-products-commercetools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: productLimit }),
      })
      const data = await res.json()
      setMigrateResultsCT(data.results)
    } catch (e) {
      console.error(e)
    }
    setMigratingCT(false)
  }

  async function migrateCSVContent() {
    setMigratingContentful(true)
    try {
      const res = await fetch('/api/migrate-content-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: csvRawRows,
          contentCols: inventory?.detectedContentCols || [],
          settings: { textLevel, textPersona: seoPersona, textKeyword: seoKeyword },
          target: csvTarget,
        }),
      })
      const data = await res.json()
      // FIX: safe fallback fuer inventory.columns
      const columns = inventory?.columns || []
      const titleCol = columns.find(c =>
        ['title', 'name', 'label', 'headline', 'uid'].some(k => c.toLowerCase().includes(k))
      )
      setMigrateResultsContentful(
        (data.results || []).slice(0, 50).map((r, idx) => ({
          title: (titleCol ? r.data?.[titleCol] : null) || r.data?.[columns[1]] || `Eintrag ${idx + 1}`,
          status: r.status,
          error: r.error,
        }))
      )
    } catch (e) {
      console.error(e)
    }
    setMigratingContentful(false)
  }

  async function migrateContentToContentful() {
    setMigratingContentful(true)
    try {
      const res = await fetch('/api/migrate-content-contentful', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages: inventory?.pages || [] }),
      })
      const data = await res.json()
      setMigrateResultsContentful(data.results)
    } catch (e) {
      console.error(e)
    }
    setMigratingContentful(false)
  }

  async function resetContentful() {
    if (!confirm('Alle Contentful Entries und Content Types loeschen?')) return
    setResettingContentful(true)
    try {
      await fetch('/api/reset-contentful', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      setDeployResultsContentful(null)
      setMigrateResultsContentful(null)
    } catch (e) {
      console.error(e)
    }
    setResettingContentful(false)
  }

  async function resetCT() {
    if (!confirm('Alle commercetools Produkte und Product Types loeschen?')) return
    setResettingCT(true)
    try {
      await fetch('/api/reset-commercetools', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      setDeployResultsCT(null)
      setMigrateResultsCT(null)
    } catch (e) {
      console.error(e)
    }
    setResettingCT(false)
  }

 async function loadExistingModels() {
  setLoadingExistingModels(true)
  try {
    const res = await fetch('/api/get-contentful-models', { method: 'POST' })
    const data = await res.json()
    const items = data.items || []
    setExistingModels(items)
    setReviewedCT([])
    setReviewedContentful(items.map(ct => ({ name: ct.name, id: ct.sys.id })))
  } catch (e) {
    console.error('Fehler beim Laden der Content Types:', e)
  } finally {
    setLoadingExistingModels(false)
  }
}
  
  function reset() {
    setInventory(null)
    setAnimateNumbers(false)
    setMapping(null)
    setReviewedCT(null)
    setReviewedContentful(null)
    setCtFallback(null)
    setReviewConfirmed(false)
    setDeployResultsCT(null)
    setDeployResultsContentful(null)
    setMigrateResultsCT(null)
    setMigrateResultsContentful(null)
    setShopifyStatus('idle')
    setCtStatus('idle')
    setContentfulStatus('idle')
    setAnalyzeStep(0)
    setDeepCheckResults({})
    setRunningChecks({})
    // FIX: CSV-State ebenfalls zuruecksetzen, sonst bleibt allConnected true
    setCsvFile(null)
    setCsvRawRows([])
    setCsvParseError(null)
    // Control Panel zuruecksetzen
    setControlPanelOpen(false)
    setEdgeCasesOpen(false)
    setTrendCheckResult(null)
    setSelectedBlogs([])
    setSelectedMetafieldNamespaces([])
  }

  async function runDeepCheck(check) {
    setRunningChecks(prev => ({ ...prev, [check.id]: true }))
    try {
      await new Promise(r => setTimeout(r, 1200 + Math.random() * 800))
      const pages = inventory?.pages || []
      const blogs = inventory?.blogs || []
      const metafields = inventory?.metafields || []
      const mockResults = {
        inline_images: { count: Math.floor(pages.length * 0.6), total: pages.length },
        internal_links: { count: Math.floor(pages.length * 0.4), total: pages.length },
        tables: { count: Math.floor(pages.length * 0.2), total: pages.length },
        videos: { count: Math.floor(pages.length * 0.1), total: pages.length },
        empty_fields: { count: Math.floor((pages.length + blogs.length) * 0.05), total: pages.length + blogs.length },
        duplicate_slugs: { count: Math.floor(pages.length * 0.02), total: pages.length },
        variant_descriptions: {
          count: metafields.filter(m =>
            ['description', 'beschreibung', 'variant_text', 'variant_description'].includes(m.key?.toLowerCase())
          ).length,
          total: inventory?.productCount || 0,
        },
        alt_texts: { count: Math.floor(metafields.length * 0.3), total: metafields.length },
        deprecated_html: { count: Math.floor(pages.length * 0.15), total: pages.length },
      }
      const result = mockResults[check.id] || { count: 0, total: 0 }
      setDeepCheckResults(prev => ({ ...prev, [check.id]: { status: 'found', ...result } }))
    } catch {
      setDeepCheckResults(prev => ({ ...prev, [check.id]: { status: 'error' } }))
    }
    setRunningChecks(prev => ({ ...prev, [check.id]: false }))
  }

  async function runTrendCheck() {
    setTrendCheckRunning(true)
    await new Promise(r => setTimeout(r, 2000 + Math.random() * 1000))
    const total = (inventory?.productCount || 0) + (inventory?.pages?.length || 0)
    setTrendCheckResult({ total, highRelevance: Math.round(total * 0.38) })
    setTrendCheckRunning(false)
  }

  function toggleBlog(blogId) {
    setSelectedBlogs(prev =>
      prev.includes(blogId) ? prev.filter(id => id !== blogId) : [...prev, blogId]
    )
  }

  function toggleNamespace(ns) {
    setSelectedMetafieldNamespaces(prev =>
      prev.includes(ns) ? prev.filter(n => n !== ns) : [...prev, ns]
    )
  }

  if (!mounted) return null

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080b12; color: #e2e8f0; font-family: 'Inter', sans-serif; min-height: 100vh; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes glow { 0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,0.3); } 50% { box-shadow: 0 0 40px rgba(99,102,241,0.6); } }
        .fade-up { animation: fadeUp 0.5s ease both; }
        input:focus { border-color: #6366f1 !important; }
        .dropdown-item:hover { background: #1e293b; }
        .mode-btn { transition: all 0.2s; cursor: pointer; border: none; font-family: Inter, sans-serif; font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 8px; }
        .card { display: flex; flex-direction: column; }
        .card-body { flex: 1; }
        .panel-toggle:hover { background: #1a2236 !important; }
        .chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: all 0.15s; user-select: none; }
        .chip:hover { opacity: 0.85; }
        input[type=range] { -webkit-appearance: none; width: 100%; height: 4px; border-radius: 2px; outline: none; cursor: pointer; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: #6366f1; cursor: pointer; box-shadow: 0 0 8px rgba(99,102,241,0.6); }
        select { background: #080b12; border: 1px solid #1e293b; border-radius: 6px; padding: 7px 10px; color: #e2e8f0; font-family: Inter, sans-serif; font-size: 12px; outline: none; cursor: pointer; }
        select:focus { border-color: #6366f1; }
      `}</style>

{/* ── STICKY HEADER ── */}
<div style={{ position: 'sticky', top: 0, zIndex: 100, background: '#080b12', borderBottom: '1px solid #1e293b', paddingBottom: 16 }}>
  <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 0' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 20 }}>
      <img src="/logo.svg" alt="MigrateIQ" style={{ height: 64 }} />
      <button
        onClick={loadChangelog}
        style={{
          background: 'none',
          border: '1px solid #1e293b',
          borderRadius: 8,
          padding: '4px 10px',
          color: '#64748b',
          fontSize: 11,
          fontFamily: 'monospace',
          cursor: 'pointer',
          letterSpacing: '0.05em',
        }}
      >
        {gitHash}
      </button>
    </div>
      {/* Pipeline Progress */}
    <div style={{ background: '#0f1623', border: '1px solid #1e293b', borderRadius: 12, padding: '14px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {PIPELINE_STEPS.map((step, i) => {
          const status = getStepStatus(step.id)
          return (
            <div key={step.id} style={{ display: 'flex', alignItems: 'center', flex: i < PIPELINE_STEPS.length - 1 ? 1 : 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700,
                  background: status === 'done' ? '#166534' : status === 'active' ? '#6366f1' : '#1e293b',
                  color: status === 'done' ? '#22c55e' : status === 'active' ? '#fff' : '#64748b',
                  border: status === 'active' ? '2px solid #6366f1' : '2px solid transparent',
                  boxShadow: status === 'active' ? '0 0 12px rgba(99,102,241,0.5)' : 'none',
                  transition: 'all 0.3s',
                  ...(status === 'active' ? { animation: 'pulse 2s ease infinite' } : {}),
                }}>
                  {status === 'done' ? '[OK]' : i + 1}
                </div>
                <div style={{
                  fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
                  color: status === 'done' ? '#22c55e' : status === 'active' ? '#a5b4fc' : '#334155',
                  whiteSpace: 'nowrap', transition: 'color 0.3s',
                }}>
                  {step.label}
                </div>
              </div>
              {i < PIPELINE_STEPS.length - 1 && (
                <div style={{
                  flex: 1, height: 2, margin: '0 6px', marginBottom: 16,
                  background: getStepStatus(PIPELINE_STEPS[i + 1].id) === 'pending' ? '#1e293b' : '#166534',
                  transition: 'background 0.5s',
                }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  </div>
</div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 48px' }}>

        {/* ── CONNECTION CARDS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>

          {/* Quellsystem Card */}
          <div className="fade-up card" style={{
            background: '#0f1623',
            border: `1px solid ${shopifyStatus === 'connected' ? '#166534' : shopifyStatus === 'error' ? '#7f1d1d' : '#1e293b'}`,
            borderRadius: 14, padding: 24, animationDelay: '0.1s', transition: 'border-color 0.3s', overflow: 'visible',
          }}>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Quellsystem</div>
                <StatusDot status={sourceSystem === 'csv' ? (csvFile ? 'connected' : 'idle') : shopifyStatus} />
              </div>

              {/* Source System Dropdown */}
              <div ref={sourceDropdownRef} style={{ position: 'relative', marginBottom: 16 }}>
                <button
                  data-1p-ignore
                  onClick={() => setSourceDropdownOpen(!sourceDropdownOpen)}
                  style={{
                    width: '100%', background: '#080b12', border: '1px solid #1e293b',
                    borderRadius: 8, padding: '10px 14px', color: '#e2e8f0', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {selectedSource?.logo && <selectedSource.logo />}
                    {selectedSource?.label}
                  </div>
                  <span style={{ color: '#64748b', fontSize: 10 }}> </span>
                </button>
                {sourceDropdownOpen && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    background: '#0f1623', border: '1px solid #1e293b',
                    borderRadius: 8, marginTop: 4, zIndex: 10, overflow: 'hidden',
                  }}>
                    {SOURCE_SYSTEMS.map(sys => (
                      <div
                        key={sys.id}
                        className="dropdown-item"
                        onClick={() => { if (sys.available) { setSourceSystem(sys.id); setSourceDropdownOpen(false) } }}
                        style={{
                          padding: '10px 14px', cursor: sys.available ? 'pointer' : 'not-allowed',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          opacity: sys.available ? 1 : 0.4,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 500 }}>
                          {sys.logo && <sys.logo />}
                          {sys.label}
                        </div>
                        {!sys.available && (
                          <span style={{ fontSize: 10, color: '#64748b', background: '#1e293b', padding: '2px 6px', borderRadius: 4 }}>bald</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Shopify Fields */}
              {sourceSystem !== 'csv' && (
                <>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Domain</div>
                    <input style={inputStyle} value={shopifyDomain} onChange={e => setShopifyDomain(e.target.value)} placeholder="shop.myshopify.com" />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Admin API Token</div>
                    <input
                      style={inputStyle}
                      value={shopifyTokenEditing ? shopifyTokenReal : shopifyToken}
                      onChange={e => setShopifyTokenReal(e.target.value)}
                      onFocus={() => { setShopifyTokenEditing(true); setShopifyTokenReal('') }}
                      onBlur={() => { if (!shopifyTokenReal) setShopifyTokenEditing(false) }}
                      placeholder="Token eingeben..."
                      type={shopifyTokenEditing ? 'text' : 'password'}
                    />
                  </div>
                </>
              )}

              {/* CSV Upload */}
              {sourceSystem === 'csv' && (
                <div style={{ marginBottom: 14 }}>
                  <div
                    onDragOver={e => { e.preventDefault(); setCsvDragOver(true) }}
                    onDragLeave={() => setCsvDragOver(false)}
                    onDrop={e => { e.preventDefault(); setCsvDragOver(false); const file = e.dataTransfer.files[0]; if (file) handleCSVUpload(file) }}
                    onClick={() => document.getElementById('csv-file-input').click()}
                    style={{
                      border: `2px dashed ${csvDragOver ? '#22c55e' : csvFile ? '#22c55e44' : '#1e293b'}`,
                      borderRadius: 10, padding: '24px 16px', textAlign: 'center', cursor: 'pointer',
                      background: csvDragOver ? 'rgba(34,197,94,0.05)' : '#080b12', transition: 'all 0.2s',
                    }}
                  >
                    {csvFile ? (
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#22c55e', marginBottom: 4 }}>[OK] {csvFile.name}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>Klicken, um andere Datei waehlen</div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: 24, marginBottom: 8 }}>&#128194;</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>CSV hier ablegen</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>oder klicken zum Auswaehlen - CSV, TSV, UTF-8 oder Latin-1</div>
                      </div>
                    )}
                  </div>
                  <input
                    id="csv-file-input"
                    type="file"
                    accept=".csv,.tsv"
                    style={{ display: 'none' }}
                    onChange={e => { if (e.target.files[0]) handleCSVUpload(e.target.files[0]) }}
                  />
                  {csvParseError && <div style={{ marginTop: 8, fontSize: 12, color: '#ef4444' }}>{csvParseError}</div>}
                </div>
              )}
            </div>

            {/* FIX: CSV ConnectButton zeigt korrekten Status, Shopify-Button nur bei Shopify */}
            {sourceSystem === 'csv'
              ? <ConnectButton status={csvFile ? 'connected' : 'idle'} onClick={() => {}} label="CSV bereit" />
              : <ConnectButton status={shopifyStatus} onClick={testShopify} label="Shopify" />
            }
          </div>

          {/* commercetools Card */}
          <div className="fade-up card" style={{
            background: '#0f1623',
            border: `1px solid ${ctStatus === 'connected' ? '#166534' : ctStatus === 'error' ? '#7f1d1d' : ctStatus === 'skipped' ? '#334155' : '#00B2E333'}`,
            opacity: ctStatus === 'skipped' ? 0.6 : 1,
            borderRadius: 14, padding: 24, animationDelay: '0.2s', transition: 'border-color 0.3s',
          }}>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Commerce</div>
                <StatusDot status={ctStatus} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '10px 14px', background: '#080b12', borderRadius: 8, border: '1px solid #00B2E333' }}>
                <CTLogo />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#00B2E3' }}>commercetools</span>
              </div>
              <div style={{ background: '#0a0e1a', borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                Credentials werden aus den Vercel Environment Variables gelesen.<br />
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#334155' }}>CT_PROJECT_KEY | CT_CLIENT_ID | CT_CLIENT_SECRET</span>
              </div>
            </div>
            {ctStatus !== 'skipped' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <ConnectButton status={ctStatus} onClick={testCT} label="commercetools" />
                <button
                  onClick={() => setCtStatus('skipped')}
                  style={{ width: '100%', padding: '8px 16px', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#475569', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}
                >
                  Ohne commercetools fortfahren
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCtStatus('idle')}
                style={{ width: '100%', padding: '10px 16px', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#475569', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}
              >
                commercetools doch verbinden
              </button>
            )}
          </div>

          {/* Contentful Card */}
          <div className="fade-up card" style={{
            background: '#0f1623',
            border: `1px solid ${contentfulStatus === 'connected' ? '#166834' : contentfulStatus === 'error' ? '#7f1d1d' : '#FAE50133'}`,
            borderRadius: 14, padding: 24, animationDelay: '0.3s', transition: 'border-color 0.3s',
          }}>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Content</div>
                <StatusDot status={contentfulStatus} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 14px', background: '#080b12', borderRadius: 8, border: '1px solid #FAE50133' }}>
                <ContentfulLogo />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#FAE501' }}>Contentful</span>
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Space ID</div>
                <input style={inputStyle} value={contentfulSpace} onChange={e => setContentfulSpace(e.target.value)} placeholder="Space ID" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>CMA Token</div>
                <input
                  style={inputStyle}
                  value={contentfulTokenEditing ? contentfulTokenReal : contentfulToken}
                  onChange={e => setContentfulTokenReal(e.target.value)}
                  onFocus={() => { setContentfulTokenEditing(true); setContentfulTokenReal('') }}
                  onBlur={() => { if (!contentfulTokenReal) setContentfulTokenEditing(false) }}
                  placeholder="CFPAT-xxx"
                  type={contentfulTokenEditing ? 'text' : 'password'}
                />
              </div>
            </div>
            <ConnectButton status={contentfulStatus} onClick={testContentful} label="Contentful" />
          </div>
        </div>

               {/* ── MODEL MODE TOGGLE (nur wenn verbunden) ── */}
        {allConnected && (
          <div className="fade-up" style={{ background: '#0f1623', border: '1px solid #1e293b', borderRadius: 14, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>MACH-Struktur</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="mode-btn"
              onClick={() => setModelMode('create')}
              style={{
                flex: 1,
                background: modelMode === 'create' ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : '#1e293b',
                color: modelMode === 'create' ? '#fff' : '#64748b',
                boxShadow: modelMode === 'create' ? '0 0 16px rgba(99,102,241,0.35)' : 'none',
              }}
            >
              Content Model anlegen
            </button>
            <button
              className="mode-btn"
              onClick={() => setModelMode('existing')}
              style={{
                flex: 1,
                background: modelMode === 'existing' ? 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)' : '#1e293b',
                color: modelMode === 'existing' ? '#fff' : '#64748b',
                boxShadow: modelMode === 'existing' ? '0 0 16px rgba(6,182,212,0.35)' : 'none',
              }}
            >
              Bestehendes Model verwenden
            </button>
            <button
              className="mode-btn"
              onClick={() => setModelMode('upload')}
              style={{
                flex: 1,
                background: modelMode === 'upload' ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' : '#1e293b',
                color: modelMode === 'upload' ? '#fff' : '#64748b',
                boxShadow: modelMode === 'upload' ? '0 0 16px rgba(16,185,129,0.35)' : 'none',
              }}
            >
              Modell hochladen
            </button>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: '#64748b' }}>
            {modelMode === 'create'
              ? 'Produkte nach commercetools. Pages und Blogs nach Contentful. Du pruefst die Namen vor dem Anlegen.'
              : modelMode === 'existing'
              ? 'Bestehende Modelle aus commercetools und Contentful werden gelesen und gemappt.'
              : 'Kundenvorgabe als JSON oder PDF hochladen. Das Modell wird geprueft bevor es verwendet wird.'}
          </div>

           {modelMode === 'existing' && (
              <button
                onClick={loadExistingModels}
                style={{
                  marginTop: 12, width: '100%', padding: '12px 16px', borderRadius: 10,
                  border: '1px solid rgba(6,182,212,0.4)', background: 'rgba(6,182,212,0.1)',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif',
                  color: '#06b6d4',
                }}
              >
                Bestehendes Model laden
              </button>
            )}
            <div style={{ height: 1, background: '#1e293b', margin: '16px 0' }} />
            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Zurücksetzen</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
  onClick={resetCT}
  disabled={resettingCT || ctSkipped}
  style={{ padding: '9px 16px', borderRadius: 10, border: '1px solid rgba(0,178,227,0.3)', background: 'rgba(0,178,227,0.08)', cursor: resettingCT || ctSkipped ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif', color: resettingCT || ctSkipped ? '#64748b' : '#00B2E3' }}
              >
                {resettingCT ? 'Wird geleert...' : 'commercetools leeren'}
              </button>
              <button
                onClick={resetContentful}
                disabled={resettingContentful}
                style={{ padding: '9px 16px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', cursor: resettingContentful ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif', color: resettingContentful ? '#64748b' : '#ef4444' }}
              >
                {resettingContentful ? 'Wird geleert...' : 'Contentful leeren'}
              </button>
            </div>
            {modelMode === 'existing' && existingModels && (
            <div style={{ marginTop: 16 }}>
              {existingModels.length === 0 ? (
                <div style={{ background: '#1a0a0a', border: '1px solid #7f1d1d', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#ef4444' }}>
                  Keine Content Types in Contentful gefunden. Bitte zuerst ein Content Model in Contentful anlegen oder den Modus wechseln.
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                    Gefundene Content Types ({existingModels.length})
                  </div>
                  {existingModels.map(ct => (
                    <div key={ct.sys.id} style={{
                      background: '#080b12', border: '1px solid #1e293b', borderRadius: 8,
                      padding: '10px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{ct.name}</span>
                      <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: '#64748b' }}>{ct.sys.id}</span>
                    </div>
                  ))}
                  <button
                    onClick={() => setReviewConfirmed(true)}
                    style={{
                      marginTop: 12, width: '100%', padding: '14px 16px', borderRadius: 10,
                      border: 'none', background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
                      cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'Inter, sans-serif', color: '#fff',
                    }}
                  >
                    Weiter zur Migration
                  </button>
                 </>
              )}
            </div>
            )}
            {modelMode === 'existing' && loadingExistingModels && (
              <div style={{ marginTop: 12, textAlign: 'center', fontSize: 13, color: '#64748b' }}>
                Lade Content Types...
              </div>
            )}

            {modelMode === 'upload' && !mapping && (
              <div style={{ marginTop: 12 }}>
                <label
                  htmlFor="model-upload"
                  style={{
                    display: 'block', width: '100%', padding: '12px 16px', borderRadius: 10,
                    border: '1px solid rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.08)',
                    cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif',
                    color: '#10b981', textAlign: 'center', boxSizing: 'border-box',
                  }}
                >
                  {uploadedModel ? 'Andere Datei laden' : 'JSON oder PDF hochladen'}
                </label>
                <input
                  id="model-upload"
                  type="file"
                  accept=".json,.pdf"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setParsingModel(true)
                    setModelParseError(null)
                    setUploadedModel(null)
                    try {
                      if (file.name.endsWith('.json')) {
                        const text = await file.text()
                        const json = JSON.parse(text)
                        const items = json.contentTypes || json.items || (Array.isArray(json) ? json : null)
                        if (!items) throw new Error('Kein gueltiges Format. Erwartet: { contentTypes: [...] } oder { items: [...] }')
                        setUploadedModel(items)
                      } else if (file.name.endsWith('.pdf')) {
                        const formData = new FormData()
                        formData.append('file', file)
                        const res = await fetch('/api/parse-content-model-pdf', { method: 'POST', body: formData })
                        const data = await res.json()
                        if (!res.ok) throw new Error(data.error || 'PDF konnte nicht geparst werden')
                        setUploadedModel(data.contentTypes)
                      }
                    } catch (err) {
                      setModelParseError(err.message)
                    } finally {
                      setParsingModel(false)
                    }
                  }}
                />
                {parsingModel && (
                  <div style={{ marginTop: 10, textAlign: 'center', fontSize: 13, color: '#64748b' }}>
                    Wird analysiert...
                  </div>
                )}
                {modelParseError && (
                  <div style={{ marginTop: 10, background: '#1a0a0a', border: '1px solid #7f1d1d', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#ef4444' }}>
                    {modelParseError}
                  </div>
                )}
                {uploadedModel && uploadedModel.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                      Erkannte Content Types ({uploadedModel.length})
                    </div>
                    {uploadedModel.map((ct, i) => (
                      <div key={ct.sys?.id || ct.id || i} style={{
                        background: '#080b12', border: '1px solid #1e293b', borderRadius: 8,
                        padding: '10px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{ct.name || ct.displayName || ct.sys?.id || ct.id}</span>
                        <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: '#64748b' }}>{ct.sys?.id || ct.id || ''}</span>
                      </div>
                    ))}
                    <button
                      onClick={() => { setReviewConfirmed(true); if (sourceSystem !== 'csv') analyze(); else startMapping(); }}
                        style={{
                        marginTop: 12, width: '100%', padding: '14px 16px', borderRadius: 10,
                        border: 'none', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                        cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'Inter, sans-serif', color: '#fff',
                      }}
                    >
                      Modell bestaetigen und weiter
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── ANALYSE BUTTON (verbunden, kein Inventar, nicht am Analysieren) ── */}
        {allConnected && !inventory && !analyzing && sourceSystem !== 'csv' && !(modelMode === 'upload' && uploadedModel) && (
          <div className="fade-up">
            <button
              onClick={analyze}
              style={{
                width: '100%', padding: '18px 24px', borderRadius: 12, border: 'none',
                cursor: 'pointer', fontSize: 16, fontWeight: 700, fontFamily: 'Inter, sans-serif',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: '#fff', marginBottom: 12, animation: 'glow 2s ease infinite',
              }}
            >
              Inventar analysieren
            </button>
          </div>
        )}

        {/* ── ANALYSE LOADING ── */}
        {analyzing && (
          <div className="fade-up" style={{ background: '#0f1623', border: '1px solid #1e293b', borderRadius: 14, padding: 32, marginBottom: 20, textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, border: '3px solid #1e293b', borderTopColor: '#6366f1', borderRadius: '50%', margin: '0 auto 24px', animation: 'spin 0.8s linear infinite' }} />
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: '#6366f1', marginBottom: 24 }}>
              {analyzeSteps[analyzeStep]}
            </div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
              {analyzeSteps.map((_, i) => (
                <div key={i} style={{
                  width: i <= analyzeStep ? 24 : 8, height: 4, borderRadius: 2,
                  background: i <= analyzeStep ? '#6366f1' : '#1e293b',
                  transition: 'all 0.3s ease',
                }} />
              ))}
            </div>
          </div>
        )}
       
        {/* ════════════════════════════════════════════════════
            INVENTAR-BEREICH — nur wenn Inventar geladen und noch kein Mapping
            FIX: Control Panel, Edge Cases und Mapping-Button sind HIER
                 drin, nicht ausserhalb. Kein null-Zugriff moeglich.
        ════════════════════════════════════════════════════ */}
        {inventory && !mapping && (
          <div className="fade-up">

            {/* Inventar-Karte */}
            <div style={{ background: '#0f1623', border: '1px solid #166834', borderRadius: 14, padding: 28, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#475569', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>// Analyse abgeschlossen</div>
                  <h2 style={{ fontSize: 20, fontWeight: 700 }}>{inventory.shopName}</h2>
                </div>
                <button
                  onClick={reset}
                  style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #1e293b', background: 'transparent', color: '#475569', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                >
                  Reset
                </button>
              </div>

              {/* Zaehler-Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                {/* Produkte */}
                <div style={{ background: '#080b12', border: '1px solid #166834', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#22c55e', fontFamily: 'JetBrains Mono, monospace' }}>
                    <AnimatedNumber value={inventory.productCount || 0} animate={animateNumbers} />
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Produkte</div>
                  {((inventory.productCountDraft || 0) > 0 || (inventory.productCountArchived || 0) > 0) && (
                    <div style={{ fontSize: 10, color: '#475569', marginTop: 6 }}>
                      {(inventory.productCountDraft || 0) > 0 && <span style={{ marginRight: 6 }}>{inventory.productCountDraft} Entwurf</span>}
                      {(inventory.productCountArchived || 0) > 0 && <span>{inventory.productCountArchived} archiviert</span>}
                    </div>
                  )}
                </div>
                {/* Pages */}
                <div style={{ background: '#080b12', border: '1px solid #166834', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#22c55e', fontFamily: 'JetBrains Mono, monospace' }}>
                    <AnimatedNumber value={inventory.pages?.length || 0} animate={animateNumbers} />
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pages</div>
                  {(inventory.pagesHidden || 0) > 0 && (
                    <div style={{ fontSize: 10, color: '#475569', marginTop: 6 }}>
                      <span style={{ marginRight: 6 }}>{inventory.pagesPublished} sichtbar</span>
                      <span>{inventory.pagesHidden} (hidden)</span>
                    </div>
                  )}
                </div>
                {/* Blogs */}
                <div style={{ background: '#080b12', border: '1px solid #166834', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#22c55e', fontFamily: 'JetBrains Mono, monospace' }}>
                    <AnimatedNumber value={inventory.blogs?.length || 0} animate={animateNumbers} />
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Blogs</div>
                  {(inventory.blogs || []).some(b => (b.articleCountUnpublished || 0) > 0) && (
                    <div style={{ fontSize: 10, color: '#475569', marginTop: 6 }}>
                      <span style={{ marginRight: 6 }}>{(inventory.blogs || []).reduce((s, b) => s + (b.articleCountPublished || 0), 0)} pub.</span>
                      <span>{(inventory.blogs || []).reduce((s, b) => s + (b.articleCountUnpublished || 0), 0)} unveroeff.</span>
                    </div>
                  )}
                </div>
                {/* Metafields */}
                <div style={{ background: '#080b12', border: '1px solid #166834', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#22c55e', fontFamily: 'JetBrains Mono, monospace' }}>
                    <AnimatedNumber value={inventory.metafields?.length || 0} animate={animateNumbers} />
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Metafields</div>
                </div>
              </div>

              {/* Pages-Tags */}
              {(inventory.pages?.length || 0) > 0 && (
                <div style={{ marginBottom: 10, fontSize: 13 }}>
                  <span style={{ color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>pages: </span>
                  {inventory.pages.map(p => (
                    <span
                      key={p.id}
                      style={{
                        background: p.published ? '#1e293b' : '#2d1a1a',
                        border: p.published ? 'none' : '1px solid #7f1d1d',
                        borderRadius: 4, padding: '2px 8px', fontSize: 12,
                        marginRight: 6, marginBottom: 4, display: 'inline-block',
                        color: p.published ? '#cbd5e1' : '#f87171',
                      }}
                    >
                      {p.title}{!p.published && ' (hidden)'}
                    </span>
                  ))}
                </div>
              )}

              {/* Blog-Tags */}
              {(inventory.blogs?.length || 0) > 0 && (
                <div style={{ marginBottom: 10, fontSize: 13 }}>
                  <span style={{ color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>blogs: </span>
                  {inventory.blogs.map(b => (
                    <span key={b.id} style={{ background: '#1e293b', borderRadius: 4, padding: '2px 8px', fontSize: 12, marginRight: 6 }}>
                      {b.title}
                      {(b.articleCountUnpublished || 0) > 0 && (
                        <span style={{ color: '#f59e0b', marginLeft: 4 }}>({b.articleCountPublished}+{b.articleCountUnpublished})</span>
                      )}
                    </span>
                  ))}
                </div>
              )}

              {/* Metafield-Tags */}
              {(inventory.metafields?.length || 0) > 0 && (
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>metafields: </span>
                  {inventory.metafields.slice(0, 10).map(m => (
                    <span key={`${m.namespace}.${m.key}`} style={{ background: '#1e293b', borderRadius: 4, padding: '2px 8px', fontSize: 12, marginRight: 6, marginBottom: 4, display: 'inline-block' }}>
                      {m.namespace}.{m.key}
                    </span>
                  ))}
                  {inventory.metafields.length > 10 && (
                    <span style={{ color: '#475569', fontSize: 12 }}>+{inventory.metafields.length - 10} weitere</span>
                  )}
                </div>
              )}
            </div>

            {/* ════════════════════════════════════════════════════
                MIGRATION CONTROL PANEL
            ════════════════════════════════════════════════════ */}
            <div style={{ background: '#0f1623', border: '1px solid #1e293b', borderRadius: 14, marginBottom: 16, overflow: 'hidden' }}>
              <button
                className="panel-toggle"
                onClick={() => setControlPanelOpen(o => !o)}
                style={{ width: '100%', padding: '16px 24px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'Inter, sans-serif' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Migration Control Panel</span>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Standard-Einstellungen aktiv</span>
                </div>
                <span style={{ color: '#64748b', fontSize: 12 }}>{controlPanelOpen ? '-' : '+'}</span>
              </button>

              {controlPanelOpen && (
                <div style={{ padding: '0 24px 24px', borderTop: '1px solid #1e293b' }}>

                  {/* Produkt-Filter */}
                  <div style={{ marginTop: 20, marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Produkt-Filter</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Status</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {['Active', 'Draft', 'Archived'].map(s => {
                            const isOn = selectedStatuses.includes(s)
                            return (
                              <span
                                key={s}
                                className="chip"
                                onClick={() => setSelectedStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                                style={{
                                  background: isOn ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.08)',
                                  border: `1px solid ${isOn ? '#22c55e44' : '#6366f122'}`,
                                  color: isOn ? '#22c55e' : '#6366f1',
                                  cursor: 'pointer',
                                }}
                              >
                                {isOn ? '[OK] ' : ''}{s}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Tags ausschliessen</div>
                        <div style={{ fontSize: 10, color: '#334155', marginBottom: 6 }}>Mehrere Tags mit Semikolon trennen</div>
                        <input style={{ ...inputStyle, width: '100%' }} defaultValue="intern" placeholder="z. B. intern;test;hidden" />
                      </div>
                    </div>
                  </div>
                  <div style={{ height: 1, background: '#1e293b', marginBottom: 20 }} />

                  {/* Produkt-Varianten */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Produkt-Varianten</div>
                    <div style={{ fontSize: 11, color: '#334155', marginBottom: 10 }}>Steuert wie Varianten (z. B. Farbe, Groesse) in commercetools als Attribute angelegt werden.</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {[
                        { label: 'Variantenoptionen als CT-Attribute uebertragen', default: true },
                        { label: 'Duplikate ueberspringen', default: true },
                      ].map(opt => (
                        <label key={opt.label} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: '#94a3b8' }}>
                          <input type="checkbox" defaultChecked={opt.default} style={{ accentColor: '#6366f1' }} />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div style={{ height: 1, background: '#1e293b', marginBottom: 20 }} />

                  {/* Produkt-Bilder */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Produkt-Bilder</div>
                    <div style={{ fontSize: 11, color: '#334155', marginBottom: 10 }}>Steuert wie Produktbilder aus Shopify nach commercetools und Contentful uebertragen werden.</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: '#94a3b8' }}>
                        <input type="checkbox" defaultChecked={true} style={{ accentColor: '#6366f1' }} />
                        Bilder an alle Varianten vererben
                      </label>
                      <div>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Max. Bilder pro Produkt</div>
                        <input style={inputStyle} placeholder="leer = alle" type="number" min={1} />
                      </div>
                    </div>
                  </div>
                  <div style={{ height: 1, background: '#1e293b', marginBottom: 20 }} />

                  {/* SKU */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>SKU-Behandlung</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Fallback</div>
                        <select style={{ width: '100%' }}>
                          <option>Fallback-ID generieren</option>
                          <option>Ueberspringen</option>
                          <option>Warnung</option>
                        </select>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>SKU-Praefix (optional)</div>
                        <input style={inputStyle} placeholder="z. B. SHOP-" />
                      </div>
                    </div>
                  </div>
                  <div style={{ height: 1, background: '#1e293b', marginBottom: 20 }} />

                  {/* Text-Qualitaet */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Text-Qualitaet</div>
                    <div style={{ background: '#080b12', borderRadius: 10, padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div>
                          <span style={{ fontSize: 20, fontWeight: 800, color: '#6366f1', fontFamily: 'JetBrains Mono, monospace' }}>{TEXT_LEVELS[textLevel].label}</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginLeft: 10 }}>{TEXT_LEVELS[textLevel].desc}</span>
                        </div>
                        <span style={{
                          fontSize: 11,
                          color: textLevel === 0 ? '#64748b' : textLevel >= 4 ? '#ef4444' : '#818cf8',
                          background: textLevel === 0 ? 'transparent' : textLevel >= 4 ? 'rgba(239,68,68,0.1)' : 'rgba(99,102,241,0.1)',
                          border: `1px solid ${textLevel === 0 ? 'transparent' : textLevel >= 4 ? 'rgba(239,68,68,0.3)' : 'rgba(99,102,241,0.25)'}`,
                          borderRadius: 6, padding: '3px 8px', transition: 'all 0.2s', whiteSpace: 'nowrap',
                        }}>
                          {textLevel === 0 ? 'Kein KI-Eingriff' : textLevel >= 4 ? `Hoher KI-Verbrauch ~$${estimatedCost}` : `KI aktiv ~$${estimatedCost} ${estimatedTime}`}
                        </span>
                      </div>
                      <input
                        type="range" min={0} max={5} value={textLevel}
                        onChange={e => setTextLevel(parseInt(e.target.value))}
                        style={{ background: `linear-gradient(to right, #6366f1 ${textLevel * 20}%, #1e293b ${textLevel * 20}%)` }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                        {TEXT_LEVELS.map((l, i) => (
                          <span key={i} style={{ fontSize: 10, color: i === textLevel ? '#6366f1' : '#334155', fontWeight: i === textLevel ? 700 : 400, fontFamily: 'JetBrains Mono, monospace' }}>{l.label}</span>
                        ))}
                      </div>
                      <div style={{ marginTop: 10, fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{TEXT_LEVELS[textLevel].detail}</div>

                      {textLevel >= 3 && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Persona / Zielgruppe</div>
                          <input style={inputStyle} value={seoPersona} onChange={e => setSeoPersona(e.target.value)} placeholder="z. B. Medizinische Fachkraefte, 35-55 Jahre" />
                        </div>
                      )}

                      {textLevel >= 4 && (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>SEO-Keywords (optional)</div>
                          <input style={inputStyle} value={seoKeyword} onChange={e => setSeoKeyword(e.target.value)} placeholder="z. B. TENS Geraet kaufen, Reizstromgeraet" />
                        </div>
                      )}

                      {/* Trend-Check und Fokus ab L1 */}
                      {textLevel >= 1 && (
                        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #1e293b' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Fokus und Trend-Analyse</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                            <div>
                              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Fokus-Segment / Zielgruppe</div>
                              <input style={inputStyle} placeholder="z. B. B2B Einkaeufer, Endverbraucher 50+" />
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Mindest-Relevanz-Score fuer Optimierung</div>
                              <select style={{ width: '100%' }} value={trendMinScore} onChange={e => setTrendMinScore(e.target.value)}>
                                <option value="none">Nicht anwenden (alle optimieren)</option>
                                <option value="5">Score 5 oder mehr (breit)</option>
                                <option value="7">Score 7 oder mehr (empfohlen)</option>
                                <option value="9">Score 9 oder mehr (nur Top-Content)</option>
                              </select>
                            </div>
                          </div>
                          <button
                            onClick={runTrendCheck}
                            disabled={trendCheckRunning}
                            style={{
                              width: '100%', padding: '10px 16px', borderRadius: 8,
                              border: '1px solid #6366f133',
                              background: trendCheckResult ? 'rgba(99,102,241,0.1)' : '#1a1f35',
                              color: trendCheckRunning ? '#64748b' : '#a5b4fc',
                              cursor: trendCheckRunning ? 'not-allowed' : 'pointer',
                              fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif',
                              transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            }}
                          >
                            {trendCheckRunning ? (
                              <>
                                <span style={{ width: 12, height: 12, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                                KI analysiert Keyword-Relevanz...
                              </>
                            ) : trendCheckResult
                              ? `Trend-Check wiederholen -- ${trendCheckResult.highRelevance} von ${trendCheckResult.total} Eintraegen relevant`
                              : 'Trend-Check starten -- KI bewertet Suchrelevanz aller Inhalte'}
                          </button>
                          {trendCheckResult && (
                            <div style={{ marginTop: 10, background: '#080b12', borderRadius: 8, padding: 12, fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                              <span style={{ color: '#a5b4fc', fontWeight: 700 }}>{trendCheckResult.highRelevance} Eintraege</span> haben einen Relevanz-Score von 7 oder mehr.{' '}
                              Mit dem gewaehlten Filter werden{' '}
                              <span style={{ color: '#22c55e', fontWeight: 700 }}>
                                {trendMinScore === 'none' ? relevantItemCount : Math.round(trendCheckResult.total * (trendMinScore === '5' ? 0.65 : trendMinScore === '7' ? 0.4 : 0.15))}
                              </span> Eintraege optimiert.
                            </div>
                          )}
                        </div>
                      )}

                      {/* Optimierungsfilter ab L1 */}
                      {textLevel >= 1 && (
                        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #1e293b' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Optimierungsfilter -- Welcher Content wird optimiert?</div>
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Filtern nach</div>
                            <select style={{ width: '100%' }} value={optimizeFilterType} onChange={e => setOptimizeFilterType(e.target.value)}>
                              <option value="all">Alle Eintraege optimieren</option>
                              <option value="status">Status (Active / Draft / Archived)</option>
                              <option value="tag">Tag</option>
                              <option value="age">Content-Alter</option>
                            </select>
                          </div>

                          {optimizeFilterType === 'status' && (
                            <div style={{ marginBottom: 12 }}>
                              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Status einschliessen (ODER-Logik)</div>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {['Active', 'Draft', 'Archived'].map(s => {
                                  const isOn = optimizeByStatus.includes(s)
                                  return (
                                    <span
                                      key={s}
                                      className="chip"
                                      onClick={() => setOptimizeByStatus(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                                      style={{
                                        background: isOn ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.08)',
                                        border: `1px solid ${isOn ? '#22c55e44' : '#6366f122'}`,
                                        color: isOn ? '#22c55e' : '#6366f1',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      {isOn ? '[OK] ' : ''}{s}
                                    </span>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {optimizeFilterType === 'tag' && (
                            <div style={{ marginBottom: 12 }}>
                              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Tags einschliessen (ODER-Logik)</div>
                              <div style={{ fontSize: 10, color: '#334155', marginBottom: 6 }}>Mehrere Tags mit Semikolon trennen</div>
                              <input style={{ ...inputStyle, width: '100%' }} value={optimizeByTag} onChange={e => setOptimizeByTag(e.target.value)} placeholder="z. B. seo-relevant;topprodukt;highlight" />
                            </div>
                          )}

                          {optimizeFilterType === 'age' && (
                            <div style={{ marginBottom: 12 }}>
                              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Content nicht aelter als</div>
                              <select style={{ width: '100%' }} value={optimizeByAge} onChange={e => setOptimizeByAge(e.target.value)}>
                                <option value="all">Kein Limit (alle)</option>
                                <option value="1">1 Jahr</option>
                                <option value="2">2 Jahre</option>
                                <option value="3">3 Jahre</option>
                                <option value="5">5 Jahre</option>
                                <option value="10">10 Jahre</option>
                              </select>
                            </div>
                          )}

                          {/* Systemseiten */}
                          <div style={{ marginTop: 8, padding: 12, background: '#080b12', borderRadius: 8, border: '1px solid #1e293b', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                            <input
                              type="checkbox"
                              id="include-system-pages"
                              checked={includeSystemPages}
                              onChange={e => setIncludeSystemPages(e.target.checked)}
                              style={{ accentColor: '#6366f1', marginTop: 2, flexShrink: 0 }}
                            />
                            <div>
                              <label htmlFor="include-system-pages" style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                Systemseiten optimieren
                                <span
                                  title={`Systemseiten werden standardmaessig von der KI-Optimierung ausgeschlossen:\n${SYSTEM_PAGE_HANDLES.join(', ')}`}
                                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, borderRadius: '50%', background: '#1e293b', color: '#64748b', fontSize: 9, fontWeight: 700, cursor: 'help', border: '1px solid #334155', flexShrink: 0 }}
                                >?</span>
                              </label>
                              <div style={{ fontSize: 11, color: '#334155', marginTop: 2 }}>Betrifft: {SYSTEM_PAGE_HANDLES.join(', ')}</div>
                            </div>
                          </div>

                          {/* Live-Zaehler */}
                          <div style={{ marginTop: 10, fontSize: 12, color: '#64748b' }}>
                            Zu optimieren:{' '}
                            <span style={{ color: '#a5b4fc', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{relevantItemCount}</span>
                            {' '}von{' '}
                            <span style={{ color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>{totalItems}</span>
                            {' '}Eintraegen
                            {!includeSystemPages && (
                              <span style={{ color: '#334155', marginLeft: 6, fontSize: 11 }}>(Systemseiten ausgeschlossen)</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* KI-Verbrauch Schaetzung ab L1 */}
                      {textLevel >= 1 && (
                        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #1e293b' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>KI-Verbrauch -- Schaetzung</div>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <tbody>
                              {[
                                { label: 'Geschaetzte Token (Input)', value: `~${totalInputTokens.toLocaleString('de-DE')}` },
                                { label: 'Geschaetzte Token (Output)', value: `~${totalOutputTokens.toLocaleString('de-DE')}` },
                                { label: 'Kosten / 1 Mio. Token (Input)', value: '$0.25' },
                                { label: 'Kosten / 1 Mio. Token (Output)', value: '$1.25' },
                                { label: 'Geschaetzte Kosten Gesamt', value: `~$${estimatedCost}`, highlight: true },
                                { label: 'Geschaetzte Zeit Gesamt', value: estimatedTime, highlight: true },
                              ].map((row, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                                  <td style={{ padding: '7px 0', color: '#64748b', paddingRight: 24 }}>{row.label}</td>
                                  <td style={{ padding: '7px 0', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: row.highlight ? 700 : 400, color: row.highlight ? '#a5b4fc' : '#94a3b8' }}>{row.value}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div style={{ marginTop: 8, fontSize: 11, color: '#334155' }}>Schaetzung basiert auf je {inputTokensPerItem} Input und {outputTokensPerItem} Output-Token pro Eintrag.</div>
                        </div>
                      )}

                      {/* Warnung ab L4 */}
                      {textLevel >= 4 && (
                        <div style={{ marginTop: 16, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: 14 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>Hoher KI-Verbrauch bei {TEXT_LEVELS[textLevel].label}</div>
                          <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                            {textLevel === 4
                              ? 'L4 integriert Keywords und optimiert die gesamte SEO-Struktur jedes Eintrags. Bei grossen Datenmengen empfehlen wir den Relevanz-Filter zu nutzen und nur wichtigen Content zu optimieren.'
                              : 'L5 erweitert jeden Eintrag um FAQ-Bloecke. Das verdreifacht die Output-Tokens. Fuer mehr als 50 Eintraege sollte zwingend der Relevanz-Filter aktiv sein.'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ════════════════════════════════════════════════════
                SONDERFAELLE und EDGE CASES
            ════════════════════════════════════════════════════ */}
            <div style={{
              background: '#0f1623',
              border: `1px solid ${criticalEdgeCases > 0 ? '#ef444433' : '#1e293b'}`,
              borderRadius: 14, marginBottom: 16, overflow: 'hidden', transition: 'border-color 0.3s',
            }}>
              <button
                className="panel-toggle"
                onClick={() => setEdgeCasesOpen(o => !o)}
                style={{ width: '100%', padding: '16px 24px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'Inter, sans-serif' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Sonderfaelle und Edge Cases</span>
                  {criticalEdgeCases > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20, padding: '2px 10px' }}>
                      {criticalEdgeCases} kritisch
                    </span>
                  )}
                  {criticalEdgeCases === 0 && Object.keys(deepCheckResults).length === 0 && (
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Noch nicht geprueft</span>
                  )}
                  {criticalEdgeCases === 0 && Object.keys(deepCheckResults).length > 0 && (
                    <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 500 }}>Alles in Ordnung</span>
                  )}
                </div>
                <span style={{ color: '#64748b', fontSize: 12 }}>{edgeCasesOpen ? '&#9650;' : '&#9660;'}</span>
              </button>

              {edgeCasesOpen && (
                <div style={{ padding: '0 24px 24px', borderTop: '1px solid #1e293b' }}>

                  {/* Automatisch erkannt */}
                  <div style={{ marginTop: 20, marginBottom: 24 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                      Automatisch erkannt
                    </div>

                    {/* Blogs */}
                    {(inventory.blogs?.length || 0) > 0 && (
                      <div style={{ background: '#080b12', borderRadius: 10, padding: 16, marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>Blog-Migration</span>
                            <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>{inventory.blogs.length} Blogs gefunden</span>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => setSelectedBlogs(inventory.blogs.map(b => b.id))} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: selectedBlogs.length === inventory.blogs.length ? '#22c55e' : '#1e293b', color: selectedBlogs.length === inventory.blogs.length ? '#fff' : '#64748b', transition: 'all 0.15s', fontFamily: 'Inter, sans-serif' }}>Alle</button>
                            <button onClick={() => setSelectedBlogs([])} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: selectedBlogs.length === 0 ? '#6366f1' : '#1e293b', color: selectedBlogs.length === 0 ? '#fff' : '#64748b', transition: 'all 0.15s', fontFamily: 'Inter, sans-serif' }}>Keine</button>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {inventory.blogs.map(b => {
                            const isSelected = selectedBlogs.includes(b.id)
                            return (
                              <span
                                key={b.id}
                                className="chip"
                                onClick={() => toggleBlog(b.id)}
                                style={{
                                  background: isSelected ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.06)',
                                  border: `1px solid ${isSelected ? '#22c55e44' : '#6366f122'}`,
                                  color: isSelected ? '#22c55e' : '#6366f180',
                                }}
                              >
                                {isSelected ? '[OK]' : 'O'} {b.title}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Metafield Namespaces */}
                    {metafieldNamespaces.length > 0 && (
                      <div style={{ background: '#080b12', borderRadius: 10, padding: 16, marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>Metafield-Namespaces</span>
                            <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>{(inventory.metafields || []).length} Felder in {metafieldNamespaces.length} Namespaces</span>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => setSelectedMetafieldNamespaces(metafieldNamespaces)} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: selectedMetafieldNamespaces.length === metafieldNamespaces.length ? '#22c55e' : '#1e293b', color: selectedMetafieldNamespaces.length === metafieldNamespaces.length ? '#fff' : '#64748b', transition: 'all 0.15s', fontFamily: 'Inter, sans-serif' }}>Alle</button>
                            <button onClick={() => setSelectedMetafieldNamespaces([])} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: selectedMetafieldNamespaces.length === 0 ? '#6366f1' : '#1e293b', color: selectedMetafieldNamespaces.length === 0 ? '#fff' : '#64748b', transition: 'all 0.15s', fontFamily: 'Inter, sans-serif' }}>Keine</button>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {metafieldNamespaces.map(ns => {
                            const isSelected = selectedMetafieldNamespaces.includes(ns)
                            return (
                              <span
                                key={ns}
                                className="chip"
                                onClick={() => toggleNamespace(ns)}
                                style={{
                                  background: isSelected ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.06)',
                                  border: `1px solid ${isSelected ? '#22c55e44' : '#6366f122'}`,
                                  color: isSelected ? '#22c55e' : '#6366f180',
                                  fontFamily: 'JetBrains Mono, monospace',
                                }}
                              >
                                {isSelected ? '[OK]' : 'O'} {ns}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Deep Checks */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', display: 'inline-block' }} />
                      Deep Check -- Content-Analyse
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16, lineHeight: 1.5 }}>
                      Diese Punkte koennen erst geprueft werden, wenn der tatsaechliche Content analysiert wird. Klicke "Check" um den Scan zu starten.
                    </div>
                    <div style={{ display: 'grid', gap: 10 }}>
                      {DEEP_CHECKS.map(check => {
                        const result = deepCheckResults[check.id]
                        const running = runningChecks[check.id]
                        const color = severityColor[check.severity]
                        const hasIssue = result?.status === 'found' && result?.count > 0
                        return (
                          <div key={check.id} style={{ background: '#080b12', borderRadius: 10, padding: 14, border: `1px solid ${hasIssue ? color + '33' : '#1e293b'}`, transition: 'border-color 0.3s' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                  <span style={{ fontSize: 10, fontWeight: 700, color, background: color + '1a', border: `1px solid ${color}33`, borderRadius: 4, padding: '1px 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    {severityLabel[check.severity]}
                                  </span>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{check.label}</span>
                                </div>
                                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{check.desc}</div>
                                {result?.status === 'found' && (
                                  <div style={{ marginTop: 8, fontSize: 12, color: hasIssue ? color : '#22c55e', fontWeight: 600 }}>
                                    {hasIssue ? '(!) ' : '[OK] '}{check.resultLabel(result)}
                                  </div>
                                )}
                                {result?.status === 'error' && (
                                  <div style={{ marginTop: 8, fontSize: 12, color: '#ef4444' }}>[X] Check fehlgeschlagen</div>
                                )}
                              </div>
                              <button
                                onClick={() => runDeepCheck(check)}
                                disabled={running}
                                style={{
                                  flexShrink: 0, padding: '7px 16px', borderRadius: 8,
                                  border: `1px solid ${result ? color + '44' : '#334155'}`,
                                  background: result ? color + '0d' : '#1e293b',
                                  color: result ? color : '#94a3b8',
                                  cursor: running ? 'not-allowed' : 'pointer',
                                  fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif',
                                  whiteSpace: 'nowrap', transition: 'all 0.2s',
                                }}
                              >
                                {running ? (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ width: 10, height: 10, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                                    Pruefe...
                                  </span>
                                ) : result ? 'Nochmal' : 'Check'}
                              </button>
                            </div>
                            {hasIssue && (
                              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{check.action.label}:</span>
                                <select
                                  value={deepCheckActions[check.id] ?? check.action.default}
                                  onChange={e => setDeepCheckActions(prev => ({ ...prev, [check.id]: parseInt(e.target.value) }))}
                                  style={{ flex: 1 }}
                                >
                                  {check.action.options.map((opt, i) => (
                                    <option key={i} value={i}>{opt}{i === check.action.default && !opt.includes('empfohlen') ? ' (empfohlen)' : ''}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* CSV Ziel-Auswahl -- nur wenn CSV-Quelle */}
            {inventory.source === 'csv' && (
              <div style={{ background: '#0f1623', border: '1px solid #1e293b', borderRadius: 14, padding: 20, marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Erkanntes Migrationsziel</div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
                  Basierend auf den Spalten haben wir das Ziel vorausgewaehlt. Du kannst es uebersteuern.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { id: 'contentful', label: 'Contentful', color: '#FAE501', desc: 'Pages, redaktionelle Inhalte' },
                    { id: 'commercetools', label: 'commercetools', color: '#00B2E3', desc: 'Produkte, Preise, SKUs' },
                    { id: 'both', label: 'Beides', color: '#a5b4fc', desc: 'Gemischte Daten aufteilen' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setCsvTarget(opt.id)}
                      style={{
                        flex: 1, padding: '12px 16px', borderRadius: 10,
                        border: `1px solid ${csvTarget === opt.id ? opt.color + '66' : '#1e293b'}`,
                        background: csvTarget === opt.id ? opt.color + '15' : '#080b12',
                        cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, color: csvTarget === opt.id ? opt.color : '#64748b', marginBottom: 4 }}>{opt.label}</div>
                      <div style={{ fontSize: 11, color: '#475569' }}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* KI MACH-Mapping Button -- EIN EINZIGER, am Ende des Inventar-Blocks */}
            <button
              onClick={() => { setReviewConfirmed(true); startMapping(); }}
              disabled={mappingLoading}
              style={{
                width: '100%', padding: '18px 24px', borderRadius: 12, border: 'none',
                cursor: mappingLoading ? 'not-allowed' : 'pointer',
                fontSize: 16, fontWeight: 700, fontFamily: 'Inter, sans-serif',
                background: mappingLoading ? '#1e293b' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: mappingLoading ? '#64748b' : '#fff',
              }}
            >
              {mappingLoading ? 'KI analysiert MACH-Struktur...' : 'KI MACH-Mapping starten'}
            </button>

          </div>
        )}
        {/* ── ENDE Inventar-Block ── */}

        {/* ════════════════════════════════════════════════════
            MACH MAPPING + REVIEW
        ════════════════════════════════════════════════════ */}
        {mapping && reviewConfirmed && (
          <div className="fade-up" style={{ marginTop: 16 }}>

            {/* Read-only Settings Summary */}
            <div style={{ background: '#0f1623', border: '1px solid #1e293b', borderRadius: 14, marginBottom: 16, overflow: 'hidden', opacity: 0.8 }}>
              <button
                className="panel-toggle"
                onClick={() => setReadonlyPanelOpen(o => !o)}
                style={{ width: '100%', padding: '14px 20px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'Inter, sans-serif' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>Migration Control Panel</span>
                  <span style={{ fontSize: 11, color: '#334155', background: '#1e293b', padding: '2px 8px', borderRadius: 4 }}>
                    {TEXT_LEVELS[textLevel].label} | {selectedStatuses.join(', ')}
                  </span>
                  <span style={{ fontSize: 11, color: '#475569', fontStyle: 'italic' }}>nur lesend</span>
                </div>
                <span style={{ color: '#334155', fontSize: 12 }}>{readonlyPanelOpen ? '&#9650;' : '&#9660;'}</span>
              </button>
              {readonlyPanelOpen && (
                <div style={{ padding: '0 20px 20px', borderTop: '1px solid #1a2030' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 16 }}>
                    <div style={{ background: '#080b12', borderRadius: 8, padding: 12, border: '1px solid #1a2030' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Produkt-Status</div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {['Active', 'Draft', 'Archived'].map(s => (
                          <span key={s} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: selectedStatuses.includes(s) ? 'rgba(99,102,241,0.12)' : 'transparent', color: selectedStatuses.includes(s) ? '#6366f1' : '#2d3748', border: `1px solid ${selectedStatuses.includes(s) ? '#6366f133' : '#1e293b'}` }}>{s}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ background: '#080b12', borderRadius: 8, padding: 12, border: '1px solid #1a2030' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Text-Qualitaet</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: textLevel === 0 ? '#334155' : '#6366f1', fontFamily: 'JetBrains Mono, monospace' }}>{TEXT_LEVELS[textLevel].label}</span>
                        <span style={{ fontSize: 11, color: '#475569' }}>{TEXT_LEVELS[textLevel].desc}</span>
                      </div>
                    </div>
                    <div style={{ background: '#080b12', borderRadius: 8, padding: 12, border: '1px solid #1a2030' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Edge Cases</div>
                      <div style={{ fontSize: 12, color: criticalEdgeCases > 0 ? '#ef4444' : '#475569' }}>
                        {criticalEdgeCases > 0 ? `${criticalEdgeCases} kritische Punkte` : Object.keys(deepCheckResults).length > 0 ? 'Alles geprueft [OK]' : 'Nicht geprueft'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={goBackToInventory}
                    style={{ marginTop: 14, padding: '10px 16px', borderRadius: 8, border: '1px solid #1e293b', background: 'transparent', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                  >
                    Zurueck zur Inventar-Analyse
                  </button>
                </div>
              )}
            </div>

            {/* Mapping-Ergebnis */}
            <div style={{ background: '#0f1623', border: '1px solid #312e81', borderRadius: 14, padding: 28, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>// KI MACH-Mapping</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: '#a5b4fc' }}>MACH Content Model Vorschlag</h2>
              <div style={{ background: '#080b12', borderRadius: 10, padding: 16, marginBottom: 24, borderLeft: '3px solid #6366f1' }}>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: '#94a3b8' }}>{mapping.summary}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                <div style={{ background: '#080b12', border: '1px solid #00B2E333', borderRadius: 10, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <CTLogo />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#00B2E3' }}>commercetools</span>
                  </div>
                  <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{mapping.commercetools?.description}</p>
                  <div style={{ marginTop: 8, fontSize: 11, color: '#00B2E3' }}>{mapping.commercetools?.contentTypes?.length || 0} Types</div>
                </div>
                <div style={{ background: '#080b12', border: '1px solid #FAE50133', borderRadius: 10, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <ContentfulLogo />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#FAE501' }}>Contentful</span>
                  </div>
                  <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{mapping.contentful?.description}</p>
                  <div style={{ marginTop: 8, fontSize: 11, color: '#FAE501' }}>{mapping.contentful?.contentTypes?.length || 0} Types</div>
                </div>
              </div>

              {/* CT-Fallback Abfrage */}
              {ctSkipped && mapping.commercetools?.contentTypes?.length > 0 && ctFallback === null && (
                <div style={{ background: '#080b12', borderRadius: 10, padding: 20, marginBottom: 24, borderLeft: '3px solid #f59e0b' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>commercetools ist nicht verbunden</div>
                  <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16, lineHeight: 1.6 }}>
                    Ich habe Produktdaten in der Quelle identifiziert. Wie soll ich damit umgehen?
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {[
                      { id: 'contentful', label: 'Produktdaten nach Contentful schreiben', desc: 'Produkte werden als eigener Content Type in Contentful angelegt.' },
                      { id: 'ignore', label: 'Produktdaten ignorieren', desc: 'Nur Pages und Blogs werden migriert.' },
                      { id: 'csv', label: 'Produktdaten als CSV exportieren', desc: 'Fuer spaetere Migration wenn CT verbunden ist.' },
                      { id: 'connect', label: 'commercetools jetzt verbinden', desc: 'Zurueck zum Verbinden-Schritt.' },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => { if (opt.id === 'connect') { setMapping(null); setCtStatus('idle') } else setCtFallback(opt.id) }}
                        style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #1e293b', background: '#0f1623', cursor: 'pointer', fontFamily: 'Inter, sans-serif', textAlign: 'left', transition: 'all 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = '#f59e0b55'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = '#1e293b'}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 2 }}>{opt.label}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Review-Sektion */}
              {!reviewConfirmed && reviewedCT && reviewedContentful && (ctFallback !== null || !ctSkipped) && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ background: '#080b12', borderRadius: 10, padding: 14, marginBottom: 16, borderLeft: '3px solid #f59e0b', fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
                    Bitte pruefe die Namen vor dem Anlegen. Du kannst Name und ID direkt bearbeiten. Erst nach Deiner Bestaetigung wird das Model angelegt.
                  </div>
                  <ReviewSection title="commercetools -- Produkte und Commerce" color="#00B2E3" items={reviewedCT} onUpdate={updateReviewedCT} logo={CTLogo} />
                  <ReviewSection title="Contentful -- Content und Redaktion" color="#FAE501" items={reviewedContentful} onUpdate={updateReviewedContentful} logo={ContentfulLogo} />
                  <button
                    onClick={() => setReviewConfirmed(true)}
                    style={{
                      width: '100%', marginTop: 8, padding: '14px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
                      fontSize: 15, fontWeight: 700, fontFamily: 'Inter, sans-serif',
                      background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
                      color: '#000', boxShadow: '0 0 20px rgba(245,158,11,0.3)',
                    }}
                  >
                    [OK] Namen bestaetigen -- Models anlegen
                  </button>
                </div>
              )}

              {reviewConfirmed && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.1em' }}>[OK] Namen bestaetigt</div>
                  <button onClick={() => setReviewConfirmed(false)} style={{ fontSize: 11, color: '#64748b', background: 'transparent', border: '1px solid #1e293b', borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}>bearbeiten</button>
                </div>
              )}

             {/* Deploy Buttons */}
              {reviewConfirmed && modelMode !== 'existing' && (
                <div style={{ display: 'grid', gridTemplateColumns: ctSkipped ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 24 }}>
                  {!ctSkipped && (
                    <button
                      onClick={deployCTModel}
                      disabled={deployingCT}
                      style={{
                        padding: '14px 24px', borderRadius: 12, border: 'none',
                        cursor: deployingCT ? 'not-allowed' : 'pointer',
                        fontSize: 13, fontWeight: 700, fontFamily: 'Inter, sans-serif',
                        background: deployingCT ? '#1e293b' : deployResultsCT ? 'rgba(34,197,94,0.15)' : 'linear-gradient(135deg, #0072b1 0%, #00B2E3 100%)',
                        color: deployingCT ? '#64748b' : deployResultsCT ? '#22c55e' : '#fff',
                      }}
                    >
                      {deployingCT ? 'Wird angelegt...' : deployResultsCT ? '[OK] commercetools Model angelegt' : 'commercetools Model anlegen'}
                    </button>
                  )}
                  <button
                    onClick={deployContentfulModel}
                    disabled={deployingContentful}
                    style={{
                      padding: '14px 24px', borderRadius: 12, border: 'none',
                      cursor: deployingContentful ? 'not-allowed' : 'pointer',
                      fontSize: 13, fontWeight: 700, fontFamily: 'Inter, sans-serif',
                      background: deployingContentful ? '#1e293b' : deployResultsContentful ? 'rgba(34,197,94,0.15)' : 'linear-gradient(135deg, #92790a 0%, #FAE501 100%)',
                      color: deployingContentful ? '#64748b' : deployResultsContentful ? '#22c55e' : '#000',
                    }}
                  >
                    {deployingContentful ? 'Wird angelegt...' : deployResultsContentful ? '[OK] Contentful Model angelegt' : 'Contentful Model anlegen'}
                  </button>
                </div>
              )}


              {/* Deploy-Ergebnisse */}
              {(deployResultsCT || deployResultsContentful) && (
                <div style={{ marginBottom: 24 }}>
                  {deployResultsCT && (
                    <div style={{ background: '#080b12', border: '1px solid #00B2E333', borderRadius: 10, padding: 16, marginBottom: 10 }}>
                      <div style={{ fontSize: 12, color: '#00B2E3', fontWeight: 700, marginBottom: 10 }}>commercetools -- Product Types</div>
                      {deployResultsCT.map(r => (
                        <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1e293b', fontSize: 13 }}>
                          <span>{r.name}</span>
                          <span style={{ color: r.status === 'success' ? '#22c55e' : '#ef4444', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                            {r.status === 'success' ? '[OK] angelegt' : `[X] ${r.error}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {deployResultsContentful && (
                    <div style={{ background: '#080b12', border: '1px solid #FAE50133', borderRadius: 10, padding: 16 }}>
                      <div style={{ fontSize: 12, color: '#FAE501', fontWeight: 700, marginBottom: 10 }}>Contentful -- Content Types</div>
                      {deployResultsContentful.map(r => (
                        <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1e293b', fontSize: 13 }}>
                          <span>{r.name}</span>
                          <span style={{ color: r.status === 'success' ? '#22c55e' : '#ef4444', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                            {r.status === 'success' ? '[OK] angelegt' : `[X] ${r.error}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Migration starten */}
              {bothDeployed && (
                <div style={{ background: '#080b12', border: '1px solid #1e293b', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', marginBottom: 16 }}>// Migration starten</div>

                  {/* CT Migration -- zeigen wenn kein CSV oder wenn CSV-Ziel CT oder beides */}
                  {!ctSkipped && (inventory?.source !== 'csv' || csvTarget === 'commercetools' || csvTarget === 'both') && (
                      <div style={{ marginBottom: 12, padding: 16, background: '#0a0e1a', borderRadius: 10, border: '1px solid #00B2E333' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <CTLogo />
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#00B2E3' }}>Produkte nach commercetools</span>
                      </div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontSize: 12, color: '#64748b' }}>Anzahl Produkte:</span>
                        <input
                          type="number" min={1} value={productLimit}
                          onChange={e => setProductLimit(parseInt(e.target.value) || 10)}
                          style={{ ...inputStyle, width: 80 }}
                        />
                        <span style={{ fontSize: 11, color: '#64748b' }}>von {inventory?.productCount || 0} gesamt</span>
                      </div>
                      <button
                        onClick={migrateProductsToCT}
                        disabled={migratingCT}
                        style={{
                          width: '100%', padding: '12px 20px', borderRadius: 10, border: 'none',
                          cursor: migratingCT ? 'not-allowed' : 'pointer',
                          fontSize: 14, fontWeight: 700, fontFamily: 'Inter, sans-serif',
                          background: migratingCT ? '#1e293b' : migrateResultsCT ? 'rgba(34,197,94,0.15)' : 'linear-gradient(135deg, #0072b1 0%, #00B2E3 100%)',
                          color: migratingCT ? '#64748b' : migrateResultsCT ? '#22c55e' : '#fff',
                        }}
                      >
                        {migratingCT ? 'Migriere Produkte...' : migrateResultsCT ? `[OK] ${(migrateResultsCT || []).filter(r => r.status === 'success').length} Produkte migriert` : `${productLimit} Produkte nach commercetools migrieren`}
                      </button>
                      {migrateResultsCT && (
                        <div style={{ marginTop: 12, maxHeight: 160, overflowY: 'auto' }}>
                          {migrateResultsCT.map((r, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #1e293b', fontSize: 12 }}>
                              <span style={{ color: '#94a3b8' }}>{r.title || r.name}</span>
                              <span style={{ color: r.status === 'success' ? '#22c55e' : '#ef4444', fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>
                                {r.status === 'success' ? '[OK]' : `[X] ${r.error}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Contentful Migration */}
                  <div style={{ padding: 16, background: '#0a0e1a', borderRadius: 10, border: '1px solid #FAE50133' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <ContentfulLogo />
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#FAE501' }}>Pages nach Contentful</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                      {inventory?.totalContentRows || inventory?.pages?.length || 0} Pages werden migriert
                    </div>
                    <button
                      onClick={inventory?.source === 'csv' ? migrateCSVContent : migrateContentToContentful}
                      disabled={migratingContentful}
                      style={{
                        width: '100%', padding: '12px 20px', borderRadius: 10, border: 'none',
                        cursor: migratingContentful ? 'not-allowed' : 'pointer',
                        fontSize: 14, fontWeight: 700, fontFamily: 'Inter, sans-serif',
                        background: migratingContentful ? '#1e293b' : migrateResultsContentful ? 'rgba(34,197,94,0.15)' : 'linear-gradient(135deg, #92790a 0%, #FAE501 100%)',
                        color: migratingContentful ? '#64748b' : migrateResultsContentful ? '#22c55e' : '#000',
                      }}
                    >
                      {migratingContentful
                        ? 'Migriere Pages...'
                        : migrateResultsContentful
                          ? `[OK] ${(migrateResultsContentful || []).filter(r => r.status === 'success').length}/${(migrateResultsContentful || []).length} Pages migriert`
                          : 'Pages nach Contentful migrieren'}
                    </button>
                    {migrateResultsContentful && (
                      <div style={{ marginTop: 12, maxHeight: 160, overflowY: 'auto' }}>
                        {migrateResultsContentful.map((r, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #1e293b', fontSize: 12 }}>
                            <span style={{ color: '#94a3b8' }}>{r.title}</span>
                            <span style={{ color: r.status === 'success' ? '#22c55e' : '#ef4444', fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>
                              {r.status === 'success' ? '[OK]' : `[X] ${r.error}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </>
  )
}
