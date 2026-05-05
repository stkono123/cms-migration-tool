// Shopify-spezifischer OAuth Callback
// Für andere Quellsysteme: eigene oauth-{system}/callback/route.js anlegen

export const runtime = 'edge'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const shop = searchParams.get('shop')

  if (!code || !shop) {
    return Response.json({ error: 'Missing code or shop' }, { status: 400 })
  }

  try {
    const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: 'a997371e91f61110400215d15621320b',
        client_secret: process.env.SHOPIFY_CLIENT_SECRET,
        code
      })
    })

    const data = await res.json()

    return new Response(`
      <html><body style="font-family:monospace;padding:40px;background:#080b12;color:#22c55e">
        <h2>✓ Access Token erhalten</h2>
        <p>Trage diesen Token in Vercel als SHOPIFY_ADMIN_TOKEN ein:</p>
        <code style="background:#0f1623;padding:16px;display:block;margin-top:16px;border-radius:8px;word-break:break-all">${data.access_token}</code>
      </body></html>
    `, { headers: { 'Content-Type': 'text/html' } })

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
