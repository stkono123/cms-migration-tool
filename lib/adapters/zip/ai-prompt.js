// ZIP/HTML-spezifischer AI-Mapping-Prompt
// Für andere Quellsysteme: lib/adapters/{system}/ai-prompt.js anlegen
export function buildMappingPrompt(inventory, targets, uploadedModel) {
  const targetList = targets.join(' und ')

  const pageList = inventory.pages
    .map(p => `- ${p.pageTitle || p.title} (Datei: ${p.fileName})`)
    .join('\n')

  return `Du bist ein MACH-Architektur-Experte. Analysiere diese aus HTML-Dateien extrahierten Seiten und erstelle ein Contentful Content Model dafür. Zielsysteme: ${targetList}.

ZIP/HTML INVENTAR:
- Projekt: ${inventory.shopName}
- Anzahl Seiten: ${inventory.fileCount}
- Seiten:
${pageList}

JEDE SEITE HAT FOLGENDE DATENFELDER, DIE ALLE IM CONTENT MODEL ABGEBILDET WERDEN MUESSEN:
- title / pageTitle: Seitentitel (aus <title>-Tag)
- fileName: Ursprünglicher Dateiname (Basis für den Slug)
- body: Hauptinhalt der Seite (Rich Text)
- seoTitle: SEO-Titel (max 60 Zeichen)
- metaDescription: Meta Description (max 160 Zeichen)
- ogTitle: Open-Graph-Titel
- ogDescription: Open-Graph-Beschreibung
- canonicalUrl: Kanonische URL

WICHTIG: Das Content Model MUSS für jedes der oben genannten Datenfelder ein eigenes Contentful-Feld anlegen, auch wenn manche Werte bei einzelnen Seiten leer sind. Verwende als Field-ID GENAU diese Namen (camelCase, exakt wie oben): title, slug, body, seoTitle, metaDescription, ogTitle, ogDescription, canonicalUrl.

Feld-Typen-Empfehlung:
- title, slug, seoTitle, ogTitle, canonicalUrl: Symbol (Short text)
- body: RichText
- metaDescription, ogDescription: Text (Long text)

${uploadedModel && uploadedModel.length > 0 ? `
VERBINDLICHES CONTENTFUL CONTENT MODEL:
Der Kunde hat ein verbindliches Content Model vorgegeben. Verwende AUSSCHLIESSLICH diese Content Types. Erfinde keine neuen:
${uploadedModel.map(ct => `- ${ct.name} (ID: ${ct.id})`).join('\n')}
Mappe die Seiten auf die passenden Types aus dieser Liste.` : ''}

Antworte NUR mit einem einzigen JSON-Objekt. Kein Text davor oder danach. Keine Markdown-Backticks. Nur das JSON:
{"summary":"...","contentful":{"description":"...","contentTypes":[{"id":"...","name":"...","description":"...","sourceType":"...","fields":[{"id":"title","name":"Titel","type":"Symbol","required":true},{"id":"slug","name":"URL-Slug","type":"Symbol","required":true},{"id":"body","name":"Inhalt","type":"RichText","required":true},{"id":"seoTitle","name":"SEO Titel","type":"Symbol","required":false},{"id":"metaDescription","name":"Meta Description","type":"Text","required":false},{"id":"ogTitle","name":"OG Titel","type":"Symbol","required":false},{"id":"ogDescription","name":"OG Beschreibung","type":"Text","required":false},{"id":"canonicalUrl","name":"Canonical URL","type":"Symbol","required":false}],"estimatedEntries":0}]},"migrationSteps":["Schritt 1","Schritt 2"]}`
}
