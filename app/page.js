'use client'

import { useState } from 'react'

export default function Home() {
  const [shopifyDomain, setShopifyDomain] = useState('')
  const [shopifyToken, setShopifyToken] = useState('')
  const [contentfulSpace, setContentfulSpace] = useState('')
  const [contentfulToken, setContentfulToken] = useState('')
  const [shopifyStatus, setShopifyStatus] = useState('idle')
  const [contentfulStatus, setContentfulStatus] = useState('idle')
  const [inventory, setInventory] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)

  async function shopifyQuery(query) {
    const res = await fetch('/api/shopify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: shopifyDomain, token: shopifyToken, query })
    })
    return res.json()
  }

  async function testShopify() {
    setShopifyStatus('loading')
    try {
      const data = await shopifyQuery(`{ shop { name } }`)
      if (data.data?.shop?.name) setShopifyStatus('connected')
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
        body: JSON.stringify({ spaceId: contentfulSpace, token: contentfulToken, endpoint: '' })
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
    try {
      const data = await shopifyQuery(`{
        shop { name }
        products(first: 10) { edges { node { id title } } }
        pages(first: 50) { edges { node { id title body } } }
        blogs(first: 20) { edges { node { id title articles(first: 5) { edges { node { id title } } } } } }
        metaobjectDefinitions(first: 20) { edges { node { name fieldDefinitions { name type { name } } } } }
      }`)

      const shop = data.data?.shop
      const products = data.data?.products?.edges || []
      const pages = data.data?.pages?.edges || []
      const blogs = data.data?.blogs?.edges || []
      const metaobjects = data.data?.metaobjectDefinitions?.edges || []

      setInventory({ shop, products, pages, blogs, metaobjects })
    } catch (e) {
      console.error(e)
    }
    setAnalyzing(false)
  }

  const bothConnected = shopifyStatus === 'connected' && contentfulStatus === 'connected'

  const inputStyle = {
    width: '100%', padding: '8px 12px', marginBottom: 8,
    borderRadius: 6, border: '1px solid #ddd', fontSize: 14
  }

  const btnStyle = {
    background: '#000', color: '#fff', padding: '8px 16px',
    borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 14
  }

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: 40, fontFamily: 'sans-serif' }}>
      <h1 style={{ marginBottom: 4 }}>CMS Migration Tool</h1>
      <p style={{ color: '#666', marginBottom: 32 }}>Shopify → Contentful · AI-powered</p>

      <div style={{ background: '#f5f5f5', borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h2 style={{ marginBottom: 16 }}>🛍️ Shopify</h2>
        <input style={inputStyle} placeholder="mein-shop.myshopify.com" value={shopifyDomain} onChange={e => setShopifyDomain(e.target.value)} />
        <input style={inputStyle} type="password" placeholder="Storefront Access Token" value={shopifyToken} onChange={e => setShopifyToken(e.target.value)} />
        <button style={{ ...btnStyle, background: shopifyStatus === 'connected' ? '#16a34a' : '#000' }} onClick={testShopify}>
          {shopifyStatus === 'loading' ? 'Verbinde...' : shopifyStatus === 'connected' ? '✓ Verbunden' : 'Verbindung testen'}
        </button>
        {shopifyStatus === 'error' && <p style={{ color: 'red', marginTop: 8, fontSize: 13 }}>Verbindung fehlgeschlagen. Token oder Domain prüfen.</p>}
      </div>

      <div style={{ background: '#f5f5f5', borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h2 style={{ marginBottom: 16 }}>📦 Contentful</h2>
        <input style={inputStyle} placeholder="Space ID" value={contentfulSpace} onChange={e => setContentfulSpace(e.target.value)} />
        <input style={inputStyle} type="password" placeholder="CFPAT-xxx" value={contentfulToken} onChange={e => setContentfulToken(e.target.value)} />
        <button style={{ ...btnStyle, background: contentfulStatus === 'connected' ? '#16a34a' : '#000' }} onClick={testContentful}>
          {contentfulStatus === 'loading' ? 'Verbinde...' : contentfulStatus === 'connected' ? '✓ Verbunden' : 'Verbindung testen'}
        </button>
        {contentfulStatus === 'error' && <p style={{ color: 'red', marginTop: 8, fontSize: 13 }}>Verbindung fehlgeschlagen. Space ID oder Token prüfen.</p>}
      </div>

      {bothConnected && (
        <button onClick={analyze} disabled={analyzing} style={{ width: '100%', background: '#16a34a', color: '#fff', padding: '14px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 600, marginBottom: 24 }}>
          {analyzing ? 'Analysiere...' : '🔍 Inventar analysieren'}
        </button>
      )}

      {inventory && (
        <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 24 }}>
          <h2 style={{ marginBottom: 16 }}>📊 {inventory.shop?.name} – Inventar</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Produkte', value: inventory.products.length + '+' },
              { label: 'Pages', value: inventory.pages.length },
              { label: 'Blogs', value: inventory.blogs.length },
              { label: 'Metaobjekte', value: inventory.metaobjects.length },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#16a34a' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {inventory.pages.length > 0 && (
            <p><strong>Pages:</strong> {inventory.pages.map(p => p.node.title).join(', ')}</p>
          )}
          {inventory.blogs.length > 0 && (
            <p style={{ marginTop: 8 }}><strong>Blogs:</strong> {inventory.blogs.map(b => b.node.title).join(', ')}</p>
          )}
          {inventory.metaobjects.length > 0 && (
            <p style={{ marginTop: 8 }}><strong>Metaobjekte:</strong> {inventory.metaobjects.map(m => m.node.name).join(', ')}</p>
          )}
        </div>
      )}
    </main>
  )
}
