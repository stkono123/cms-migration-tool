export const runtime = 'edge'

export async function POST(request) {
  try {
    const { endpoint, method, body } = await request.json()

    const spaceId = process.env.CONTENTFUL_SPACE_ID
    const token = process.env.CONTENTFUL_CMA_TOKEN

    const res = await fetch(`https://api.contentful.com/spaces/${spaceId}${endpoint}`, {
      method: method || 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    })

    const data = await res.json()
    return Response.json(data, { status: res.status })

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
