/**
 * src/core/config/geography.config.js
 * ─────────────────────────────────────────────────────────────
 * Single source of truth para la geografía colombiana que usa el SEO.
 *
 * Exports requeridos por el resto del proyecto:
 *   · findCity            — lookup por slug/alias/nombre
 *   · findDepartment      — lookup por slug/nombre
 *   · findPropertyType    — lookup por slug/plural/singular/alias
 *   · findTransaction     — lookup por slug/alias
 *   · getRelatedCities    — ciudades cercanas para internal linking
 *   · getCitiesByDepartment
 *   · getTier1Cities, getHomeRegionCities, getCityCount, getDepartmentCount
 *   · PROPERTY_TYPES, TRANSACTION_TYPES, DEPARTMENTS, CITIES
 * ─────────────────────────────────────────────────────────────
 */

/* ═══════════════════════════════════════════════════════════════════════════
 *  DEPARTAMENTOS
 * ═══════════════════════════════════════════════════════════════════════════ */

export const DEPARTMENTS = [
  { slug: 'amazonas',          name: 'Amazonas',           capital: 'leticia',          tier: 3 },
  { slug: 'antioquia',         name: 'Antioquia',          capital: 'medellin',         tier: 1 },
  { slug: 'arauca',            name: 'Arauca',             capital: 'arauca',           tier: 3 },
  { slug: 'atlantico',         name: 'Atlántico',          capital: 'barranquilla',     tier: 1 },
  { slug: 'bogota-dc',         name: 'Bogotá D.C.',        capital: 'bogota',           tier: 1, isCapitalDistrict: true },
  { slug: 'bolivar',           name: 'Bolívar',            capital: 'cartagena',        tier: 1 },
  { slug: 'boyaca',            name: 'Boyacá',             capital: 'tunja',            tier: 2 },
  { slug: 'caldas',            name: 'Caldas',             capital: 'manizales',        tier: 1, isHomeDepartment: true },
  { slug: 'caqueta',           name: 'Caquetá',            capital: 'florencia',        tier: 3 },
  { slug: 'casanare',          name: 'Casanare',           capital: 'yopal',            tier: 3 },
  { slug: 'cauca',             name: 'Cauca',              capital: 'popayan',          tier: 2 },
  { slug: 'cesar',             name: 'Cesar',              capital: 'valledupar',       tier: 2 },
  { slug: 'choco',             name: 'Chocó',              capital: 'quibdo',           tier: 3 },
  { slug: 'cordoba',           name: 'Córdoba',            capital: 'monteria',         tier: 2 },
  { slug: 'cundinamarca',      name: 'Cundinamarca',       capital: 'bogota',           tier: 1 },
  { slug: 'guainia',           name: 'Guainía',            capital: 'inirida',          tier: 3 },
  { slug: 'guaviare',          name: 'Guaviare',           capital: 'san-jose-del-guaviare', tier: 3 },
  { slug: 'huila',             name: 'Huila',              capital: 'neiva',            tier: 2 },
  { slug: 'la-guajira',        name: 'La Guajira',         capital: 'riohacha',         tier: 3 },
  { slug: 'magdalena',         name: 'Magdalena',          capital: 'santa-marta',      tier: 2 },
  { slug: 'meta',              name: 'Meta',               capital: 'villavicencio',    tier: 2 },
  { slug: 'narino',            name: 'Nariño',             capital: 'pasto',            tier: 2 },
  { slug: 'norte-de-santander',name: 'Norte de Santander', capital: 'cucuta',           tier: 2 },
  { slug: 'putumayo',          name: 'Putumayo',           capital: 'mocoa',            tier: 3 },
  { slug: 'quindio',           name: 'Quindío',            capital: 'armenia',          tier: 1, isHomeRegion: true },
  { slug: 'risaralda',         name: 'Risaralda',          capital: 'pereira',          tier: 1, isHomeRegion: true },
  { slug: 'san-andres-y-providencia', name: 'San Andrés y Providencia', capital: 'san-andres', tier: 3 },
  { slug: 'santander',         name: 'Santander',          capital: 'bucaramanga',      tier: 1 },
  { slug: 'sucre',             name: 'Sucre',              capital: 'sincelejo',        tier: 2 },
  { slug: 'tolima',            name: 'Tolima',             capital: 'ibague',           tier: 2 },
  { slug: 'valle-del-cauca',   name: 'Valle del Cauca',    capital: 'cali',             tier: 1 },
  { slug: 'vaupes',            name: 'Vaupés',             capital: 'mitu',             tier: 3 },
  { slug: 'vichada',           name: 'Vichada',            capital: 'puerto-carreno',   tier: 3 },
];

