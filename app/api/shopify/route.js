export const runtime = 'edge'

export async function POST(request) {
  try {
    const { endpoint } = await request.json()

    const domain = process.env.SHOPIFY_DOMAIN
    const token = process.env.SHOPIFY_ADMIN_TOKEN

    const res = await fetch(`https://${domain}/admin/api/2024-01/${endpoint}`, {
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json'
      }
    })

    const data = await res.json()
    return Response.json(data, { status: res.status })

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
