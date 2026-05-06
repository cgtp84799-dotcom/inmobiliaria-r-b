// src/shared/hooks/useSeo.js
// ─────────────────────────────────────────────────────────────
// Hooks utilitarios para SEO.
//
//   • useCanonical()   — construye la URL canónica absoluta limpia
//                        (sin query params de tracking) del path actual
//   • useRelatedCities() — retorna ciudades relacionadas con la actual
//                          para "zonas relacionadas" e internal linking
//   • useRelatedLinks() — genera los "explora también" links de una
//                         landing page según tipo/transacción/ciudad
// ─────────────────────────────────────────────────────────────

import { useMemo } from "react";
import { useLocation } from "react-router-dom";

import {
  findCity,
  findPropertyType,
  findTransaction,
  getRelatedCities,
  PROPERTY_TYPES,
  TRANSACTION_TYPES,
} from "../../core/config/geography.config";
import {
  buildCityUrl,
  buildTypeCityUrl,
} from "../../core/config/routes.config";
import { SITE_URL as BASE_URL } from '../../core/config/site.config';

const CONTENT_PARAMS = new Set([
  "ciudad", "operacion", "tipo", "min", "max",
  "hab", "ban", "q", "page", "orden", "sort",
]);

/** Retorna la URL canónica absoluta del path actual, sin tracking params. */
export function useCanonical() {
  const { pathname, search } = useLocation();

  return useMemo(() => {
    if (!search) return `${BASE_URL}${pathname}`;
    const params = new URLSearchParams(search);
    const clean = new URLSearchParams();
    for (const [key, val] of params.entries()) {
      if (CONTENT_PARAMS.has(key.toLowerCase()) && val) {
        clean.append(key, val);
      }
    }
    const qs = clean.toString();
    return qs ? `${BASE_URL}${pathname}?${qs}` : `${BASE_URL}${pathname}`;
  }, [pathname, search]);
}

/**
 * Ciudades relacionadas a una ciudad dada (para "zonas cercanas").
 * @param {string} citySlug - slug de la ciudad actual
 * @param {number} [limit=6]
 * @returns {Array<{slug, name, department, url}>}
 */
export function useRelatedCities(citySlug, limit = 6) {
  return useMemo(() => {
    const related = getRelatedCities(citySlug, limit);
    return related.map((c) => ({
      slug: c.slug,
      name: c.name,
      department: c.department,
      url: buildCityUrl(c.slug),
    }));
  }, [citySlug, limit]);
}

/**
 * Genera links internos relacionados a una landing page.
 * Ejemplo: si estás en "casas-en-venta-manizales", sugiere
 * "apartamentos-en-venta-manizales", "casas-en-arriendo-manizales",
 * "casas-en-venta-pereira", etc.
 */
export function useRelatedLinks({ citySlug, typeSlug, transactionSlug }) {
  return useMemo(() => {
    const city = findCity(citySlug);
    const type = findPropertyType(typeSlug);
    const tx = findTransaction(transactionSlug);

    const links = [];

    // 1) Otros tipos en la misma ciudad y transacción
    if (city && tx) {
      for (const pt of PROPERTY_TYPES) {
        if (pt.slug === type?.slug) continue;
        links.push({
          label: `${pt.labelPlural} ${tx.labelVerb} en ${city.name}`,
          url: buildTypeCityUrl({ type: pt.plural, transaction: tx.slug, city: city.slug }),
        });
      }
    }

    // 2) La otra transacción del mismo tipo/ciudad
    if (city && type && tx) {
      const otherTx = TRANSACTION_TYPES.find((t) => t.slug !== tx.slug);
      if (otherTx) {
        links.push({
          label: `${type.labelPlural} ${otherTx.labelVerb} en ${city.name}`,
          url: buildTypeCityUrl({ type: type.plural, transaction: otherTx.slug, city: city.slug }),
        });
      }
    }

    // 3) El mismo tipo/tx en ciudades relacionadas
    if (city && type && tx) {
      const related = getRelatedCities(city.slug, 4);
      for (const rc of related) {
        links.push({
          label: `${type.labelPlural} ${tx.labelVerb} en ${rc.name}`,
          url: buildTypeCityUrl({ type: type.plural, transaction: tx.slug, city: rc.slug }),
        });
      }
    }

    // 4) Fallback si faltan tipo o transacción — ciudades relacionadas
    if (links.length === 0 && city) {
      const related = getRelatedCities(city.slug, 6);
      for (const rc of related) {
        links.push({
          label: `Propiedades en ${rc.name}`,
          url: buildCityUrl(rc.slug),
        });
      }
    }

    // Dedup y cap a 12 links
    const seen = new Set();
    return links
      .filter((l) => {
        if (seen.has(l.url)) return false;
        seen.add(l.url);
        return true;
      })
      .slice(0, 12);
  }, [citySlug, typeSlug, transactionSlug]);
}