/* ═══════════════════════════════════════════════════════════════════════════
 *  CIUDADES
 * ═══════════════════════════════════════════════════════════════════════════ */

export const CITIES = [
  // Eje cafetero
  { slug: 'anserma',     name: 'Anserma',      department: 'caldas',    lat: 5.2383,  lng: -75.7850, population:  35000, tier: 1, priority: 0.95, isHeadquarters: true, aliases: ['anserma-caldas'] },
  { slug: 'manizales',   name: 'Manizales',    department: 'caldas',    lat: 5.0703,  lng: -75.5138, population: 400000, tier: 1, priority: 0.95 },
  { slug: 'pereira',     name: 'Pereira',      department: 'risaralda', lat: 4.8133,  lng: -75.6961, population: 475000, tier: 1, priority: 0.95 },
  { slug: 'armenia',     name: 'Armenia',      department: 'quindio',   lat: 4.5339,  lng: -75.6811, population: 300000, tier: 1, priority: 0.9 },
  { slug: 'dosquebradas',name: 'Dosquebradas', department: 'risaralda', lat: 4.8333,  lng: -75.6833, population: 210000, tier: 1, priority: 0.85, aliases: ['dos-quebradas'] },
  { slug: 'chinchina',   name: 'Chinchiná',    department: 'caldas',    lat: 4.9833,  lng: -75.6000, population:  55000, tier: 2, priority: 0.75 },
  { slug: 'villamaria',  name: 'Villamaría',   department: 'caldas',    lat: 5.0425,  lng: -75.5144, population:  60000, tier: 2, priority: 0.7 },
  { slug: 'riosucio',    name: 'Riosucio',     department: 'caldas',    lat: 5.4200,  lng: -75.7025, population:  60000, tier: 2, priority: 0.8 },
  { slug: 'supia',       name: 'Supía',        department: 'caldas',    lat: 5.4506,  lng: -75.6494, population:  27000, tier: 2, priority: 0.75 },
  { slug: 'belalcazar',  name: 'Belalcázar',   department: 'caldas',    lat: 4.9956,  lng: -75.8081, population:  11000, tier: 2, priority: 0.7 },
  { slug: 'filadelfia',  name: 'Filadelfia',   department: 'caldas',    lat: 5.2956,  lng: -75.5608, population:  12000, tier: 2, priority: 0.7 },
  { slug: 'la-merced',   name: 'La Merced',    department: 'caldas',    lat: 5.3994,  lng: -75.5483, population:   5500, tier: 3, priority: 0.65 },
  { slug: 'marmato',     name: 'Marmato',      department: 'caldas',    lat: 5.4758,  lng: -75.6011, population:   9000, tier: 3, priority: 0.65 },
  { slug: 'quinchia',    name: 'Quinchía',     department: 'risaralda', lat: 5.3372,  lng: -75.7283, population:  33000, tier: 2, priority: 0.7 },
  { slug: 'la-virginia', name: 'La Virginia',  department: 'risaralda', lat: 4.8994,  lng: -75.8800, population:  32000, tier: 2, priority: 0.7 },
  { slug: 'santa-rosa-de-cabal', name: 'Santa Rosa de Cabal', department: 'risaralda', lat: 4.8719, lng: -75.6239, population: 75000, tier: 2, priority: 0.75 },
  { slug: 'viterbo',     name: 'Viterbo',      department: 'caldas',    lat: 5.0622,  lng: -75.8717, population:  12000, tier: 3, priority: 0.65 },
  { slug: 'neira',       name: 'Neira',        department: 'caldas',    lat: 5.1667,  lng: -75.5167, population:  30000, tier: 3, priority: 0.65 },
  { slug: 'salamina',    name: 'Salamina',     department: 'caldas',    lat: 5.4075,  lng: -75.4881, population:  17000, tier: 3, priority: 0.65 },

  // Expansión nacional
  { slug: 'bogota',      name: 'Bogotá',       department: 'bogota-dc', lat: 4.7110,  lng: -74.0721, population: 7900000, tier: 1, priority: 0.95, aliases: ['bogota-dc', 'santa-fe-de-bogota'] },
  { slug: 'medellin',    name: 'Medellín',     department: 'antioquia', lat: 6.2442,  lng: -75.5812, population: 2500000, tier: 1, priority: 0.95 },
  { slug: 'cali',        name: 'Cali',         department: 'valle-del-cauca', lat: 3.4516, lng: -76.5320, population: 2200000, tier: 1, priority: 0.95, aliases: ['santiago-de-cali'] },
  { slug: 'barranquilla',name: 'Barranquilla', department: 'atlantico', lat: 10.9685, lng: -74.7813, population: 1200000, tier: 1, priority: 0.9 },
  { slug: 'cartagena',   name: 'Cartagena',    department: 'bolivar',   lat: 10.3910, lng: -75.4794, population: 1000000, tier: 1, priority: 0.9, aliases: ['cartagena-de-indias'] },
  { slug: 'bucaramanga', name: 'Bucaramanga',  department: 'santander', lat: 7.1193,  lng: -73.1227, population:  580000, tier: 1, priority: 0.9 },
  { slug: 'cucuta',      name: 'Cúcuta',       department: 'norte-de-santander', lat: 7.8939, lng: -72.5078, population: 700000, tier: 1, priority: 0.85, aliases: ['san-jose-de-cucuta'] },
  { slug: 'santa-marta', name: 'Santa Marta',  department: 'magdalena', lat: 11.2408, lng: -74.1990, population:  500000, tier: 1, priority: 0.85 },
  { slug: 'ibague',      name: 'Ibagué',       department: 'tolima',    lat: 4.4389,  lng: -75.2322, population:  550000, tier: 1, priority: 0.85 },
  { slug: 'villavicencio',name: 'Villavicencio', department: 'meta',    lat: 4.1420,  lng: -73.6266, population:  530000, tier: 1, priority: 0.85 },
  { slug: 'pasto',       name: 'Pasto',        department: 'narino',    lat: 1.2136,  lng: -77.2811, population:  450000, tier: 2, priority: 0.8, aliases: ['san-juan-de-pasto'] },
  { slug: 'monteria',    name: 'Montería',     department: 'cordoba',   lat: 8.7479,  lng: -75.8814, population:  490000, tier: 2, priority: 0.8 },
  { slug: 'sincelejo',   name: 'Sincelejo',    department: 'sucre',     lat: 9.3047,  lng: -75.3978, population:  290000, tier: 2, priority: 0.8 },
  { slug: 'valledupar',  name: 'Valledupar',   department: 'cesar',     lat: 10.4631, lng: -73.2532, population:  490000, tier: 2, priority: 0.8 },
  { slug: 'popayan',     name: 'Popayán',      department: 'cauca',     lat: 2.4448,  lng: -76.6147, population:  280000, tier: 2, priority: 0.75 },
  { slug: 'neiva',       name: 'Neiva',        department: 'huila',     lat: 2.9273,  lng: -75.2819, population:  355000, tier: 2, priority: 0.8 },
  { slug: 'tunja',       name: 'Tunja',        department: 'boyaca',    lat: 5.5353,  lng: -73.3678, population:  195000, tier: 2, priority: 0.75 },
  { slug: 'riohacha',    name: 'Riohacha',     department: 'la-guajira',lat: 11.5444, lng: -72.9072, population:  280000, tier: 3, priority: 0.7 },
  { slug: 'florencia',   name: 'Florencia',    department: 'caqueta',   lat: 1.6144,  lng: -75.6062, population:  180000, tier: 3, priority: 0.7 },
  { slug: 'yopal',       name: 'Yopal',        department: 'casanare',  lat: 5.3378,  lng: -72.3959, population:  175000, tier: 3, priority: 0.7 },
];

