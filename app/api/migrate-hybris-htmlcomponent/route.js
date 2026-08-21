// Migrates Hybris WCMSHTMLComponent CSV data into the D2C content model in Contentful.
// Creates the same linked entry chain per component as the ZIP path:
//   headlineBlock → editorialText → sectionText → seo → contentPage
//
// Accepts: POST {
//   pages: Array<{
//     uid:  string,              // Hybris component UID (e.g. "silence-content")
//     name: string,              // Hybris component name
//     slug: string | null,       // resolved via Punchout; falls back to /uid
//     html: { en, de, fr, it, es }  // raw HTML per locale (empty string = skip)
//   }>
// }
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

function stripHtml(html) {
  return (html || '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/\s+/g, ' ')
    .trim()
}

// Boilerplate patterns shared with the ZIP path
const BOILERPLATE = [
  /warnung.*browser/i,
  /bitte aktualisieren/i,
  /service eines drittanbieter/i,
  /videoinhalte einzubetten/i,
  /cookie/i,
  /^menschen,?\s*produkte/i,
  /^entdecke unser universum/i,
  /^über\s+\S/i,
  /^was hat .+ als n.chstes vor/i,
  /^ähnliche produkte/i,
  /^empfohlene produkte/i,
  /^produkte vergleichen/i,
  /^zurück zur übersicht/i,
]

function extractBodyFromHtml(html) {
  const stripped = stripHtml(html)
  if (!stripped || BOILERPLATE.some(re => re.test(stripped))) return ''
  return stripped.slice(0, 10000)
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
    const { pages } = await request.json()

    if (!pages || pages.length === 0) {
      return Response.json({ error: 'Keine Komponenten übergeben' }, { status: 400 })
    }

    const spaceId    = process.env.CONTENTFUL_SPACE_ID
    const token      = process.env.CONTENTFUL_CMA_TOKEN
    const environment = process.env.CONTENTFUL_ENVIRONMENT || 'master'
    const baseUrl    = `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/entries`

    // Resolve Contentful locales
    const localeRes  = await fetch(
      `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/locales`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const localeData = await localeRes.json()
    const allLocales = localeData.items || []
    const defaultLocale = allLocales.find(l => l.default)?.code || 'en-US'

    // Map 2-letter lang codes → Contentful locale codes
    // e.g. 'de' → 'de', 'en' → 'en-US', 'fr' → 'fr'
    function cfCode(lang) {
      const exact = allLocales.find(l => l.code === lang)
      if (exact) return exact.code
      const prefix = allLocales.find(l => l.code.startsWith(lang + '-'))
      return prefix ? prefix.code : lang
    }

    const ACTIVE_LOCALES = ['en', 'de', 'fr', 'it', 'es']

    // Build a multi-locale field object — only include locales that have a value
    function multiLocale(valueFn) {
      const field = {}
      for (const lang of ACTIVE_LOCALES) {
        const val = valueFn(lang)
        if (val !== null && val !== undefined && val !== '') {
          field[cfCode(lang)] = val
        }
      }
      // If nothing resolved, fall back to an empty string in defaultLocale
      if (Object.keys(field).length === 0) field[defaultLocale] = ''
      return field
    }

    const results = []

    for (const page of pages) {
      const uid          = (page.uid  || '').trim()
      const name         = (page.name || uid).slice(0, 250)
      const slug         = page.slug  || `/${uid.toLowerCase().replace(/[^a-z0-9-/]/g, '-')}`
      const internalName = `${name} | ${slug}`.slice(0, 255)

      try {
        // ── 1. headlineBlock ────────────────────────────────────────
        // Headline = component name (same across all locales — there is no per-locale title
        // in the HTMLComponent CSV). internalName is non-localized → defaultLocale.
        const hbEntry = await cfPost(baseUrl, token, 'headlineBlock', {
          internalName: { [defaultLocale]: `[HB] ${internalName}` },
          headline: { [defaultLocale]: buildRichTextDoc(name) },
        })

        // ── 2. editorialText ────────────────────────────────────────
        // Body text is extracted from the HTML per locale and stored as Rich Text.
        const etEntry = await cfPost(baseUrl, token, 'editorialText', {
          internalName: { [defaultLocale]: `[ET] ${internalName}` },
          text: multiLocale(lang => {
            const body = extractBodyFromHtml(page.html?.[lang])
            return body ? buildRichTextDoc(body) : null
          }),
        })

        // ── 3. sectionText ──────────────────────────────────────────
        const stEntry = await cfPost(baseUrl, token, 'sectionText', {
          internalName: { [defaultLocale]: `[ST] ${internalName}` },
          headline:    { [defaultLocale]: { sys: { type: 'Link', linkType: 'Entry', id: hbEntry.sys.id } } },
          text:        { [defaultLocale]: { sys: { type: 'Link', linkType: 'Entry', id: etEntry.sys.id } } },
          textVariant: { [defaultLocale]: 'normal' },
          columnWidth: { [defaultLocale]: 12 },
          textColumns: { [defaultLocale]: 1 },
        })

        // ── 4. seo ──────────────────────────────────────────────────
        const seoEntry = await cfPost(baseUrl, token, 'seo', {
          internalName: { [defaultLocale]: `[SEO] ${internalName}` },
          title:        multiLocale(() => name),
          description:  { [defaultLocale]: '' },
          hideFromSearchEnginesNoindex:     { [defaultLocale]: false },
          excludeLinksFromRankingsNofollow: { [defaultLocale]: false },
        })

        // ── 5. contentPage ──────────────────────────────────────────
        await cfPost(baseUrl, token, 'contentPage', {
          internalName: { [defaultLocale]: internalName },
          slug:         { [defaultLocale]: slug },
          title:        multiLocale(() => name),
          pageType:     { [defaultLocale]: 'family' },
          sections:     { [defaultLocale]: [{ sys: { type: 'Link', linkType: 'Entry', id: stEntry.sys.id } }] },
          seoMetadata:  { [defaultLocale]: { sys: { type: 'Link', linkType: 'Entry', id: seoEntry.sys.id } } },
        })

        results.push({ status: 'success', uid, name, slug })
      } catch (e) {
        results.push({ status: 'error', uid, name, slug, error: e.message })
      }
    }

    return Response.json({
      results,
      summary: {
        total:   pages.length,
        success: results.filter(r => r.status === 'success').length,
        errors:  results.filter(r => r.status === 'error').length,
      },
    })
  } catch (e) {
    console.error('migrate-hybris-htmlcomponent:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
