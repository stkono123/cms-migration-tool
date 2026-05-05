'use client'

import { useState, useEffect, useRef } from 'react'

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

const SOURCE_SYSTEMS = [
  { id: 'shopify', label: 'Shopify', logo: ShopifyLogo, available: true },
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
  { level: 0, label: 'L0', title: '1:1 übernehmen', desc: 'Text wird unverändert übertragen.' },
  { level: 1, label: 'L1', title: 'Rechtschreibung & Grammatik', desc: 'Nur Fehler korrigieren, kein Eingriff in Stil oder Inhalt.' },
  { level: 2, label: 'L2', title: 'Leichte Verbesserungen', desc: 'L1 plus sanfte Formulierungsverbesserungen.' },
  { level: 3, label: 'L3', title: 'Ton & Zielgruppe', desc: 'L2 plus Anpassung an eine definierte Persona und Tonalität.' },
  { level: 4, label: 'L4', title: 'SEO-Optimierung', desc: 'L3 plus Keyword-Findung und smarte SEO-Optimierung.' },
  { level: 5, label: 'L5', title: 'AIO + FAQs', desc: 'L4 plus FAQ-Erweiterung für AI-Overviews und Featured Snippets.' },
]

const DEFAULT_SETTINGS = {
  statusFilter: ['active', 'draft', 'archived'],
  tagInclude: '',
  tagExclude: 'intern',
  productTypeFilter: '',
  onlyWithImages: false,
  onlyWithSku: false,
  priceOperator: 'none',
  priceValue: '',
  priceReference: 'min',
  inheritImages: true,
  transferVariantOptions: true,
  maxImagesPerProduct: '',
  skuFallback: 'generate',
  skuPrefix: '',
  duplicateHandling: 'skip',
  textLevel: 0,
}

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

