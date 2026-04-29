'use client'

import { useState, useEffect } from 'react'

export default function Home() {
  const [shopifyStatus, setShopifyStatus] = useState('idle')
  const [contentfulStatus, setContentfulStatus] = useState('idle')
  const [inventory, setInventory] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeStep, setAnalyzeStep] = useState(0)
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

  function reset() {
    setInventory(null)
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
        .pulse { animation: pulse 1.5s ease infinite; }
        .spin { animation: spin 0.8s linear infinite; }
        .count-up { animation: countUp 0.4s cubic-bezier(0.34,1.56,0.64,1) both; }
      `}</style>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>

        <div className="fade-up" style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ background: '#6366f1', borderRadius: 4, padding: '3px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#fff' }}>Beta</div>
          </div>
          <h1 style={{ fontSize: 42, fo
