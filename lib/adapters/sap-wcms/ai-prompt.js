// SAP WCMS / Hybris — AI Mapping Prompt
// Für andere Quellsysteme: lib/adapters/{system}/ai-prompt.js anlegen

export function buildMappingPrompt(inventory, targets, uploadedModel) {
  const targetList = targets.join(' und ')
  const pageList   = (inventory.pages || [])
    .map(p => `- ${p.title} (uid: ${p.id})`)
    .join('\n')

  return `Du bist ein MACH-Architektur-Experte. Analysiere diesen SAP WCMS / Hybris Export und erstelle ein Contentful Content Model. Zielsystem: ${targetList}.

SAP WCMS INVENTAR:
- Quelle: SAP Commerce Cloud / Hybris WCMS
- Seiten gesamt: ${inventory.totalRows}
- Vorschau (erste 5 Seiten):
${pageList}

FELDER JEDER SEITE — alle muessen im Content Model abgebildet werden:
- uid: Technischer Identifier (wird als Slug-Basis verwendet)
- name: Technischer Seitenname (intern)
- label: Anzeigename / Seitentitel
- pageStatus: Seitenstatus (z. B. ACTIVE, DELETED)
- customCss: Seitenspezifisches CSS (Long text, optional)
- customJs: Seitenspezifisches JavaScript (Long text, optional)
- htmlEn: HTML-Seiteninhalt Englisch (Long text)
- htmlDe: HTML-Seiteninhalt Deutsch (Long text)
- htmlFr: HTML-Seiteninhalt Franzoesisch (Long text)
- htmlIt: HTML-Seiteninhalt Italienisch (Long text)
- htmlEs: HTML-Seiteninhalt Spanisch (Long text)

PFLICHTREGELN:
1. Das Content Model MUSS fuer jedes oben genannte Feld ein eigenes Contentful-Feld anlegen.
2. Verwende als Field-IDs EXAKT: uid, name, label, pageStatus, customCss, customJs, htmlEn, htmlDe, htmlFr, htmlIt, htmlEs
3. Empfohlene Feld-Typen: uid/name/label/pageStatus → Symbol; customCss/customJs/htmlEn/htmlDe/htmlFr/htmlIt/htmlEs → Text (Long text)
4. uid ist required und dient als eindeutiger Identifier.
5. Kein commercetools-Model anlegen — SAP WCMS exportiert nur Content, keine Produkte.
${uploadedModel?.length > 0 ? `
VERBINDLICHES CONTENTFUL CONTENT MODEL:
Der Kunde hat ein verbindliches Content Model vorgegeben. Verwende AUSSCHLIESSLICH diese Content Types:
${uploadedModel.map(ct => `- ${ct.name} (ID: ${ct.id})`).join('\n')}
Mappe die SAP-Seiten auf die passenden Types aus dieser Liste.` : ''}

Antworte NUR mit einem einzigen JSON-Objekt. Kein Text davor oder danach. Keine Markdown-Backticks. Nur das JSON:
{"summary":"...","contentful":{"description":"...","contentTypes":[{"id":"sapWcmsPage","name":"SAP WCMS Page","description":"Aus SAP Commerce / Hybris WCMS migrierte Seite","sourceType":"sap-wcms","fields":[{"id":"uid","name":"UID","type":"Symbol","required":true},{"id":"name","name":"Technischer Name","type":"Symbol","required":false},{"id":"label","name":"Seitentitel","type":"Symbol","required":true},{"id":"pageStatus","name":"Status","type":"Symbol","required":false},{"id":"customCss","name":"Custom CSS","type":"Text","required":false},{"id":"customJs","name":"Custom JS","type":"Text","required":false},{"id":"htmlEn","name":"HTML Englisch","type":"Text","required":false},{"id":"htmlDe","name":"HTML Deutsch","type":"Text","required":false},{"id":"htmlFr","name":"HTML Franzoesisch","type":"Text","required":false},{"id":"htmlIt","name":"HTML Italienisch","type":"Text","required":false},{"id":"htmlEs","name":"HTML Spanisch","type":"Text","required":false}],"estimatedEntries":${inventory.totalRows}}]},"migrationSteps":["1. SAP WCMS Content Model in Contentful anlegen","2. ${inventory.totalRows} Seiten mit HTML-Inhalten nach Contentful migrieren","3. Qualitaetspruefung der migrierten HTML-Inhalte"]}`
}
