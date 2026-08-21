// Migrates HTML pages into the D2C content model in Contentful.
// Creates a linked entry chain per page:
//   headlineBlock → editorialText → sectionText → seo → contentPage
//
// Accepts: POST { pages: Array<{ path, title, h1, eyebrow, subline, body, metaDescription,
//                                slug, canonicalUrl, keywords, zone, klasse }>, locale? }
// Returns: { results, summary }
//
// Learning notes (from 10-page Scott Sports extraction):
//   - subline     = first H2 on the page (cleaned)
//   - canonicalUrl = from <link rel="canonical">
//   - keywords    = from <meta name="keywords">, max 20, array of strings
//   - body        = H3s + remaining H2s + <p> from full cleaned HTML,
//                   boilerplate-filtered, max 20 paragraphs
//   - description = stripTags(decodeEntities×2(og:description || meta description))
//                  double-decode catches pages that store HTML-encoded tags in og:description
//   - Product/campaign pages may have empty bodies if JS-rendered

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
  let slug = path
    .replace(/^.*?www\.[^/]+/, '')  // strip domain prefix
    .replace(/^.*?\/de\/de\//, '/') // strip language prefix e.g. /de/de/
    .replace(/\/index\.html?$/i, '')
    .replace(/\.html?$/i, '')
    .toLowerCase()
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 's')
    .replace(/[^a-z0-9/]/g, '-')
    .replace(/-+/g, '-')
    .replace(/\/$/, '')

  if (!slug.startsWith('/')) slug = '/' + slug
  if (!/^\/[a-z0-9\-\/]+$/.test(slug)) {
    slug = slug.replace(/[^a-z0-9\-\/]/g, '-').replace(/-+/g, '-')
  }
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

    // Resolve locales.
    // defaultLocale = Contentful default (= 'en' in this space) — required for non-localized fields.
    // contentLocale = language of the crawled content (= 'de' for Scott Sports DE).
    // Non-localized fields (internalName, slug, pageType, link fields) use defaultLocale.
    // Localized content fields (headline, title, description, eyebrow …) use contentLocale.
    const localeRes = await fetch(
      `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/locales`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const localeData = await localeRes.json()
    const allLocales    = localeData.items || []
    const defaultLocale = allLocales.find(l => l.default)?.code || 'en'
    const contentLocale = reqLocale || 'de'

    // Build a field object with value set for ALL locales.
    // Used for required localized fields (title, seo title) where every locale
    // must have a value. Product names and page titles are language-neutral
    // enough to use the same string across locales as a migration default.
    function allLocaleField(value) {
      const field = {}
      for (const loc of allLocales) field[loc.code] = value
      return field
    }

    const results = []

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]
      const rawTitle = (page.title || page.path?.replace(/.*\//, '').replace(/\.html?$/, '') || `Seite ${i + 1}`).trim()
      const safeTitle = rawTitle.slice(0, 250)
      const h1Text    = (page.h1 || safeTitle).slice(0, 250)
      const eyebrow   = (page.eyebrow || '').slice(0, 255)   // from Punchout newSlug_1 (silo)
      const subline   = (page.subline || '').slice(0, 255)
      const bodyText  = (page.body || '').slice(0, 10000)
      const metaDesc  = (page.metaDescription || '').slice(0, 500)
      const canonicalUrl = page.canonicalUrl || ''
      const keywords  = Array.isArray(page.keywords) ? page.keywords.slice(0, 20) : []
      const slug      = page.slug ? page.slug : deriveSlug(page.path || '')
      const internalName = `${safeTitle} | ${slug}`.slice(0, 255)

      try {
        // 1. headlineBlock
        // internalName = non-localized → defaultLocale ('en')
        // headline / eyebrow / subline = localized → contentLocale ('de')
        const hbFields = {
          internalName: { [defaultLocale]: `[HB] ${internalName}` },
          headline: { [contentLocale]: buildRichTextDoc(h1Text) },
        }
        if (eyebrow) hbFields.eyebrow = { [contentLocale]: eyebrow }
        if (subline) hbFields.subline = { [contentLocale]: subline }
        const hbEntry = await cfPost(baseUrl, token, 'headlineBlock', hbFields)

        // 2. editorialText
        // internalName = non-localized → defaultLocale; text = localized → contentLocale
        const etEntry = await cfPost(baseUrl, token, 'editorialText', {
          internalName: { [defaultLocale]: `[ET] ${internalName}` },
          text: { [contentLocale]: buildRichTextDoc(bodyText || ' ') },
        })

        // 3. sectionText — all fields non-localized → defaultLocale
        // headlineVariant: 'h1' for the primary page section (page title level)
        // headlineDash: false — no decorative dash for migrated content
        const stEntry = await cfPost(baseUrl, token, 'sectionText', {
          internalName: { [defaultLocale]: `[ST] ${internalName}` },
          headline: { [defaultLocale]: { sys: { type: 'Link', linkType: 'Entry', id: hbEntry.sys.id } } },
          text: { [defaultLocale]: { sys: { type: 'Link', linkType: 'Entry', id: etEntry.sys.id } } },
          headlineVariant: { [defaultLocale]: 'h1' },
          headlineDash: { [defaultLocale]: false },
          textVariant: { [defaultLocale]: 'normal' },
          columnWidth: { [defaultLocale]: 12 },
          textColumns: { [defaultLocale]: 1 },
        })

        // 4. seo
        // internalName, noindex, nofollow = non-localized → defaultLocale
        // title, description, canonicalUrl, keywords = localized → contentLocale
        const seoFields = {
          internalName: { [defaultLocale]: `[SEO] ${internalName}` },
          title: allLocaleField(safeTitle),
          description: { [contentLocale]: metaDesc },
          hideFromSearchEnginesNoindex: { [defaultLocale]: false },
          excludeLinksFromRankingsNofollow: { [defaultLocale]: false },
        }
        if (canonicalUrl) seoFields.canonicalUrl = { [contentLocale]: canonicalUrl }
        if (keywords.length > 0) seoFields.keywords = { [contentLocale]: keywords }
        const seoEntry = await cfPost(baseUrl, token, 'seo', seoFields)

        // 5. contentPage
        // internalName, slug, pageType, sections, seoMetadata = non-localized → defaultLocale
        // title = localized → contentLocale
        await cfPost(baseUrl, token, 'contentPage', {
          internalName: { [defaultLocale]: internalName },
          slug: { [defaultLocale]: slug },
          title: allLocaleField(safeTitle),
          pageType: { [defaultLocale]: 'family' },
          sections: { [defaultLocale]: [{ sys: { type: 'Link', linkType: 'Entry', id: stEntry.sys.id } }] },
          seoMetadata: { [defaultLocale]: { sys: { type: 'Link', linkType: 'Entry', id: seoEntry.sys.id } } },
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
