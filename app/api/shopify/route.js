export async function POST(request) {
  try {
    const body = await request.json()
    const { domain, token, query } = body

    if (!domain || !token || !query) {
      return Response.json({ error: 'Missing domain, token or query', body }, { status: 400 })
    }

    const url = `https://${domain}/api/2024-01/graphql.json`
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Shopify-Storefront-Access-Token': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    })

    const text = await res.text()
    
    try {
      const data = JSON.parse(text)
      return Response.json(data, { status: res.status })
    } catch {
      return Response.json({ error: 'Invalid JSON from Shopify', raw: text, status: res.status }, { status: 500 })
    }

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 })
  }
}
