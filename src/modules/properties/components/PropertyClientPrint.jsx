import { useEffect, useMemo, useRef, useState } from 'react';
import './PropertyClientPrint.css';
import {
  fmt,
  safeFilename,
  downloadPDFExactVisual,
} from '../utils/pdfUtils';

const TX = {
  venta: 'EN VENTA',
  arriendo: 'EN ARRIENDO',
  both: 'VENTA / ARRIENDO',
};

const ST = {
  disponible: 'DISPONIBLE',
  reservada: 'RESERVADA',
  vendida: 'VENDIDA',
  arrendada: 'ARRENDADA',
};

const chunk = (arr = [], size = 4) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const normalizeList = (arr = []) =>
  arr.filter(Boolean).map((v) => String(v).trim()).filter(Boolean);

const shorten = (text = '', max = 950) =>
  text.length > max ? `${text.slice(0, max).trim()}…` : text;

const cleanImages = (arr = []) =>
  (arr || [])
    .filter((img) => typeof img === 'string')
    .map((img) => img.trim())
    .filter(Boolean);

const fillGallerySlots = (arr = [], count = 4) => {
  const valid = cleanImages(arr);
  if (!valid.length) return [];
  const out = [];
  for (let i = 0; i < count; i++) out.push(valid[i % valid.length]);
  return out;
};

const getOptionalGalleryGroups = (arr = [], startIndex = 0, minRequired = 2, size = 4) => {
  const valid = cleanImages(arr).slice(startIndex);
  if (valid.length < minRequired) return [];
  return chunk(valid, size);
};

