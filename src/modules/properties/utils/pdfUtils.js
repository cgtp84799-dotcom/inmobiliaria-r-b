export const fmt = (p) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(p ?? 0);

export const fmtDate = (ts) => {
  if (!ts) return null;
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const safeFilename = (title) =>
  (title || 'propiedad')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);

export const imgToBase64 = async (url) => url;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isValidImageSrc = (src) =>
  typeof src === 'string' &&
  src.trim() &&
  !src.startsWith('blob:null') &&
  !src.startsWith('undefined') &&
  !src.startsWith('null');

const waitForImage = (img) =>
  new Promise((resolve) => {
    if (!img) return resolve();
    if (img.complete && img.naturalWidth > 0) return resolve();

    const done = () => {
      img.removeEventListener('load', done);
      img.removeEventListener('error', done);
      resolve();
    };

    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
  });

const waitForAllImages = async (root, timeout = 15000) => {
  if (!root) return;

  const images = Array.from(root.querySelectorAll('img'));

  images.forEach((img) => {
    const src = img.getAttribute('src') || '';

    if (!isValidImageSrc(src)) {
      img.removeAttribute('src');
      img.style.visibility = 'hidden';
      return;
    }

    img.setAttribute('loading', 'eager');
    img.setAttribute('decoding', 'sync');
    img.setAttribute('crossorigin', 'anonymous');
    img.removeAttribute('srcset');
  });

  await Promise.race([
    Promise.all(images.map(waitForImage)),
    wait(timeout),
  ]);
};

const waitForFonts = async (docLike = document, timeout = 5000) => {
  try {
    if (docLike?.fonts?.ready) {
      await Promise.race([docLike.fonts.ready, wait(timeout)]);
    } else {
      await wait(500);
    }
  } catch {
    await wait(500);
  }
};

const cloneForExport = (sourceEl) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'export-shell';
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-100000px';
  wrapper.style.top = '0';
  wrapper.style.zIndex = '-1';
  wrapper.style.pointerEvents = 'none';
  wrapper.style.background = '#ffffff';
  wrapper.style.padding = '0';
  wrapper.style.margin = '0';
  wrapper.style.boxSizing = 'border-box';
  wrapper.style.overflow = 'visible';

  const clone = sourceEl.cloneNode(true);

  clone.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src') || '';
    if (!isValidImageSrc(src)) {
      img.remove();
      return;
    }

    img.setAttribute('loading', 'eager');
    img.setAttribute('decoding', 'sync');
    img.setAttribute('crossorigin', 'anonymous');
    img.removeAttribute('srcset');
  });

  clone.querySelectorAll('.no-print').forEach((el) => {
    el.remove();
  });

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  return { wrapper, clone };
};

const removeNodeSafe = (node) => {
  try {
    node?.parentNode?.removeChild(node);
  } catch {}
};

const getScale = () => {
  const dpr = window.devicePixelRatio || 1;
  return Math.max(2, Math.min(3, dpr * 2));
};

const getPageTargets = (root, pageSelector) => {
  const pages = Array.from(root.querySelectorAll(pageSelector));
  return pages.length ? pages : [root];
};

const ensureStablePageSize = (page) => {
  const rect = page.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(rect.width));
  const height = Math.max(1, Math.ceil(rect.height));

  page.style.width = `${width}px`;
  page.style.minWidth = `${width}px`;
  page.style.maxWidth = `${width}px`;
  page.style.height = `${height}px`;
  page.style.minHeight = `${height}px`;
  page.style.maxHeight = `${height}px`;
  page.style.boxSizing = 'border-box';

  return { width, height };
};

export const downloadPDFExactVisual = async (
  elementRef,
  filename,
  pageSelector = '.ppv-page, .cflyer-page, .pdf-page'
) => {
  if (!elementRef?.current) throw new Error('Elemento no encontrado');

  const source = elementRef.current;
  const sourceRect = source.getBoundingClientRect();
  const { wrapper, clone } = cloneForExport(source);

  try {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);

    const rootWidth = Math.max(1, Math.ceil(sourceRect.width));
    wrapper.style.width = `${rootWidth}px`;
    wrapper.style.minWidth = `${rootWidth}px`;
    wrapper.style.maxWidth = 'none';

    clone.classList.add('exact-pdf-mode');

    await waitForFonts(document, 5000);
    await waitForAllImages(wrapper, 15000);
    await wait(250);

    const targets = getPageTargets(clone, pageSelector);

    let pdf = null;

    for (let i = 0; i < targets.length; i += 1) {
      const page = targets[i];
      const { width, height } = ensureStablePageSize(page);

      await waitForAllImages(page, 8000);
      await wait(120);

      const canvas = await html2canvas(page, {
        scale: getScale(),
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 15000,
        removeContainer: true,
        foreignObjectRendering: false,
        width,
        height,
        windowWidth: width,
        windowHeight: height,
        scrollX: 0,
        scrollY: 0,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const orientation = canvas.width >= canvas.height ? 'landscape' : 'portrait';
      const pageFormat = [canvas.width, canvas.height];

      if (!pdf) {
        pdf = new jsPDF({
          orientation,
          unit: 'px',
          format: pageFormat,
          compress: true,
          precision: 12,
        });
      } else {
        pdf.addPage(pageFormat, orientation);
      }

      pdf.addImage(
        imgData,
        'JPEG',
        0,
        0,
        canvas.width,
        canvas.height,
        `page-${i + 1}`,
        'FAST'
      );
    }

    if (!pdf) throw new Error('No se pudo generar el PDF');

    pdf.save(filename || `${safeFilename('propiedad')}.pdf`);
  } finally {
    removeNodeSafe(wrapper);
  }
};  