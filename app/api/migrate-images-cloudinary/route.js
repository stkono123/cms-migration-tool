// Migrates Cloudinary image references into Image [D2C] entries in Contentful.
//
// Accepts: POST {
//   images: Array<{
//     url:      string,   // Cloudinary URL (static.scott-sports.com or res.cloudinary.com)
//     altText?: string,   // optional alt text (from <img alt="...">)
//     caption?: string,   // optional caption
//     locale?:  string,   // locale for altText/caption, defaults to defaultLocale
//   }>
// }
// Returns: { results, summary }
//
// URL formats supported:
//   https://static.scott-sports.com/image/upload/f_auto/q_auto/v1778085300/2063988.jpg
//   https://res.cloudinary.com/{cloud}/image/upload/f_auto/q_auto/v123/{public_id}.jpg
//
// Note: width/height/bytes are unknown from URL alone and set to null.
// They can be enriched later via Cloudinary Admin API if needed.

export const runtime = 'nodejs'
export const maxDuration = 60

// ── Cloudinary URL parser ────────────────────────────────────────────
// Handles both custom domains and res.cloudinary.com
function parseCloudinaryUrl(rawUrl) {
  if (!rawUrl || !rawUrl.includes('/image/upload/')) return null

  // Pattern: .../image/upload/[transformations/][v{version}/]{public_id}.{format}
  const m = rawUrl.match(
    /\/image\/upload\/(?:((?:[^/]+\/)*[^/v][^/]*(?:\/[^/]+)*)\/)?(?:v(\d+)\/)?([^/?#]+)\.(\w{2,4})(?:[?#].*)?$/
  )
  if (!m) return null

  const [, transformation, version, publicId, format] = m
  const secureUrl = rawUrl.startsWith('http:') ? rawUrl.replace('http:', 'https:') : rawUrl
  const httpUrl   = secureUrl.replace('https:', 'http:')

  return {
    url:                     httpUrl,
    tags:                    [],
    type:                    'upload',
    bytes:                   null,
    width:                   null,
    format:                  format.toLowerCase(),
    height:                  null,
    context:                 {},
    version:                 version ? parseInt(version) : null,
    duration:                null,
    metadata:                {},
    public_id:               publicId,
    created_at:              null,
    secure_url:              secureUrl,
    resource_type:           'image',
    raw_transformation:      transformation || null,
    original_secure_url:     secureUrl,
  }
}

// ── Contentful helper ────────────────────────────────────────────────
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

// ── Route ────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const { images } = await request.json()

    if (!images || images.length === 0) {
      return Response.json({ error: 'Keine Bilder übergeben' }, { status: 400 })
    }

    const spaceId     = process.env.CONTENTFUL_SPACE_ID
    const token       = process.env.CONTENTFUL_CMA_TOKEN
    const environment = process.env.CONTENTFUL_ENVIRONMENT || 'master'
    const baseUrl     = `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/entries`

    // Resolve Contentful locales
    const localeRes  = await fetch(
      `https://api.contentful.com/spaces/${spaceId}/environments/${environment}/locales`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const localeData = await localeRes.json()
    const defaultLocale = (localeData.items || []).find(l => l.default)?.code || 'en-US'

    const results = []

    for (const img of images) {
      const cloudinaryJson = parseCloudinaryUrl(img.url)
      if (!cloudinaryJson) {
        results.push({ status: 'skipped', url: img.url, reason: 'Keine Cloudinary-URL erkannt' })
        continue
      }

      const publicId     = cloudinaryJson.public_id
      const internalName = `[IMG] ${publicId}`.slice(0, 255)
      const contentLocale = img.locale || defaultLocale
      const altText      = (img.altText || '').slice(0, 125)
      const caption      = (img.caption || '').slice(0, 255)

      try {
        // Image [D2C] fields:
        //   internalName  — Long text, not localized → defaultLocale
        //   image         — JSON object (Cloudinary array), not localized → defaultLocale
        //   alternativeText — Short text, localized
        //   caption         — Short text, localized
        //   hasFocalPoint   — Boolean, not localized → defaultLocale
        const fields = {
          internalName:    { [defaultLocale]: internalName },
          image:           { [defaultLocale]: [cloudinaryJson] },
          hasFocalPoint:   { [defaultLocale]: false },
        }
        if (altText) fields.alternativeText = { [contentLocale]: altText }
        if (caption) fields.caption         = { [contentLocale]: caption }

        const entry = await cfPost(baseUrl, token, 'mediaImage', fields)
        results.push({ status: 'success', url: img.url, publicId, entryId: entry.sys.id })
      } catch (e) {
        results.push({ status: 'error', url: img.url, publicId, error: e.message })
      }
    }

    return Response.json({
      results,
      summary: {
        total:   images.length,
        success: results.filter(r => r.status === 'success').length,
        skipped: results.filter(r => r.status === 'skipped').length,
        errors:  results.filter(r => r.status === 'error').length,
      },
    })
  } catch (e) {
    console.error('migrate-images-cloudinary:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