export default function PropertyClientPrint({ property, onClose }) {
  const docRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [, setScale] = useState(1);

  // ★ FIX rules-of-hooks: hooks deben llamarse SIEMPRE en el mismo orden.
  // Antes: `if (!property) return null;` antes de useMemo/useEffect → bug.
  // Ahora: computamos con fallback seguro y el early return va AL FINAL,
  // justo antes del render (pero después de todos los hooks).
  const safeProperty = property || {};

  const allImages = cleanImages(safeProperty.images || []);
  const logo = '/favicon.ico';
  const hero = allImages[0] || '';
  const afterHero = allImages.slice(1);
  const basePool = afterHero.length ? afterHero : allImages;

  const galleryPrimary = fillGallerySlots(basePool, 4);
  const galleryComplementary = fillGallerySlots(
    afterHero.slice(4).length ? afterHero.slice(4) : basePool,
    4
  );

  const extraGalleryGroups = useMemo(
    () => getOptionalGalleryGroups(afterHero, 8, 2, 4),
    [safeProperty.images]
  );

  const txLabel = TX[safeProperty.transactionType] ?? 'PROPIEDAD';
  const stLabel = ST[safeProperty.status] ?? (safeProperty.status || '').toUpperCase();
  const txCls = `chip-${safeProperty.transactionType || 'venta'}`;
  const stCls = `chip-${safeProperty.status || 'disponible'}`;
  const isArriendo = safeProperty.transactionType === 'arriendo';

  const loc = [
    safeProperty.address,
    safeProperty.neighborhood,
    safeProperty.city,
    safeProperty.department,
  ].filter(Boolean).join(', ');

  const amenities = normalizeList([
    ...(safeProperty.amenities ?? []),
    ...(safeProperty.customAmenities ?? []),
  ]);

  const stats = [
    safeProperty.area ? { label: 'Área total', value: `${Number(safeProperty.area).toLocaleString('es-CO')} m²` } : null,
    safeProperty.builtArea ? { label: 'Área const.', value: `${Number(safeProperty.builtArea).toLocaleString('es-CO')} m²` } : null,
    safeProperty.rooms ? { label: 'Habitaciones', value: safeProperty.rooms } : null,
    safeProperty.bathrooms ? { label: 'Baños', value: safeProperty.bathrooms } : null,
    safeProperty.parkingSpots ? { label: 'Parqueaderos', value: safeProperty.parkingSpots } : null,
    safeProperty.floors ? { label: 'Niveles', value: safeProperty.floors } : null,
    safeProperty.stratum ? { label: 'Estrato', value: safeProperty.stratum } : null,
    safeProperty.yearBuilt ? { label: 'Año const.', value: safeProperty.yearBuilt } : null,
  ].filter(Boolean);

  const featureRows = [
    ['Tipo de inmueble', safeProperty.type],
    ['Área total', safeProperty.area ? `${Number(safeProperty.area).toLocaleString('es-CO')} m²` : null],
    ['Área construida', safeProperty.builtArea ? `${Number(safeProperty.builtArea).toLocaleString('es-CO')} m²` : null],
    ['Habitaciones', safeProperty.rooms],
    ['Baños', safeProperty.bathrooms],
    ['Parqueaderos', safeProperty.parkingSpots],
    ['Pisos / niveles', safeProperty.floors],
    ['Año de construcción', safeProperty.yearBuilt],
    ['Estrato', safeProperty.stratum],
  ].filter(([, v]) => v || v === 0);

  const locationRows = [
    ['Dirección', safeProperty.address],
    ['Barrio / Vereda', safeProperty.neighborhood],
    ['Ciudad', safeProperty.city],
    ['Departamento', safeProperty.department],
  ].filter(([, v]) => v || v === 0);

  const priceRows = [
    [isArriendo ? 'Canon de arriendo' : 'Precio de venta', safeProperty.price ? fmt(safeProperty.price) : null],
    ['Administración', safeProperty.administrationFee ? fmt(safeProperty.administrationFee) : null],
    ['Depósito', safeProperty.rentalDeposit ? `${safeProperty.rentalDeposit} meses` : null],
    ['Período mínimo', safeProperty.minimumRentalPeriod ? `${safeProperty.minimumRentalPeriod} meses` : null],
  ].filter(([, v]) => v || v === 0);

  const amenityGroups = useMemo(() => chunk(amenities, 12), [amenities]);

  const hasThirdPage =
    extraGalleryGroups.length > 0 ||
    amenityGroups.length > 1 ||
    (safeProperty.description && safeProperty.description.length > 1000);

  const totalPages = hasThirdPage ? 3 : 2;

  useEffect(() => {
    const el = docRef.current;
    if (!el) return;

    const updateScale = () => {
      const isSmall = window.innerWidth < 980;
      if (isSmall) {
        setScale(1);
        el.style.transform = '';
        el.style.transformOrigin = '';
        const wrapper = el.parentElement;
        if (wrapper) wrapper.style.height = 'auto';
        return;
      }

      const available = window.innerWidth - 48;
      const s = Math.min(1, available / 794);
      setScale(s);
      el.style.transform = s < 1 ? `scale(${s})` : '';
      el.style.transformOrigin = 'top center';

      const wrapper = el.parentElement;
      if (wrapper) {
        wrapper.style.height = s < 1 ? `${el.scrollHeight * s + 40}px` : 'auto';
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [property]);

  // ★ Early return AQUÍ (después de todos los hooks) — cumple rules-of-hooks
  if (!property) return null;

  const handleDownload = async () => {
    setLoading(true);
    try {
      await downloadPDFExactVisual(
        docRef,
        `Brochure-${safeFilename(property.title || 'Propiedad')}.pdf`,
        '.cflyer-page'
      );
    } catch (e) {
      console.error(e);
      alert(`Error al descargar el PDF: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const Header = ({ subtitle }) => (
    <header className="cf-header avoid-break">
      <div className="cf-brand">
        <div className="cf-logo-wrap">
          {logo ? (
            <img src={logo} alt="Logo" className="cf-logo" />
          ) : (
            <span className="cf-logo-fallback">RB</span>
          )}
        </div>
        <div className="cf-brand-text">
          <div className="cf-brand-name">INMOBILIARIA RINCÓN BEDOYA Y ASOCIADOS</div>
          <div className="cf-brand-sub">
            {subtitle || 'Venta · Arriendo · Finca raíz · Asesoría personalizada'}
          </div>
        </div>
      </div>
      <div className="cf-header-right">
        <strong>310 596 8202 · 320 673 6391</strong>
        <span>inmobiliaria-ryb-y-asociados.com</span>
      </div>
    </header>
  );

  const Footer = ({ page }) => (
    <footer className="cf-footer avoid-break">
      <div className="cf-footer-top">
        <div className="cf-footer-cta">Dé el siguiente paso hacia su nueva propiedad</div>
        <div className="cf-footer-contact">
          <span>📞 310 596 8202</span>
          <span>📞 320 673 6391</span>
          <span>🌐 inmobiliaria-ryb-y-asociados.com</span>
          <span>📍 Cra 5 #9-28, Anserma, Caldas</span>
        </div>
      </div>
      <div className="cf-footer-bottom">
        <span>Información sujeta a verificación</span>
        <span>Ref: {property.id?.substring(0, 8).toUpperCase() || 'N/A'}</span>
        <span>Pág. {page}/{totalPages}</span>
      </div>
    </footer>
  );

  const Row = ({ label, value }) => {
    if (!value && value !== 0) return null;
    return (
      <tr>
        <td className="cf-td-lbl">{label}</td>
        <td className="cf-td-val">{value}</td>
      </tr>
    );
  };

  const SecHd = ({ children }) => <div className="cf-sec-hd">{children}</div>;

  const MosaicGallery = ({ items = [], compact = false }) => {
    const normalized = fillGallerySlots(items, 4);

    if (!normalized.length) {
      return (
        <div className={`cf-gallery-empty${compact ? ' compact' : ''}`}>
          Próximamente más imágenes de esta propiedad
        </div>
      );
    }

    return (
      <div
        className={`cf-gallery-mosaic${compact ? ' compact' : ''}`}
        data-count={Math.min(normalized.length, 4)}
      >
        {normalized.slice(0, 4).map((img, i) => (
          <div
            key={`${img}-${i}`}
            className="cf-thumb"
            style={{ backgroundImage: `url(${img})` }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="cflyer-backdrop" onClick={onClose}>
      <div className="cflyer-toolbar no-print" onClick={(e) => e.stopPropagation()}>
        <button onClick={handleDownload} disabled={loading} className="cflyer-btn-dl">
          {loading ? '⏳ Generando PDF exacto...' : '⬇ Descargar Brochure'}
        </button>
        <button onClick={onClose} className="cflyer-btn-cl">✕ Cerrar</button>
      </div>

      <div className="cflyer-scale-wrapper" onClick={(e) => e.stopPropagation()}>
        <div ref={docRef} className="cflyer-root">
          <section className="cflyer-page">
            <div className="cf-rule" />
            <Header />

            {hero ? (
              <div className="cf-hero" style={{ backgroundImage: `url(${hero})` }}>
                <div className="cf-hero-overlay">
                  <div className="cf-hero-top">
                    <div className="cf-chips">
                      <span className={`cf-chip ${txCls}`}>{txLabel}</span>
                      <span className={`cf-chip ${stCls}`}>{stLabel}</span>
                      <span className="cf-chip chip-type">
                        {(property.type || 'Inmueble').toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="cf-hero-bottom">
                    <h1 className="cf-hero-title">{property.title || 'Propiedad Exclusiva'}</h1>
                    <p className="cf-hero-loc">{loc || 'Ubicación no especificada'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="cf-hero-empty">
                <div className="cf-hero-empty-inner">
                  <div className="cf-chips">
                    <span className={`cf-chip ${txCls}`}>{txLabel}</span>
                    <span className={`cf-chip ${stCls}`}>{stLabel}</span>
                  </div>
                  <h1 className="cf-hero-title">{property.title || 'Propiedad Exclusiva'}</h1>
                  <p className="cf-hero-loc">{loc || 'Ubicación no especificada'}</p>
                </div>
              </div>
            )}

            <div className="cf-cover-band avoid-break">
              <div className="cf-cover-price">
                <div className="cpc-lbl">{isArriendo ? 'CANON DE ARRIENDO' : 'INVERSIÓN'}</div>
                <div className="cpc-val">{fmt(property.price)}</div>
                {isArriendo && <div className="cpc-sub">Mensual</div>}
              </div>

              <div className="cf-cover-summary">
                <div><strong>Tipo:</strong> {property.type || 'Inmueble'}</div>
                <div><strong>Estado:</strong> {stLabel}</div>
                <div><strong>Modalidad:</strong> {txLabel}</div>
              </div>
            </div>

            <div className="cf-stats avoid-break">
              {stats.slice(0, 8).map((item) => (
                <div key={item.label} className="cf-stat">
                  <b>{item.value}</b>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            <div className="cf-main-grid">
              <div className="cf-main-copy avoid-break">
                <SecHd>Acerca de esta propiedad</SecHd>
                <p className="cf-desc">
                  {shorten(property.description || 'Propiedad disponible con información sujeta a actualización.', 1250)}
                </p>
              </div>

              <div className="cf-main-gallery avoid-break">
                <SecHd>Galería destacada</SecHd>
                <MosaicGallery items={galleryPrimary} />
              </div>
            </div>

            <Footer page={1} />
            <div className="cf-rule" />
          </section>

          <section className="cflyer-page">
            <div className="cf-rule" />
            <Header subtitle="Ficha Técnica y Detalles" />

            <div className="cf-page-banner avoid-break">
              ESPECIFICACIONES — {(property.title || 'Propiedad').substring(0, 56)}
            </div>

            <div className="cf-two-col">
              <div className="cf-stack-col">
                <div className="cf-block avoid-break">
                  <SecHd>Características físicas</SecHd>
                  <table className="cf-table">
                    <tbody>
                      {featureRows.map(([label, value]) => (
                        <Row key={label} label={label} value={value} />
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="cf-block avoid-break">
                  <SecHd>Ubicación</SecHd>
                  <table className="cf-table">
                    <tbody>
                      {locationRows.map(([label, value]) => (
                        <Row key={label} label={label} value={value} />
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="cf-block avoid-break">
                  <SecHd>{isArriendo ? 'Condiciones económicas' : 'Precio y negociación'}</SecHd>
                  <table className="cf-table">
                    <tbody>
                      {priceRows.map(([label, value]) => (
                        <Row key={label} label={label} value={value} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="cf-stack-col">
                <div className="cf-block avoid-break">
                  <SecHd>Amenidades exclusivas</SecHd>
                  {amenities.length > 0 ? (
                    <ul className="cf-amenities">
                      {amenityGroups[0]?.map((a) => <li key={a}>{a}</li>)}
                    </ul>
                  ) : (
                    <div className="cf-empty-box">Esta propiedad no registra amenidades adicionales por el momento.</div>
                  )}
                </div>

                <div className="cf-block avoid-break">
                  <SecHd>Galería complementaria</SecHd>
                  <MosaicGallery items={galleryComplementary} compact />
                </div>

                <div className="cf-highlight-card avoid-break">
                  <div className="cf-highlight-kicker">Atención personalizada</div>
                  <p>
                    Nuestro equipo le acompaña durante todo el proceso de visita,
                    negociación, documentación y cierre.
                  </p>
                </div>
              </div>
            </div>

            <div className="cf-disclaimer avoid-break">
              La información de esta propiedad tiene carácter informativo y está sujeta a verificación.
              Áreas, precios, disponibilidad, imágenes y condiciones pueden cambiar sin previo aviso.
              Para confirmar datos actualizados comuníquese al <strong>310 596 8202</strong>.
            </div>

            <Footer page={2} />
            <div className="cf-rule" />
          </section>

          {hasThirdPage && (
            <section className="cflyer-page">
              <div className="cf-rule" />
              <Header subtitle="Galería Ampliada y Complementos" />

              <div className="cf-page-banner avoid-break">
                IMÁGENES Y COMPLEMENTOS — {(property.title || 'Propiedad').substring(0, 56)}
              </div>

              <div className="cf-two-col">
                <div className="cf-stack-col">
                  {amenityGroups.slice(1).map((group, idx) => (
                    <div key={idx} className="cf-block avoid-break">
                      <SecHd>{`Amenidades adicionales ${idx + 2}`}</SecHd>
                      <ul className="cf-amenities">
                        {group.map((a) => <li key={a}>{a}</li>)}
                      </ul>
                    </div>
                  ))}

                  {property.description && property.description.length > 1000 && (
                    <div className="cf-block avoid-break">
                      <SecHd>Descripción extendida</SecHd>
                      <p className="cf-desc cf-desc-extended">{property.description}</p>
                    </div>
                  )}
                </div>

                <div className="cf-stack-col">
                  {extraGalleryGroups.length > 0 &&
                    extraGalleryGroups.map((group, idx) => (
                      <div key={idx} className="cf-block avoid-break">
                        <SecHd>{`Galería adicional ${idx + 1}`}</SecHd>
                        <MosaicGallery items={group} compact />
                      </div>
                    ))}
                </div>
              </div>

              <div className="cf-disclaimer avoid-break">
                Brochure comercial elaborado por Inmobiliaria Rincón Bedoya y Asociados.
                Solicite acompañamiento de un asesor para información actualizada y visita programada.
              </div>

              <Footer page={3} />
              <div className="cf-rule" />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
