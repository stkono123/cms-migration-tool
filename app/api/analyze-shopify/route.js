// Shopify-spezifische Analyse-Route
// Die gesamte Shopify-Logik liegt in lib/adapters/shopify/analyze.js
// Für andere Quellsysteme: analyze-{system}/route.js + lib/adapters/{system}/analyze.js anlegen

export const runtime = 'edge'

import { analyzeShopify } from '../../../lib/adapters/shopify/analyze.js'

export async function POST() {
  try {
    const inventory = await analyzeShopify()
    return Response.json(inventory)
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
