import { useEffect, useRef, useState } from 'react';
import './PropertyPrintView.css';
import { imgToBase64, fmt, fmtDate, safeFilename, generatePDF, printDocument } from '../utils/pdfUtils';

const TX = { venta: 'EN VENTA', arriendo: 'EN ARRIENDO', both: 'VENTA / ARRIENDO' };
const ST = { disponible: 'DISPONIBLE', reservada: 'RESERVADA', vendida: 'VENDIDA', arrendada: 'ARRENDADA' };

export default function PropertyPrintView({ property, onClose }) {
  const docRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [imgs, setImgs] = useState({ logo: '', hero: '', gallery: [] });
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!property) return;
    const urls = property.images || [];
    Promise.all([
      imgToBase64('logo.jpg.png'),
      ...urls.map(imgToBase64),
    ]).then(([logo, ...converted]) => {
      setImgs({
        logo,
        hero: converted[0] || '',
        gallery: converted.slice(1, 5),
      });
      setReady(true);
    });
  }, [property]);

  // Escala responsive de vista previa
  useEffect(() => {
    const el = docRef.current;
    if (!el) return;

    const updateScale = () => {
      const available = window.innerWidth - 32;
      const s = Math.min(1, available / 794);
      setScale(s);
      el.style.transform = s < 1 ? `scale(${s})` : '';
      el.style.transformOrigin = 'top left';
      const wrapper = el.parentElement;
      if (wrapper) {
        wrapper.style.height = s < 1
          ? `${el.scrollHeight * s + 20}px`
          : 'auto';
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [ready]);

  const handleDownload = async () => {
    if (!ready || !docRef.current) return;
    setLoading(true);
    try {
      const safe = safeFilename(property.title);
      await generatePDF(docRef.current, `FichaAdmin-${safe}.pdf`);
    } catch (e) {
      console.error('PDF error', e);
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
    ? (Number(property.price) * Number(property.commissionPercentage)) / 100
    : null;

  const amenities = [
    ...(property.amenities ?? []),
    ...(property.customAmenities ?? []),
  ].filter(Boolean);
  const documents = property.documents || [];

  const hasLegal =
    property.cadastralReference ||
    property.registrationNumber ||
    property.legalStatus ||
    property.publicDeedNumber ||
    property.registeredOwner ||
    property.cadastralAppraisal ||
    property.liensAndLimitations ||
    property.horizontalProperty;

  const hasOwner =
    property.ownerName || property.ownerPhone || property.ownerEmail;

  const hasNotes =
    property.propertyObservations || property.ownerRecommendations;

  const hasCosts =
    property.propertyTax ||
    property.administrationFee ||
    property.rentalDeposit ||
    property.minimumRentalPeriod ||
    property.commissionPercentage;

  const hasPage3 = !!(hasLegal || hasOwner || hasNotes || documents.length);
  const hasPage4 = amenities.length > 0;
  const totalPages = 2 + (hasPage3 ? 1 : 0) + (hasPage4 ? 1 : 0);

  const Header = ({ subtitle }) => (
    <header className="ppv-header">
      <div className="ppv-brand">
        <div className="ppv-logo-wrap">
          {imgs.logo ? (
            <img src={imgs.logo} alt="Logo" className="ppv-logo" />
          ) : (
            <span
              style={{
                fontFamily: 'serif',
                fontSize: 13,
                fontWeight: 700,
                color: '#0B1929',
              }}
            >
              RB
            </span>
          )}
        </div>
        <div>
          <div className="ppv-brand-name">
            INMOBILIARIA RINCÓN BEDOYA Y ASOCIADOS
          </div>
          <div className="ppv-brand-sub">
            {subtitle || 'Ficha Técnica · Uso Interno'}
          </div>
        </div>
      </div>
      <div className="ppv-header-right">
        <span>310 596 8202 · 320 673 6391</span>
        <span>inmobiliaria-ryb-y-asociados.com</span>
        {refId && <span className="ppv-ref-id">REF {refId}</span>}
      </div>
    </header>
  );

  const Footer = ({ page, total }) => (
    <footer className="ppv-footer">
      <span>
        Inmobiliaria Rincón Bedoya y Asociados · Cra 5 #9-28, Anserma,
        Caldas
      </span>
      <span className="ppv-footer-gold">
        Pág. {page}/{total} · {new Date().getFullYear()}
      </span>
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

  const SecHd = ({ children }) => (
    <span className="ppv-sec-hd">{children}</span>
  );

  const stats = [
    { v: property.area,         l: 'Área total',   s: ' m²' },
    { v: property.builtArea,    l: 'Área const.',  s: ' m²' },
    { v: property.rooms,        l: 'Habitaciones', s: '' },
    { v: property.bathrooms,    l: 'Baños',        s: '' },
    { v: property.parkingSpots, l: 'Parqueaderos', s: '' },
    { v: property.floors,       l: 'Pisos',        s: '' },
    { v: property.yearBuilt,    l: 'Año const.',   s: '' },
    { v: property.stratum ? `Est. ${property.stratum}` : null, l: 'Estrato', s: '' },
  ].filter((s) => s.v);

  return (
    <div className="ppv-backdrop" onClick={onClose}>
      <div
        className="ppv-toolbar no-print"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleDownload}
          disabled={loading || !ready}
          className="ppv-btn-dl"
        >
          {loading
            ? '⏳ Generando PDF...'
            : !ready
            ? '⏳ Cargando imágenes...'
            : '⬇ Descargar Ficha Admin'}
        </button>
        <button
          onClick={() =>
            printDocument(docRef.current, property.title || 'Ficha Admin')
          }
          className="ppv-btn-pr"
        >
          🖨 Imprimir
        </button>
        <button onClick={onClose} className="ppv-btn-cl">
          ✕ Cerrar
        </button>
      </div>

      <div className="ppv-scale-wrapper" onClick={(e) => e.stopPropagation()}>
        <div ref={docRef} className="ppv-root">
          {/* PÁGINA 1 */}
          <div className="ppv-page pdf-page">
            <div className="ppv-rule" />
            <Header />

            {imgs.hero ? (
              <div
                className="ppv-hero"
                style={{ backgroundImage: `url(${imgs.hero})` }}
              >
                <div className="ppv-hero-overlay">
                  <div className="ppv-chips">
                    <span className={`ppv-chip ${txCls}`}>{txLabel}</span>
                    <span className={`ppv-chip ${stCls}`}>{stLabel}</span>
                    <span className="ppv-chip chip-type">
                      {(property.type || '').toUpperCase()}
                    </span>
                  </div>
                  <h1 className="ppv-hero-title">
                    {property.title || 'Sin título'}
                  </h1>
                  <p className="ppv-hero-loc">
                    {[property.address, property.neighborhood, property.city, property.department]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="ppv-hero-empty">
                <div>
                  <div className="ppv-chips" style={{ marginBottom: 8 }}>
                    <span className={`ppv-chip ${txCls}`}>{txLabel}</span>
                    <span className={`ppv-chip ${stCls}`}>{stLabel}</span>
                  </div>
                  <h1
                    style={{
                      fontFamily: 'Cormorant Garamond,Georgia,serif',
                      fontSize: 24,
                      fontWeight: 700,
                      color: '#fff',
                      margin: '0 0 3px',
                      lineHeight: 1.15,
                    }}
                  >
                    {property.title || 'Sin título'}
                  </h1>
                  <p
                    style={{
                      fontSize: 9,
                      color: 'rgba(255,255,255,.65)',
                      margin: 0,
                    }}
                  >
                    {[property.address, property.neighborhood, property.city, property.department]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
              </div>
            )}

            <div className="ppv-price-banner">
              <span className="ppv-price-lbl">
                {isArriendo ? 'CANON DE ARRIENDO' : 'PRECIO DE VENTA'}
              </span>
              <span className="ppv-price-val">
                {fmt(property.price)}
                {isArriendo && <small>/ mes</small>}
              </span>
            </div>

            {stats.length > 0 && (
              <div className="ppv-stats-row">
                {stats.map(({ v, l, s }) => (
                  <div key={l} className="ppv-cstat">
                    <b>
                      {typeof v === 'number'
                        ? Number(v).toLocaleString('es-CO')
                        : v}
                      {s}
                    </b>
                    <span>{l}</span>
                  </div>
                ))}
              </div>
            )}

            {property.description && (
              <div className="ppv-cover-desc">
                <SecHd>DESCRIPCIÓN</SecHd>
                <p className="ppv-desc-text">{property.description}</p>
              </div>
            )}

            {imgs.gallery.length > 0 && (
              <div className="ppv-cover-gallery">
                {imgs.gallery.map((img, i) => (
                  <div
                    key={i}
                    className="ppv-gthumb"
                    style={{ backgroundImage: `url(${img})` }}
                  />
                ))}
              </div>
            )}

            <Footer page={1} total={totalPages} />
            <div className="ppv-rule" />
          </div>

          {/* PÁGINA 2 */}
          <div className="ppv-page pdf-page">
            <div className="ppv-rule" />
            <Header subtitle="Características Técnicas e Información Financiera" />
            <div className="ppv-page-banner">
              FICHA TÉCNICA COMPLETA — {property.title?.substring(0, 60)}
            </div>

            <div className="ppv-two-col">
              <div>
                <SecHd>CARACTERÍSTICAS FÍSICAS</SecHd>
                <table className="ppv-table">
                  <tbody>
                    <Row
                      label="Tipo de inmueble"
                      value={property.type}
                    />
                    <Row
                      label="Área total"
                      value={
                        property.area &&
                        `${Number(property.area).toLocaleString(
                          'es-CO',
                        )} m²`
                      }
                    />
                    <Row
                      label="Área construida"
                      value={
                        property.builtArea &&
                        `${Number(property.builtArea).toLocaleString(
                          'es-CO',
                        )} m²`
                      }
                    />
                    <Row
                      label="Habitaciones"
                      value={property.rooms}
                    />
                    <Row
                      label="Baños"
                      value={property.bathrooms}
                    />
                    <Row
                      label="Parqueaderos"
                      value={property.parkingSpots}
                    />
                    <Row
                      label="Pisos / Niveles"
                      value={property.floors}
                    />
                    <Row
                      label="Año de construcción"
                      value={property.yearBuilt}
                    />
                    <Row
                      label="Estrato"
                      value={property.stratum}
                    />
                  </tbody>
                </table>

                <SecHd>UBICACIÓN</SecHd>
                <table className="ppv-table">
                  <tbody>
                    <Row
                      label="Dirección"
                      value={property.address}
                    />
                    <Row
                      label="Barrio / Vereda"
                      value={property.neighborhood}
                    />
                    <Row
                      label="Ciudad"
                      value={property.city}
                    />
                    <Row
                      label="Departamento"
                      value={property.department}
                    />
                    {property.latitude && property.longitude && (
                      <Row
                        label="Coordenadas"
                        value={`${property.latitude}, ${property.longitude}`}
                        mono
                      />
                    )}
                  </tbody>
                </table>

                {hasCosts && (
                  <>
                    <SecHd>PRECIO Y COSTOS</SecHd>
                    <table className="ppv-table">
                      <tbody>
                        <Row label="Transacción" value={txLabel} />
                        <Row
                          label={
                            isArriendo ? 'Canon/mes' : 'Precio de venta'
                          }
                          value={fmt(property.price)}
                        />
                        {property.commissionPercentage && (
                          <Row
                            label={`Comisión (${property.commissionPercentage}%)`}
                            value={commission ? fmt(commission) : null}
                          />
                        )}
                        {property.propertyTax && (
                          <Row
                            label="Predial anual"
                            value={fmt(property.propertyTax)}
                          />
                        )}
                        {property.administrationFee && (
                          <Row
                            label="Administración"
                            value={`${fmt(property.administrationFee)}/mes`}
                          />
                        )}
                        {property.rentalDeposit && (
                          <Row
                            label="Depósito"
                            value={`${property.rentalDeposit} meses`}
                          />
                        )}
                        {property.minimumRentalPeriod && (
                          <Row
                            label="Período mínimo"
                            value={`${property.minimumRentalPeriod} meses`}
                          />
                        )}
                      </tbody>
                    </table>
                  </>
                )}
              </div>

              <div>
                {hasOwner && (
                  <>
                    <SecHd>DATOS DEL PROPIETARIO</SecHd>
                    <div className="ppv-confidential-badge">
                      🔒 INFORMACIÓN CONFIDENCIAL · USO INTERNO
                    </div>
                    <table className="ppv-table">
                      <tbody>
                        <Row
                          label="Nombre"
                          value={property.ownerName}
                          confidential
                        />
                        <Row
                          label="Teléfono"
                          value={property.ownerPhone}
                          confidential
                        />
                        <Row
                          label="Correo"
                          value={property.ownerEmail}
                          confidential
                        />
                      </tbody>
                    </table>
                  </>
                )}

                <SecHd>ESTADO ADMINISTRATIVO</SecHd>
                <table className="ppv-table">
                  <tbody>
                    <Row
                      label="Estado"
                      value={stLabel}
                    />
                    <Row
                      label="ID de referencia"
                      value={refId}
                      mono
                    />
                    <Row
                      label="Fecha publicación"
                      value={fmtDate(property.createdAt)}
                    />
                    <Row
                      label="Última actualización"
                      value={fmtDate(property.updatedAt)}
                    />
                    {property.cadastralAppraisal && (
                      <Row
                        label="Avalúo catastral"
                        value={fmt(property.cadastralAppraisal)}
                      />
                    )}
                  </tbody>
                </table>

                {imgs.gallery.length > 0 && (
                  <>
                    <SecHd>GALERÍA</SecHd>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 5,
                      }}
                    >
                      {imgs.gallery.map((img, i) => (
                        <div
                          key={i}
                          style={{
                            height: 68,
                            borderRadius: 6,
                            backgroundImage: `url(${img})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            border: '1px solid #e2e8f0',
                          }}
                        />
                      ))}
                    </div>
                  </>
                )}

                {!imgs.gallery.length && property.description && (
                  <>
                    <SecHd>DESCRIPCIÓN</SecHd>
                    <p
                      style={{
                        fontSize: 8.5,
                        color: '#374151',
                        lineHeight: 1.65,
                        margin: 0,
                      }}
                    >
                      {property.description.substring(0, 500)}
                      {property.description.length > 500 && '…'}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="ppv-disclaimer">
              La información presentada tiene carácter informativo y está sujeta
              a verificación. Para confirmar disponibilidad y condiciones exactas
              comuníquese al <strong>310 596 8202</strong>.
            </div>
            <Footer page={2} total={totalPages} />
            <div className="ppv-rule" />
          </div>

          {/* PÁGINA 3 */}
          {hasPage3 && (
            <div className="ppv-page pdf-page">
              <div className="ppv-rule" />
              <Header subtitle="Información Jurídica y Observaciones" />
              <div className="ppv-page-banner">
                INFORMACIÓN JURÍDICA · CONFIDENCIAL · USO INTERNO
              </div>

              <div className="ppv-two-col">
                <div>
                  {hasLegal && (
                    <>
                      <SecHd>IDENTIFICACIÓN REGISTRAL</SecHd>
                      <table className="ppv-table">
                        <tbody>
                          <Row
                            label="Matrícula inmobiliaria"
                            value={property.registrationNumber}
                            mono
                          />
                          <Row
                            label="Ficha catastral"
                            value={property.cadastralReference}
                            mono
                          />
                          <Row
                            label="Escritura pública N°"
                            value={property.publicDeedNumber}
                            mono
                          />
                          <Row
                            label="Propietario registrado"
                            value={property.registeredOwner}
                          />
                        </tbody>
                      </table>

                      {(property.legalStatus ||
                        property.cadastralAppraisal ||
                        property.horizontalProperty) && (
                        <>
                          <SecHd>ESTADO JURÍDICO</SecHd>
                          <table className="ppv-table">
                            <tbody>
                              <Row
                                label="Estado jurídico"
                                value={property.legalStatus}
                              />
                              <Row
                                label="Avalúo catastral"
                                value={
                                  property.cadastralAppraisal &&
                                  fmt(property.cadastralAppraisal)
                                }
                              />
                              {property.horizontalProperty && (
                                <Row
                                  label="Propiedad horizontal"
                                  value="Sí"
                                />
                              )}
                              {property.horizontalPropertyRegime && (
                                <Row
                                  label="Reglamento PH"
                                  value={property.horizontalPropertyRegime}
                                />
                              )}
                            </tbody>
                          </table>
                        </>
                      )}

                      {property.liensAndLimitations && (
                        <>
                          <SecHd>GRAVÁMENES Y LIMITACIONES</SecHd>
                          <div className="ppv-text-block warn">
                            {property.liensAndLimitations}
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {documents.length > 0 && (
                    <>
                      <SecHd>DOCUMENTOS ADJUNTOS</SecHd>
                      <ul
                        style={{
                          listStyle: 'none',
                          padding: '3px 0 0',
                          margin: 0,
                          fontSize: 8.5,
                          color: '#374151',
                        }}
                      >
                        {documents.map((doc, i) => (
                          <li
                            key={i}
                            style={{
                              padding: '2.5px 0',
                              borderBottom: '1px solid #f0f0f0',
                            }}
                          >
                            📄 {doc.name || `Documento ${i + 1}`}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>

                <div>
                  {hasOwner && (
                    <>
                      <SecHd>DATOS DEL PROPIETARIO</SecHd>
                      <div className="ppv-confidential-badge">
                        🔒 INFORMACIÓN CONFIDENCIAL · USO INTERNO
                      </div>
                      <table className="ppv-table">
                        <tbody>
                          <Row
                            label="Nombre completo"
                            value={property.ownerName}
                            confidential
                          />
                          <Row
                            label="Teléfono"
                            value={property.ownerPhone}
                            confidential
                          />
                          <Row
                            label="Correo electrónico"
                            value={property.ownerEmail}
                            confidential
                          />
                        </tbody>
                      </table>
                    </>
                  )}

                  {property.propertyObservations && (
                    <>
                      <SecHd>OBSERVACIONES DE LA PROPIEDAD</SecHd>
                      <div className="ppv-text-block">
                        {property.propertyObservations}
                      </div>
                    </>
                  )}

                  {property.ownerRecommendations && (
                    <>
                      <SecHd>RECOMENDACIONES DEL PROPIETARIO</SecHd>
                      <div className="ppv-text-block info">
                        {property.ownerRecommendations}
                      </div>
                    </>
                  )}

                  <SecHd>RESUMEN FINANCIERO</SecHd>
                  <table className="ppv-table">
                    <tbody>
                      <Row
                        label={isArriendo ? 'Canon/mes' : 'Precio venta'}
                        value={fmt(property.price)}
                      />
                      {property.commissionPercentage && (
                        <Row
                          label={`Comisión ${property.commissionPercentage}%`}
                          value={commission ? fmt(commission) : null}
                        />
                      )}
                      {property.cadastralAppraisal && (
                        <Row
                          label="Avalúo catastral"
                          value={fmt(property.cadastralAppraisal)}
                        />
                      )}
                      {property.propertyTax && (
                        <Row
                          label="Predial anual"
                          value={fmt(property.propertyTax)}
                        />
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="ppv-disclaimer">
                <strong>
                  DOCUMENTO CONFIDENCIAL · USO EXCLUSIVO INTERNO.
                </strong>{' '}
                Esta ficha contiene información jurídica, financiera y de
                contacto de uso restringido. No compartir con terceros sin
                autorización de la dirección. Generada el{' '}
                {new Date().toLocaleDateString('es-CO', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
                .
              </div>
              <Footer page={3} total={totalPages} />
              <div className="ppv-rule" />
            </div>
          )}

          {/* PÁGINA 4 */}
          {hasPage4 && (
            <div className="ppv-page pdf-page">
              <div className="ppv-rule" />
              <Header subtitle="Amenidades, Características y Observaciones" />
              <div className="ppv-page-banner">
                AMENIDADES, OBSERVACIONES Y DOCUMENTOS
              </div>

              <div className="ppv-two-col">
                <div>
                  {amenities.length > 0 && (
                    <>
                      <SecHd>AMENIDADES Y CARACTERÍSTICAS ADICIONALES</SecHd>
                      <ul className="ppv-amenities-list">
                        {amenities.map((a) => (
                          <li key={a}>{a}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>

                <div>
                  {!hasPage3 && property.propertyObservations && (
                    <>
                      <SecHd>OBSERVACIONES DE LA PROPIEDAD</SecHd>
                      <div className="ppv-text-block">
                        {property.propertyObservations}
                      </div>
                    </>
                  )}

                  {!hasPage3 && property.ownerRecommendations && (
                    <>
                      <SecHd>RECOMENDACIONES DEL PROPIETARIO</SecHd>
                      <div className="ppv-text-block info">
                        {property.ownerRecommendations}
                      </div>
                    </>
                  )}

                  {!hasPage3 && documents.length > 0 && (
                    <>
                      <SecHd>DOCUMENTOS ADJUNTOS</SecHd>
                      <ul
                        style={{
                          listStyle: 'none',
                          padding: '3px 0 0',
                          margin: 0,
                          fontSize: 8.5,
                          color: '#374151',
                        }}
                      >
                        {documents.map((doc, i) => (
                          <li
                            key={i}
                            style={{
                              padding: '2.5px 0',
                              borderBottom: '1px solid #f0f0f0',
                            }}
                          >
                            📄 {doc.name || `Documento ${i + 1}`}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {hasPage3 && amenities.length > 0 && (
                    <>
                      <SecHd>CARACTERÍSTICAS ADICIONALES</SecHd>
                      <p
                        style={{
                          fontSize: 8,
                          color: '#64748b',
                          fontStyle: 'italic',
                          margin: '4px 0',
                        }}
                      >
                        Ver listado completo en columna izquierda.
                      </p>
                    </>
                  )}
                </div>
              </div>

              <Footer page={hasPage3 ? 4 : 3} total={totalPages} />
              <div className="ppv-rule" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}