// One-time route: updates the uid (slug) field for the 11 Punchout-matched pages.
// Trigger via GET /api/update-slugs-once?confirm=yes
// Delete this file once the slugs are set.

export const runtime = 'nodejs'

const SLUG_MAP = {
  '/addict':                'biking/product-family/addict',
  '/addict-rc':             'biking/product-family/addict-rc',
  '/eride-road-gravel':     'biking/product-family/eride-road-gravel',
  '/freeride-world-tour':   'wintersport/events/freeride/freeride-world-tour',
  '/pro-program':           'company/pro-program',
  '/ransom':                'biking/product-family/ransom',
  '/gore-tex':              'gear/technology/gore-tex',
  '/explorair-line':        'gear/product-family/explorair-line',
  '/pursuit-gravel':        'biking/product-family/gravel/pursuit-gravel',
  '/urban-mobility':        'biking/urban-mobility',
  '/winter-layering-guide': 'wintersport/winter-layering-guide',
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('confirm') !== 'yes') {
    return Response.json({
      info: 'Dry run. No changes made. Append ?confirm=yes to execute.',
      slugMap: SLUG_MAP,
    })
  }

  const spaceId = process.env.CONTENTFUL_SPACE_ID
  const token   = process.env.CONTENTFUL_CMA_TOKEN
  const env     = 'master'
  const base    = `https://api.contentful.com/spaces/${spaceId}/environments/${env}`
  const headers = { Authorization: `Bearer ${token}` }

  const listRes = await fetch(
    `${base}/entries?content_type=sapWcmsPage&limit=200`,
    { headers }
  )
  const listData = await listRes.json()
  const entries  = listData.items || []

  const results = []

  for (const entry of entries) {
    const fields  = entry.fields || {}
    const locale  = Object.keys(fields.label || {})[0]
    if (!locale) continue

    const labelValue = (fields.label[locale] || '').trim()
    const newSlug    = SLUG_MAP[labelValue]
    if (!newSlug) continue

    const oldSlug = (fields.uid?.[locale]) || ''
    const version = entry.sys.version
    const entryId = entry.sys.id

    const updatedFields = { ...fields, uid: { [locale]: newSlug } }

    const updateRes = await fetch(`${base}/entries/${entryId}`, {
      method: 'PUT',
      headers: {
        ...headers,
        'Content-Type': 'application/vnd.contentful.management.v1+json',
        'X-Contentful-Version': String(version),
      },
      body: JSON.stringify({ fields: updatedFields }),
    })

    const updateData = await updateRes.json()
    results.push({
      label:   labelValue,
      oldSlug,
      newSlug,
      status:  updateRes.ok ? 'updated' : 'error',
      ...(updateRes.ok ? {} : { error: updateData.message || JSON.stringify(updateData) }),
    })
  }

  const updated = results.filter(r => r.status === 'updated').length
  const errors  = results.filter(r => r.status === 'error').length

  return Response.json({ scanned: entries.length, matched: results.length, updated, errors, results })
}
