// src/shared/components/SEO/index.js
// ─────────────────────────────────────────────────────────────
// Barrel export del sistema SEO. Punto único de import:
//
//   import {
//     SeoHead,
//     SeoTextBlock,
//     buildBreadcrumbSchema,
//     buildFaqSchema,
//     buildItemListSchema,
//     buildRealEstateListingSchema,
//     buildLocalBusinessSchema,
//     buildCollectionPageSchema,
//     HOMEPAGE_FAQS,
//     CATALOG_FAQS,
//     buildZoneFaqs,
//     buildZoneSeoParagraphs,
//     buildZoneKeywords,
//     buildZoneSeoTitle,
//     buildZoneSeoDescription,
//   } from '@/shared/components/SEO';
//
// Cada nombre ha sido verificado contra los `export` reales en:
//   · SeoHead.jsx        (default export)
//   · SeoTextBlock.jsx   (default export)
//   · schemaBuilders.js  (6 named exports)
//   · seoContent.js      (2 constantes + 5 funciones)
// ─────────────────────────────────────────────────────────────

export { default as SeoHead } from "./SeoHead";
export { default as SeoTextBlock } from "./SeoTextBlock";

export {
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildItemListSchema,
  buildRealEstateListingSchema,
  buildLocalBusinessSchema,
  buildCollectionPageSchema,
} from "./schemaBuilders";

export {
  HOMEPAGE_FAQS,
  CATALOG_FAQS,
  buildZoneFaqs,
  buildZoneSeoParagraphs,
  buildZoneKeywords,
  buildZoneSeoTitle,
  buildZoneSeoDescription,
} from "./seoContent";