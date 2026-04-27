// Función para comprimir imágenes
//
// ★ FIX (auditoría): antes esta función no manejaba errores — si el
// FileReader o la decodificación de la imagen fallaban, la promesa nunca
// resolvía/rechazaba y el upload se colgaba indefinidamente.
export const optimizeImage = (file, maxWidth = 1920, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Archivo requerido'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('No se pudo decodificar la imagen'));
      img.src = event.target.result;

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Si la imagen es muy grande, reducirla a maxWidth de ancho
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convertir a JPEG comprimido
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                // Fallback al archivo original si la compresión falló
                resolve(file);
                return;
              }
              resolve(new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              }));
            },
            'image/jpeg',
            quality
          );
        } catch (err) {
          reject(err);
        }
      };
    };
  });
};