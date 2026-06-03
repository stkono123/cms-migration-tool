export const runtime = 'nodejs'
import { optimizeCSVRow } from '../../../lib/pipeline/text-optimizer.js'

export async function POST(request) {
  try {
    const { rows, contentCols, settings, target } = await request.json()

    if (!rows || rows.length === 0) {
      return Response.json({ error: 'Keine Rows übergeben' }, { status: 400 })
    }

    const results = []
    const migrationLog = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        const { optimized, log } = await optimizeCSVRow(row, contentCols, settings)
        results.push({ index: i, status: 'success', data: optimized })
        if (log.length > 0) migrationLog.push({ index: i, entries: log })
      } catch (e) {
        results.push({ index: i, status: 'error', error: e.message })
        migrationLog.push({ index: i, entries: [{ action: 'error', error: e.message }] })
      }
    }

    const successCount = results.filter(r => r.status === 'success').length
    const encodingFixed = migrationLog.flatMap(l => l.entries).filter(e => e.action === 'encoding_fixed').length
    const enhanced = migrationLog.flatMap(l => l.entries).filter(e => e.action?.startsWith('l')).length

    return Response.json({
      results,
      summary: {
        total: rows.length,
        success: successCount,
        errors: rows.length - successCount,
        encodingFixed,
        enhanced,
      },
      migrationLog,
    })
  } catch (e) {
    console.error(e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
