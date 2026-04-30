export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const { pages } = await request.json()

    const spaceId = process.env.CONTENTFUL_SPACE_ID
    const token = process.env.CONTENTFUL_CMA_TOKEN
    const environment = 'master'

    const results = []

    for (const page of pages) {
      try {
        const res = await fetch(
          `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/entries`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/vnd.contentful.management.v1+json',
              'X-Contentful-Content-Type': 'staticPage'
            },
            body: JSON.stringify({
              fields: {
                title: { 'en-US': page.title },
                slug: { 'en-US': page.handle || page.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') },
                content: { 'en-US': { nodeType: 'document', data: {}, content: [{ nodeType: 'paragraph', data: {}, content: [{ nodeType: 'text', value: page.body_html ? page.body_html.replace(/<[^>]*>/g, '') : '', marks: [], data: {} }] }] } },
                seoTitle: { 'en-US': page.title },
                noindex: { 'en-US': false }
              }
            })
          }
        )

        const data = await res.json()

        if (res.ok) {
          results.push({ title: page.title, status: 'success' })
        } else {
          results.push({ title: page.title, status: 'error', error: data.message || data.details || 'Unbekannter Fehler' })
        }
      } catch (e) {
        results.push({ title: page.title, status: 'error', error: e.message })
      }
    }

    return Response.json({ results })

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
