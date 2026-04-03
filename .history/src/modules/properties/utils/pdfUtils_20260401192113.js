import { getStorage, ref, getBlob } from 'firebase/storage';

const storage = getStorage();

// ── CORS FIX: Firebase Storage via SDK (bypasa CORS completamente) ──
const firebaseToBase64 = async (url) => {
  try {
    const match = url.match(/\/o\/(.+?)(?:\?|$)/);
    if (!match) throw new Error('path not found');
    const path = decodeURIComponent(match[1]);
    const blob = await getBlob(ref(storage, path));
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(url);
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
};

// ── Archivos locales (logo, etc.) via fetch normal ──
const localToBase64 = async (url) => {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error('fetch fail');
    const blob = await r.blob();
    return new Promise((resolve) => {
      const fr = new FileReader();
      fr.onloadend = () => resolve(fr.result);
      fr.onerror = () => resolve(url);
      fr.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
};

export const imgToBase64 = async (url) => {
  if (!url) return '';
  // URLs de Firebase Storage → usar SDK (sin CORS)
  if (url.includes('firebasestorage') || url.includes('googleapis.com/v0/b/')) {
    return firebaseToBase64(url);
  }
  // Archivos locales y otros → fetch normal
  return localToBase64(url);
};

// ── Utilidades ──
export const fmt = (p) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(p ?? 0);

export const fmtDate = (ts) => {
  if (!ts) return null;
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
};

export const safeFilename = (title) =>
  (title || 'propiedad')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);

// ── DESCARGA PDF: captura el elemento completo y pagina automáticamente ──
// Sin páginas fijas → sin espacios en blanco, el contenido fluye inteligente
export const generatePDF = async (element, filename) => {
  const { default: jsPDF } = await import('jspdf');
  const { default: html2canvas } = await import('html2canvas');

  // Captura el documento completo de una vez
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    imageTimeout: 30000,
    windowWidth: 794,
    width: 794,
  });

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });

  const PAGE_W_MM = 210;
  const PAGE_H_MM = 297;
  const canvasW = canvas.width;
  const canvasH = canvas.height;
  const pxPerMm = canvasW / PAGE_W_MM;
  const pageHeightPx = PAGE_H_MM * pxPerMm;

  let yPx = 0;
  let pageNum = 0;

  while (yPx < canvasH) {
    if (pageNum > 0) pdf.addPage();

    const sliceH = Math.min(pageHeightPx, canvasH - yPx);

    // Crear canvas temporal para esta franja
    const slice = document.createElement('canvas');
    slice.width = canvasW;
    slice.height = Math.ceil(sliceH);
    const ctx = slice.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasW, slice.height);
    ctx.drawImage(canvas, 0, yPx, canvasW, sliceH, 0, 0, canvasW, sliceH);

    const imgData = slice.toDataURL('image/jpeg', 0.93);
    const sliceHmm = sliceH / pxPerMm;
    pdf.addImage(imgData, 'JPEG', 0, 0, PAGE_W_MM, sliceHmm);

    yPx += pageHeightPx;
    pageNum++;
  }

  pdf.save(filename);
};

// ── IMPRIMIR: abre ventana nueva con SOLO la ficha (sin la app alrededor) ──
export const printDocument = (element, title = 'Ficha Técnica') => {
  // Recolectar todos los estilos CSS del documento actual
  const cssText = Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules || []).map((r) => r.cssText).join('\n');
      } catch {
        return '';
      }
    })
    .join('\n');

  // Recolectar links de fuentes (Google Fonts, Fontshare, etc.)
  const fontLinks = Array.from(
    document.querySelectorAll('link[href*="fonts.googleapis"], link[href*="fontshare"], link[href*="fonts.gstatic"]')
  ).map((l) => l.outerHTML).join('\n');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  ${fontLinks}
  <style>
    ${cssText}
    @page { size: A4; margin: 0; }
    body { margin: 0; padding: 0; background: white; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .no-print,
    .ppv-toolbar,
    .cflyer-toolbar { display: none !important; }
    .ppv-backdrop,
    .cflyer-backdrop {
      position: static !important;
      background: none !important;
      padding: 0 !important;
      overflow: visible !important;
      display: block !important;
    }
  </style>
</head>
<body>${element.innerHTML}</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    alert('Activa las ventanas emergentes para poder imprimir.');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 1200);
};