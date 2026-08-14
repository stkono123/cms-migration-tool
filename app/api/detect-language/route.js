/**
 * POST /api/detect-language
 *
 * Detects the language of a set of text samples.
 * Called by the frontend after analysis completes so the user can confirm
 * the detected source language and choose an output language before migration.
 *
 * Request body: { samples: string[] }
 * Response:     { sourceLanguage: string, targetLanguage: string, autoDetected: boolean }
 */
import { resolveLanguageContext } from '../../../lib/pipeline/language-context.js'

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const { samples } = await request.json()
    const ctx = await resolveLanguageContext({ bodySamples: samples || [] })
    return Response.json(ctx)
  } catch (e) {
    console.error('detect-language error:', e.message)
    return Response.json({ sourceLanguage: 'en', targetLanguage: 'en', autoDetected: false })
  }
}
