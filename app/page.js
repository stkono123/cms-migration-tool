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

  async function testShopify() {
    setShopifyStatus('loading')
    try {
      const res = await fetch('/api/shopify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: shopifyDomain,
          token: shopifyToken,
          endpoint: 'shop.json'
        })
      })
      const data = await res.json()
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
        body: JSON.stringify({
          spaceId: contentfulSpace,
          token: contentfulToken,
          endpoint: ''
        })
      })
      const data = await res.json()
      if (data.name) setContentfulStatus('connected')
      else setContentfulStatus('error')
    } catch {
      setContentfulStatus('error')
    }
  }

  async function shopifyFetch(endpoint) {
    const res = await fetch('/api/shopify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domain: shopifyDomain,
        token: shopifyToken,
        endpoint
      })
    })
    return res.json()
  }

  async function analyze() {
    setAnalyzing(true)
    try {
      const [pages, blogs, products, metafields, themes] = await Promise.all([
        shopifyFetch('pages.json?limit=250'),
        shopifyFetch('blogs.json'),
        shopifyFetch('products/count.json'),
        shopifyFetch('metafields.json'),
        shopifyFetch('themes.json'),
      ])
      setInventory({
        pages: pages.pages || [],
        blogs: blogs.blogs || [],
        productCount: products.count || 0,
        metafields: metafields.metafields || [],
        themes: themes.themes || []
      })
    } catch (e) {
      console.error(e)
    }
    setAnalyzing(false)
  }

  const bothConnected = shopifyStatus === 'connected' && contentfulStatus === 'connected'

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    marginBottom: 8,
    borderRadius: 6,
    border: '1px solid #ddd',
    fontSize: 14
  }

  const btnStyle = {
    background: '#000',
    color: '#fff',
    padding: '8px 16px',
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    fontSize: 14
  }

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: 40, fontFamily: 'sans-serif' }}>
      <h1 style={{ marginBottom: 4 }}>CMS Migration Tool</h1>
      <p style={{ color: '#666', marginBottom: 32 }}>Shopify → Contentful · AI-powered</p>

      <div style={{ background: '#f5f5f5', borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h2 style={{ marginBottom: 16 }}>🛍️ Shopify</h2>
        <input
          style={inputStyle}
          placeholder="mein-shop.myshopify.com"
          value={shopifyDomain}
          onChange={e => setShopifyDomain(e.target.value)}
        />
        <input
          style={inputStyle}
          type="password"
          placeholder="shpat_xxx"
          value={shopifyToken}
          onChange={e => setShopifyToken(e.target.value)}
        />
        <button style={btnStyle} onClick={testShopify}>
          {shopifyStatus === 'loading' ? 'Verbinde...' : shopifyStatus === 'connected' ? '✓ Verbunden' : 'Verbindung testen'}
        </button>
      </div>

      <div style={{ background: '#f5f5f5', borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h2 style={{ marginBottom: 16 }}>📦 Contentful</h2>
        <input
          style={inputStyle}
          placeholder="Space ID"
          value={contentfulSpace}
          onChange={e => setContentfulSpace(e.target.value)}
        />
        <input
          style={inputStyle}
          type="password"
          placeholder="CFPAT-xxx"
          value={contentfulToken}
          onChange={e => setContentfulToken(e.target.value)}
        />
        <button style={btnStyle} onClick={testContentful}>
          {contentfulStatus === 'loading' ? 'Verbinde...' : contentfulStatus === 'connected' ? '✓ Verbunden' : 'Verbindung testen'}
        </button>
      </div>

      {bothConnected && (
        <button
          onClick={analyze}
          disabled={analyzing}
          style={{
            width: '100%',
            background: '#16a34a',
            color: '#fff',
            padding: '14px 24px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 24
          }}
        >
          {analyzing ? 'Analysiere...' : '🔍 Inventar analysieren'}
        </button>
      )}

      {inventory && (
        <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 24 }}>
          <h2 style={{ marginBottom: 16 }}>📊 Shopify Inventar</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Produkte', value: inventory.productCount },
              { label: 'Pages', value: inventory.pages.length },
              { label: 'Blogs', value: inventory.blogs.length },
              { label: 'Metafields', value: inventory.metafields.length },
              { label: 'Themes', value: inventory.themes.length },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#16a34a' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {inventory.pages.length > 0 && (
            <p><strong>Pages:</strong> {inventory.pages.map(p => p.title).join(', ')}</p>
          )}
          {inventory.blogs.length > 0 && (
            <p style={{ marginTop: 8 }}><strong>Blogs:</strong> {inventory.blogs.map(b => b.title).join(', ')}</p>
          )}
          {inventory.metafields.length > 0 && (
            <p style={{ marginTop: 8 }}><strong>Metafields:</strong> {inventory.metafields.map(m => `${m.namespace}.${m.key}`).join(', ')}</p>
          )}
        </div>
      )}
    </main>
  )
}
