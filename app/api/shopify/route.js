export const runtime = 'edge'

export async function POST(request) {
  try {
    const { query } = await request.json()
    
    const domain = process.env.SHOPIFY_DOMAIN
    const token = process.env.SHOPIFY_STOREFRONT_TOKEN

    const res = await fetch(`https://${domain}/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Storefront-Access-Token': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    })

    const data = await res.json()
    return Response.json(data, { status: res.status })

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
