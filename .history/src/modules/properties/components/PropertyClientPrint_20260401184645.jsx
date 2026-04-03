import { useEffect, useRef, useState } from 'react';
import './PropertyClientPrint.css';
import { imgToBase64, fmt, fmtDate, safeFilename, generatePDF } from '../utils/pdfUtils';

const TX = { venta: 'EN VENTA', arriendo: 'EN ARRIENDO', both: 'VENTA / ARRIENDO' };
const ST = { disponible: 'DISPONIBLE', reservada: 'RESERVADA', vendida: 'VENDIDA', arrendada: 'ARRENDADA' };

export default function PropertyClientPrint({ property, onClose }) {
  const docRef = useRef(null);
  const [loading, setLoading]   = useState(false);
  const [ready, setReady]       = useState(false);
  const [imgs, setImgs]         = useState({ logo: '', hero: '', gallery: [] });

  // Convierte TODAS las imágenes a base64 al montar
  useEffect(() => {
    if (!property) return;
    const urls = property.images || [];
    Promise.all([
      imgToBase64('logo.jpg.png'),
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
      await generatePDF(docRef.current, `Ficha-Cliente-${safe}.pdf`);
    } catch (e) {
      console.error('PDF error', e);
      alert('Error al generar PDF: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!property) return null;

  const isArriendo = property.transactionType === 'arriendo';
  const txCls   = `chip-${property.transactionType || 'venta'}`;
  const stCls   = `chip-${property.status || 'disponible'}`;
  const txLabel  = TX[property.transactionType] ?? 'PROPIEDAD';
  const stLabel  = ST[property.status] ?? (property.status || '').toUpperCase();
  const loc      = [property.address, property.neighborhood, property.city, property.department].filter(Boolean).join(', ');
  const amenities = [...(property.amenities ?? []), ...(property.customAmenities ?? [])].filter(Boolean);

  const stats = [
    { v: property.area,         l: 'Área total',   s: ' m²' },
    { v: property.builtArea,    l: 'Área const.',   s: ' m²' },
    { v: property.rooms,        l: 'Habitaciones',  s: '' },
    { v: property.bathrooms,    l: 'Baños',         s: '' },
    { v: property.parkingSpots, l: 'Parqueaderos',  s: '' },
    { v: property.floors,       l: 'Pisos',         s: '' },
    { v: property.yearBuilt,    l: 'Año const.',    s: '' },
    { v: property.stratum ? `Est. ${property.stratum}` : null, l: 'Estrato', s: '' },
  ].filter(s => s.v);

  const Header = ({ subtitle }) => (
    <header className="cf-header">
      <div className="cf-brand">
        <div className="cf-logo-wrap">
          {imgs.logo
            ? <img src={imgs.logo} alt="Logo" className="cf-logo" />
            : <span style={{ fontFamily: 'serif', fontSize: 14, fontWeight: 700, color: '#0B1929' }}>RB</span>}
        </div>
        <div>
          <div className="cf-brand-name">INMOBILIARIA RINCÓN BEDOYA Y ASOCIADOS</div>
          <div className="cf-brand-sub">{subtitle || 'Venta · Arriendo · Finca Raíz · Anserma, Caldas'}</div>
        </div>
      </div>
      <div className="cf-header-right">
        <strong>310 596 8202 · 320 673 6391</strong>
        <span>inmobiliaria-ryb-y-asociados.com</span>
      </div>
    </header>
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

  const SecHd = ({ children, style }) => <div className="cf-sec-hd" style={style}>{children}</div>;

  /* ────────────────────────────────────────── */
  return (
    <div className="cflyer-backdrop" onClick={onClose}>
      <div className="cflyer-toolbar no-print" onClick={e => e.stopPropagation()}>
        <button onClick={handleDownload} disabled={loading || !ready} className="cflyer-btn-dl">
          {loading ? '⏳ Generando PDF...' : !ready ? '⏳ Cargando imágenes...' : '⬇ Descargar PDF'}
        </button>
        <button onClick={() => window.print()} className="cflyer-btn-pr">🖨 Imprimir</button>
        <button onClick={onClose} className="cflyer-btn-cl">✕ Cerrar</button>
      </div>

      <div ref={docRef} className="cflyer-root" onClick={e => e.stopPropagation()}>

        {/* ══════════════ PÁGINA 1 — PORTADA CLIENTE ══════════════ */}
        <div className="cflyer-page pdf-page">
          <div className="cf-rule" />
          <Header />

          {/* Hero */}
          {imgs.hero ? (
            <div className="cf-hero" style={{ backgroundImage: `url(${imgs.hero})` }}>
              <div className="cf-hero-overlay">
                <div className="cf-chips">
                  <span className={`cf-chip ${txCls}`}>{txLabel}</span>
                  <span className={`cf-chip ${stCls}`}>{stLabel}</span>
                  <span className="cf-chip chip-type">{(property.type || 'Inmueble').toUpperCase()}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="cf-hero-empty">
              <div className="cf-chips" style={{ justifyContent: 'center' }}>
                <span className={`cf-chip ${txCls}`}>{txLabel}</span>
                <span className={`cf-chip ${stCls}`}>{stLabel}</span>
              </div>
            </div>
          )}

          {/* Cuerpo */}
          <div className="cf-body">
            <div className="cf-title-row">
              <div className="cf-title-col">
                <h1 className="cf-title">{property.title || 'Sin título'}</h1>
                <p className="cf-loc">{loc || 'Ubicación no especificada'}</p>
              </div>
              <div className="cf-price-card">
                <div className="cpc-lbl">{isArriendo ? 'CANON DE ARRIENDO' : 'PRECIO DE VENTA'}</div>
                <div className="cpc-val">{fmt(property.price)}</div>
                {isArriendo && <div className="cpc-sub">por mes</div>}
                {isArriendo && property.administrationFee && (
                  <div className="cpc-extra"><span>Admón</span><span>{fmt(property.administrationFee)}/mes</span></div>
                )}
                {isArriendo && property.rentalDeposit && (
                  <div className="cpc-extra"><span>Depósito</span><span>{property.rentalDeposit} meses</span></div>
                )}
              </div>
            </div>

            {/* Stats */}
            {stats.length > 0 && (
              <div className="cf-stats">
                {stats.map(({ v, l, s }) => (
                  <div key={l} className="cf-stat">
                    <b>{typeof v === 'number' ? Number(v).toLocaleString('es-CO') : v}{s}</b>
                    <span>{l}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Descripción */}
            {property.description && (
              <div style={{ marginBottom: 8 }}>
                <SecHd>DESCRIPCIÓN</SecHd>
                <p className="cf-desc">{property.description}</p>
              </div>
            )}

            {/* Galería */}
            {imgs.gallery.length > 0 && (
              <div style={{ marginTop: 'auto', paddingTop: 6 }}>
                <div className="cf-gallery">
                  {imgs.gallery.map((img, i) => (
                    <div key={i} className="cf-thumb" style={{ backgroundImage: `url(${img})` }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <footer className="cf-footer">
            <div className="cf-footer-cta">¿Interesado? Comuníquese con nosotros hoy mismo</div>
            <div className="cf-footer-items">
              <span>📞 310 596 8202</span>
              <span>📞 320 673 6391</span>
              <span>🌐 inmobiliaria-ryb-y-asociados.com</span>
              <span>📍 Cra 5 #9-28, Anserma, Caldas</span>
            </div>
            <div className="cf-footer-disc">
              Información sujeta a verificación. © {new Date().getFullYear()} Inmobiliaria Rincón Bedoya y Asociados.
            </div>
          </footer>
          <div className="cf-rule" />
        </div>

        {/* ══════════════ PÁGINA 2 — DETALLES CLIENTE ══════════════ */}
        <div className="cflyer-page pdf-page">
          <div className="cf-rule" />
          <Header subtitle="Características y Detalles" />
          <div className="cf-page-banner">FICHA TÉCNICA — {property.title?.substring(0, 55)}</div>

          <div className="cf-two-col">
            {/* Izquierda */}
            <div>
              <SecHd style={{ marginTop: 0 }}>CARACTERÍSTICAS</SecHd>
              <table className="cf-table">
                <tbody>
                  <Row label="Tipo"            value={property.type} />
                  <Row label="Área total"      value={property.area && `${Number(property.area).toLocaleString('es-CO')} m²`} />
                  <Row label="Área construida" value={property.builtArea && `${Number(property.builtArea).toLocaleString('es-CO')} m²`} />
                  <Row label="Habitaciones"    value={property.rooms} />
                  <Row label="Baños"           value={property.bathrooms} />
                  <Row label="Parqueaderos"    value={property.parkingSpots} />
                  <Row label="Pisos / Niveles" value={property.floors} />
                  <Row label="Año const."      value={property.yearBuilt} />
                  <Row label="Estrato"         value={property.stratum} />
                </tbody>
              </table>

              <SecHd style={{ marginTop: 10 }}>UBICACIÓN</SecHd>
              <table className="cf-table">
                <tbody>
                  <Row label="Dirección"       value={property.address} />
                  <Row label="Barrio / Vereda" value={property.neighborhood} />
                  <Row label="Ciudad"          value={property.city} />
                  <Row label="Departamento"    value={property.department} />
                </tbody>
              </table>

              <SecHd style={{ marginTop: 10 }}>PRECIO</SecHd>
              <table className="cf-table">
                <tbody>
                  <Row label={isArriendo ? 'Canon de arriendo' : 'Precio de venta'} value={fmt(property.price)} />
                  {isArriendo && property.administrationFee && <Row label="Administración" value={`${fmt(property.administrationFee)}/mes`} />}
                  {isArriendo && property.rentalDeposit      && <Row label="Depósito"       value={`${property.rentalDeposit} meses`} />}
                  {isArriendo && property.minimumRentalPeriod && <Row label="Período mín."  value={`${property.minimumRentalPeriod} meses`} />}
                </tbody>
              </table>
            </div>

            {/* Derecha */}
            <div>
              {amenities.length > 0 && (
                <>
                  <SecHd style={{ marginTop: 0 }}>AMENIDADES Y CARACTERÍSTICAS</SecHd>
                  <ul className="cf-amenities">
                    {amenities.map(a => <li key={a}>{a}</li>)}
                  </ul>
                </>
              )}

              {imgs.gallery.length > 0 && (
                <>
                  <SecHd style={{ marginTop: amenities.length > 0 ? 12 : 0 }}>GALERÍA</SecHd>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {imgs.gallery.map((img, i) => (
                      <div key={i} style={{ height: 90, borderRadius: 8, backgroundImage: `url(${img})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid #e2e8f0' }} />
                    ))}
                  </div>
                </>
              )}

              {property.description && (
                <>
                  <SecHd style={{ marginTop: 12 }}>DESCRIPCIÓN</SecHd>
                  <p style={{ fontSize: 8.5, color: '#374151', lineHeight: 1.65, margin: 0 }}>
                    {property.description.substring(0, 600)}{property.description.length > 600 && '…'}
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="cf-disclaimer">
            La información presentada tiene carácter informativo y está sujeta a verificación. Precios, áreas y condiciones
            pueden variar. Para confirmar disponibilidad comuníquese al <strong>310 596 8202</strong>.
          </div>

          <footer className="cf-footer">
            <div className="cf-footer-items">
              <span>📞 310 596 8202</span>
              <span>📞 320 673 6391</span>
              <span>🌐 inmobiliaria-ryb-y-asociados.com</span>
              <span>📍 Cra 5 #9-28, Anserma, Caldas</span>
              <span>© {new Date().getFullYear()}</span>
            </div>
          </footer>
          <div className="cf-rule" />
        </div>

      </div>
    </div>
  );
}