/* ═══════════════════════════════════════════════════════════════════════════
 *  TIPOS DE PROPIEDAD
 * ═══════════════════════════════════════════════════════════════════════════ */

export const PROPERTY_TYPES = [
  { slug: 'casa',        plural: 'casas',        singular: 'casa',        label: 'Casa',            labelPlural: 'Casas',             icon: 'home' },
  { slug: 'apartamento', plural: 'apartamentos', singular: 'apartamento', label: 'Apartamento',     labelPlural: 'Apartamentos',      icon: 'building', aliases: ['apto', 'apartaestudio'] },
  { slug: 'finca',       plural: 'fincas',       singular: 'finca',       label: 'Finca',           labelPlural: 'Fincas',            icon: 'tree', aliases: ['parcela'] },
  { slug: 'lote',        plural: 'lotes',        singular: 'lote',        label: 'Lote',            labelPlural: 'Lotes',             icon: 'map-pin', aliases: ['terreno'] },
  { slug: 'local',       plural: 'locales',      singular: 'local',       label: 'Local comercial', labelPlural: 'Locales comerciales', icon: 'store', aliases: ['comercial', 'local-comercial'] },
  { slug: 'oficina',     plural: 'oficinas',     singular: 'oficina',     label: 'Oficina',         labelPlural: 'Oficinas',          icon: 'briefcase' },
  { slug: 'bodega',      plural: 'bodegas',      singular: 'bodega',      label: 'Bodega',          labelPlural: 'Bodegas',           icon: 'warehouse', aliases: ['warehouse'] },
];

