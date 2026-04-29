// ═══════════════════════════════════════════════════════════════════════════
//  Inyector de Schema.org JSON-LD
//
//  PROBLEMA: el CSP endurecido ya no permite <script type="application/ld+json">
//  inline sin nonce. Firebase Hosting no soporta nonces dinámicos.
//
//  SOLUCIÓN: cargamos el JSON-LD desde un archivo estático y lo inyectamos
//  como <script type="application/ld+json"> en el head. Los crawlers modernos
//  (Googlebot, Bingbot) ejecutan JavaScript, así que ven el schema igual.
//
//  Para crawlers antiguos / redes sociales, el prerender de Cloud Functions
//  ya inyecta el schema server-side. Esto cubre el caso del usuario normal.
// ═══════════════════════════════════════════════════════════════════════════

(function injectSchemaLD() {
  fetch('/schema-ld.json', { cache: 'default' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data) return;
      var script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(data);
      document.head.appendChild(script);
    })
    .catch(function () { /* silencioso: SEO no debe romper UX */ });
})();
