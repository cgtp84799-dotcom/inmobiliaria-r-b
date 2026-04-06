import { useMemo, useRef, useState } from 'react';
import './PropertyPrintView.css';
import { fmt, fmtDate, safeFilename, downloadPDFExactVisual } from '../utils/pdfUtils';

const TX = {
  venta: 'EN VENTA',
  arriendo: 'EN ARRIENDO',
  both: 'VENTA / ARRIENDO',
};

const TX_CLS = {
  venta: 'chip-venta',
  arriendo: 'chip-arriendo',
  both: 'chip-both',
};

const ST = {
  disponible: 'DISPONIBLE',
  reservada: 'RESERVADA',
  vendida: 'VENDIDA',
  arrendada: 'ARRENDADA',
};

const ST_CLS = {
  disponible: 'chip-disponible',
  reservada: 'chip-reservada',
  vendida: 'chip-vendida',
  arrendada: 'chip-arrendada',
};

function chunk(arr = [], size = 4) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function compactText(text = '', max = 420) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

function normalizeList(list = []) {
  return list.filter(Boolean).map((v) => String(v).trim()).filter(Boolean);
}

function cleanImages(list = []) {
  return (list || [])
    .filter((img) => typeof img === 'string')
    .map((img) => img.trim())
    .filter(Boolean);
}

function fillGallerySlots(list = [], count = 4) {
  const valid = cleanImages(list);
  if (!valid.length) return [];
  const out = [];
  for (let i = 0; i < count; i += 1) {
    out.push(valid[i % valid.length]);
  }
  return out;
}

function getOptionalGalleryGroups(list = [], startIndex = 0, minRequired = 2, size = 4) {
  const valid = cleanImages(list).slice(startIndex);
  if (valid.length < minRequired) return [];
  return chunk(valid, size);
}

