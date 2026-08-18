import { analyzeSapWcms } from '../../../lib/adapters/sap-wcms/analyze.js'

export async function POST(request) {
  try {
    const {
      contentPages       = [],
      contentSlots       = [],
      contentSlotForPages = [],
      htmlComponents     = [],
    } = await request.json()

    if (!contentPages.length) {
      return Response.json(
        { error: 'ContentPage.csv (oder wcmspages_*.csv) fehlt oder ist leer.' },
        { status: 400 }
      )
    }

    const inventory = analyzeSapWcms({ contentPages, contentSlots, contentSlotForPages, htmlComponents })
    return Response.json(inventory)
  } catch (e) {
    console.error('[analyze-sap-wcms]', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
