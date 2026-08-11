import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request) {
  try {
    const { base64, mediaType } = await request.json()
    if (!base64) {
      return NextResponse.json({ error: 'Kein PDF übergeben' }, { status: 400 })
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: mediaType || 'application/pdf', data: base64 }
            },
            {
              type: 'text',
              text: 'Extrahiere alle Tone-of-Voice-Regeln und Schreibrichtlinien aus diesem Dokument als kompakte Liste. Nur die Regeln, keine Erklärungen.'
            }
          ]
        }]
      })
    })

    const data = await res.json()
    const text = data.content?.[0]?.text || ''
    return NextResponse.json({ text })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