export default function PropertyPrintView({ property, onClose }) {
  const docRef = useRef(null);
  const [loading, setLoading] = useState(false);

  if (!property) return null;

  const logoUrl = '/favicon.ico';

  const allImages = cleanImages(property.images || []);
  const heroUrl = allImages[0] || '';
  const afterHero = allImages.slice(1);
  const basePool = afterHero.length ? afterHero : allImages;

  const galleryMain = fillGallerySlots(basePool, 4);
  const galleryTechnical = fillGallerySlots(
    afterHero.slice(4).length ? afterHero.slice(4) : basePool,
    4
  );

  const extraGalleryGroups = useMemo(
    () => getOptionalGalleryGroups(afterHero, 8, 2, 4).slice(0, 1),
    [afterHero]
  );

  const handleDownload = async () => {
    setLoading(true);
    try {
      const safeTitle = safeFilename(property.title || 'propiedad');
      await downloadPDFExactVisual(
        docRef,
        `FichaAdmin-${safeTitle}.pdf`,
        '.ppv-page'
      );
    } catch (e) {
      console.error('PDF error', e);
      alert(`Error al generar PDF: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const isArriendo = property.transactionType === 'arriendo';
  const txLabel = TX[property.transactionType] ?? 'PROPIEDAD';
  const txCls = TX_CLS[property.transactionType] ?? 'chip-type';
  const stLabel = ST[property.status] ?? (property.status || '').toUpperCase();
  const stCls = ST_CLS[property.status] ?? 'chip-type';
  const refId = property.id ? property.id.substring(0, 8).toUpperCase() : 'SIN-REF';

  const loc = [
    property.address,
    property.neighborhood,
    property.city,
    property.department,
  ]
    .filter(Boolean)
    .join(', ');

  const amenities = normalizeList([
    ...(property.amenities ?? []),
    ...(property.customAmenities ?? []),
  ]);

  const documents = property.documents || [];

  const commission =
    property.commissionPercentage && property.price
      ? (Number(property.price) * Number(property.commissionPercentage)) / 100
      : null;

  const summaryStats = [
    property.area
      ? { label: 'Área total', value: `${Number(property.area).toLocaleString('es-CO')} m²` }
      : null,
    property.builtArea
      ? { label: 'Área const.', value: `${Number(property.builtArea).toLocaleString('es-CO')} m²` }
      : null,
    property.rooms ? { label: 'Habitaciones', value: property.rooms } : null,
    property.bathrooms ? { label: 'Baños', value: property.bathrooms } : null,
    property.parkingSpots ? { label: 'Parqueaderos', value: property.parkingSpots } : null,
    property.floors ? { label: 'Pisos', value: property.floors } : null,
    property.yearBuilt ? { label: 'Año const.', value: property.yearBuilt } : null,
    property.stratum ? { label: 'Estrato', value: property.stratum } : null,
  ].filter(Boolean);

  const featuresLeft = [
    ['Tipo de inmueble', property.type],
    ['Área total', property.area ? `${Number(property.area).toLocaleString('es-CO')} m²` : null],
    ['Área construida', property.builtArea ? `${Number(property.builtArea).toLocaleString('es-CO')} m²` : null],
    ['Habitaciones', property.rooms],
    ['Baños', property.bathrooms],
    ['Parqueaderos', property.parkingSpots],
    ['Pisos / niveles', property.floors],
    ['Año de construcción', property.yearBuilt],
    ['Estrato', property.stratum],
  ].filter(([, value]) => value || value === 0);

  const locationRows = [
    ['Dirección', property.address],
    ['Barrio / Vereda', property.neighborhood],
    ['Ciudad', property.city],
    ['Departamento', property.department],
    [
      'Coordenadas',
      property.latitude && property.longitude
        ? `${property.latitude}, ${property.longitude}`
        : null,
      true,
    ],
  ].filter(([, value]) => value || value === 0);

  const costRows = [
    ['Tipo de transacción', txLabel],
    [isArriendo ? 'Canon de arriendo' : 'Precio de venta', property.price ? fmt(property.price) : null],
    ['Comisión', property.commissionPercentage ? `${property.commissionPercentage}%` : null],
    ['Valor comisión', commission ? fmt(commission) : null],
    ['Predial anual', property.propertyTax ? fmt(property.propertyTax) : null],
    ['Administración / mes', property.administrationFee ? fmt(property.administrationFee) : null],
    ['Depósito', property.rentalDeposit ? `${property.rentalDeposit} meses` : null],
    ['Período mínimo', property.minimumRentalPeriod ? `${property.minimumRentalPeriod} meses` : null],
  ].filter(([, value]) => value || value === 0);

  const ownerRows = [
    ['Nombre', property.ownerName],
    ['Teléfono', property.ownerPhone],
    ['Correo', property.ownerEmail],
  ].filter(([, value]) => value || value === 0);

  const adminRows = [
    ['Estado actual', stLabel],
    ['Tipo transacción', txLabel],
    ['ID referencia', refId, true],
    ['Publicado', fmtDate(property.createdAt)],
    ['Actualizado', fmtDate(property.updatedAt)],
  ].filter(([, value]) => value || value === 0);

  const legalRows = [
    ['Matrícula inmobiliaria', property.registrationNumber, true],
    ['Ficha catastral', property.cadastralReference, true],
    ['Escritura pública', property.publicDeedNumber],
    ['Propietario registrado', property.registeredOwner],
    ['Estado jurídico', property.legalStatus],
    ['Avalúo catastral', property.cadastralAppraisal ? fmt(property.cadastralAppraisal) : null],
    ['Propiedad horizontal', property.horizontalProperty ? 'Sí' : null],
    ['Régimen PH', property.horizontalPropertyRegime],
  ].filter(([, value]) => value || value === 0);

  const amenityGroups = useMemo(() => chunk(amenities, 12), [amenities]);

  const hasOwner = ownerRows.length > 0;
  const hasCosts = costRows.length > 1;
  const hasLegal = legalRows.length > 0 || property.liensAndLimitations;
  const hasNotes = property.propertyObservations || property.ownerRecommendations;
  const hasExtraGallery = extraGalleryGroups.length > 0;
  const hasDocuments = documents.length > 0;

  const pageCount =
    2 +
    (hasLegal || amenityGroups.length > 0 || hasDocuments ? 1 : 0) +
    (hasNotes || hasExtraGallery ? 1 : 0);

  const Row = ({ label, value, mono = false, confidential = false }) => {
    if (!value && value !== 0) return null;
    return (
      <tr className={confidential ? 'ppv-confidential' : ''}>
        <td className="ppv-td-lbl">{label}</td>
        <td className={`ppv-td-val${mono ? ' ppv-mono' : ''}`}>{value}</td>
      </tr>
    );
  };

  const SectionTitle = ({ children }) => (
    <div className="ppv-sec-label">{children}</div>
  );

  const Header = ({ subtitle }) => (
    <header className="ppv-header avoid-break">
      <div className="ppv-brand">
        <div className="ppv-logo-wrap">
          <img src={logoUrl} alt="Logo" className="ppv-logo" />
        </div>
        <div className="ppv-brand-text">
          <div className="ppv-brand-name">INMOBILIARIA RINCÓN BEDOYA Y ASOCIADOS</div>
          <div className="ppv-brand-sub">
            {subtitle ?? 'Ficha Interna · Venta · Arriendo · Gestión Inmobiliaria'}
          </div>
        </div>
      </div>
      <div className="ppv-header-right">
        <span className="ppv-header-contact">310 596 8202 · 320 673 6391</span>
        <span className="ppv-header-web">inmobiliaria-ryb-y-asociados.com</span>
        <span className="ppv-header-ref">REF {refId}</span>
      </div>
    </header>
  );

  const Footer = ({ page }) => (
    <div className="ppv-int-footer">
      <span className="ppv-int-footer-left">
        Cra 5 #9-28, Anserma, Caldas · Documento interno de trabajo
      </span>
      <span className="ppv-int-footer-right">
        Pág. {page}/{pageCount} · {new Date().getFullYear()}
      </span>
    </div>
  );

  const AdaptiveGallery = ({ images = [], compact = false }) => {
    const normalized = fillGallerySlots(images, 4);

    if (!normalized.length) {
      return (
        <div className={`ppv-gallery-empty${compact ? ' compact' : ''}`}>
          Sin material fotográfico adicional
        </div>
      );
    }

    return (
      <div
        className={`ppv-gallery-mosaic${compact ? ' compact' : ''}`}
        data-count={Math.min(normalized.length, 4)}
      >
        {normalized.slice(0, 4).map((img, i) => (
          <div key={`${img}-${i}`} className="ppv-gallery-tile">
            <img
              src={img}
              alt={`Imagen ${i + 1}`}
              className="ppv-gallery-img"
              loading="eager"
              decoding="sync"
              crossOrigin="anonymous"
            />
          </div>
        ))}
      </div>
    );
  };

  const LinedNotes = ({ title, text, tone = 'default', lines = 10 }) => (
    <div className={`ppv-lined-card ${tone}`}>
      <div className="ppv-lined-head">
        <span>{title}</span>
        <small>{lines} líneas de seguimiento</small>
      </div>
      <div className="ppv-lined-sheet" style={{ '--ppv-lines': lines }}>
        <div className="ppv-lined-text">{text || ' '}</div>
      </div>
    </div>
  );

  return (
    <div className="ppv-backdrop" onClick={onClose}>
      <div className="ppv-toolbar no-print" onClick={(e) => e.stopPropagation()}>
        <button onClick={handleDownload} disabled={loading} className="ppv-btn-dl">
          {loading ? '⏳ Generando PDF Alta Calidad…' : '⬇ Descargar Ficha Admin'}
        </button>
        <button onClick={onClose} className="ppv-btn-cl">✕ Cerrar</button>
      </div>

      <div ref={docRef} className="ppv-root" onClick={(e) => e.stopPropagation()}>
        <section className="ppv-page">
          <Header subtitle="Ficha Técnica · Uso Interno Premium" />

          {heroUrl ? (
            <div className="ppv-hero">
              <img
                src={heroUrl}
                alt={property.title || 'Imagen principal'}
                className="ppv-hero-img"
                loading="eager"
                decoding="sync"
                crossOrigin="anonymous"
              />
              <div className="ppv-hero-overlay">
                <div className="ppv-hero-top">
                  <div className="ppv-hero-chips">
                    <span className={`ppv-chip ${txCls}`}>{txLabel}</span>
                    <span className={`ppv-chip ${stCls}`}>{stLabel}</span>
                    <span className="ppv-chip chip-type">
                      {(property.type || 'Inmueble').toUpperCase()}
                    </span>
                  </div>
                  <div className="ppv-hero-ref">REF {refId}</div>
                </div>
                <div className="ppv-hero-main">
                  <h1 className="ppv-hero-title">{property.title || 'Sin título'}</h1>
                  <p className="ppv-hero-loc">{loc || 'Ubicación no especificada'}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="ppv-hero-empty">
              <div className="ppv-hero-empty-inner">
                <div className="ppv-hero-chips">
                  <span className={`ppv-chip ${txCls}`}>{txLabel}</span>
                  <span className={`ppv-chip ${stCls}`}>{stLabel}</span>
                </div>
                <h1 className="ppv-hero-empty-title">{property.title || 'Sin título'}</h1>
                <p className="ppv-hero-empty-loc">{loc || 'Ubicación no especificada'}</p>
              </div>
            </div>
          )}

          <div className="ppv-cover-band avoid-break">
            <div className="ppv-cover-price">
              <span className="ppv-price-lbl">
                {isArriendo ? 'CANON DE ARRIENDO' : 'PRECIO DE VENTA'}
              </span>
              <span className="ppv-price-val">
                {fmt(property.price)}
                {isArriendo && <small>/ mes</small>}
              </span>
            </div>
            <div className="ppv-cover-meta">
              <div><strong>Publicación:</strong> {fmtDate(property.createdAt)}</div>
              <div><strong>Actualización:</strong> {fmtDate(property.updatedAt)}</div>
              <div><strong>Estado:</strong> {stLabel}</div>
            </div>
          </div>

          <div className="ppv-stats-row avoid-break">
            {summaryStats.map((item) => (
              <div key={item.label} className="ppv-cstat">
                <b>{item.value}</b>
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          <div className="ppv-cover-grid">
            <div className="ppv-cover-left avoid-break">
              <div className="ppv-cover-desc">
                <div className="ppv-cover-desc-title">Resumen Ejecutivo</div>
                <p className="ppv-desc-text">
                  {compactText(property.description || 'Sin descripción registrada.', 1200)}
                </p>
              </div>

              <div className="ppv-summary-panels">
                <div className="ppv-summary-card">
                  <span className="ppv-summary-kicker">Ubicación</span>
                  <p>{loc || 'Ubicación no especificada'}</p>
                </div>
                <div className="ppv-summary-card">
                  <span className="ppv-summary-kicker">Perfil del activo</span>
                  <p>{(property.type || 'Inmueble')} · {txLabel} · {stLabel}</p>
                </div>
              </div>
            </div>

            <div className="ppv-cover-right avoid-break">
              <SectionTitle>Galería Principal</SectionTitle>
              <AdaptiveGallery images={galleryMain} />
            </div>
          </div>

          <div className="ppv-cover-footer avoid-break">
            <span className="ppv-cover-footer-cta">
              Documento interno para gestión comercial y operativa
            </span>
            <div className="ppv-cover-footer-contact">
              <strong>310 596 8202 · 320 673 6391</strong>
              <span>inmobiliaria-ryb-y-asociados.com · Cra 5 #9-28, Anserma, Caldas</span>
            </div>
          </div>

          <Footer page={1} />
        </section>

        <section className="ppv-page">
          <Header subtitle="Características Técnicas · Precio · Propietario" />

          <div className="ppv-page-header avoid-break">
            <div className="ppv-page-header-title">FICHA TÉCNICA COMPLETA</div>
            <div className="ppv-page-header-sub">
              Características físicas · Ubicación · Costos · Propietario · Estado administrativo
            </div>
          </div>

          <div className="ppv-two-col">
            <div className="ppv-stack-col">
              <div className="ppv-block avoid-break">
                <SectionTitle>Características Físicas</SectionTitle>
                <table className="ppv-table">
                  <tbody>
                    {featuresLeft.map(([label, value]) => (
                      <Row key={label} label={label} value={value} />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="ppv-block avoid-break">
                <SectionTitle>Ubicación</SectionTitle>
                <table className="ppv-table">
                  <tbody>
                    {locationRows.map(([label, value, mono]) => (
                      <Row key={label} label={label} value={value} mono={!!mono} />
                    ))}
                  </tbody>
                </table>
              </div>

              {hasCosts && (
                <div className="ppv-block avoid-break">
                  <SectionTitle>Precio y Costos</SectionTitle>
                  <table className="ppv-table">
                    <tbody>
                      {costRows.map(([label, value]) => (
                        <Row key={label} label={label} value={value} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="ppv-stack-col">
              <div className="ppv-price-card avoid-break">
                <div className="ppc-lbl">
                  {isArriendo ? 'CANON DE ARRIENDO' : 'PRECIO DE VENTA'}
                </div>
                <div className="ppc-val">{fmt(property.price)}</div>
                {isArriendo && <div className="ppc-sub">por mes</div>}

                {commission && (
                  <div className="ppc-row">
                    <span>Comisión estimada</span>
                    <strong>{fmt(commission)}</strong>
                  </div>
                )}

                {property.administrationFee && (
                  <div className="ppc-row">
                    <span>Administración</span>
                    <strong>{fmt(property.administrationFee)}</strong>
                  </div>
                )}

                {property.propertyTax && (
                  <div className="ppc-row">
                    <span>Predial anual</span>
                    <strong>{fmt(property.propertyTax)}</strong>
                  </div>
                )}
              </div>

              <div className="ppv-ref-box avoid-break">
                <div>Referencia: <strong>{refId}</strong></div>
                <div>Estado: <strong>{stLabel}</strong></div>
                <div>Tipo: <strong>{txLabel}</strong></div>
                <div>Publicado: <strong>{fmtDate(property.createdAt)}</strong></div>
                <div>Actualizado: <strong>{fmtDate(property.updatedAt)}</strong></div>
              </div>

              {hasOwner && (
                <div className="ppv-block avoid-break">
                  <SectionTitle>Datos del Propietario</SectionTitle>
                  <div className="ppv-confidential-badge">
                    ⚠ INFORMACIÓN CONFIDENCIAL · USO INTERNO
                  </div>
                  <table className="ppv-table">
                    <tbody>
                      {ownerRows.map(([label, value]) => (
                        <Row key={label} label={label} value={value} confidential />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="ppv-block avoid-break">
                <SectionTitle>Estado Administrativo</SectionTitle>
                <table className="ppv-table">
                  <tbody>
                    {adminRows.map(([label, value, mono]) => (
                      <Row key={label} label={label} value={value} mono={!!mono} />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="ppv-block avoid-break">
                <SectionTitle>Galería Técnica</SectionTitle>
                <AdaptiveGallery images={galleryTechnical} compact />
              </div>
            </div>
          </div>

          <div className="ppv-disclaimer avoid-break">
            La información presentada tiene carácter informativo y está sujeta a verificación.
            Precios, áreas, tiempos, disponibilidad y condiciones pueden variar. Confirmar
            internamente antes de compartir o cerrar negociación.
          </div>

          <Footer page={2} />
        </section>

        {(hasLegal || amenityGroups.length > 0 || hasDocuments) && (
          <section className="ppv-page">
            <Header subtitle="Jurídico · Amenidades · Soportes" />

            <div className="ppv-page-header avoid-break">
              <div className="ppv-page-header-title">
                SOPORTE JURÍDICO Y COMPLEMENTOS DEL ACTIVO
              </div>
              <div className="ppv-page-header-sub">
                Registro · Estado jurídico · Amenidades · Documentación de respaldo
              </div>
            </div>

            <div className="ppv-two-col">
              <div className="ppv-stack-col">
                {hasLegal && (
                  <div className="ppv-block avoid-break">
                    <SectionTitle>Identificación y Estado Jurídico</SectionTitle>
                    <table className="ppv-table">
                      <tbody>
                        {legalRows.map(([label, value, mono]) => (
                          <Row key={label} label={label} value={value} mono={!!mono} />
                        ))}
                      </tbody>
                    </table>

                    {property.liensAndLimitations && (
                      <div className="ppv-text-block warn">
                        {property.liensAndLimitations}
                      </div>
                    )}
                  </div>
                )}

                {hasDocuments && (
                  <div className="ppv-block avoid-break">
                    <SectionTitle>Documentos Adjuntos</SectionTitle>
                    <ul className="ppv-doc-list">
                      {documents.map((doc, i) => (
                        <li key={doc?.name || i}>
                          <span className="ppv-doc-bullet">◆</span>
                          <span>{doc?.name || `Documento ${i + 1}`}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="ppv-stack-col">
                {amenityGroups.length > 0 ? (
                  amenityGroups.map((group, idx) => (
                    <div key={idx} className="ppv-block avoid-break">
                      <SectionTitle>
                        {idx === 0
                          ? 'Amenidades y Características'
                          : `Amenidades adicionales ${idx + 1}`}
                      </SectionTitle>
                      <ul className="ppv-amenities-grid">
                        {group.map((a) => <li key={a}>{a}</li>)}
                      </ul>
                    </div>
                  ))
                ) : (
                  <div className="ppv-block avoid-break">
                    <SectionTitle>Amenidades y Características</SectionTitle>
                    <div className="ppv-empty-box">
                      No se registraron amenidades adicionales.
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="ppv-disclaimer avoid-break">
              Documento interno de soporte. Validar matrícula, catastro, gravámenes,
              régimen de propiedad horizontal y estado de tradición antes de cualquier
              cierre o promesa de compraventa.
            </div>

            <Footer page={3} />
          </section>
        )}

        {(hasNotes || hasExtraGallery) && (
          <section className="ppv-page">
            <Header subtitle="Observaciones · Recomendaciones · Seguimiento" />

            <div className="ppv-page-header avoid-break">
              <div className="ppv-page-header-title">
                SEGUIMIENTO INTERNO Y NOTAS COMERCIALES
              </div>
              <div className="ppv-page-header-sub">
                Espacios preparados para lectura, escritura manual y control interno
              </div>
            </div>

            <div className="ppv-notes-layout">
              <div className="ppv-notes-col">
                <LinedNotes
                  title="Observaciones de la Propiedad"
                  text={property.propertyObservations}
                  lines={12}
                />

                <LinedNotes
                  title="Recomendaciones del Propietario"
                  text={property.ownerRecommendations}
                  tone="info"
                  lines={10}
                />
              </div>

              <div className="ppv-notes-col">
                <LinedNotes
                  title="Seguimiento Comercial"
                  text=""
                  tone="light"
                  lines={12}
                />

                <LinedNotes
                  title="Próximos Pasos / Cierre"
                  text=""
                  tone="gold"
                  lines={10}
                />
              </div>
            </div>

            {hasExtraGallery && (
              <div className="ppv-bottom-grid">
                <div className="ppv-block avoid-break">
                  <SectionTitle>Galería Adicional</SectionTitle>
                  <div className="ppv-gallery-stack">
                    {extraGalleryGroups.map((group, idx) => (
                      <AdaptiveGallery key={idx} images={group} compact />
                    ))}
                  </div>
                </div>

                <div className="ppv-block avoid-break">
                  <SectionTitle>Espacio Operativo</SectionTitle>
                  <div className="ppv-op-box">
                    <div className="ppv-op-row">
                      <span>Asesor responsable</span>
                      <span className="line" />
                    </div>
                    <div className="ppv-op-row">
                      <span>Fecha de visita</span>
                      <span className="line" />
                    </div>
                    <div className="ppv-op-row">
                      <span>Estado del negocio</span>
                      <span className="line" />
                    </div>
                    <div className="ppv-op-row">
                      <span>Próximo contacto</span>
                      <span className="line" />
                    </div>
                    <div className="ppv-op-row">
                      <span>Observación rápida</span>
                      <span className="line" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!hasExtraGallery && (
              <div className="ppv-bottom-grid ppv-bottom-grid--single">
                <div className="ppv-block avoid-break">
                  <SectionTitle>Espacio Operativo</SectionTitle>
                  <div className="ppv-op-box">
                    <div className="ppv-op-row">
                      <span>Asesor responsable</span>
                      <span className="line" />
                    </div>
                    <div className="ppv-op-row">
                      <span>Fecha de visita</span>
                      <span className="line" />
                    </div>
                    <div className="ppv-op-row">
                      <span>Estado del negocio</span>
                      <span className="line" />
                    </div>
                    <div className="ppv-op-row">
                      <span>Próximo contacto</span>
                      <span className="line" />
                    </div>
                    <div className="ppv-op-row">
                      <span>Observación rápida</span>
                      <span className="line" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="ppv-disclaimer avoid-break">
              <strong>DOCUMENTO CONFIDENCIAL · USO EXCLUSIVO INTERNO.</strong> Esta ficha
              contiene información comercial, jurídica y operativa. No compartir con
              terceros sin autorización de la dirección.
            </div>

            <Footer page={pageCount} />
          </section>
        )}
      </div>
    </div>
  );
}