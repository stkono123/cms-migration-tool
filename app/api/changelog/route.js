import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET() {
  try {
    const filePath = join(process.cwd(), 'data', 'changelog.json')
    const raw = readFileSync(filePath, 'utf-8')
    const changelog = JSON.parse(raw)
    return NextResponse.json(changelog)
  } catch (err) {
    return NextResponse.json({ error: 'Changelog nicht gefunden' }, { status: 500 })
  }
}
