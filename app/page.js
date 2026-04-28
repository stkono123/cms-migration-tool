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
        body: JSON.stringify({ domain: shopifyDomain, token: shopifyToken, endpoint: 'shop.json' })
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
      const [pages, blogs, products, metafields, themes] = await Promise.all([
        fetch('/api/shopify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: shopifyDomain, token: shopifyToken, endpoint: 'pages.json?limit=250' }) }).then(r => r.json()),
        fetch('/api/shopify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: shopifyDomain, token: shopifyToken, endpoint: 'blogs.json' }) }).then(r => r.json()),
        fetch('/api/shopify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: shopifyDomain, token: shopifyToken, endpoint: 'products/count.json' }) }).then(r => r.json()),
        fetch('/api/shopify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: shopifyDomain, token: shopifyToken, endpoint: 'metafields.json' }) }).then(r => r.json()),
        fetch('/api/shopify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: shopifyDomain, token: shopifyToken, endpoint: 'themes.json' }) }).then(r => r.json()),
      ])
      setInventory({ pages: pages.pages || [], blogs: blogs.blogs || [], productCount: products.count || 0, metafields: metafields.metafields || [], themes: themes.themes || [] })
    } catch (e) {
      console.error(e)
    }
    setAnalyzing(false)
  }

  const bothConnected = shopifyStatus === 'connected' && contentfulStatus === 'connected'

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: 40, fontFamily: 'sans-serif' }}>
      <h1>CMS Migration Tool</h1>
      <p style={{ color: '#666' }}>Shopify → Contentful · AI-powered</p>

      <div style={{ background: '#f5f5f5', borderRadius: 12, padding: 24, marginTop: 24 }}>
        <h2>Shopify</h2>
        <input placeholder="shop.myshopify.com" value={shopifyDomain} onChange={e => setShopifyDomain(e.target.value)} style={{ width: '100%', padding: 8, marginBottom: 8, borderRadius: 6, border: '1px solid #ddd' }} />
        <input type="password" placeholder="shpat_xxx" value={shopifyToken} onChange={e => setShopifyToken(e.target.value)} style={{ width: '100%', padding: 8, marginBottom: 8, borderRadius: 6, border: '1px solid #ddd' }} />
        <button onClick={testShopify} style={{ background: '#000', color: '#fff', padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer' }}>
          {shopifyStatus === 'loading' ? 'Verbinde...' : shopifyStatus === 'connected' ? '✓ Verbunden' : 'Verbindung testen'}
        </button>
      </div>

      <div style={{ background: '#f5f5f5', borderRadius: 12, padding: 24, marginTop: 16 }}>
        <h2>Contentful</h2>
        <input placeholder="Space ID" value={contentfulSpace} onChange={e => setContentfulSpace(e.target.value)} style={{ width: '100%', padding: 8, marginBottom: 8, borderRadius: 6, border: '1px solid #ddd' }} />
        <input type="password" placeholder="CFPAT-xxx" value={contentfulToken} onChange={e => setContentfulToken(e.target.value)} style={{ width: '100%', padding: 8, marginBottom: 8, borderRadius: 6, border: '1px solid #ddd' }} />
        <button onClick={testContentful} style={{ background: '#000', color: '#fff', padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer' }}>
          {contentfulStatus === 'loading' ? 'Verbinde...' : contentfulStatus === 'connected' ? '✓ Verbunden' : 'Verbindung testen'}
        </button>
      </div>

      {bothConnected && (
        <button onClick={a
