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
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

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
    } catch {
      setShopifyStatus('error')
    }
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
    } catch {
      setContentfulStatus('error')
    }
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
    } catch (e) {
      console.error(e)
    }
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
    } catch (e) {
      console.error(e)
    }
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
    } catch (e) {
      console.error(e)
    }
    setMigrating(false)
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

  const bothConnected = shopifyStatus === 'connected' && contentfulStatus === 'connected'
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

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>

        <div className="fade-up" style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ background: '#6366f1', borderRadius: 4, padding: '3px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#fff' }}>Beta</div>
          </div>
          <h1 style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, background: 'linear-gradient(135deg, #fff 0%, #94a3b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            CMS Migration<br />Intelligence
          </h1>
          <p style={{ color: '#475569', fontSize: 14, marginTop: 10, fontFamily: 'JetBrains Mono, monospace' }}>
            // {selectedSource?.label} → Contentful · AI-powered
          </p>
        </div>

        <div className="fade-up" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32, animationDelay: '0.1s' }}>
          {['Connect', 'Analyse', 'AI Mapping', 'Migrate'].map((s, i) => {
            const active = i === 0 || (i === 1 && inventory) || (i === 2 && mapping) || (i === 3 && deployResults)
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: active ? '#6366f1' : '#334155', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', border: `1.5px solid ${active ? '#6366f1' : '#334155'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, background: active ? '#6366f1' : 'transparent', color: active ? '#fff' : '#334155' }}>{i + 1}</div>
                  {s}
                </div>
                {i < 3 && <div style={{ width: 32, height: 1, background: '#1e293b' }} />}
              </div>
            )
          })}
        </div>

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
              <div style={{ fontSize: 10, color: '#475569', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Domain</div>
              <input style={inputStyle} value={shopifyDomain} onChange={e => setShopifyDomain(e.target.value)} placeholder="shop.myshopify.com" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: '#475569', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Admin API Token</div>
              <input style={{ ...inputStyle }} value={shopifyTokenEditing ? shopifyTokenReal : shopifyToken} onChange={e => setShopifyTokenReal(e.target.value)} onFocus={() => { setShopifyTokenEditing(true); setShopifyTokenReal('') }} onBlur={() => { if (!shopifyTokenReal) setShopifyTokenEditing(false) }} placeholder="Token eingeben..." type={shopifyTokenEditing ? 'text' : 'password'} />
            </div>
            <button onClick={testShopify} style={{ width: '100%', padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif', background: shopifyStatus === 'connected' ? 'rgba(34,197,94,0.15)' : shopifyStatus === 'error' ? 'rgba(239,68,68,0.15)' : '#1e293b', color: shopifyStatus === 'connected' ? '#22c55e' : shopifyStatus === 'error' ? '#ef4444' : '#94a3b8', transition: 'all 0.2s' }}>
              {shopifyStatus === 'loading' ? 'Verbinde...' : shopifyStatus === 'connected' ? '✓ Verbunden' : shopifyStatus === 'error' ? '✗ Fehler – Erneut versuchen' : 'Verbindung testen'}
            </button>
          </div>

          <div className="fade-up" style={{ background: '#0f1623', border: `1px solid ${contentfulStatus === 'connected' ? '#166534' : contentfulStatus === 'error' ? '#7f1d1d' : '#1e293b'}`, borderRadius: 14, padding: 24, animationDelay: '0.3s', transition: 'border-color 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Zielsystem</div>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: contentfulStatus === 'connected' ? '#22c55e' : contentfulStatus === 'error' ? '#ef4444' : contentfulStatus === 'loading' ? '#f59e0b' : '#334155', boxShadow: contentfulStatus === 'connected' ? '0 0 8px #22c55e' : 'none', ...(contentfulStatus === 'loading' ? { animation: 'pulse 1s infinite' } : {}) }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 14px', background: '#080b12', borderRadius: 8, border: '1px solid #1e293b' }}>
              <ContentfulLogo />
              <span style={{ fontSize: 14, fontWeight: 600 }}>Contentful</span>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: '#475569', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Space ID</div>
              <input style={inputStyle} value={contentfulSpace} onChange={e => setContentfulSpace(e.target.value)} placeholder="Space ID" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: '#475569', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>CMA Token</div>
              <input style={inputStyle} value={contentfulTokenEditing ? contentfulTokenReal : contentfulToken} onChange={e => setContentfulTokenReal(e.target.value)} onFocus={() => { setContentfulTokenEditing(true); setContentfulTokenReal('') }} onBlur={() => { if (!contentfulTokenReal) setContentfulTokenEditing(false) }} placeholder="CFPAT-xxx" type={contentfulTokenEditing ? 'text' : 'password'} />
            </div>
            <button onClick={testContentful} style={{ width: '100%', padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif', background: contentfulStatus === 'connected' ? 'rgba(34,197,94,0.15)' : contentfulStatus === 'error' ? 'rgba(239,68,68,0.15)' : '#1e293b', color: contentfulStatus === 'connected' ? '#22c55e' : contentfulStatus === 'error' ? '#ef4444' : '#94a3b8', transition: 'all 0.2s' }}>
              {contentfulStatus === 'loading' ? 'Verbinde...' : contentfulStatus === 'connected' ? '✓ Verbunden' : contentfulStatus === 'error' ? '✗ Fehler – Erneut versuchen' : 'Verbindung testen'}
            </button>
          </div>
        </div>

        {bothConnected && !inventory && !analyzing && (
          <div className="fade-up" style={{ animationDelay: '0.1s' }}>
            <button onClick={analyze} style={{ width: '100%', padding: '18px 24px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, fontFamily: 'Inter, sans-serif', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff', marginBottom: 20, animation: 'glow 2s ease infinite' }}>
              Inventar analysieren
            </button>
          </div>
        )}

        {analyzing && (
          <div className="fade-up" style={{ background: '#0f1623', border: '1px solid #1e293b', borderRadius: 14, padding: 32, marginBottom: 20, textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, border: '3px solid #1e293b', borderTopColor: '#6366f1', borderRadius: '50%', margin: '0 auto 24px', animation: 'spin 0.8s linear infinite' }} />
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: '#6366f1', marginBottom: 24 }}>{steps[analyzeStep]}</div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
              {steps.map((_, i) => (
                <div key={i} style={{ width: i <= analyzeStep ? 24 : 8, height: 4, borderRadius: 2, background: i <= analyzeStep ? '#6366f1' : '#1e293b', transition: 'all 0.3s ease' }} />
              ))}
            </div>
          </div>
        )}

        {inventory && !mapping && (
          <div className="fade-up">
            <div style={{ background: '#0f1623', border: '1px solid #166534', borderRadius: 14, padding: 28, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#475569', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>// Analyse abgeschlossen</div>
                  <h2 style={{ fontSize: 20, fontWeight: 700 }}>{inventory.shopName}</h2>
                </div>
                <button onClick={reset} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #1e293b', background: 'transparent', color: '#475569', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>↺ Reset</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                {[
                  { label: 'Produkte', value: inventory.productCount, delay: '0s' },
                  { label: 'Pages', value: inventory.pages.length, delay: '0.1s' },
                  { label: 'Blogs', value: inventory.blogs.length, delay: '0.2s' },
                  { label: 'Metafields', value: inventory.metafields.length, delay: '0.3s' },
                ].map(s => (
                  <div key={s.label} className="count-up" style={{ background: '#080b12', border: '1px solid #166534', borderRadius: 10, padding: 16, textAlign: 'center', animationDelay: s.delay }}>
                    <div style={{ fontSize: 32, fontWeight: 800, color: '#22c55e', fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
                  </div>
                ))}
              </div>
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
            <button onClick={startMapping} disabled={mappingLoading} style={{ width: '100%', padding: '18px 24px', borderRadius: 12, border: 'none', cursor: mappingLoading ? 'not-allowed' : 'pointer', fontSize: 16, fontWeight: 700, fontFamily: 'Inter, sans-serif', background: mappingLoading ? '#1e293b' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: mappingLoading ? '#475569' : '#fff' }}>
              {mappingLoading ? 'KI analysiert Struktur...' : 'KI Content Mapping starten →'}
            </button>
          </div>
        )}

        {mapping && (
          <div className="fade-up" style={{ marginTop: 16 }}>
            <div style={{ background: '#0f1623', border: '1px solid #312e81', borderRadius: 14, padding: 28, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#475569', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>// KI Content Mapping</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: '#a5b4fc' }}>Content Model Vorschlag</h2>
              <div style={{ background: '#080b12', borderRadius: 10, padding: 16, marginBottom: 24, borderLeft: '3px solid #6366f1' }}>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: '#94a3b8' }}>{mapping.summary}</p>
              </div>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Content Types</div>
                <div style={{ display: 'grid', gap: 12 }}>
                  {mapping.contentTypes?.map((ct, i) => (
                    <div key={ct.id} className="fade-up" style={{ background: '#080b12', border: '1px solid #1e293b', borderRadius: 10, padding: 16, animationDelay: `${i * 0.1}s` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{ct.name}</div>
                          <div style={{ fontSize: 12, color: '#475569' }}>{ct.description}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 11, color: '#6366f1', fontFamily: 'JetBrains Mono, monospace' }}>{ct.id}</div>
                          <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>~{ct.estimatedEntries} Entries</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                        {ct.fields?.map(f => (
                          <span key={f.id} style={{ background: '#1e293b', borderRadius: 4, padding: '3px 8px', fontSize: 11, color: f.required ? '#a5b4fc' : '#64748b', border: f.required ? '1px solid #312e81' : '1px solid transparent' }}>
                            {f.name} <span style={{ color: '#475569' }}>({f.type})</span>
                          </span>
                        ))}
                      </div>
                      <div style={{ marginTop: 8, fontSize: 11, color: '#475569' }}>
                        Quelle: <span style={{ color: '#94a3b8' }}>{ct.sourceType}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {mapping.migrationSteps && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Migrations-Plan</div>
                  {mapping.migrationSteps.map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 8, alignItems: 'flex-start' }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#312e81', color: '#a5b4fc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                      <div style={{ fontSize: 13, color: '#94a3b8', paddingTop: 3 }}>{step}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {deployResults && (
              <div className="fade-up" style={{ background: '#0f1623', border: '1px solid #166534', borderRadius: 14, padding: 28, marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#475569', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>// Content Model Deployment</div>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#22c55e' }}>Content Types angelegt</h2>
                {deployResults.map(r => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1e293b', fontSize: 13 }}>
                    <span>{r.name}</span>
                    <span style={{ color: r.status === 'success' ? '#22c55e' : '#ef4444', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                      {r.status === 'success' ? '✓ angelegt' : `✗ ${r.error}`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {migrateResults && (
              <div className="fade-up" style={{ background: '#0f1623', border: '1px solid #166534', borderRadius: 14, padding: 28, marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#475569', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>// Content Migration</div>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#22c55e' }}>
                  Pages migriert: {migrateResults.filter(r => r.status === 'success').length}/{migrateResults.length}
                </h2>
                {migrateResults.map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1e293b', fontSize: 13 }}>
                    <span>{r.title}</span>
                    <span style={{ color: r.status === 'success' ? '#22c55e' : '#ef4444', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                      {r.status === 'success' ? '✓ migriert' : `✗ ${r.error}`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <button onClick={reset} style={{ padding: '14px 24px', borderRadius: 12, border: '1px solid #1e293b', background: 'transparent', color: '#475569', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>↺ Von vorne</button>
              <button onClick={deployToContentful} disabled={deploying} style={{ padding: '14px 24px', borderRadius: 12, border: 'none', cursor: deploying ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'Inter, sans-serif', background: deploying ? '#1e293b' : deployResults ? 'rgba(34,197,94,0.15)' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: deploying ? '#475569' : deployResults ? '#22c55e' : '#fff' }}>
                {deploying ? 'Wird angelegt...' : deployResults ? '✓ Model angelegt' : 'Content Model anlegen →'}
              </button>
              <button onClick={migrateContent} disabled={migrating || !deployResults} style={{ padding: '14px 24px', borderRadius: 12, border: 'none', cursor: (migrating || !deployResults) ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'Inter, sans-serif', background: migrating ? '#1e293b' : !deployResults ? '#1e293b' : migrateResults ? 'rgba(34,197,94,0.15)' : 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: (migrating || !deployResults) ? '#475569' : migrateResults ? '#22c55e' : '#fff' }}>
                {migrating ? 'Migriere...' : migrateResults ? '✓ Pages migriert' : 'Pages migrieren →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
