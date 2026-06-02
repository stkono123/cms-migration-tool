// CSV-spezifischer AI-Mapping-Prompt
// Wird verwendet wenn inventory.source === 'csv'
export function buildMappingPrompt(inventory, targets) {
  const targetList = targets.join(' und ')

  const contentColsText = inventory.detectedContentCols?.length > 0
    ? inventory.detectedContentCols.join(', ')
    : 'keine eindeutigen Content-Spalten erkannt'

  const commerceColsText = inventory.detectedCommerceCols?.length > 0
    ? inventory.detectedCommerceCols.join(', ')
    : 'keine Commerce-Spalten erkannt'

  const allColsText = inventory.columns?.join(', ') || 'unbekannt'

  return `Du bist ein MACH-Architektur-Experte. Analysiere diese CSV-Struktur und verteile die Inhalte optimal auf folgende Zielsysteme: ${targetList}.

CSV INVENTAR:
- Datei: ${inventory.shopName}
- Gesamtzeilen: ${inventory.totalRows}
- Alle Spalten (${inventory.columns?.length || 0}): ${allColsText}
- Erkannte Content-Spalten: ${contentColsText}
- Erkannte Commerce-Spalten: ${commerceColsText}
- Enthält Commerce-Daten: ${inventory.hasCommerce ? 'Ja' : 'Nein'}
- Enthält Content-Daten: ${inventory.hasContent ? 'Ja' : 'Nein'}
- Zusätzliche Metafelder: ${inventory.metafields?.map(m => m.key).join(', ') || 'keine'}

REGELN FÜR DIE VERTEILUNG:
- commercetools: Produkte, Preise, Inventar, SKUs, Commerce-relevante Felder
- Contentful: Pages, redaktionelle Inhalte, Labels, Beschreibungen, alle Content-Felder
- Wenn die CSV nur Content enthält (keine Commerce-Spalten): alles nach Contentful
- Wenn die CSV nur Commerce enthält: alles nach commercetools
- Wenn gemischt: sinnvoll aufteilen

WICHTIG für commercetools Product Types:
- Attribut-IDs müssen lowercase sein, Leerzeichen als Underscore
- Pflichtattribute wenn vorhanden: sku, status

WICHTIG für Namen: Verwende EXAKT die Spaltennamen aus der CSV. Erfinde keine neuen Namen.

Antworte NUR mit einem einzigen JSON-Objekt. Kein Text davor oder danach. Keine Markdown-Backticks. Nur das JSON:
{"summary":"...","commercetools":{"description":"...","contentTypes":[{"id":"...","name":"...","description":"...","sourceType":"...","fields":[{"id":"...","name":"...","type":"String","required":true}],"estimatedEntries":0}]},"contentful":{"description":"...","contentTypes":[{"id":"...","name":"...","description":"...","sourceType":"...","fields":[{"id":"...","name":"...","type":"Symbol","required":true}],"estimatedEntries":0}]},"migrationSteps":["Schritt 1","Schritt 2"]}`
}
