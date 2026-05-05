// Contentful-spezifische Verbindungstest-Route
// Prüft ob die Contentful-Credentials gültig sind und der Space erreichbar ist
// Für andere Zielsysteme: test-{system}/route.js anlegen

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const spaceId = process.env.CONTENTFUL_SPACE_ID
    const token = process.env.CONTENTFUL_CMA_TOKEN

    if (!spaceId || !token) {
      return Response.json({ ok: false, error: 'CONTENTFUL_SPACE_ID oder CONTENTFUL_CMA_TOKEN fehlen in den Environment Variables.' }, { status: 400 })
    }

    const res = await fetch(`https://api.contentful.com/spaces/${spaceId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    const data = await res.json()

    if (!res.ok) {
      return Response.json({ ok: false, error: 'Space nicht gefunden', details: data }, { status: 404 })
    }

    return Response.json({ ok: true, name: data.name, spaceId: data.sys.id })

  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 })
  }
}
