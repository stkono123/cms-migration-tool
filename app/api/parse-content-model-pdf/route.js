export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!file) return Response.json({ error: 'Keine Datei übergeben' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 }
            },
            {
              type: 'text',
              text: `Analysiere dieses Dokument. Es beschreibt ein Contentful Content Model.
Extrahiere alle Content Types und gib sie als JSON zurueck.
Antworte NUR mit einem JSON-Objekt, kein Text davor oder danach, keine Markdown-Backticks.
Format:
{
  "contentTypes": [
    {
      "id": "technicalName",
      "name": "Display Name",
      "fields": ["field1", "field2"]
    }
  ]
}`
            }
          ]
        }]
      })
    })

    const data = await response.json()
    const raw = data.content?.find(b => b.type === 'text')?.text || ''
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start === -1 || end === -1) throw new Error('Kein JSON in der Antwort gefunden')
    const parsed = JSON.parse(raw.slice(start, end + 1))

    return Response.json(parsed)
  } catch (e) {
    console.error(e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