export default function Home() {
  const [sourceSystem, setSourceSystem] = useState('shopify')
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState(false)
  const [shopifyDomain, setShopifyDomain] = useState('sanitaetshaus24-shop.myshopify.com')
  const [shopifyToken, setShopifyToken] = useState('••••••••••••••••••••••••')
  const [shopifyTokenEditing, setShopifyTokenEditing] = useState(false)
  const [shopifyTokenReal, setShopifyTokenReal] = useState('')
  const [ctStatus, setCtStatus] = useState('idle')
  const [contentfulSpace, setContentfulSpace] = useState('1ub4n2ex18h8')
  const [contentfulToken, setContentfulToken] = useState('••••••••••••••••••••••••')
  const [contentfulTokenEditing, setContentfulTokenEditing] = useState(false)
  const [contentfulTokenReal, setContentfulTokenReal] = useState('')
  const [contentfulStatus, setContentfulStatus] = useState('idle')
  const [shopifyStatus, setShopifyStatus] = useState('idle')
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
  const [mounted, setMounted] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [migrationSettings, setMigrationSettings] = useState(DEFAULT_SETTINGS)

  const updateSetting = (key, value) => setMigrationSettings(prev => ({ ...prev, [key]: value }))
  const toggleStatus = (status) => {
    setMigrationSettings(prev => {
      const current = prev.statusFilter
      if (current.includes(status)) return { ...prev, statusFilter: current.filter(s => s !== status) }
      return { ...prev, statusFilter: [...current, status] }
    })
  }

  useEffect(() => { setMounted(true) }, [])

  const allConnected = shopifyStatus === 'connected' && ctStatus === 'connected' && contentfulStatus === 'connected'
  const bothDeployed = deployResultsCT && deployResultsContentful
  const bothMigrated = migrateResultsCT && migrateResultsContentful

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

  const analyzeSteps = [
    'Verbinde mit Shopify...',
    'Lade Produkte...',
    'Analysiere Pages & Blogs...',
    'Erkenne Metafeld-Strukturen...',
    'Untersuche Theme & Sections...',
    'KI bereitet MACH-Mapping vor...',
  ]

  async function testShopify() {
    setShopifyStatus('loading')
    try {
      const res = await fetch('/api/analyze-shopify', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      const data = await res.json()
      if (data.shopName) setShopifyStatus('connected')
      else setShopifyStatus('error')
    } catch { setShopifyStatus('error') }
  }

  async function testCT() {
    setCtStatus('loading')
    try {
      const res = await fetch('/api/test-commercetools', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      const data = await res.json()
      if (data.ok) setCtStatus('connected')
      else setCtStatus('error')
    } catch { setCtStatus('error') }
  }

  async function testContentful() {
    setContentfulStatus('loading')
    try {
      const res = await fetch('/api/test-contentful', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      const data = await res.json()
      if (data.ok) setContentfulStatus('connected')
      else setContentfulStatus('error')
    } catch { setContentfulStatus('error') }
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
    } catch (e) { clearInterval(stepInterval); console.error(e) }
    setAnalyzing(false)
  }

  async function startMapping() {
    setMappingLoading(true)
    try {
      const res = await fetch('/api/ai-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory })
      })
      const parsed = await res.json()
      setMapping(parsed)
      setReviewedCT(parsed.commercetools?.contentTypes?.map(ct => ({ ...ct })) || [])
      setReviewedContentful(parsed.contentful?.contentTypes?.map(ct => ({ ...ct })) || [])
      setReviewConfirmed(false)
    } catch (e) { console.error(e) }
    setMappingLoading(false)
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
        body: JSON.stringify({ contentTypes: reviewedCT })
      })
      const data = await res.json()
      setDeployResultsCT(data.results)
    } catch (e) { console.error(e) }
    setDeployingCT(false)
  }

  async function deployContentfulModel() {
    setDeployingContentful(true)
    try {
      const res = await fetch('/api/create-model-contentful', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentTypes: reviewedContentful })
      })
      const data = await res.json()
      setDeployResultsContentful(data.results)
    } catch (e) { console.error(e) }
    setDeployingContentful(false)
  }

  async function migrateProductsToCT() {
    setMigratingCT(true)
    try {
      const res = await fetch('/api/migrate-products-commercetools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: productLimit, settings: migrationSettings })
      })
      const data = await res.json()
      setMigrateResultsCT(data.results)
    } catch (e) { console.error(e) }
    setMigratingCT(false)
  }

  async function migrateContentToContentful() {
    setMigratingContentful(true)
    try {
      const res = await fetch('/api/migrate-content-contentful', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages: inventory.pages, settings: migrationSettings })
      })
      const data = await res.json()
      setMigrateResultsContentful(data.results)
    } catch (e) { console.error(e) }
    setMigratingContentful(false)
  }

  async function resetContentful() {
    if (!confirm('Alle Contentful Entries und Content Types löschen?')) return
    setResettingContentful(true)
    try {
      await fetch('/api/reset-contentful', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      setDeployResultsContentful(null)
      setMigrateResultsContentful(null)
    } catch (e) { console.error(e) }
    setResettingContentful(false)
  }

  async function resetCT() {
    if (!confirm('Alle commercetools Produkte und Product Types löschen?')) return
    setResettingCT(true)
    try {
      await fetch('/api/reset-commercetools', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      setDeployResultsCT(null)
      setMigrateResultsCT(null)
    } catch (e) { console.error(e) }
    setResettingCT(false)
  }

  function reset() {
    setInventory(null); setAnimateNumbers(false); setMapping(null)
    setReviewedCT(null); setReviewedContentful(null); setReviewConfirmed(false)
    setDeployResultsCT(null); setDeployResultsContentful(null)
    setMigrateResultsCT(null); setMigrateResultsContentful(null)
    setShopifyStatus('idle'); setCtStatus('idle'); setContentfulStatus('idle')
    setAnalyzeStep(0); setSettingsOpen(false)
    setMigrationSettings(DEFAULT_SETTINGS)
  }

  const selectedSource = SOURCE_SYSTEMS.find(s => s.id === sourceSystem)
  if (!mounted) return null

  const inp = { width: '100%', background: '#080b12', border: '1px solid #1e293b', borderRadius: 6, padding: '8px 12px', color: '#e2e8f0', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, outline: 'none' }
  const sel = { background: '#080b12', border: '1px solid #1e293b', borderRadius: 6, padding: '7px 10px', color: '#e2e8f0', fontFamily: 'Inter, sans-serif', fontSize: 13, outline: 'none', cursor: 'pointer', width: '100%' }
  const rev = { background: '#080b12', border: '1px solid #312e81', borderRadius: 6, padding: '6px 10px', color: '#e2e8f0', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, outline: 'none', width: '100%' }

  const Toggle = ({ value, onChange, label }) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: '#94a3b8' }}>
      <div onClick={() => onChange(!value)} style={{ width: 36, height: 20, borderRadius: 10, background: value ? '#6366f1' : '#1e293b', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
        <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: value ? 19 : 3, transition: 'left 0.2s' }} />
      </div>
      {label}
    </label>
  )

  const StatusPill = ({ status, active, onClick }) => {
    const colors = { active: '#22c55e', draft: '#f59e0b', archived: '#64748b' }
    const labels = { active: 'Active', draft: 'Draft', archived: 'Archived' }
    return (
      <button onClick={onClick} style={{ padding: '4px 14px', borderRadius: 99, border: `1px solid ${active ? colors[status] : '#1e293b'}`, background: active ? `${colors[status]}22` : 'transparent', color: active ? colors[status] : '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
        {labels[status]}
      </button>
    )
  }

  const SectionHeader = ({ logo: Logo, title, color }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      {Logo && <Logo />}
      <div style={{ fontSize: 12, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{title}</div>
    </div>
  )

  const FieldLabel = ({ children }) => (
    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>{children}</div>
  )

  const StatusDot = ({ status }) => (
    <div style={{ width: 10, height: 10, borderRadius: '50%', background: status === 'connected' ? '#22c55e' : status === 'error' ? '#ef4444' : status === 'loading' ? '#f59e0b' : '#334155', boxShadow: status === 'connected' ? '0 0 8px #22c55e' : 'none', ...(status === 'loading' ? { animation: 'pulse 1s infinite' } : {}) }} />
  )

  const ConnectButton = ({ status, onClick, label }) => (
    <button onClick={onClick} style={{ width: '100%', padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif', background: status === 'connected' ? 'rgba(34,197,94,0.15)' : status === 'error' ? 'rgba(239,68,68,0.15)' : '#1e293b', color: status === 'connected' ? '#22c55e' : status === 'error' ? '#ef4444' : '#94a3b8', transition: 'all 0.2s' }}>
      {status === 'loading' ? 'Verbinde...' : status === 'connected' ? `✓ ${label} verbunden` : status === 'error' ? '✗ Fehler – Erneut versuchen' : 'Verbindung testen'}
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
                <div style={{ fontSize: 11, color, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Name</div>
                <input style={{ ...rev, borderColor: `${color}66` }} value={ct.name} onChange={e => onUpdate(i, 'name', e.target.value)} />
              </div>
              <div>
                <div style={{ fontSize: 11, color, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>ID</div>
                <input style={{ ...rev, borderColor: `${color}66`, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }} value={ct.id} onChange={e => onUpdate(i, 'id', e.target.value)} />
              </div>
            </div>
            <div style={{ fontSize: 12, color: '#475569' }}>
              Quelle: <span style={{ color: '#64748b' }}>{ct.sourceType}</span>
              <span style={{ marginLeft: 12 }}>~{ct.estimatedEntries} Entries</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const currentTextLevel = TEXT_LEVELS[migrationSettings.textLevel]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080b12; color: #e2e8f0; font-family: 'Inter', sans-serif; min-height: 100vh; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideDown { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 2000px; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes glow { 0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,0.3); } 50% { box-shadow: 0 0 40px rgba(99,102,241,0.6); } }
        .fade-up { animation: fadeUp 0.5s ease both; }
        .slide-down { animation: slideDown 0.3s ease both; overflow: hidden; }
        input:focus { border-color: #6366f1 !important; }
        select:focus { border-color: #6366f1 !important; }
        .dropdown-item:hover { background: #1e293b; }
        .mode-btn { transition: all 0.2s; cursor: pointer; border: none; font-family: Inter, sans-serif; font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 8px; }
        .card { display: flex; flex-direction: column; }
        .card-body { flex: 1; }
        .settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
      `}</style>

      {/* Sticky Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: '#080b12', borderBottom: '1px solid #1e293b', paddingBottom: 16 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <img src="/logo.svg" alt="MigrateIQ" style={{ height: 64 }} />
          </div>
          <div style={{ background: '#0f1623', border: '1px solid #1e293b', borderRadius: 12, padding: '14px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {PIPELINE_STEPS.map((step, i) => {
                const status = getStepStatus(step.id)
                return (
                  <div key={step.id} style={{ display: 'flex', alignItems: 'center', flex: i < PIPELINE_STEPS.length - 1 ? 1 : 'none' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, background: status === 'done' ? '#166534' : status === 'active' ? '#6366f1' : '#1e293b', color: status === 'done' ? '#22c55e' : status === 'active' ? '#fff' : '#475569', border: status === 'active' ? '2px solid #6366f1' : '2px solid transparent', boxShadow: status === 'active' ? '0 0 12px rgba(99,102,241,0.5)' : 'none', transition: 'all 0.3s', ...(status === 'active' ? { animation: 'pulse 2s ease infinite' } : {}) }}>
                        {status === 'done' ? '✓' : i + 1}
                      </div>
                      <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: status === 'done' ? '#22c55e' : status === 'active' ? '#a5b4fc' : '#334155', whiteSpace: 'nowrap', transition: 'color 0.3s' }}>{step.label}</div>
                    </div>
                    {i < PIPELINE_STEPS.length - 1 && (
                      <div style={{ flex: 1, height: 2, margin: '0 6px', marginBottom: 16, background: getStepStatus(PIPELINE_STEPS[i + 1].id) === 'pending' ? '#1e293b' : '#166534', transition: 'background 0.5s' }} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 48px' }}>

        {/* CONNECTION CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
          {/* Shopify */}
          <div className="fade-up card" style={{ background: '#0f1623', border: `1px solid ${shopifyStatus === 'connected' ? '#166534' : shopifyStatus === 'error' ? '#7f1d1d' : '#1e293b'}`, borderRadius: 14, padding: 24, animationDelay: '0.1s', transition: 'border-color 0.3s' }}>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Quellsystem</div>
                <StatusDot status={shopifyStatus} />
              </div>
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <button onClick={() => setSourceDropdownOpen(!sourceDropdownOpen)} style={{ width: '100%', background: '#080b12', border: '1px solid #1e293b', borderRadius: 8, padding: '10px 14px', color: '#e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {selectedSource?.logo && <selectedSource.logo />}
                    {selectedSource?.label}
                  </div>
                  <span style={{ color: '#475569', fontSize: 10 }}>▼</span>
                </button>
                {sourceDropdownOpen && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0f1623', border: '1px solid #1e293b', borderRadius: 8, marginTop: 4, zIndex: 10, overflow: 'hidden' }}>
                    {SOURCE_SYSTEMS.map(sys => (
                      <div key={sys.id} className="dropdown-item" onClick={() => { if (sys.available) { setSourceSystem(sys.id); setSourceDropdownOpen(false) } }} style={{ padding: '10px 14px', cursor: sys.available ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: sys.available ? 1 : 0.4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 500 }}>
                          {sys.logo && <sys.logo />}
                          {sys.label}
                        </div>
                        {!sys.available && <span style={{ fontSize: 10, color: '#475569', background: '#1e293b', padding: '2px 6px', borderRadius: 4 }}>bald</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: '#475569', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Domain</div>
                <input style={inp} value={shopifyDomain} onChange={e => setShopifyDomain(e.target.value)} placeholder="shop.myshopify.com" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: '#475569', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Admin API Token</div>
                <input style={inp} value={shopifyTokenEditing ? shopifyTokenReal : shopifyToken} onChange={e => setShopifyTokenReal(e.target.value)} onFocus={() => { setShopifyTokenEditing(true); setShopifyTokenReal('') }} onBlur={() => { if (!shopifyTokenReal) setShopifyTokenEditing(false) }} placeholder="Token eingeben..." type={shopifyTokenEditing ? 'text' : 'password'} />
              </div>
            </div>
            <ConnectButton status={shopifyStatus} onClick={testShopify} label="Shopify" />
          </div>

          {/* commercetools */}
          <div className="fade-up card" style={{ background: '#0f1623', border: `1px solid ${ctStatus === 'connected' ? '#166534' : ctStatus === 'error' ? '#7f1d1d' : '#00B2E333'}`, borderRadius: 14, padding: 24, animationDelay: '0.2s', transition: 'border-color 0.3s' }}>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Commerce</div>
                <StatusDot status={ctStatus} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '10px 14px', background: '#080b12', borderRadius: 8, border: '1px solid #00B2E333' }}>
                <CTLogo />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#00B2E3' }}>commercetools</span>
              </div>
              <div style={{ background: '#0a0e1a', borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
                Credentials werden aus den Vercel Environment Variables gelesen.<br />
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#334155' }}>CT_PROJECT_KEY · CT_CLIENT_ID · CT_CLIENT_SECRET</span>
              </div>
            </div>
            <ConnectButton status={ctStatus} onClick={testCT} label="commercetools" />
          </div>

          {/* Contentful */}
          <div className="fade-up card" style={{ background: '#0f1623', border: `1px solid ${contentfulStatus === 'connected' ? '#166534' : contentfulStatus === 'error' ? '#7f1d1d' : '#FAE50133'}`, borderRadius: 14, padding: 24, animationDelay: '0.3s', transition: 'border-color 0.3s' }}>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Content</div>
                <StatusDot status={contentfulStatus} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 14px', background: '#080b12', borderRadius: 8, border: '1px solid #FAE50133' }}>
                <ContentfulLogo />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#FAE501' }}>Contentful</span>
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: '#475569', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Space ID</div>
                <input style={inp} value={contentfulSpace} onChange={e => setContentfulSpace(e.target.value)} placeholder="Space ID" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: '#475569', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>CMA Token</div>
                <input style={inp} value={contentfulTokenEditing ? contentfulTokenReal : contentfulToken} onChange={e => setContentfulTokenReal(e.target.value)} onFocus={() => { setContentfulTokenEditing(true); setContentfulTokenReal('') }} onBlur={() => { if (!contentfulTokenReal) setContentfulTokenEditing(false) }} placeholder="CFPAT-xxx" type={contentfulTokenEditing ? 'text' : 'password'} />
              </div>
            </div>
            <ConnectButton status={contentfulStatus} onClick={testContentful} label="Contentful" />
          </div>
        </div>

        {/* Model Mode Toggle */}
        {allConnected && (
          <div className="fade-up" style={{ background: '#0f1623', border: '1px solid #1e293b', borderRadius: 14, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Content Model</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="mode-btn" onClick={() => setModelMode('create')} style={{ flex: 1, background: modelMode === 'create' ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : '#1e293b', color: modelMode === 'create' ? '#fff' : '#64748b', boxShadow: modelMode === 'create' ? '0 0 16px rgba(99,102,241,0.35)' : 'none' }}>
                ✦ Content Model anlegen
              </button>
              <button className="mode-btn" onClick={() => setModelMode('existing')} style={{ flex: 1, background: modelMode === 'existing' ? 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)' : '#1e293b', color: modelMode === 'existing' ? '#fff' : '#64748b', boxShadow: modelMode === 'existing' ? '0 0 16px rgba(6,182,212,0.35)' : 'none' }}>
                ↗ Bestehendes Model verwenden
              </button>
            </div>
            <div style={{ marginTop: 10, fontSize: 13, color: '#475569' }}>
              {modelMode === 'create' ? 'Produkte → commercetools. Pages und Blogs → Contentful. Du prüfst die Namen vor dem Anlegen.' : 'Bestehende Modelle aus commercetools und Contentful werden gelesen und gemappt.'}
            </div>
          </div>
        )}

        {/* Analyse Button */}
        {allConnected && !inventory && !analyzing && (
          <div className="fade-up">
            <button onClick={analyze} style={{ width: '100%', padding: '18px 24px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, fontFamily: 'Inter, sans-serif', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff', marginBottom: 12, animation: 'glow 2s ease infinite' }}>
              Inventar analysieren
            </button>
          </div>
        )}

        {/* Analyse Loading */}
        {analyzing && (
          <div className="fade-up" style={{ background: '#0f1623', border: '1px solid #1e293b', borderRadius: 14, padding: 32, marginBottom: 20, textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, border: '3px solid #1e293b', borderTopColor: '#6366f1', borderRadius: '50%', margin: '0 auto 24px', animation: 'spin 0.8s linear infinite' }} />
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: '#6366f1', marginBottom: 24 }}>{analyzeSteps[analyzeStep]}</div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
              {analyzeSteps.map((_, i) => (
                <div key={i} style={{ width: i <= analyzeStep ? 24 : 8, height: 4, borderRadius: 2, background: i <= analyzeStep ? '#6366f1' : '#1e293b', transition: 'all 0.3s ease' }} />
              ))}
            </div>
          </div>
        )}

        {/* Inventar + Migration Control Panel */}
        {inventory && !mapping && (
          <div className="fade-up">
            {/* Inventar */}
            <div style={{ background: '#0f1623', border: '1px solid #166534', borderRadius: 14, padding: 28, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#475569', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>// Analyse abgeschlossen</div>
                  <h2 style={{ fontSize: 24, fontWeight: 700 }}>{inventory.shopName}</h2>
                </div>
                <button onClick={reset} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #1e293b', background: 'transparent', color: '#475569', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>↺ Reset</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                {[
                  { label: 'Produkte', value: inventory.productCount },
                  { label: 'Pages', value: inventory.pages.length },
                  { label: 'Blogs', value: inventory.blogs.length },
                  { label: 'Metafields', value: inventory.metafields.length },
                ].map(s => (
                  <div key={s.label} style={{ background: '#080b12', border: '1px solid #166534', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: 32, fontWeight: 800, color: '#22c55e', fontFamily: 'JetBrains Mono, monospace' }}>
                      <AnimatedNumber value={s.value} animate={animateNumbers} />
                    </div>
                    <div style={{ fontSize: 12, color: '#475569', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {inventory.variantOptions?.length > 0 && (
                <div style={{ marginBottom: 10, fontSize: 13 }}>
                  <span style={{ color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>varianten-optionen: </span>
                  {inventory.variantOptions.map(o => <span key={o} style={{ background: '#1e293b', borderRadius: 4, padding: '2px 8px', fontSize: 12, marginRight: 6 }}>{o}</span>)}
                </div>
              )}
              {inventory.pages.length > 0 && (
                <div style={{ marginBottom: 10, fontSize: 13 }}>
                  <span style={{ color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>pages: </span>
                  {inventory.pages.map(p => <span key={p.id} style={{ background: '#1e293b', borderRadius: 4, padding: '2px 8px', fontSize: 12, marginRight: 6, marginBottom: 4, display: 'inline-block' }}>{p.title}</span>)}
                </div>
              )}
              {inventory.blogs.length > 0 && (
                <div style={{ marginBottom: 10, fontSize: 13 }}>
                  <span style={{ color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>blogs: </span>
                  {inventory.blogs.map(b => <span key={b.id} style={{ background: '#1e293b', borderRadius: 4, padding: '2px 8px', fontSize: 12, marginRight: 6 }}>{b.title}</span>)}
                </div>
              )}
              {inventory.metafields.length > 0 && (
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>metafields: </span>
                  {inventory.metafields.slice(0, 10).map(m => <span key={`${m.namespace}.${m.key}`} style={{ background: '#1e293b', borderRadius: 4, padding: '2px 8px', fontSize: 12, marginRight: 6, marginBottom: 4, display: 'inline-block' }}>{m.namespace}.{m.key}</span>)}
                  {inventory.metafields.length > 10 && <span style={{ color: '#475569', fontSize: 12 }}>+{inventory.metafields.length - 10} weitere</span>}
                </div>
              )}
            </div>

            {/* ── MIGRATION CONTROL PANEL ── */}
            <div style={{ background: '#0f1623', border: '1px solid #312e81', borderRadius: 14, marginBottom: 16, overflow: 'hidden' }}>
              {/* Header — immer sichtbar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', cursor: 'pointer' }} onClick={() => setSettingsOpen(!settingsOpen)}>
                <div>
                  <div style={{ fontSize: 12, color: '#6366f1', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>// Konfiguration</div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: '#a5b4fc' }}>Migration Control Panel</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {!settingsOpen && (
                    <div style={{ fontSize: 12, color: '#475569' }}>Standard-Einstellungen aktiv</div>
                  )}
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#6366f1', transition: 'transform 0.2s', transform: settingsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    ▼
                  </div>
                </div>
              </div>

              {/* Panel-Inhalt — aufklappbar */}
              {settingsOpen && (
                <div className="slide-down" style={{ padding: '0 28px 28px' }}>
                  <div style={{ height: 1, background: '#1e293b', marginBottom: 24 }} />
                  <div className="settings-grid">

                    {/* PRODUKT-FILTER */}
                    <div style={{ background: '#080b12', borderRadius: 12, padding: 20, border: '1px solid #1e293b' }}>
                      <SectionHeader logo={ShopifyLogo} title="Produkt-Filter" color="#95BF47" />

                      <div style={{ marginBottom: 16 }}>
                        <FieldLabel>Status</FieldLabel>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {['active', 'draft', 'archived'].map(s => (
                            <StatusPill key={s} status={s} active={migrationSettings.statusFilter.includes(s)} onClick={() => toggleStatus(s)} />
                          ))}
                        </div>
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <FieldLabel>Tag enthält</FieldLabel>
                        <input style={{ ...inp, marginBottom: 8 }} value={migrationSettings.tagInclude} onChange={e => updateSetting('tagInclude', e.target.value)} placeholder="z.B. sale, featured" />
                        <FieldLabel>Tag ausschliessen</FieldLabel>
                        <input style={inp} value={migrationSettings.tagExclude} onChange={e => updateSetting('tagExclude', e.target.value)} placeholder="z.B. intern, test" />
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <FieldLabel>Nur dieser Produkttyp (leer = alle)</FieldLabel>
                        <input style={inp} value={migrationSettings.productTypeFilter} onChange={e => updateSetting('productTypeFilter', e.target.value)} placeholder="z.B. Stützen & Bandagen" />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <Toggle value={migrationSettings.onlyWithImages} onChange={v => updateSetting('onlyWithImages', v)} label="Nur Produkte mit Bildern" />
                        <Toggle value={migrationSettings.onlyWithSku} onChange={v => updateSetting('onlyWithSku', v)} label="Nur Produkte mit SKU" />
                      </div>
                    </div>

                    {/* PREISFILTER + SKU */}
                    <div style={{ background: '#080b12', borderRadius: 12, padding: 20, border: '1px solid #1e293b' }}>
                      <SectionHeader logo={CTLogo} title="Preisfilter" color="#00B2E3" />

                      <div style={{ marginBottom: 12 }}>
                        <FieldLabel>Preis-Referenz</FieldLabel>
                        <select style={sel} value={migrationSettings.priceReference} onChange={e => updateSetting('priceReference', e.target.value)}>
                          <option value="min">Günstigste Variante (Standard)</option>
                          <option value="max">Teuerste Variante</option>
                          <option value="avg">Durchschnitt aller Varianten</option>
                        </select>
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <FieldLabel>Operator</FieldLabel>
                        <select style={sel} value={migrationSettings.priceOperator} onChange={e => updateSetting('priceOperator', e.target.value)}>
                          <option value="none">Kein Filter</option>
                          <option value="lt">{'< Kleiner als'}</option>
                          <option value="gt">{'> Grösser als'}</option>
                          <option value="eq">{'= Gleich'}</option>
                          <option value="lte">{'<= Kleiner oder gleich'}</option>
                          <option value="gte">'{'>= Grösser oder gleich'}</option>
                        </select>
                      </div>

                      {migrationSettings.priceOperator !== 'none' && (
                        <div style={{ marginBottom: 16 }}>
                          <FieldLabel>Betrag in €</FieldLabel>
                          <input style={inp} type="number" min="0" step="0.01" value={migrationSettings.priceValue} onChange={e => updateSetting('priceValue', e.target.value)} placeholder="0.00" />
                        </div>
                      )}

                      <div style={{ height: 1, background: '#1e293b', margin: '16px 0' }} />

                      <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>SKU-Behandlung</div>
                      <div style={{ marginBottom: 10 }}>
                        <select style={sel} value={migrationSettings.skuFallback} onChange={e => updateSetting('skuFallback', e.target.value)}>
                          <option value="generate">Fallback-ID generieren</option>
                          <option value="skip">Produkt überspringen</option>
                          <option value="warn">Warnung, trotzdem migrieren</option>
                        </select>
                      </div>
                      <input style={inp} value={migrationSettings.skuPrefix} onChange={e => updateSetting('skuPrefix', e.target.value)} placeholder="SKU-Präfix (optional, z.B. SHOP-)" />
                    </div>

                    {/* VARIANTEN & BILDER */}
                    <div style={{ background: '#080b12', borderRadius: 12, padding: 20, border: '1px solid #1e293b' }}>
                      <SectionHeader logo={ShopifyLogo} title="Varianten & Bilder" color="#95BF47" />

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                        <Toggle value={migrationSettings.inheritImages} onChange={v => updateSetting('inheritImages', v)} label="Produktbilder an alle Varianten vererben" />
                        <Toggle value={migrationSettings.transferVariantOptions} onChange={v => updateSetting('transferVariantOptions', v)} label="Variantenoptionen als Attribute übertragen" />
                      </div>

                      <div style={{ marginBottom: 14 }}>
                        <FieldLabel>Max. Bilder pro Produkt (leer = alle)</FieldLabel>
                        <input style={inp} type="number" min="1" value={migrationSettings.maxImagesPerProduct} onChange={e => updateSetting('maxImagesPerProduct', e.target.value)} placeholder="Leer = alle Bilder" />
                      </div>

                      <div style={{ height: 1, background: '#1e293b', margin: '16px 0' }} />

                      <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Bei Duplikaten</div>
                      <select style={sel} value={migrationSettings.duplicateHandling} onChange={e => updateSetting('duplicateHandling', e.target.value)}>
                        <option value="skip">Überspringen</option>
                        <option value="overwrite">Überschreiben</option>
                        <option value="error">Fehler melden</option>
                      </select>
                    </div>

                    {/* TEXT-QUALITÄT L0-L5 */}
                    <div style={{ background: '#080b12', borderRadius: 12, padding: 20, border: '1px solid #1e293b' }}>
                      <SectionHeader title="Text-Qualität" color="#a5b4fc" />

                      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                        {TEXT_LEVELS.map(l => (
                          <button key={l.level} onClick={() => updateSetting('textLevel', l.level)} style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: `1px solid ${migrationSettings.textLevel === l.level ? '#6366f1' : '#1e293b'}`, background: migrationSettings.textLevel === l.level ? 'rgba(99,102,241,0.2)' : 'transparent', color: migrationSettings.textLevel === l.level ? '#a5b4fc' : '#475569', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
                            {l.label}
                          </button>
                        ))}
                      </div>

                      <div style={{ background: '#0a0e1a', borderRadius: 10, padding: 14, borderLeft: '3px solid #6366f1', marginBottom: 14 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#a5b4fc', marginBottom: 6 }}>{currentTextLevel.title}</div>
                        <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{currentTextLevel.desc}</div>
                      </div>

                      {migrationSettings.textLevel === 3 && (
                        <div>
                          <FieldLabel>Zielgruppe / Persona</FieldLabel>
                          <input style={inp} placeholder="z.B. Medizinisches Fachpersonal, 40-60 Jahre" />
                        </div>
                      )}
                      {migrationSettings.textLevel >= 4 && (
                        <div>
                          <FieldLabel>Primäres Keyword (leer = KI ermittelt selbst)</FieldLabel>
                          <input style={inp} placeholder="Leer = KI ermittelt selbst" />
                        </div>
                      )}
                    </div>

                  </div>

                  <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={() => { setMigrationSettings(DEFAULT_SETTINGS) }} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #1e293b', background: 'transparent', color: '#475569', cursor: 'pointer', fontSize: 13 }}>
                      Zurücksetzen
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button onClick={startMapping} disabled={mappingLoading} style={{ width: '100%', padding: '18px 24px', borderRadius: 12, border: 'none', cursor: mappingLoading ? 'not-allowed' : 'pointer', fontSize: 16, fontWeight: 700, fontFamily: 'Inter, sans-serif', background: mappingLoading ? '#1e293b' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: mappingLoading ? '#475569' : '#fff' }}>
              {mappingLoading ? 'KI analysiert MACH-Struktur...' : 'KI MACH-Mapping starten →'}
            </button>
          </div>
        )}

        {/* MACH Mapping + Review */}
        {mapping && (
          <div className="fade-up" style={{ marginTop: 16 }}>
            <div style={{ background: '#0f1623', border: '1px solid #312e81', borderRadius: 14, padding: 28, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#475569', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>// KI MACH-Mapping</div>
              <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: '#a5b4fc' }}>MACH Content Model Vorschlag</h2>
              <div style={{ background: '#080b12', borderRadius: 10, padding: 16, marginBottom: 24, borderLeft: '3px solid #6366f1' }}>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: '#94a3b8' }}>{mapping.summary}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                <div style={{ background: '#080b12', border: '1px solid #00B2E333', borderRadius: 10, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <CTLogo />
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#00B2E3' }}>commercetools</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>{mapping.commercetools?.description}</p>
                  <div style={{ marginTop: 8, fontSize: 12, color: '#00B2E3' }}>{mapping.commercetools?.contentTypes?.length || 0} Types</div>
                </div>
                <div style={{ background: '#080b12', border: '1px solid #FAE50133', borderRadius: 10, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <ContentfulLogo />
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#FAE501' }}>Contentful</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>{mapping.contentful?.description}</p>
                  <div style={{ marginTop: 8, fontSize: 12, color: '#FAE501' }}>{mapping.contentful?.contentTypes?.length || 0} Types</div>
                </div>
              </div>

              {!reviewConfirmed && reviewedCT && reviewedContentful && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ background: '#080b12', borderRadius: 10, padding: 14, marginBottom: 16, borderLeft: '3px solid #f59e0b', fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
                    ⚠ Bitte prüfe die Namen vor dem Anlegen. Du kannst Name und ID direkt bearbeiten. Erst nach Deiner Bestätigung wird das Model angelegt.
                  </div>
                  <ReviewSection title="commercetools — Produkte & Commerce" color="#00B2E3" items={reviewedCT} onUpdate={updateReviewedCT} logo={CTLogo} />
                  <ReviewSection title="Contentful — Content & Redaktion" color="#FAE501" items={reviewedContentful} onUpdate={updateReviewedContentful} logo={ContentfulLogo} />
                  <button onClick={() => setReviewConfirmed(true)} style={{ width: '100%', marginTop: 8, padding: '14px 24px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700, fontFamily: 'Inter, sans-serif', background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)', color: '#000', boxShadow: '0 0 20px rgba(245,158,11,0.3)' }}>
                    ✓ Namen bestätigen und weiter
                  </button>
                </div>
              )}

              {reviewConfirmed && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.1em' }}>✓ Namen bestätigt</div>
                  <button onClick={() => setReviewConfirmed(false)} style={{ fontSize: 12, color: '#475569', background: 'transparent', border: '1px solid #1e293b', borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}>bearbeiten</button>
                </div>
              )}

              {reviewConfirmed && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                  <button onClick={deployCTModel} disabled={deployingCT} style={{ padding: '14px 24px', borderRadius: 12, border: 'none', cursor: deployingCT ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'Inter, sans-serif', background: deployingCT ? '#1e293b' : deployResultsCT ? 'rgba(34,197,94,0.15)' : 'linear-gradient(135deg, #0072b1 0%, #00B2E3 100%)', color: deployingCT ? '#475569' : deployResultsCT ? '#22c55e' : '#fff' }}>
                    {deployingCT ? 'Wird angelegt...' : deployResultsCT ? '✓ commercetools Model angelegt' : 'commercetools Model anlegen →'}
                  </button>
                  <button onClick={deployContentfulModel} disabled={deployingContentful} style={{ padding: '14px 24px', borderRadius: 12, border: 'none', cursor: deployingContentful ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'Inter, sans-serif', background: deployingContentful ? '#1e293b' : deployResultsContentful ? 'rgba(34,197,94,0.15)' : 'linear-gradient(135deg, #92790a 0%, #FAE501 100%)', color: deployingContentful ? '#475569' : deployResultsContentful ? '#22c55e' : '#000' }}>
                    {deployingContentful ? 'Wird angelegt...' : deployResultsContentful ? '✓ Contentful Model angelegt' : 'Contentful Model anlegen →'}
                  </button>
                </div>
              )}

              {(deployResultsCT || deployResultsContentful) && (
                <div style={{ marginBottom: 24 }}>
                  {deployResultsCT && (
                    <div style={{ background: '#080b12', border: '1px solid #00B2E333', borderRadius: 10, padding: 16, marginBottom: 10 }}>
                      <div style={{ fontSize: 13, color: '#00B2E3', fontWeight: 700, marginBottom: 10 }}>commercetools — Product Types</div>
                      {deployResultsCT.map(r => (
                        <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1e293b', fontSize: 13 }}>
                          <span>{r.name}</span>
                          <span style={{ color: r.status === 'success' ? '#22c55e' : '#ef4444', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{r.status === 'success' ? '✓ angelegt' : `✗ ${r.error}`}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {deployResultsContentful && (
                    <div style={{ background: '#080b12', border: '1px solid #FAE50133', borderRadius: 10, padding: 16 }}>
                      <div style={{ fontSize: 13, color: '#FAE501', fontWeight: 700, marginBottom: 10 }}>Contentful — Content Types</div>
                      {deployResultsContentful.map(r => (
                        <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1e293b', fontSize: 13 }}>
                          <span>{r.name}</span>
                          <span style={{ color: r.status === 'success' ? '#22c55e' : '#ef4444', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{r.status === 'success' ? '✓ angelegt' : `✗ ${r.error}`}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {bothDeployed && (
                <div style={{ background: '#080b12', border: '1px solid #1e293b', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                  <div style={{ fontSize: 13, color: '#475569', fontFamily: 'JetBrains Mono, monospace', marginBottom: 16 }}>// Migration starten</div>

                  <div style={{ marginBottom: 12, padding: 16, background: '#0a0e1a', borderRadius: 10, border: '1px solid #00B2E333' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <CTLogo />
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#00B2E3' }}>Produkte → commercetools</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontSize: 13, color: '#475569' }}>Anzahl Produkte:</span>
                      <input type="number" min={1} max={50} value={productLimit} onChange={e => setProductLimit(Math.min(50, parseInt(e.target.value) || 10))} style={{ ...inp, width: 80 }} />
                      <span style={{ fontSize: 12, color: '#475569' }}>von {inventory?.productCount || 0} gesamt (max. 50 pro Batch)</span>
                    </div>
                    <button onClick={migrateProductsToCT} disabled={migratingCT} style={{ width: '100%', padding: '12px 20px', borderRadius: 10, border: 'none', cursor: migratingCT ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'Inter, sans-serif', background: migratingCT ? '#1e293b' : migrateResultsCT ? 'rgba(34,197,94,0.15)' : 'linear-gradient(135deg, #0072b1 0%, #00B2E3 100%)', color: migratingCT ? '#475569' : migrateResultsCT ? '#22c55e' : '#fff' }}>
                      {migratingCT ? 'Migriere Produkte...' : migrateResultsCT ? `✓ ${migrateResultsCT.filter(r => r.status === 'success').length} Produkte migriert` : `${productLimit} Produkte nach commercetools migrieren →`}
                    </button>
                    {migrateResultsCT && (
                      <div style={{ marginTop: 12, maxHeight: 160, overflowY: 'auto' }}>
                        {migrateResultsCT.map((r, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #1e293b', fontSize: 13 }}>
                            <span style={{ color: '#94a3b8' }}>{r.title || r.name}</span>
                            <span style={{ color: r.status === 'success' ? '#22c55e' : r.status === 'skipped' ? '#f59e0b' : '#ef4444', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{r.status === 'success' ? '✓' : r.status === 'skipped' ? `↷ ${r.reason}` : `✗ ${r.error}`}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ padding: 16, background: '#0a0e1a', borderRadius: 10, border: '1px solid #FAE50133' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <ContentfulLogo />
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#FAE501' }}>Pages → Contentful</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#475569', marginBottom: 12 }}>
                      {inventory?.pages.length || 0} Pages werden migriert
                    </div>
                    <button onClick={migrateContentToContentful} disabled={migratingContentful} style={{ width: '100%', padding: '12px 20px', borderRadius: 10, border: 'none', cursor: migratingContentful ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'Inter, sans-serif', background: migratingContentful ? '#1e293b' : migrateResultsContentful ? 'rgba(34,197,94,0.15)' : 'linear-gradient(135deg, #92790a 0%, #FAE501 100%)', color: migratingContentful ? '#475569' : migrateResultsContentful ? '#22c55e' : '#000' }}>
                      {migratingContentful ? 'Migriere Pages...' : migrateResultsContentful ? `✓ ${migrateResultsContentful.filter(r => r.status === 'success').length}/${migrateResultsContentful.length} Pages migriert` : 'Pages nach Contentful migrieren →'}
                    </button>
                    {migrateResultsContentful && (
                      <div style={{ marginTop: 12, maxHeight: 160, overflowY: 'auto' }}>
                        {migrateResultsContentful.map((r, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #1e293b', fontSize: 13 }}>
                            <span style={{ color: '#94a3b8' }}>{r.title}</span>
                            <span style={{ color: r.status === 'success' ? '#22c55e' : '#ef4444', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{r.status === 'success' ? '✓' : `✗ ${r.error}`}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <button onClick={resetCT} disabled={resettingCT} style={{ padding: '14px 24px', borderRadius: 12, border: '1px solid rgba(0,178,227,0.3)', background: 'rgba(0,178,227,0.08)', cursor: resettingCT ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif', color: resettingCT ? '#475569' : '#00B2E3' }}>
                  {resettingCT ? 'Wird geleert...' : '↺ commercetools zurücksetzen'}
                </button>
                <button onClick={resetContentful} disabled={resettingContentful} style={{ padding: '14px 24px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', cursor: resettingContentful ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif', color: resettingContentful ? '#475569' : '#ef4444' }}>
                  {resettingContentful ? 'Wird geleert...' : '↺ Contentful zurücksetzen'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
