export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const ctProjectKey = process.env.CT_PROJECT_KEY
    const ctClientId = process.env.CT_CLIENT_ID
    const ctClientSecret = process.env.CT_CLIENT_SECRET
    const ctAuthUrl = process.env.CT_AUTH_URL || 'https://auth.europe-west1.gcp.commercetools.com'
    const ctApiUrl = process.env.CT_API_URL || 'https://api.europe-west1.gcp.commercetools.com'

    if (!ctProjectKey || !ctClientId || !ctClientSecret) {
      return Response.json({ ok: false, error: 'CT_PROJECT_KEY, CT_CLIENT_ID oder CT_CLIENT_SECRET fehlen in den Environment Variables.' }, { status: 400 })
    }

    // Auth Token holen
    const authResponse = await fetch(`${ctAuthUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${ctClientId}:${ctClientSecret}`).toString('base64')}`
      },
      body: `grant_type=client_credentials&scope=manage_project:${ctProjectKey}`
    })

    const authData = await authResponse.json()

    if (!authResponse.ok) {
      return Response.json({ ok: false, error: 'Auth fehlgeschlagen', details: authData }, { status: 401 })
    }

    // Projekt-Info abrufen als Verbindungstest
    const projectRes = await fetch(`${ctApiUrl}/${ctProjectKey}`, {
      headers: { 'Authorization': `Bearer ${authData.access_token}` }
    })

    const projectData = await projectRes.json()

    if (!projectRes.ok) {
      return Response.json({ ok: false, error: 'Projekt nicht gefunden', details: projectData }, { status: 404 })
    }

    return Response.json({ ok: true, projectKey: projectData.key, projectName: projectData.name })

  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 })
  }
}
