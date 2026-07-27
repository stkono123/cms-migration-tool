// Shopify-spezifischer AI-Mapping-Prompt
// Für andere Quellsysteme: lib/adapters/{system}/ai-prompt.js anlegen

export function buildMappingPrompt(inventory, targets, uploadedModel) {
  const targetList = targets.join(' und ')

  // Varianten-Optionen als CT-Attribute formulieren
  const variantOptionsText = inventory.variantOptions?.length > 0
    ? `- Varianten-Optionen: ${inventory.variantOptions.join(', ')} (müssen als Attribute im commercetools Product Type angelegt werden)`
    : '- Keine Varianten-Optionen gefunden'

  return `Du bist ein MACH-Architektur-Experte. Analysiere diese Shopify-Struktur und verteile die Inhalte optimal auf folgende Zielsysteme: ${targetList}.

SHOPIFY INVENTAR:
- Shop: ${inventory.shopName}
- Produkte: ${inventory.productCount}
- Pages (${inventory.pages.length}): ${inventory.pages.map(p => p.title).join(', ')}
- Blogs (${inventory.blogs.length}): ${inventory.blogs.map(b => b.title).join(', ')}
- Metafields (${inventory.metafields.length}): ${inventory.metafields.slice(0, 20).map(m => `${m.namespace}.${m.key}`).join(', ')}
${variantOptionsText}

REGELN FÜR DIE VERTEILUNG:
- commercetools: Produkte, Kategorien, Preise, Inventar, Bestellungen, Kundendaten
- Contentful: Pages, Blogs, redaktionelle Inhalte, Marketing-Texte, Metafield-Inhalte die nicht commerce-relevant sind

WICHTIG für commercetools Product Types:
- Der "Produkte" Product Type MUSS folgende Pflichtattribute enthalten: sku, status, tags
- Jede Varianten-Option aus dem Inventar (z.B. Farbe, Grösse) MUSS als eigenes Attribut angelegt werden
- Attribut-IDs müssen lowercase sein, Leerzeichen als Underscore: "Farbe" → "farbe", "Grösse" → "grosse"

WICHTIG für Namen: Verwende EXAKT die Namen aus dem Shopify-Inventar. Erfinde keine neuen Namen.
${uploadedModel && uploadedModel.length > 0 ? `
VERBINDLICHES CONTENTFUL CONTENT MODEL:
Der Kunde hat ein verbindliches Content Model vorgegeben. Verwende für Contentful AUSSCHLIESSLICH diese Content Types. Erfinde keine neuen:
${uploadedModel.map(ct => `- ${ct.name} (ID: ${ct.id})`).join('\n')}
Mappe die Shopify-Inhalte (Pages, Blogs, Metafields) auf die passenden Types aus dieser Liste.` : ''}

Antworte NUR mit einem einzigen JSON-Objekt. Kein Text davor oder danach. Keine Markdown-Backticks. Nur das JSON:
{"summary":"...","commercetools":{"description":"...","contentTypes":[{"id":"...","name":"...","description":"...","sourceType":"...","fields":[{"id":"...","name":"...","type":"String","required":true}],"estimatedEntries":0}]},"contentful":{"description":"...","contentTypes":[{"id":"...","name":"...","description":"...","sourceType":"...","fields":[{"id":"...","name":"...","type":"Symbol","required":true}],"estimatedEntries":0}]},"migrationSteps":["Schritt 1","Schritt 2"]}`
}
