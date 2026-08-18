// SAP WCMS / Hybris source adapter — CSV join logic
// Input: four pre-parsed CSV tables (semicolon-delimited, parsed client-side)
// Output: normalized inventory with one flat entry per ContentPage
//
// Join chain:
//   ContentPage → ContentSlotForPage → ContentSlot → WCMSHTMLComponent
//
// Column-name variants are handled with ?? chains because SAP export
// column names differ across Hybris versions (e.g. "contentPage.uid"
// vs "contentPage" vs "pageUid").  Only this file needs to change if
// a project exports non-standard columns.

export function analyzeSapWcms({
  contentPages       = [],
  contentSlots       = [],
  contentSlotForPages = [],
  htmlComponents     = [],
}) {
  // ── Index ContentSlots by uid ────────────────────────────────────────────
  const slotById = Object.fromEntries(
    contentSlots.map(r => [r.uid ?? r.UID ?? '', r])
  )

  // ── Index HTMLComponents by the slot they belong to ──────────────────────
  const compsBySlot = {}
  for (const comp of htmlComponents) {
    const key =
      comp['contentSlot.uid'] ??
      comp.contentSlot ??
      comp.slotUid ??
      comp.slot ??
      ''
    if (!key) continue
    ;(compsBySlot[key] ??= []).push(comp)
  }

  // ── Index ContentSlotForPage relations by page uid ───────────────────────
  // SAP exports the page reference as a fully-qualified CMS item ID, e.g.
  //   "scottb2cContentCatalog:staged:winter-2026-freedom-to-explore"
  // ContentPage.uid contains only the bare uid ("winter-2026-freedom-to-explore"),
  // so we strip everything up to and including the last colon before indexing.
  const stripCatalogPrefix = (val) => val.includes(':') ? val.slice(val.lastIndexOf(':') + 1) : val

  const slotsByPage = {}
  for (const rel of contentSlotForPages) {
    const raw =
      rel['contentPage.uid'] ??
      rel.contentPage ??
      rel.pageUid ??
      rel.page ??
      ''
    const key = stripCatalogPrefix(raw)
    if (!key) continue
    ;(slotsByPage[key] ??= []).push(rel)
  }

  // ── Join: one flat entry per ContentPage ─────────────────────────────────
  const allPages = contentPages.map(page => {
    const uid   = page.uid ?? page.UID ?? ''
    const slots = slotsByPage[uid] ?? []

    const html = { en: [], de: [], fr: [], it: [], es: [] }
    const css  = []
    const js   = []

    for (const slotRel of slots) {
      const slotId =
        slotRel['contentSlot.uid'] ??
        slotRel.contentSlot ??
        slotRel.slotUid ??
        slotRel.slot ??
        ''
      const comps = compsBySlot[slotId] ?? []

      for (const comp of comps) {
        // Primary content (English / default)
        const en =
          comp.content ??
          comp.htmlContent ??
          comp.content_en ??
          comp.htmlContent_en ??
          ''
        if (en) html.en.push(en)

        // Additional locale variants
        for (const lang of ['de', 'fr', 'it', 'es']) {
          const v = comp[`content_${lang}`] ?? comp[`htmlContent_${lang}`] ?? ''
          if (v) html[lang].push(v)
        }

        if (comp.externalCss) css.push(comp.externalCss)
        if (comp.externalJs)  js.push(comp.externalJs)
      }
    }

    return {
      uid,
      name:       page.name        ?? '',
      label:      page.label       ?? page.title ?? page.name ?? '',
      pageStatus: page.pageStatus  ?? page.approvalStatus ?? '',
      customCss:  [...new Set(css)].join('\n'),
      customJs:   [...new Set(js)].join('\n'),
      htmlEn: html.en.join('\n\n'),
      htmlDe: html.de.join('\n\n'),
      htmlFr: html.fr.join('\n\n'),
      htmlIt: html.it.join('\n\n'),
      htmlEs: html.es.join('\n\n'),
    }
  })

  // ── Normalized inventory (same shape expected by the rest of the app) ────
  return {
    source:           'sap-wcms',
    shopName:         'SAP WCMS / Hybris',
    allPages,
    totalRows:        allPages.length,
    totalContentRows: allPages.length,
    // First 5 as preview tags in the UI
    pages: allPages.slice(0, 5).map(p => ({
      id:        p.uid,
      title:     p.label || p.name || p.uid,
      published: !p.pageStatus || p.pageStatus.toUpperCase() === 'ACTIVE',
    })),
    columns: ['uid', 'name', 'label', 'pageStatus', 'customCss', 'customJs',
              'htmlEn', 'htmlDe', 'htmlFr', 'htmlIt', 'htmlEs'],
    detectedContentCols:  ['htmlEn', 'htmlDe', 'htmlFr', 'htmlIt', 'htmlEs', 'label'],
    detectedCommerceCols: [],
    hasCommerce:      false,
    hasContent:       true,
    productCount:     0,
    blogs:            [],
    metafields:       [],
    metafieldSources: { shop: 0, product: 0 },
  }
}
