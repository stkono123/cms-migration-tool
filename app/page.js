'use client'

import { useState, useEffect } from 'react'

export default function Home() {
  const [shopifyStatus, setShopifyStatus] = useState('idle')
  const [contentfulStatus, setContentfulStatus] = useState('idle')
  const [inventory, setInventory] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeStep, setAnalyzeStep] = useState(0)
  const [mapping, setMapping] = useState(null)
  const [mappingLoading, setMappingLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const steps = [
    '🔍 Verbinde mit Shopify...',
    '📦 Lade Produkte...',
    '📄 Analysiere Pages & Blogs...',
    '🔧 Erkenne Metafeld-Strukturen...',
    '🎨 Untersuche Theme & Sections...',
    '🤖 KI bereitet Content Mapping vor...',
  ]

  async function shopifyFetch(endpoint) {
    const res = await fetch('/api/shopify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint })
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
      const res = await fetch('/api/contentful', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: '' })
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
      const prompt = `Du bist ein CMS-Migrationsexperte. Analysiere diese Shopify-Struktur und schlage ein optimales Contentful Content Model vor.

SHOPIFY INVENTAR:
- Shop: ${inventory.shopName}
- Produkte: ${inventory.productCount}
- Pages (${inventory.pages.length}): ${inventory.pages.map(p => p.title).join(', ')}
- Blogs (${inventory.blogs.length}): ${inventory.blogs.map(b => b.title).join(', ')}
- Metafields (${inventory.metafields.length}): ${inventory.metafields.slice(0, 20).map(m => `${m.namespace}.${m.key} (${m.type || m.value_type || 'string'})`).join(', ')}

Erstelle ein JSON mit folgendem Format:
{
  "summary": "Kurze Zusammenfassung der Migration in 2-3 Sätzen auf Deutsch",
  "contentTypes": [
    {
      "id": "eindeutige_id",
      "name": "Content Type Name",
      "description": "Wofür dieser Content Type gedacht ist",
      "sourceType": "Woher die Daten kommen",
      "fields": [
        { "id": "field_id", "name": "Feldname", "type": "Symbol|Text|RichText|Integer|Boolean|Date|Asset|Link", "required": true }
      ],
      "estimatedEntries": 0
    }
  ],
  "migrationSteps": ["Schritt 1", "Schritt 2"]
}

Antworte NUR mit dem JSON, ohne Markdown-Backticks oder anderen Text.`

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }]
        })
      })

      const data = await response.json()
      const text = data.content[0].text
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
      setMapping(parsed)
    } catch (e) {
      console.error(e)
    }
    setMappingLoading(false)
  }

  function reset() {
    setInventory(null)
    setMapping(null)
    setShopifyStatus('idle')
    setContentfulStatus('idle')
    setAnalyzeStep(0)
  }

  const bothConnected = shopifyStatus === 'connected' && contentfulStatus === 'connected'

  if (!mounted) return null

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
            // Shopify → Contentful · AI-powered
          </p>
        </div>

        <div className="fade-up" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32, animationDelay: '0.1s' }}>
          {['Connect', 'Analyse', 'AI Mapping', 'Migrate'].map((s, i) => {
            const active = i === 0 || (i === 1 && inventory) || (i === 2 && mapping)
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  color: active ? '#6366f1' : '#334155',
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase'
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', border: `1.5px solid ${active ? '#6366f1' : '#334155'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10,
                    background: active ? '#6366f1' : 'transparent', color: active ? '#fff' : '#334155'
                  }}>{i + 1}</div>
                  {s}
                </div>
                {i < 3 && <div style={{ width: 32, height: 1, background: '#1e293b' }} />}
              </div>
            )
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {[
            { key: 'shopify', label: 'Shopify', sub: 'Quellsystem', icon: '🛍️', status: shopifyStatus, action: testShopify },
            { key: 'contentful', label: 'Contentful', sub: 'Zielsystem', icon: '📦', status: contentfulStatus, action: testContentful },
          ].map((sys, i) => (
            <div key={sys.key} className="fade-up" style={{
              background: '#0f1623', border: `1px solid ${sys.status === 'connected' ? '#166534' : sys.status === 'error' ? '#7f1d1d' : '#1e293b'}`,
              borderRadius: 14, padding: 24, animationDelay: `${0.2 + i * 0.1}s`, transition: 'border-color 0.3s',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{sys.sub}</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{sys.icon} {sys.label}</div>
                </div>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%', marginTop: 4,
                  background: sys.status === 'connected' ? '#22c55e' : sys.status === 'error' ? '#ef4444' : sys.status === 'loading' ? '#f59e0b' : '#334155',
                  boxShadow: sys.status === 'connected' ? '0 0 8px #22c55e' : 'none',
                  ...(sys.status === 'loading' ? { animation: 'pulse 1s infinite' } : {})
                }} />
              </div>
              <button onClick={sys.action} style={{
                width: '100%', padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif',
                background: sys.status === 'connected' ? 'rgba(34,197,94,0.15)' : sys.status === 'error' ? 'rgba(239,68,68,0.15)' : '#1e293b',
                color: sys.status === 'connected' ? '#22c55e' : sys.status === 'error' ? '#ef4444' : '#94a3b8',
                transition: 'all 0.2s',
              }}>
                {sys.status === 'loading' ? '⏳ Verbinde...' : sys.status === 'connected' ? '✓ Verbunden' : sys.status === 'error' ? '✗ Fehler – Erneut versuchen' : 'Verbindung testen'}
              </button>
            </div>
          ))}
        </div>

        {bothConnected && !inventory && !analyzing && (
          <div className="fade-up" style={{ animationDelay: '0.1s' }}>
            <button onClick={analyze} style={{
              width: '100%', padding: '18px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
              fontSize: 16, fontWeight: 700, fontFamily: 'Inter, sans-serif',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: '#fff', marginBottom: 20, animation: 'glow 2s ease infinite',
            }}>
              🔍 Shopify Inventar analysieren
            </button>
          </div>
        )}

        {analyzing && (
          <div className="fade-up" style={{
            background: '#0f1623', border: '1px solid #1e293b', borderRadius: 14, padding: 32, marginBottom: 20, textAlign: 'center'
          }}>
            <div style={{ width: 40, height: 40, border: '3px solid #1e293b', borderTopColor: '#6366f1', borderRadius: '50%', margin: '0 auto 24px', animation: 'spin 0.8s linear infinite' }} />
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: '#6366f1', marginBottom: 24 }}>
              {steps[analyzeStep]}
            </div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
              {steps.map((_, i) => (
                <div key={i} style={{
                  width: i <= analyzeStep ? 24 : 8, height: 4, borderRadius: 2,
                  background: i <= analyzeStep ? '#6366f1' : '#1e293b',
                  transition: 'all 0.3s ease'
                }} />
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
                  <h2 style={{ fontSize: 20, fontWeight: 700 }}>📊 {inventory.shopName}</h2>
                </div>
                <button onClick={reset} style={{
                  padding: '8px 14px', borderRadius: 8, border: '1px solid #1e293b', background: 'transparent',
                  color: '#475569', cursor: 'pointer', fontSize: 12, fontWeight: 600
                }}>↺ Reset</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                {[
                  { label: 'Produkte', value: inventory.productCount, icon: '📦', delay: '0s' },
                  { label: 'Pages', value: inventory.pages.length, icon: '📄', delay: '0.1s' },
                  { label: 'Blogs', value: inventory.blogs.length, icon: '✍️', delay: '0.2s' },
                  { label: 'Metafields', value: inventory.metafields.length, icon: '🔧', delay: '0.3s' },
                ].map(s => (
                  <div key={s.label} className="count-up" style={{
                    background: '#080b12', border: '1px solid #166534', borderRadius: 10, padding: 16, textAlign: 'center',
                    animationDelay: s.delay
                  }}>
                    <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: '#22c55e', fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {inventory.pages.length > 0 && (
                <div style={{ marginBottom: 10, fontSize: 13 }}>
                  <span style={{ color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>pages: </span>
                  {inventory.pages.map(p => (
                    <span key={p.id} style={{ background: '#1e293b', borderRadius: 4, padding: '2px 8px', fontSize: 12, marginRight: 6, marginBottom: 4, display: 'inline-block' }}>{p.title}</span>
                  ))}
                </div>
              )}
              {inventory.blogs.length > 0 && (
                <div style={{ marginBottom: 10, fontSize: 13 }}>
                  <span style={{ color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>blogs: </span>
                  {inventory.blogs.map(b => (
                    <span key={b.id} style={{ background: '#1e293b', borderRadius: 4, padding: '2px 8px', fontSize: 12, marginRight: 6 }}>{b.title}</span>
                  ))}
                </div>
              )}
              {inventory.metafields.length > 0 && (
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>metafields: </span>
                  {inventory.metafields.slice(0, 10).map(m => (
                    <span key={`${m.namespace}.${m.key}`} style={{ background: '#1e293b', borderRadius: 4, padding: '2px 8px', fontSize: 12, marginRight: 6, marginBottom: 4, display: 'inline-block' }}>{m.namespace}.{m.key}</span>
                  ))}
                  {inventory.metafields.length > 10 && <span style={{ color: '#475569', fontSize: 12 }}>+{inventory.metafields.length - 10} weitere</span>}
                </div>
              )}
            </div>

            <button onClick={startMapping} disabled={mappingLoading} style={{
              width: '100%', padding: '18px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
              fontSize: 16, fontWeight: 700, fontFamily: 'Inter, sans-serif',
              background: mappingLoading ? '#1e293b' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: mappingLoading ? '#475569' : '#fff',
            }}>
              {mappingLoading ? '🤖 KI analysiert...' : '🤖 KI Content Mapping starten →'}
            </button>
          </div>
        )}

        {mapping && (
          <div className="fade-up" style={{ marginTop: 16 }}>
            <div style={{ background: '#0f1623', border: '1px solid #312e81', borderRadius: 14, padding: 28, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#475569', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>// KI Content Mapping</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: '#a5b4fc' }}>🤖 Content Model Vorschlag</h2>
              
              <div style={{ background: '#080b12', borderRadius: 10, padding: 16, marginBottom: 24, borderLeft: '3px solid #6366f1' }}>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: '#94a3b8' }}>{mapping.summary}</p>
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Content Types</div>
                <div style={{ display: 'grid', gap: 12 }}>
                  {mapping.contentTypes?.map((ct, i) => (
                    <div key={ct.id} className="fade-up" style={{
                      background: '#080b12', border: '1px solid #1e293b', borderRadius: 10, padding: 16,
                      animationDelay: `${i * 0.1}s`
                    }}>
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
                          <span key={f.id} style={{
                            background: '#1e293b', borderRadius: 4, padding: '3px 8px', fontSize: 11,
                            color: f.required ? '#a5b4fc' : '#64748b',
                            border: f.required ? '1px solid #312e81' : '1px solid transparent'
                          }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button onClick={reset} style={{
                padding: '14px 24px', borderRadius: 12, border: '1px solid #1e293b', background: 'transparent',
                color: '#475569', cursor: 'pointer', fontSize: 14, fontWeight: 600
              }}>↺ Von vorne</button>
              <button style={{
                padding: '14px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 700, fontFamily: 'Inter, sans-serif',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff',
              }}
                onClick={() => alert('Schritt 4: Content Migration – coming soon!')}>
                🚀 Content Model in Contentful anlegen →
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
