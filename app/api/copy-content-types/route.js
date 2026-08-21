// Kopiert alle Content Types von einer Quell-Umgebung in die Ziel-Umgebung.
// Nützlich um nach einem versehentlichen Reset die Content Types aus 'master'
// nach 'empty-environment' zurückzubringen.
//
// POST { sourceEnv?: string, targetEnv?: string }
// sourceEnv default: 'master'
// targetEnv default: CONTENTFUL_ENVIRONMENT env var

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))

    const spaceId   = process.env.CONTENTFUL_SPACE_ID
    const token     = process.env.CONTENTFUL_CMA_TOKEN
    const sourceEnv = body.sourceEnv ?? 'master'
    const targetEnv = body.targetEnv ?? (process.env.CONTENTFUL_ENVIRONMENT || 'master')

    if (sourceEnv === targetEnv) {
      return Response.json({ error: 'sourceEnv und targetEnv sind identisch' }, { status: 400 })
    }

    const baseUrl = `https://api.contentful.com/spaces/${spaceId}`

    // 1. Content Types aus Quell-Umgebung holen
    const srcRes = await fetch(
      `${baseUrl}/environments/${sourceEnv}/content_types?limit=200`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const srcData = await srcRes.json()
    if (!srcRes.ok) {
      return Response.json({ error: `Quell-Umgebung lesen fehlgeschlagen: ${srcData.message}` }, { status: 500 })
    }

    const contentTypes = srcData.items || []
    const results = { copied: 0, skipped: 0, errors: [] }

    for (const ct of contentTypes) {
      const ctId = ct.sys.id

      // Felder und Display Field übernehmen, sys-Metadaten weglassen
      const fields = {
        name:        ct.name,
        description: ct.description || '',
        displayField: ct.displayField || undefined,
        fields:      ct.fields.map(f => {
          // Nur erlaubte Feld-Properties übernehmen
          const clean = {
            id:        f.id,
            name:      f.name,
            type:      f.type,
            required:  f.required  ?? false,
            localized: f.localized ?? false,
            disabled:  f.disabled  ?? false,
            omitted:   f.omitted   ?? false,
          }
          if (f.linkType)    clean.linkType    = f.linkType
          if (f.items)       clean.items       = f.items
          if (f.validations) clean.validations = f.validations
          return clean
        }),
      }

      try {
        // Content Type in Ziel-Umgebung anlegen (PUT = idempotent)
        const putRes = await fetch(
          `${baseUrl}/environments/${targetEnv}/content_types/${ctId}`,
          {
            method: 'PUT',
            headers: {
              Authorization:  `Bearer ${token}`,
              'Content-Type': 'application/vnd.contentful.management.v1+json',
              'X-Contentful-Version': '0',
            },
            body: JSON.stringify(fields),
          }
        )
        const putData = await putRes.json()

        if (!putRes.ok) {
          // Konflikt (Version-Mismatch) → bestehende Version ermitteln und retry
          if (putRes.status === 409) {
            const existRes = await fetch(
              `${baseUrl}/environments/${targetEnv}/content_types/${ctId}`,
              { headers: { Authorization: `Bearer ${token}` } }
            )
            const existData = await existRes.json()
            const version   = existData.sys?.version ?? 0

            const retryRes = await fetch(
              `${baseUrl}/environments/${targetEnv}/content_types/${ctId}`,
              {
                method: 'PUT',
                headers: {
                  Authorization:              `Bearer ${token}`,
                  'Content-Type':             'application/vnd.contentful.management.v1+json',
                  'X-Contentful-Version':     String(version),
                },
                body: JSON.stringify(fields),
              }
            )
            const retryData = await retryRes.json()
            if (!retryRes.ok) {
              results.errors.push(`${ctId}: ${retryData.message || retryRes.status}`)
              continue
            }
          } else {
            results.errors.push(`${ctId}: ${putData.message || putRes.status}`)
            continue
          }
        }

        // Publizieren
        const latestRes = await fetch(
          `${baseUrl}/environments/${targetEnv}/content_types/${ctId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const latestData = await latestRes.json()
        const version    = latestData.sys?.version ?? 1

        await fetch(
          `${baseUrl}/environments/${targetEnv}/content_types/${ctId}/published`,
          {
            method: 'PUT',
            headers: {
              Authorization:          `Bearer ${token}`,
              'X-Contentful-Version': String(version),
            },
          }
        )

        results.copied++
      } catch (e) {
        results.errors.push(`${ctId}: ${e.message}`)
      }
    }

    return Response.json({
      sourceEnv,
      targetEnv,
      total: contentTypes.length,
      ...results,
    })
  } catch (e) {
    console.error('copy-content-types:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
