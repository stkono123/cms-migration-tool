// Shopify-spezifische Analyse-Route
// Die gesamte Shopify-Logik liegt in lib/adapters/shopify/analyze.js
// Für andere Quellsysteme: analyze-{system}/route.js + lib/adapters/{system}/analyze.js anlegen

export const runtime = 'edge'
import { analyzeShopify } from '../../../lib/adapters/shopify/analyze.js'
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const domain = body.domain || null
    const token = body.token || null
    if (!domain || !token) {
      return Response.json({ error: 'Domain und Token erforderlich' }, { status: 400 })
    }
    const inventory = await analyzeShopify(domain, token)
    return Response.json(inventory)
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
