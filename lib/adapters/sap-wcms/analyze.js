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
  // Step 1: explicit slot reference columns (present in some Hybris versions).
  const compsBySlot = {}
  const _matchedComps = new Set()
  for (const comp of htmlComponents) {
    const key =
      comp['contentSlot.uid'] ??
      comp.contentSlot ??
      comp.slotUid ??
      comp.slot ??
      ''
    if (!key) continue
    ;(compsBySlot[key] ??= []).push(comp)
    _matchedComps.add(comp)
  }

  // Steps 2 + 3 run only when no explicit slot references exist.
  if (_matchedComps.size === 0 && htmlComponents.length > 0) {
    const _strip = (val) => val.includes(':') ? val.slice(val.lastIndexOf(':') + 1) : val

    // Step 2: name-based matching.
    // Component names often embed the page uid, e.g. "addict-2025-content" contains
    // "addict-2025", which is the page uid. Match by checking two directions:
    //   A. component name contains the full page uid (most reliable)
    //   B. page uid contains the stripped component base name (catches "ransom-hero-video" → ransom-2024)
    // Build a temporary page → slot uid index from ContentSlotForPage.
    const _pageToSlots = {}
    for (const rel of contentSlotForPages) {
      const raw     = rel['contentPage.uid'] ?? rel.contentPage ?? rel.pageUid ?? rel.page ?? ''
      const pageUid = _strip(raw)
      const rawSlot = rel['contentSlot.uid'] ?? rel.contentSlot ?? rel.slotUid ?? rel.slot ?? ''
      const slotUid = _strip(rawSlot)
      if (pageUid && slotUid) (_pageToSlots[pageUid] ??= new Set()).add(slotUid)
    }

    // Strip common suffixes to derive a matchable base name from the component name.
    const _baseName = s => (s ?? '').toLowerCase()
      .replace(/[-_]?(content|intro|sticky(-nav)?|hero(-video)?|video|dach|banner|form|text|copy|nav).*$/, '')
      .replace(/[-_]+$/, '')

    for (const comp of htmlComponents) {
      const compName = (comp.name ?? comp.uid ?? '').toLowerCase()
      const compBase = _baseName(comp.name ?? comp.uid ?? '')
      let bestPageUid = null, bestScore = 0

      for (const pageUid of Object.keys(_pageToSlots)) {
        const uid = pageUid.toLowerCase()
        // Strategy A: component name contains the full page uid
        if (compName.includes(uid) && uid.length > bestScore) {
          bestScore = uid.length; bestPageUid = pageUid
        }
        // Strategy B: page uid contains the stripped component base name
        if (compBase.length >= 4 && uid.includes(compBase) && compBase.length > bestScore) {
          bestScore = compBase.length; bestPageUid = pageUid
        }
      }

      if (bestPageUid) {
        _matchedComps.add(comp)
        for (const slotUid of _pageToSlots[bestPageUid]) {
          ;(compsBySlot[slotUid] ??= []).push(comp)
        }
      }
    }

    // Step 3: timing-based fallback for components not matched by name.
    // Each slot is matched to the closest-in-time unmatched component within one week.
    // Parse "DD.MM.YYYY HH:MM:SS" → timestamp
    const parseHybrisDate = (str) => {
      if (!str) return 0
      const [datePart = '', timePart = '00:00:00'] = str.split(' ')
      const [d = '01', m = '01', y = '2000'] = datePart.split('.')
      return new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T${timePart}`).getTime()
    }

    const unmatchedComps = htmlComponents.filter(c => !_matchedComps.has(c))

    const slotsWithTime = contentSlots
      .map(s => ({ uid: s.uid ?? s.UID ?? '', t: parseHybrisDate(s.creationtime ?? '') }))
      .filter(s => s.uid && !compsBySlot[s.uid])
      .sort((a, b) => a.t - b.t)

    const compsPool = unmatchedComps
      .map(c => ({ comp: c, t: parseHybrisDate(c.creationtime ?? ''), matched: false }))
      .sort((a, b) => a.t - b.t)

    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000
    for (const slot of slotsWithTime) {
      let best = null, bestDiff = Infinity
      for (const c of compsPool) {
        if (c.matched) continue
        const diff = Math.abs(slot.t - c.t)
        if (diff < bestDiff) { bestDiff = diff; best = c }
      }
      if (best && bestDiff <= ONE_WEEK_MS) {
        best.matched = true
        ;(compsBySlot[slot.uid] ??= []).push(best.comp)
      }
    }
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
      const rawSlotId =
        slotRel['contentSlot.uid'] ??
        slotRel.contentSlot ??
        slotRel.slotUid ??
        slotRel.slot ??
        ''
      const slotId = stripCatalogPrefix(rawSlotId)
      const comps = compsBySlot[slotId] ?? []

      for (const comp of comps) {
        // Primary content (English / default)
        // Column name variants across Hybris versions:
        //   html_en (newer exports), content, htmlContent, content_en, htmlContent_en
        const en =
          comp.html_en ??
          comp.content ??
          comp.htmlContent ??
          comp.content_en ??
          comp.htmlContent_en ??
          ''
        if (en) html.en.push(en)

        // Additional locale variants
        for (const lang of ['de', 'fr', 'it', 'es']) {
          const v =
            comp[`html_${lang}`] ??
            comp[`content_${lang}`] ??
            comp[`htmlContent_${lang}`] ??
            ''
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
      // Strip Hybris enum type prefix (e.g. "active:CmsPageStatus" → "active")
      pageStatus: (page.pageStatus ?? page.approvalStatus ?? '').split(':')[0],
      // CSS and JS live directly on ContentPage in this export format,
      // not on the WCMSHTMLComponent. Fall back to component-level values
      // if the page fields are empty (other export formats).
      customCss:  page.css         || [...new Set(css)].join('\n'),
      customJs:   page.js          || [...new Set(js)].join('\n'),
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
      // Treat as published unless explicitly inactive — SAP exports often use
      // type references like "check:CmsApprovalStatus" rather than plain values.
      published: !p.pageStatus || !['INACTIVE', 'DISABLED'].includes(p.pageStatus.toUpperCase()),
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
