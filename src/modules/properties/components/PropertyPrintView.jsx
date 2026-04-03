import { useEffect, useRef, useState } from 'react';
import './PropertyPrintView.css';
import { imgToBase64, fmt, fmtDate, safeFilename, generatePDF } from '../utils/pdfUtils';

const TX = { venta: 'EN VENTA', arriendo: 'EN ARRIENDO', both: 'VENTA / ARRIENDO' };
const TX_CLS = { venta: 'chip-venta', arriendo: 'chip-arriendo', both: 'chip-both' };
const ST = { disponible: 'DISPONIBLE', reservada: 'RESERVADA', vendida: 'VENDIDA', arrendada: 'ARRENDADA' };
const ST_CLS = { disponible: 'chip-disponible', reservada: 'chip-reservada', vendida: 'chip-vendida', arrendada: 'chip-arrendada' };

export default function PropertyPrintView({ property, onClose }) {
  const docRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [imgs, setImgs] = useState({ logo: '', hero: '', gallery: [] });

  useEffect(() => {
    if (!property) return;
    const urls = property.images || [];
    Promise.all([
      imgToBase64('/favicon.ico'),
      ...urls.map(imgToBase64),
    ]).then(([logo, ...converted]) => {
      setImgs({ logo, hero: converted[0] || '', gallery: converted.slice(1, 7) });
      setReady(true);
    });
  }, [property]);

  const handleDownload = async () => {
    if (!ready) return;
    setLoading(true);
    try {
      const safe = safeFilename(property.title);
      await generatePDF(docRef.current, `FichaAdmin-${safe}.pdf`);
    } catch (e) {
      console.error('PDF error', e);
      alert(`Error al generar PDF: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!property) return null;

  const isArriendo = property.transactionType === 'arriendo';
  const txLabel = TX[property.transactionType] ?? 'PROPIEDAD';
  const txCls = TX_CLS[property.transactionType] ?? 'chip-type';
  const stLabel = ST[property.status] ?? (property.status || '').toUpperCase();
  const stCls = ST_CLS[property.status] ?? 'chip-type';
  const refId = property.id ? property.id.substring(0, 8).toUpperCase() : null;
  const loc = [property.address, property.neighborhood, property.city, property.department].filter(Boolean).join(', ');
  const amenities = [...(property.amenities ?? []), ...(property.customAmenities ?? [])].filter(Boolean);
  const commission = property.commissionPercentage
    ? Number(property.price) * Number(property.commissionPercentage) / 100
    : null;

  const hasLegal = property.cadastralReference || property.registrationNumber
    || property.legalStatus || property.publicDeedNumber || property.registeredOwner
    || property.cadastralAppraisal || property.liensAndLimitations || property.horizontalProperty;
  const hasOwner = property.ownerName || property.ownerPhone || property.ownerEmail;
  const hasNotes = property.propertyObservations || property.ownerRecommendations;
  const hasCosts = property.propertyTax || property.administrationFee || property.rentalDeposit
    || property.minimumRentalPeriod || property.commissionPercentage;
  const documents = property.documents || [];

  // ── Componentes reutilizables ──
  const Row = ({ label, value, mono = false, confidential = false }) => {
    if (!value && value !== 0) return null;
    return (
      <tr className={confidential ? 'ppv-confidential' : ''}>
        <td className="ppv-td-lbl">{label}</td>
        <td className={`ppv-td-val${mono ? ' ppv-mono' : ''}`}>{value}</td>
      </tr>
    );
  };

  const SecLabel = ({ children, mt = false }) => (
    <span className={`ppv-sec-label${mt ? ' mt' : ''}`}>{children}</span>
  );

  const Header = ({ subtitle }) => (
    <header className="ppv-header">
      <div className="ppv-brand">
        <div className="ppv-logo-wrap">
          {imgs.logo
            ? <img src={imgs.logo} alt="Logo" className="ppv-logo" />
            : <span style={{ fontFamily: 'serif', fontSize: 14, fontWeight: 700, color: '#0B1929' }}>RB</span>
          }
        </div>
        <div className="ppv-brand-text">
          <div className="ppv-brand-name">INMOBILIARIA RINCÓN BEDOYA Y ASOCIADOS</div>
          <div className="ppv-brand-sub">{subtitle ?? 'Venta · Arriendo · Finca Raíz — Anserma, Caldas'}</div>
        </div>
      </div>
      <div className="ppv-header-right">
        <span className="ppv-header-contact">310 596 8202 · 320 673 6391</span>
        <span className="ppv-header-web">inmobiliaria-ryb-y-asociados.com</span>
        {refId && <span className="ppv-header-ref">REF {refId}</span>}
      </div>
    </header>
  );

  const IntFooter = ({ page, total }) => (
    <div className="ppv-int-footer">
      <span className="ppv-int-footer-left">
        Inmobiliaria Rincón Bedoya y Asociados · Cra 5 #9-28, Anserma, Caldas
      </span>
      <span className="ppv-int-footer-right">Pág. {page}/{total} · {new Date().getFullYear()}</span>
    </div>
  );

  // Total de páginas
  const totalPages = (hasLegal || amenities.length > 0 || hasNotes || documents.length > 0) ? 3 : 2;

  return (
    <div className="ppv-backdrop" onClick={onClose}>
      {/* TOOLBAR */}
      <div className="ppv-toolbar no-print" onClick={(e) => e.stopPropagation()}>
        <button onClick={handleDownload} disabled={loading || !ready} className="ppv-btn-dl">
          {loading ? '⏳ Generando PDF…' : !ready ? '🔄 Cargando imágenes…' : '⬇ Descargar Ficha Admin'}
        </button>
        <button onClick={() => window.print()} className="ppv-btn-pr">🖨 Imprimir</button>
        <button onClick={onClose} className="ppv-btn-cl">✕ Cerrar</button>
      </div>

      {/* DOCUMENTO */}
      <div ref={docRef} className="ppv-root" onClick={(e) => e.stopPropagation()}>

        {/* ══════════════════════════════
            PÁGINA 1 — PORTADA
        ══════════════════════════════ */}
        <Header subtitle="Ficha Técnica · Uso Interno" />

        {/* HERO */}
        {imgs.hero ? (
          <div className="ppv-hero" style={{ backgroundImage: `url(${imgs.hero})` }}>
            <div className="ppv-hero-overlay">
              <div className="ppv-hero-chips">
                <span className={`ppv-chip ${txCls}`}>{txLabel}</span>
                <span className={`ppv-chip ${stCls}`}>{stLabel}</span>
                <span className="ppv-chip chip-type">{(property.type || 'Inmueble').toUpperCase()}</span>
              </div>
              <h1 className="ppv-hero-title">{property.title || 'Sin título'}</h1>
              <p className="ppv-hero-loc">{loc || 'Ubicación no especificada'}</p>
            </div>
          </div>
        ) : (
          <div className="ppv-hero-empty">
            <div>
              <div className="ppv-hero-chips" style={{ justifyContent: 'center', marginBottom: 10 }}>
                <span className={`ppv-chip ${txCls}`}>{txLabel}</span>
                <span className={`ppv-chip ${stCls}`}>{stLabel}</span>
              </div>
              <div style={{ fontFamily: 'var(--cg)', fontSize: 22, fontWeight: 700, color: '#fff', textAlign: 'center' }}>
                {property.title || 'Sin título'}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 4 }}>
                {loc}
              </div>
            </div>
          </div>
        )}

        {/* PRECIO */}
        <div className="ppv-price-banner">
          <span className="ppv-price-lbl">{isArriendo ? 'CANON DE ARRIENDO' : 'PRECIO DE VENTA'}</span>
          <span className="ppv-price-val">
            {fmt(property.price)}
            {isArriendo && <small>/ mes</small>}
          </span>
        </div>

        {/* STATS */}
        <div className="ppv-stats-row">
          {property.area && <div className="ppv-cstat"><b>{Number(property.area).toLocaleString('es-CO')} m²</b><span>Área total</span></div>}
          {property.builtArea && <div className="ppv-cstat"><b>{Number(property.builtArea).toLocaleString('es-CO')} m²</b><span>Área const.</span></div>}
          {property.rooms && <div className="ppv-cstat"><b>{property.rooms}</b><span>Habitaciones</span></div>}
          {property.bathrooms && <div className="ppv-cstat"><b>{property.bathrooms}</b><span>Baños</span></div>}
          {property.parkingSpots && <div className="ppv-cstat"><b>{property.parkingSpots}</b><span>Parqueaderos</span></div>}
          {property.floors && <div className="ppv-cstat"><b>{property.floors}</b><span>Pisos</span></div>}
          {property.yearBuilt && <div className="ppv-cstat"><b>{property.yearBuilt}</b><span>Año const.</span></div>}
          {property.stratum && <div className="ppv-cstat"><b>Est. {property.stratum}</b><span>Estrato</span></div>}
        </div>

        {/* DESCRIPCIÓN */}
        {property.description && (
          <div className="ppv-cover-desc">
            <div className="ppv-cover-desc-title">Descripción</div>
            <p className="ppv-desc-text">{property.description}</p>
          </div>
        )}

        {/* GALERÍA */}
        {imgs.gallery.length > 0 && (
          <div className="ppv-cover-gallery">
            {imgs.gallery.slice(0, 5).map((img, i) => (
              <div key={i} className="ppv-gthumb" style={{ backgroundImage: `url(${img})` }} />
            ))}
          </div>
        )}

        <div className="ppv-cover-footer">
          <span className="ppv-cover-footer-cta">¿Interesado? Comuníquese con nosotros hoy mismo</span>
          <div className="ppv-cover-footer-contact">
            <strong>310 596 8202 · 320 673 6391</strong>
            <span>inmobiliaria-ryb-y-asociados.com · Cra 5 #9-28, Anserma, Caldas</span>
          </div>
        </div>

        {/* ── SEPARADOR ── */}
        <div className="ppv-page-sep" />

        {/* ══════════════════════════════
            PÁGINA 2 — FICHA TÉCNICA
        ══════════════════════════════ */}
        <Header subtitle="Características Técnicas e Información Financiera" />
        <div className="ppv-page-header">
          <div className="ppv-page-header-title">FICHA TÉCNICA COMPLETA — {property.title}</div>
          <div className="ppv-page-header-sub">Características · Ubicación · Precio · Propietario · Galería</div>
        </div>

        <div className="ppv-two-col">
          {/* Columna izquierda */}
          <div>
            <SecLabel>Características Físicas</SecLabel>
            <table className="ppv-table">
              <tbody>
                <Row label="Tipo de inmueble" value={property.type} />
                <Row label="Área total" value={property.area && `${Number(property.area).toLocaleString('es-CO')} m²`} />
                <Row label="Área construida" value={property.builtArea && `${Number(property.builtArea).toLocaleString('es-CO')} m²`} />
                <Row label="Habitaciones" value={property.rooms} />
                <Row label="Baños" value={property.bathrooms} />
                <Row label="Parqueaderos" value={property.parkingSpots} />
                <Row label="Pisos / Niveles" value={property.floors} />
                <Row label="Año de construcción" value={property.yearBuilt} />
                <Row label="Estrato" value={property.stratum} />
              </tbody>
            </table>

            <SecLabel mt>Ubicación</SecLabel>
            <table className="ppv-table">
              <tbody>
                <Row label="Dirección" value={property.address} />
                <Row label="Barrio / Vereda" value={property.neighborhood} />
                <Row label="Ciudad" value={property.city} />
                <Row label="Departamento" value={property.department} />
                {property.latitude && property.longitude && (
                  <Row label="Coordenadas" value={`${property.latitude}, ${property.longitude}`} mono />
                )}
              </tbody>
            </table>

            {hasCosts && (
              <>
                <SecLabel mt>Precio y Costos</SecLabel>
                <table className="ppv-table">
                  <tbody>
                    <Row label="Tipo de transacción" value={txLabel} />
                    <Row label={isArriendo ? 'Canon de arriendo' : 'Precio de venta'} value={fmt(property.price)} />
                    {property.commissionPercentage && (
                      <Row label={`Comisión (${property.commissionPercentage}%)`} value={commission ? fmt(commission) : null} />
                    )}
                    <Row label="Predial anual" value={property.propertyTax ? fmt(property.propertyTax) : null} />
                    <Row label="Administración/mes" value={property.administrationFee ? fmt(property.administrationFee) : null} />
                    <Row label="Depósito" value={property.rentalDeposit ? `${property.rentalDeposit} meses` : null} />
                    <Row label="Período mínimo" value={property.minimumRentalPeriod ? `${property.minimumRentalPeriod} meses` : null} />
                  </tbody>
                </table>
              </>
            )}
          </div>

          {/* Columna derecha */}
          <div>
            {/* Precio card */}
            <div className="ppv-price-card">
              <div className="ppc-lbl">{isArriendo ? 'CANON DE ARRIENDO' : 'PRECIO DE VENTA'}</div>
              <div className="ppc-val">{fmt(property.price)}</div>
              {isArriendo && <div className="ppc-sub">por mes</div>}
              {property.commissionPercentage && commission && (
                <div className="ppc-row"><span>Comisión {property.commissionPercentage}%</span><strong>{fmt(commission)}</strong></div>
              )}
              {property.administrationFee && (
                <div className="ppc-row"><span>Admón./mes</span><strong>{fmt(property.administrationFee)}</strong></div>
              )}
              {property.propertyTax && (
                <div className="ppc-row"><span>Predial anual</span><strong>{fmt(property.propertyTax)}</strong></div>
              )}
            </div>

            {/* Ref box */}
            <div className="ppv-ref-box">
              {refId && <div>Referencia: <strong>{refId}</strong></div>}
              <div>Estado: <strong>{stLabel}</strong></div>
              {property.createdAt && <div>Publicado: <strong>{fmtDate(property.createdAt)}</strong></div>}
              {property.updatedAt && <div>Actualizado: <strong>{fmtDate(property.updatedAt)}</strong></div>}
            </div>

            {/* Propietario */}
            {hasOwner && (
              <>
                <SecLabel mt>Datos del Propietario</SecLabel>
                <div className="ppv-confidential-badge">⚠ INFORMACIÓN CONFIDENCIAL · USO INTERNO</div>
                <table className="ppv-table">
                  <tbody>
                    <Row label="Nombre" value={property.ownerName} confidential />
                    <Row label="Teléfono" value={property.ownerPhone} confidential />
                    <Row label="Correo" value={property.ownerEmail} confidential />
                  </tbody>
                </table>
              </>
            )}

            {/* Estado administrativo */}
            <SecLabel mt>Estado Administrativo</SecLabel>
            <table className="ppv-table">
              <tbody>
                <Row label="Estado actual" value={stLabel} />
                <Row label="Tipo transacción" value={txLabel} />
                <Row label="ID referencia" value={refId} mono />
                <Row label="Fecha publicación" value={fmtDate(property.createdAt)} />
              </tbody>
            </table>

            {/* Galería col derecha */}
            {imgs.gallery.length > 0 && (
              <>
                <SecLabel mt>Galería</SecLabel>
                <div className="ppv-gallery-grid">
                  {imgs.gallery.slice(0, 4).map((img, i) => (
                    <div key={i} className="ppv-gallery-thumb" style={{ backgroundImage: `url(${img})` }} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="ppv-disclaimer">
          La información presentada tiene carácter informativo y está sujeta a verificación. Precios, áreas y condiciones pueden variar.
          Para confirmar disponibilidad contacte <strong>310 596 8202</strong>.
        </div>

        <IntFooter page={2} total={totalPages} />

        {/* ── SEPARADOR ── */}
        {(hasLegal || amenities.length > 0 || hasNotes || documents.length > 0) && (
          <div className="ppv-page-sep" />
        )}

        {/* ══════════════════════════════
            PÁGINA 3 — JURÍDICO + AMENIDADES + NOTAS
        ══════════════════════════════ */}
        {(hasLegal || amenities.length > 0 || hasNotes || documents.length > 0) && (
          <>
            <Header subtitle="Información Jurídica · Amenidades · Observaciones" />
            <div className="ppv-page-header">
              <div className="ppv-page-header-title">INFORMACIÓN JURÍDICA, AMENIDADES Y OBSERVACIONES</div>
              <div className="ppv-page-header-sub">{property.title}</div>
            </div>

            <div className="ppv-two-col">
              {/* Columna izquierda: jurídico + documentos */}
              <div>
                {hasLegal && (
                  <>
                    <SecLabel>Identificación Registral</SecLabel>
                    <table className="ppv-table">
                      <tbody>
                        <Row label="Matrícula inmobiliaria" value={property.registrationNumber} mono />
                        <Row label="Ficha catastral" value={property.cadastralReference} mono />
                        <Row label="Escritura pública N°" value={property.publicDeedNumber} mono />
                        <Row label="Propietario registrado" value={property.registeredOwner} />
                      </tbody>
                    </table>

                    <SecLabel mt>Estado Jurídico</SecLabel>
                    <table className="ppv-table">
                      <tbody>
                        <Row label="Estado jurídico" value={property.legalStatus} />
                        <Row label="Avalúo catastral" value={property.cadastralAppraisal ? fmt(property.cadastralAppraisal) : null} />
                        <Row label="Propiedad horizontal" value={property.horizontalProperty ? 'Sí' : null} />
                        <Row label="Régimen PH" value={property.horizontalPropertyRegime} />
                      </tbody>
                    </table>

                    {property.liensAndLimitations && (
                      <>
                        <SecLabel mt>Gravámenes y Limitaciones</SecLabel>
                        <div className="ppv-text-block warn">{property.liensAndLimitations}</div>
                      </>
                    )}
                  </>
                )}

                {documents.length > 0 && (
                  <>
                    <SecLabel mt>Documentos Adjuntos</SecLabel>
                    <ul style={{ listStyle: 'none', padding: '5px 0', margin: 0, fontSize: 9.5 }}>
                      {documents.map((doc, i) => (
                        <li key={i} style={{ padding: '2px 0', color: '#374151', fontFamily: 'var(--int)' }}>
                          ◆ {doc.name || `Documento ${i + 1}`}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              {/* Columna derecha: amenidades + notas */}
              <div>
                {amenities.length > 0 && (
                  <>
                    <SecLabel>Amenidades y Características</SecLabel>
                    <ul className="ppv-amenities-grid">
                      {amenities.map((a) => <li key={a}>{a}</li>)}
                    </ul>
                  </>
                )}

                {property.propertyObservations && (
                  <>
                    <SecLabel mt>Observaciones de la Propiedad</SecLabel>
                    <div className="ppv-text-block">{property.propertyObservations}</div>
                  </>
                )}

                {property.ownerRecommendations && (
                  <>
                    <SecLabel mt>Recomendaciones del Propietario</SecLabel>
                    <div className="ppv-text-block info">{property.ownerRecommendations}</div>
                  </>
                )}

                {/* Galería extra si hay más fotos */}
                {imgs.gallery.length > 4 && (
                  <>
                    <SecLabel mt>Galería Adicional</SecLabel>
                    <div className="ppv-gallery-grid">
                      {imgs.gallery.slice(4, 8).map((img, i) => (
                        <div key={i} className="ppv-gallery-thumb" style={{ backgroundImage: `url(${img})` }} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="ppv-disclaimer">
              <strong>DOCUMENTO CONFIDENCIAL · USO EXCLUSIVO INTERNO.</strong> Esta ficha contiene información jurídica,
              financiera y de contacto de uso restringido. No compartir con terceros sin autorización de la dirección.
              Generada el {new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}.
            </div>

            <IntFooter page={3} total={totalPages} />
          </>
        )}
      </div>
    </div>
  );
}