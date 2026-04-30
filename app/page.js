'use client'

import { useState, useEffect } from 'react'

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
  { id: 'model', label: 'Model anlegen' },
  { id: 'migrate', label: 'Migrieren' },
  { id: 'done', label: 'Fertig' },
]

export default function Home() {
  const [sourceSystem, setSourceSystem] = useState('shopify')
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState(false)
  const [shopifyDomain, setShopifyDomain] = useState('sanitaetshaus24-shop.myshopify.com')
  const [shopifyToken, setShopifyToken] = useState('••••••••••••••••••••••••')
  const [shopifyTokenEditing, setShopifyTokenEditing] = useState(false)
  const [shopifyTokenReal, setShopifyTokenReal] = useState('')
  const [contentfulSpace, setContentfulSpace] = useState('1ub4n2ex18h8')
  const [contentfulToken, setContentfulToken] = useState('••••••••••••••••••••••••')
  const [contentfulTokenEditing, setContentfulTokenEditing] = useState(false)
  const [contentfulTokenReal, setContentfulTokenReal] = useState('')
  const [shopifyStatus, setShopifyStatus] = useState('idle')
  const [contentfulStatus, setContentfulStatus] = useState('idle')
  const [inventory, setInventory] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeStep, setAnalyzeStep] = useState(0)
  const [mapping, setMapping] = useState(null)
  const [mappingLoading, setMappingLoading] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [deployResults, setDeployResults] = useState(null)
  const [migrating, setMigrating] = useState(false)
  const [migrateResults, setMigrateResults] = useState(null)
  const [resetting, setResetting] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const bothConnected = shopifyStatus === 'connected' && contentfulStatus === 'connected'

  const currentStep = () => {
    if (migrateResults && migrateResults.filter(r => r.status === 'success').length > 0) return 'done'
    if (migrating) return 'migrate'
    if (deployResults) return 'migrate'
    if (deploying) return 'model'
    if (mapping) return 'model'
    if (mappingLoading) return 'mapping'
    if (inventory) return 'mapping'
    if (analyzing) return 'analyse'
    if (bothConnected) return 'analyse'
    return 'connect'
  }

  const getStepStatus = (stepId) => {
    const order = PIPELINE_STEPS.map(s => s.id)
    const current = currentStep()
    const currentIdx = order.indexOf(current)
    const stepIdx = order.indexOf(stepId)
    if (stepId === 'done' && migrateResults && migrateResults.filter(r => r.status === 'success').length > 0) return 'done'
    if (stepIdx < currentIdx) return 'done'
    if (stepIdx === currentIdx) return 'active'
    return 'pending'
  }

  const steps = [
    'Verbinde mit Shopify...',
    'Lade Produkte...',
    'Analysiere Pages & Blogs...',
    'Erkenne Metafeld-Strukturen...',
    'Untersuche Theme & Sections...',
    'KI bereitet Content Mapping vor...',
  ]

  async function shopifyFetch(endpoint) {
    const body = { endpoint }
    if (shopifyTokenEditing && shopifyTokenReal) {
      body.domain = shopifyDomain
      body.token = shopifyTokenReal
    }
    const res = await fetch('/api/shopify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    return res.json()
  }

  async function testShopify() {
    setShopifyStatus('loading')
    try {
      const data = await shopifyFetch('shop.json')
      if (data.shop) setShopifyStatus('connected')
      else setShopifyStatus('error')
    } catch { setShopifyStatus('error') }
  }

  async function testContentful() {
    setContentfulStatus('loading')
    try {
      const body = { endpoint: '' }
      if (contentfulTokenEditing && contentfulTokenReal) {
        body.spaceId = contentfulSpace
        body.token = contentfulTokenReal
      }
      const res = await fetch('/api/contentful', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (data.name) setContentfulStatus('connected')
      else setContentfulStatus('error')
    } catch { setContentfulStatus('error') }
  }

  async function analyze() {
    setAnalyzing(true)
    setAnalyzeStep(0)
    const stepInterval = setInterval(() => {
      setAnalyzeStep(s => {
        if (s >= steps.length - 1) { clearInterval(stepInterval); return s }
        return s + 1
      })
    }, 600)
    try {
      const [shop, products, pages, blogs, metafields, themes] = await Promise.all([
        shopifyFetch('shop.json'),
        shopifyFetch('products/count.json'),
        shopifyFetch('pages.json?limit=250'),
        shopifyFetch('blogs.json?limit=50'),
        shopifyFetch('metafields.json?limit=250'),
        shopifyFetch('themes.json'),
      ])
      clearInterval(stepInterval)
      setAnalyzeStep(steps.length - 1)
      await new Promise(r => setTimeout(r, 800))
      setInventory({
        shopName: shop.shop?.name,
        productCount: products.count || 0,
        pages: pages.pages || [],
        blogs: blogs.blogs || [],
        metafields: metafields.metafields || [],
        themes: themes.themes || [],
      })
    } catch (e) {
      clearInterval(stepInterval)
      console.error(e)
    }
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
    } catch (e) { console.error(e) }
    setMappingLoading(false)
  }

  async function deployToContentful() {
    setDeploying(true)
    try {
      const res = await fetch('/api/create-content-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentTypes: mapping.contentTypes })
      })
      const data = await res.json()
      setDeployResults(data.results)
    } catch (e) { console.error(e) }
    setDeploying(false)
  }

  async function migrateContent() {
    setMigrating(true)
    try {
      const res = await fetch('/api/migrate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages: inventory.pages })
      })
      const data = await res.json()
      setMigrateResults(data.results)
    } catch (e) { console.error(e) }
    setMigrating(false)
  }

  async function resetContentful() {
    if (!confirm('Alle Contentful Entries und Content Types löschen?')) return
    setResetting(true)
    try {
      await fetch('/api/reset-contentful', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      setDeployResults(null)
      setMigrateResults(null)
    } catch (e) { console.error(e) }
    setResetting(false)
  }

  function reset() {
    setInventory(null)
    setMapping(null)
    setDeployResults(null)
    setMigrateResults(null)
    setShopifyStatus('idle')
    setContentfulStatus('idle')
    setAnalyzeStep(0)
  }

  const selectedSource = SOURCE_SYSTEMS.find(s => s.id === sourceSystem)

  if (!mounted) return null

  const inputStyle = {
    width: '100%', background: '#080b12', border: '1px solid #1e293b',
    borderRadius: 6, padding: '8px 12px', color: '#e2e8f0',
    fontFamily: 'JetBrains Mono, monospace', fontSize: 12, outline: 'none'
  }

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
        @keyframes countUp { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
        .fade-up { animation: fadeUp 0.5s ease both; }
        .count-up { animation: countUp 0.4s cubic-bezier(0.34,1.56,0.64,1) both; }
        input:focus { border-color: #6366f1 !important; }
        .dropdown-item:hover { background: #1e293b; }
      `}</style>

      {/* Sticky Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: '#080b12', borderBottom: '1px solid #1e293b', paddingBottom: 16 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ background: '#6366f1', borderRadius: 4, padding: '3px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#fff' }}>Beta</div>
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, background: 'linear-gradient(135deg, #fff 0%, #94a3b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                CMS Migration Intelligence
              </h1>
              <p style={{ color: '#475569', fontSize: 12, marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }}>
                // {selectedSource?.label} → Contentful · AI-powered
              </p>
            </div>
          </div>

          {/* Pipeline Status */}
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
                        color: status === 'done' ? '#22c55e' : status === 'active' ? '#fff' : '#475569',
                        border: status === 'active' ? '2px solid #6366f1' : '2px solid transparent',
                        boxShadow: status === 'active' ? '0 0 12px rgba(99,102,241,0.5)' : 'none',
                        transition: 'all 0.3s',
                        ...(status === 'active' ? { animation: 'pulse 2s ease infinite' } : {})
                      }}>
                        {status === 'done' ? '✓' : i + 1}
                      </div>
                      <div style={{
                        fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
                        color: status === 'done' ? '#22c55e' : status === 'active' ? '#a5b4fc' : '#334155',
                        whiteSpace: 'nowrap', transition: 'color 0.3s'
                      }}>{step.label}</div>
                    </div>
                    {i < PIPELINE_STEPS.length - 1 && (
                      <div style={{
                        flex: 1, height: 2, margin: '0 6px', marginBottom: 16,
                        background: getStepStatus(PIPELINE_STEPS[i + 1].id) === 'pending' ? '#1e293b' : '#166534',
                        transition: 'background 0.5s'
                      }} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 48px' }}>

        {/* Connection Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div className="fade-up" style={{ background: '#0f1623', border: `1px solid ${shopifyStatus === 'connected' ? '#166534' : shopifyStatus === 'error' ? '#7f1d1d' : '#1e293b'}`, borderRadius: 14, padding: 24, animationDelay: '0.2s', transition: 'border-color 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Quellsystem</div>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: shopifyStatus === 'connected' ? '#22c55e' : shopifyStatus === 'error' ? '#ef4444' : shopifyStatus === 'loading' ? '#f59e0b' : '#334155', boxShadow: shopifyStatus === 'connected' ? '0 0 8px #22c55e' : 'none', ...(shopifyStatus === 'loading' ? { animation: 'pulse 1s infinite' } : {}) }} />
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
                    <div key={sys.id} className="dropdown-item" onClick={() => { if (sys.available) { setSourceSystem(sys.id); setSourceDropdownOpen(false) } }} style={{ padding: '10px 14px', cursor: sys.available ? 'pointer' : 'not-allowed', dis
