// Migrates HTML pages into the D2C content model in Contentful.
// Creates a linked entry chain per page:
//   headlineBlock → editorialText → sectionText → seo → contentPage
//
// Accepts: POST { pages: Array<{ path, title, h1, body, metaDescription, slug }>, locale? }
// Returns: { results, summary }

export const runtime = 'nodejs'
export const maxDuration = 60

// ── Helpers ─────────────────────────────────────────────────────────

function buildRichTextDoc(text) {
  const content = (text || '').split(/\n\n+/).map(p => p.trim()).filter(Boolean)
  const paragraphs = (content.length ? content : [text || '']).map(p => ({
    nodeType: 'paragraph',
    data: {},
    content: [{ nodeType: 'text', value: p.slice(0, 2000), marks: [], data: {} }],
  }))
  return { nodeType: 'document', data: {}, content: paragraphs }
}

function deriveSlug(path) {
  // Strip leading crawler path prefix up to the domain
  let slug = path
    .replace(/^.*?www\.[^/]+/, '') // remove everything up to and including the domain
    .replace(/\/index\.html?$/i, '') // /index.html → ''
    .replace(/\.html?$/i, '')        // page.html → page
    .toLowerCase()
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 's')
    .replace(/[^a-z0-9/]/g, '-')
    .replace(/-+/g, '-')
    .replace(/\/$/, '')

  if (!slug.startsWith('/')) slug = '/' + slug
  // Ensure it matches ^\/[a-z0-9\-\/]+$ — must have at least one char after /
  if (!/^\/[a-z0-9\-\/]+$/.test(slug)) {
    slug = slug.replace(/[^a-z0-9\-\/]/g, '-').replace(/-+/g, '-')
  }
  // Fallback for truly empty slugs
  if (slug === '/') slug = '/page'
  return slug
}

async function cfPost(baseUrl, token, contentTypeId, fields) {
  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/vnd.contentful.management.v1+json',
      'X-Contentful-Content-Type': contentTypeId,
    },
    body: JSON.stringify({ fields }),
  })
  const data = await res.json()
  if (!res.ok) {
    const msg = data.message || (data.details?.errors?.[0]?.details) || JSON.stringify(data.details) || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return data
}

// ── Route ───────────────────────────────────────────────────────────

export async function POST(request) {
  try {
    const { pages, locale: reqLocale } = await request.json()

    if (!pages || pages.length === 0) {
      return Response.json({ error: 'Keine Seiten übergeben' }, { status: 400 })
    }

    const spaceId = process.env.CONTENTFUL_SPACE_ID
    const token = process.env.CONTENTFUL_CMA_TOKEN
    const environment = process.env.CONTENTFUL_ENVIRONMENT || 'master'
    const baseUrl = `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/entries`

    // Resolve default locale once
    const localeRes = await fetch(
      `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/locales`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const localeData = await localeRes.json()
    const locale = reqLocale || (localeData.items || []).find(l => l.default)?.code || 'de-DE'

    const results = []

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]
      const rawTitle = (page.title || page.path?.replace(/.*\//, '').replace(/\.html?$/, '') || `Seite ${i + 1}`).trim()
      const safeTitle = rawTitle.slice(0, 250)
      const h1Text = (page.h1 || safeTitle).slice(0, 250)
      const bodyText = (page.body || '').slice(0, 10000)
      const metaDesc = (page.metaDescription || '').slice(0, 500)
      const slug = page.slug ? page.slug : deriveSlug(page.path || '')

      // Make internalName unique by appending the slug
      const internalName = `${safeTitle} | ${slug}`.slice(0, 255)

      try {
        // 1. headlineBlock
        const hbEntry = await cfPost(baseUrl, token, 'headlineBlock', {
          internalName: { [locale]: `[HB] ${internalName}` },
          headline: { [locale]: buildRichTextDoc(h1Text) },
        })
        const hbId = hbEntry.sys.id

        // 2. editorialText
        const etEntry = await cfPost(baseUrl, token, 'editorialText', {
          internalName: { [locale]: `[ET] ${internalName}` },
          text: { [locale]: buildRichTextDoc(bodyText || ' ') },
        })
        const etId = etEntry.sys.id

        // 3. sectionText (headline + text + required enum fields)
        const stEntry = await cfPost(baseUrl, token, 'sectionText', {
          internalName: { [locale]: `[ST] ${internalName}` },
          headline: { [locale]: { sys: { type: 'Link', linkType: 'Entry', id: hbId } } },
          text: { [locale]: { sys: { type: 'Link', linkType: 'Entry', id: etId } } },
          textVariant: { [locale]: 'normal' },
          columnWidth: { [locale]: 12 },
          textColumns: { [locale]: 1 },
        })
        const stId = stEntry.sys.id

        // 4. seo
        const seoEntry = await cfPost(baseUrl, token, 'seo', {
          internalName: { [locale]: `[SEO] ${internalName}` },
          title: { [locale]: safeTitle },
          description: { [locale]: metaDesc },
          hideFromSearchEnginesNoindex: { [locale]: false },
          excludeLinksFromRankingsNofollow: { [locale]: false },
        })
        const seoId = seoEntry.sys.id

        // 5. contentPage
        await cfPost(baseUrl, token, 'contentPage', {
          internalName: { [locale]: internalName },
          slug: { [locale]: slug },
          title: { [locale]: safeTitle },
          pageType: { [locale]: 'family' },
          sections: { [locale]: [{ sys: { type: 'Link', linkType: 'Entry', id: stId } }] },
          seoMetadata: { [locale]: { sys: { type: 'Link', linkType: 'Entry', id: seoId } } },
        })

        results.push({ status: 'success', title: safeTitle, slug })
      } catch (e) {
        results.push({ status: 'error', title: safeTitle, slug, error: e.message })
      }
    }

    return Response.json({
      results,
      summary: {
        total: pages.length,
        success: results.filter(r => r.status === 'success').length,
        errors: results.filter(r => r.status === 'error').length,
      },
    })
  } catch (e) {
    console.error('migrate-html-zip-d2c:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