/* ═══════════════════════════════════════════════════════════════════════════
 *  TIPOS DE TRANSACCIÓN
 * ═══════════════════════════════════════════════════════════════════════════ */

export const TRANSACTION_TYPES = [
  { slug: 'venta',    label: 'Venta',    labelVerb: 'en venta',    internalValue: 'sale', aliases: ['compra', 'sale'] },
  { slug: 'arriendo', label: 'Arriendo', labelVerb: 'en arriendo', internalValue: 'rent', aliases: ['alquiler', 'renta', 'rent'] },
];

/* ═══════════════════════════════════════════════════════════════════════════
 *  HELPERS DE LOOKUP
 * ═══════════════════════════════════════════════════════════════════════════ */

const slugifyLocal = (s = '') =>
  String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

export const findCity = (input) => {
  if (!input) return null;
  const s = slugifyLocal(input);
  return (
    CITIES.find((c) => c.slug === s) ||
    CITIES.find((c) => Array.isArray(c.aliases) && c.aliases.includes(s)) ||
    CITIES.find((c) => slugifyLocal(c.name) === s) ||
    null
  );
};

export const findDepartment = (input) => {
  if (!input) return null;
  const s = slugifyLocal(input);
  return (
    DEPARTMENTS.find((d) => d.slug === s) ||
    DEPARTMENTS.find((d) => slugifyLocal(d.name) === s) ||
    null
  );
};

export const findPropertyType = (input) => {
  if (!input) return null;
  const s = slugifyLocal(input);
  return (
    PROPERTY_TYPES.find((t) => t.slug === s || t.plural === s || t.singular === s) ||
    PROPERTY_TYPES.find((t) => Array.isArray(t.aliases) && t.aliases.includes(s)) ||
    null
  );
};

export const findTransaction = (input) => {
  if (!input) return null;
  const s = slugifyLocal(input);
  return (
    TRANSACTION_TYPES.find((t) => t.slug === s) ||
    TRANSACTION_TYPES.find((t) => Array.isArray(t.aliases) && t.aliases.includes(s)) ||
    null
  );
};

export const getCitiesByDepartment = (departmentSlug) => {
  const d = slugifyLocal(departmentSlug);
  return CITIES.filter((c) => c.department === d).sort(
    (a, b) => (b.population || 0) - (a.population || 0)
  );
};

export const getTier1Cities = () => CITIES.filter((c) => c.tier === 1);

export const getHomeRegionCities = () =>
  CITIES.filter((c) => {
    const dep = DEPARTMENTS.find((d) => d.slug === c.department);
    return dep?.isHomeDepartment || dep?.isHomeRegion;
  });

export const getRelatedCities = (citySlug, limit = 6) => {
  const city = findCity(citySlug);
  if (!city) return [];
  const sameDept = CITIES.filter(
    (c) => c.department === city.department && c.slug !== city.slug
  );
  const sameTier = CITIES.filter(
    (c) => c.tier === city.tier && c.slug !== city.slug && c.department !== city.department
  );
  return [...sameDept, ...sameTier].slice(0, limit);
};

export const getCityCount = () => CITIES.length;
export const getDepartmentCount = () => DEPARTMENTS.length;