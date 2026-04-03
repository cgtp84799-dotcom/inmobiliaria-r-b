// Convierte URL (incluyendo Firebase Storage) a base64 para evitar CORS en canvas
export const imgToBase64 = async (url) => {
  if (!url) return '';
  try {
    const r = await fetch(url, { mode: 'cors', cache: 'no-store' });
    if (!r.ok) throw new Error('fetch fail');
    const blob = await r.blob();
    return await new Promise((res) => {
      const fr = new FileReader();
      fr.onloadend = () => res(fr.result);
      fr.readAsDataURL(blob);
    });
  } catch {
    // Fallback canvas
    return new Promise((res) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          c.getContext('2d').drawImage(img, 0, 0);
          res(c.toDataURL('image/jpeg', 0.88));
        } catch { res(url); }
      };
      img.onerror = () => res(url);
      img.src = url;
    });
  }
};

export const fmt = (p) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(p ?? 0);

export const fmtDate = (ts) => {
  if (!ts) return null;
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
};

export const safeFilename = (title = 'propiedad') =>
  title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').substring(0, 50);

// CLAVE: cada .pdf-page se renderiza como canvas independiente → sin espacios blancos
export const generatePDF = async (element, filename) => {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);

  const pages = element.querySelectorAll('.pdf-page');
  if (!pages.length) throw new Error('No se encontraron páginas PDF');

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });

  for (let i = 0; i < pages.length; i++) {
    const canvas = await html2canvas(pages[i], {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      imageTimeout: 30000,
    });
    if (i > 0) pdf.addPage();
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
  }

  pdf.save(filename);
};