export const runtime = 'nodejs'

export async function POST() {
  try {
    const spaceId = process.env.CONTENTFUL_SPACE_ID
    const token = process.env.CONTENTFUL_MANAGEMENT_TOKEN

    const res = await fetch(
      `https://api.contentful.com/spaces/${spaceId}/environments/master/content_types?limit=200`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await res.json()
    return Response.json({ ok: true, items: data.items || [] })
  } catch (e) {
    return Response.json({ ok: false, error: e.message })
  }
}
