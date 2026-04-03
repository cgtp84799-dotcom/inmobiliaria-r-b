import { useEffect, useRef, useState } from 'react';
import './PropertyPrintView.css';
import { imgToBase64, fmt, fmtDate, safeFilename, generatePDF } from '../utils/pdfUtils';

const TX = { venta: 'EN VENTA', arriendo: 'EN ARRIENDO', both: 'VENTA / ARRIENDO' };
const ST = { disponible: 'DISPONIBLE', reservada: 'RESERVADA', vendida: 'VENDIDA', arrendada: 'ARRENDADA' };

export default function PropertyPrintView({ property, onClose }) {
  const docRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [imgs, setImgs] = useState({ logo: '', hero: '', gallery: [] });

  useEffect(() => {
    if (!property) return;
    const urls = property.images || [];
    Promise.all([
      imgToBase64('/logo.jpg.png'),
      ...urls.map(imgToBase64),
    ]).then(([logo, ...converted]) => {
      setImgs({ logo, hero: converted[0] || '', gallery: converted.slice(1, 5) });
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
      console.error('PDF error:', e);
      alert('Error al generar PDF: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!property) return null;

  const isArriendo = property.transactionType === 'arriendo';
  const txCls = `chip-${property.transactionType || 'venta'}`;
  const stCls = `chip-${property.status || 'disponible'}`;
  const txLabel = TX[property.transactionType] ?? 'PROPIEDAD';
  const stLabel = ST[property.status] ?? (property.status || '').toUpperCase();
  const refId = property.id ? property.id.substring(0, 8).toUpperCase() : null;
  const commission = property.commissionPercentage
    ? Number(property.price) * Number(property.commissionPercentage) / 100
    : null;
  const amenities = [...(property.amenities ?? []), ...(property.customAmenities ?? [])].filter(Boolean);
  const documents = property.documents || [];

  const hasLegal = property.cadastralReference || property.registrationNumber || property.legalStatus
    || property.publicDeedNumber || property.registeredOwner || property.cadastralAppraisal
    || property.liensAndLimitations || property.horizontalProperty;
  const hasOwner = property.ownerName || property.ownerPhone || property.ownerEmail;
  const hasNotes = property.propertyObservations || property.ownerRecommendations;
  const hasCosts = property.propertyTax || property.administrationFee || property.rentalDeposit
    || property.minimumRentalPeriod || property.commissionPercentage;

  const Header = ({ subtitle }) => (
    <header className="ppv-header">
      <div className="ppv-brand">
        <div className="ppv-logo-wrap">
          {imgs.logo
            ? <img src={imgs.logo} alt="Logo" className="ppv-logo" />
            : <span style={{ fontFamily: 'serif', fontSize: 13, fontWeight: 700, color: '#0B1929' }}>RB</span>
          }
        </div>
        <div>
          <div className="ppv-brand-name">INMOBILIARIA RINCÓN BEDOYA Y ASOCIADOS</div>
          <div className="ppv-brand-sub">{subtitle || 'Ficha Técnica — Uso Interno'}</div>
        </div>
      </div>
      <div className="ppv-header-right">
        <span>310 596 8202 · 320 673 6391</span>
        {refId && <span className="ppv-ref-id">REF: {refId}</span>}
      </div>
    </header>
  );

  const Footer = ({ page, total }) => (
    <footer className="ppv-footer">
      <span>Inmobiliaria Rincón Bedoya y Asociados · Cra 5 #9-28, Anserma, Caldas</span>
      <span className="ppv-footer-gold">Pág. {page}/{total} · © {new Date().getFullYear()}</span>
    </footer>
  );

  const Row = ({ label, value, mono = false, confidential = false }) => {
    if (!value && value !== 0) return null;
    return (
      <tr className={confidential ? 'ppv-confidential' : ''}>
        <td className="ppv-td-lbl">{label}</td>
        <td className={`ppv-td-val${mono ? ' ppv-mono' : ''}`}>{value}</td>
      </tr>
    );
  };

  const totalPages = (hasLegal || amenities.length > 0 || hasNotes || documents.length > 0) ? 3 : 2;

  return (
    <div className="ppv-backdrop" onClick={onClose}>
      <div className="ppv-toolbar no-print" onClick={e => e.stopPropagation()}>
        <button onClick={handleDownload} disabled={loading || !ready} className="ppv-btn-dl">
          {loading ? '⏳ Generando PDF...' : !ready ? '⏳ Cargando...' : '⬇ Descargar Ficha Admin'}
        </button>
        <button onClick={() => window.print()} className="ppv-btn-pr">🖨 Imprimir</button>
        <button onClick={onClose} className="ppv-btn-cl">✕ Cerrar</button>
      </div>

      <div ref={docRef} className="ppv-root" onClick={e => e.stopPropagation()}>

        {/* ════════════════ PÁGINA 1 — PORTADA ════════════════ */}
        <div className="ppv-page pdf-page">
          <div className="ppv-rule" />
          <Header />

          {imgs.hero
            ? <div className="ppv-hero" style={{ backgroundImage: `url(${imgs.hero})` }}>
                <div className="ppv-hero-overlay">
                  <div className="ppv-chips">
                    <span className={`ppv-chip ${txCls}`}>{txLabel}</span>
                    <span className={`ppv-chip ${stCls}`}>{stLabel}</span>
                    <span className="ppv-chip chip-type">{(property.type || '').toUpperCase()}</span>
                  </div>
                  <h1 className="ppv-hero-title">{property.title || 'Sin título'}</h1>
                  <p className="ppv-hero-loc">
                    {[property.address, property.neighborhood, property.city, property.department].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
            : <div className="ppv-hero-empty">
                <div>
                  <div className="ppv-chips">
                    <span className={`ppv-chip ${txCls}`}>{txLabel}</span>
                    <span className={`ppv-chip ${stCls}`}>{stLabel}</span>
                  </div>
                  <h1 style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 24, fontWeight: 700, color: '#fff', margin: '6px 0 3px', lineHeight: 1.15 }}>
                    {property.title || 'Sin título'}
                  </h1>
                  <p style={{ fontSize: 9, color: 'rgba(255,255,255,.65)', margin: 0 }}>
                    {[property.address, property.neighborhood, property.city, property.department].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
          }

          <div className="ppv-price-banner">
            <span className="ppv-price-lbl">{isArriendo ? 'CANON DE ARRIENDO' : 'PRECIO DE VENTA'}</span>
            <span className="ppv-price-val">
              {fmt(property.price)}{isArriendo && <small>/mes</small>}
            </span>
          </div>

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

          {property.description && (
            <div className="ppv-cover-desc">
              <span className="ppv-sec-hd">DESCRIPCIÓN</span>
              <p className="ppv-desc-text">{property.description}</p>
            </div>
          )}

          {imgs.gallery.length > 0 && (
            <div className="ppv-cover-gallery">
              {imgs.gallery.map((img, i) => (
                <div key={i} className="ppv-gthumb" style={{ backgroundImage: `url(${img})` }} />
              ))}
            </div>
          )}

          <Footer page={1} total={totalPages} />
          <div className="ppv-rule" />
        </div>

        {/* ════════════════ PÁGINA 2 — FICHA TÉCNICA ════════════════ */}
        <div className="ppv-page pdf-page">
          <div className="ppv-rule" />
          <Header subtitle="Características Técnicas e Información Financiera" />
          <div className="ppv-page-banner">FICHA TÉCNICA COMPLETA</div>

          <div className="ppv-two-col">
            {/* Izquierda */}
            <div>
              <span className="ppv-sec-hd">CARACTERÍSTICAS FÍSICAS</span>
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

              <span className="ppv-sec-hd">UBICACIÓN</span>
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
                  <span className="ppv-sec-hd">PRECIO Y COSTOS ASOCIADOS</span>
                  <table className="ppv-table">
                    <tbody>
                      <Row label="Tipo de transacción" value={txLabel} />
                      <Row label={isArriendo ? 'Canon de arriendo' : 'Precio de venta'} value={fmt(property.price)} />
                      {property.commissionPercentage && <Row label={`Comisión (${property.commissionPercentage}%)`} value={commission ? fmt(commission) : null} />}
                      <Row label="Predial anual" value={property.propertyTax && fmt(property.propertyTax)} />
                      <Row label="Administración/mes" value={property.administrationFee && fmt(property.administrationFee)} />
                      <Row label="Depósito" value={property.rentalDeposit && `${property.rentalDeposit} mes(es)`} />
                      <Row label="Período mínimo" value={property.minimumRentalPeriod && `${property.minimumRentalPeriod} mes(es)`} />
                    </tbody>
                  </table>
                </>
              )}
            </div>

            {/* Derecha */}
            <div>
              {hasOwner && (
                <>
                  <span className="ppv-sec-hd">DATOS DEL PROPIETARIO</span>
                  <div className="ppv-confidential-badge">🔒 INFORMACIÓN CONFIDENCIAL — USO INTERNO</div>
                  <table className="ppv-table">
                    <tbody>
                      <Row label="Nombre" value={property.ownerName} confidential />
                      <Row label="Teléfono" value={property.ownerPhone} confidential />
                      <Row label="Correo" value={property.ownerEmail} confidential />
                    </tbody>
                  </table>
                </>
              )}

              <span className="ppv-sec-hd">ESTADO ADMINISTRATIVO</span>
              <table className="ppv-table">
                <tbody>
                  <Row label="Estado" value={stLabel} />
                  <Row label="ID de referencia" value={refId} mono />
                  <Row label="Fecha publicación" value={fmtDate(property.createdAt)} />
                  <Row label="Última actualización" value={fmtDate(property.updatedAt)} />
                </tbody>
              </table>

              {property.avaluoCatastral && (
                <>
                  <span className="ppv-sec-hd">AVALÚO CATASTRAL</span>
                  <table className="ppv-table">
                    <tbody>
                      <Row label="Avalúo catastral" value={property.cadastralAppraisal && fmt(property.cadastralAppraisal)} />
                    </tbody>
                  </table>
                </>
              )}

              {imgs.gallery.length > 0 && (
                <>
                  <span className="ppv-sec-hd">GALERÍA</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                    {imgs.gallery.map((img, i) => (
                      <div key={i} style={{
                        height: 70, borderRadius: 6,
                        backgroundImage: `url(${img})`,
                        backgroundSize: 'cover', backgroundPosition: 'center'
                      }} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <Footer page={2} total={totalPages} />
          <div className="ppv-rule" />
        </div>

        {/* ════════════════ PÁGINA 3 — JURÍDICO + AMENIDADES + NOTAS ════════════════ */}
        {(hasLegal || amenities.length > 0 || hasNotes || documents.length > 0) && (
          <div className="ppv-page pdf-page">
            <div className="ppv-rule" />
            <Header subtitle="Información Jurídica y Notas Internas" />
            <div className="ppv-page-banner">INFORMACIÓN JURÍDICA, AMENIDADES Y OBSERVACIONES</div>

            <div className="ppv-two-col">
              {/* Izquierda: Jurídico + Documentos */}
              <div>
                {hasLegal && (
                  <>
                    <span className="ppv-sec-hd">IDENTIFICACIÓN REGISTRAL</span>
                    <table className="ppv-table">
                      <tbody>
                        <Row label="Matrícula inmobiliaria" value={property.registrationNumber} mono />
                        <Row label="Ficha catastral" value={property.cadastralReference} mono />
                        <Row label="Escritura pública N.°" value={property.publicDeedNumber} mono />
                        <Row label="Propietario registrado" value={property.registeredOwner} />
                      </tbody>
                    </table>

                    <span className="ppv-sec-hd">ESTADO JURÍDICO</span>
                    <table className="ppv-table">
                      <tbody>
                        <Row label="Estado jurídico" value={property.legalStatus} />
                        <Row label="Avalúo catastral" value={property.cadastralAppraisal && fmt(property.cadastralAppraisal)} />
                        {property.horizontalProperty && <Row label="Propiedad horizontal" value="Sí" />}
                        {property.horizontalPropertyRegime && <Row label="Reglamento PH" value={property.horizontalPropertyRegime} />}
                      </tbody>
                    </table>

                    {property.liensAndLimitations && (
                      <>
                        <span className="ppv-sec-hd">GRAVÁMENES Y LIMITACIONES</span>
                        <div className="ppv-text-block warn">{property.liensAndLimitations}</div>
                      </>
                    )}
                  </>
                )}

                {documents.length > 0 && (
                  <>
                    <span className="ppv-sec-hd">DOCUMENTOS ADJUNTOS</span>
                    <ul style={{ listStyle: 'none', padding: '3px 0 0', margin: 0, fontSize: 9, color: '#374151' }}>
                      {documents.map((doc, i) => (
                        <li key={i} style={{ padding: '2px 0' }}>📄 {doc.name || `Documento ${i + 1}`}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              {/* Derecha: Amenidades + Notas */}
              <div>
                {amenities.length > 0 && (
                  <>
                    <span className="ppv-sec-hd">AMENIDADES Y CARACTERÍSTICAS</span>
                    <ul className="ppv-amenities-list">
                      {amenities.map(a => <li key={a}>{a}</li>)}
                    </ul>
                  </>
                )}

                {property.propertyObservations && (
                  <>
                    <span className="ppv-sec-hd">OBSERVACIONES DE LA PROPIEDAD</span>
                    <div className="ppv-text-block">{property.propertyObservations}</div>
                  </>
                )}

                {property.ownerRecommendations && (
                  <>
                    <span className="ppv-sec-hd">RECOMENDACIONES DEL PROPIETARIO</span>
                    <div className="ppv-text-block info">{property.ownerRecommendations}</div>
                  </>
                )}
              </div>
            </div>

            <div className="ppv-disclaimer">
              🔒 <strong>DOCUMENTO CONFIDENCIAL — USO EXCLUSIVO INTERNO.</strong> Esta ficha contiene información
              jurídica, financiera y de contacto de uso restringido. No compartir con terceros sin autorización de la dirección.
              Generada el {new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}.
            </div>

            <Footer page={3} total={totalPages} />
            <div className="ppv-rule" />
          </div>
        )}

      </div>
    </div>
  );
}