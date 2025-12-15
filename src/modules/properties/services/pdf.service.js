import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // ✅ Importación para Vite

const formatPrice = (price) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(price || 0);
};

const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('es-CO', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

export const generatePropertyPDF = async (property) => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPosition = margin;

    // ==================== ENCABEZADO ====================
    doc.setFillColor(251, 191, 36); // Color primario dorado
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(15, 23, 42); // Slate-900
    doc.setFontSize(28);
    doc.setFont(undefined, 'bold');
    doc.text('FICHA TÉCNICA', margin, 18);

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Propiedad ID: ${property.id?.substring(0, 8) || 'N/A'}`, margin, 28);
    doc.text(`Generado: ${formatDate(new Date())}`, margin, 33);

    yPosition = 50;

    // ==================== TÍTULO Y ESTADO ====================
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(property.title, margin, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Estado: ${property.status?.charAt(0).toUpperCase() + property.status?.slice(1) || 'Disponible'}`, margin, yPosition);
    yPosition += 10;

    // ==================== INFORMACIÓN FINANCIERA ====================
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(251, 191, 36);
    doc.text('INFORMACIÓN FINANCIERA', margin, yPosition);
    yPosition += 8;

    const financeData = [
      [
        property.transactionType === 'venta' ? 'Precio de venta:' : 'Canon de arriendo:',
        formatPrice(property.price)
      ]
    ];

    if (property.commissionPercentage) {
      financeData.push([
        `Comisión (${property.commissionPercentage}%):`,
        formatPrice(property.price * (property.commissionPercentage / 100))
      ]);
    }

    if (property.propertyTax) {
      financeData.push(['Predial (anual):', formatPrice(property.propertyTax)]);
    }

    if (property.administrationFee) {
      financeData.push(['Administración:', formatPrice(property.administrationFee)]);
    }

    autoTable(doc, {
      startY: yPosition,
      head: [['Concepto', 'Valor']],
      body: financeData,
      theme: 'grid',
      headStyles: {
        fillColor: [251, 191, 36],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 10
      },
      bodyStyles: {
        textColor: [15, 23, 42],
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 60, halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: margin, right: margin }
    });

    yPosition = doc.lastAutoTable.finalY + 10;

    // ==================== CARACTERÍSTICAS ====================
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(251, 191, 36);
    doc.text('CARACTERÍSTICAS PRINCIPALES', margin, yPosition);
    yPosition += 8;

    const characteristics = [];
    if (property.type) characteristics.push(['Tipo:', property.type]);
    if (property.area) characteristics.push(['Área total:', `${property.area} m²`]);
    if (property.builtArea) characteristics.push(['Área construida:', `${property.builtArea} m²`]);
    if (property.rooms) characteristics.push(['Habitaciones:', property.rooms]);
    if (property.bathrooms) characteristics.push(['Baños:', property.bathrooms]);
    if (property.parkingSpots) characteristics.push(['Parqueaderos:', property.parkingSpots]);
    if (property.floors) characteristics.push(['Pisos:', property.floors]);
    if (property.yearBuilt) characteristics.push(['Año:', property.yearBuilt]);
    if (property.stratum) characteristics.push(['Estrato:', property.stratum]);

    if (characteristics.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        head: [['Característica', 'Valor']],
        body: characteristics,
        theme: 'striped',
        headStyles: {
          fillColor: [251, 191, 36],
          textColor: [15, 23, 42],
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 60, fontStyle: 'bold' }
        },
        margin: { left: margin, right: margin }
      });

      yPosition = doc.lastAutoTable.finalY + 10;
    }

    // ==================== UBICACIÓN ====================
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(251, 191, 36);
    doc.text('UBICACIÓN', margin, yPosition);
    yPosition += 8;

    const locationData = [
      ['Dirección:', property.address || 'N/A'],
      ['Barrio:', property.neighborhood || 'N/A'],
      ['Ciudad:', property.city || 'N/A'],
      ['Departamento:', property.department || 'N/A']
    ];

    autoTable(doc, {
      startY: yPosition,
      body: locationData,
      theme: 'plain',
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold', textColor: [100, 116, 139] },
        1: { cellWidth: 110, textColor: [15, 23, 42] }
      },
      margin: { left: margin, right: margin }
    });

    yPosition = doc.lastAutoTable.finalY + 10;

    // ==================== DESCRIPCIÓN ====================
    if (property.description) {
      if (yPosition > pageHeight - 50) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(251, 191, 36);
      doc.text('DESCRIPCIÓN', margin, yPosition);
      yPosition += 8;

      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(51, 65, 85);
      const splitDescription = doc.splitTextToSize(property.description, pageWidth - 2 * margin);
      doc.text(splitDescription, margin, yPosition);
      yPosition += splitDescription.length * 5 + 10;
    }

    // ==================== AMENIDADES ====================
    const amenities = [...(property.amenities || []), ...(property.customAmenities || [])];
    if (amenities.length > 0) {
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(251, 191, 36);
      doc.text('AMENIDADES', margin, yPosition);
      yPosition += 8;

      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(51, 65, 85);

      amenities.forEach((amenity) => {
        if (yPosition > pageHeight - 15) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(`• ${amenity}`, margin + 5, yPosition);
        yPosition += 5;
      });
    }

    // ==================== PIE DE PÁGINA ====================
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      
      doc.text(
        `Página ${i} de ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
      
      doc.text(
        `© ${new Date().getFullYear()} Inmobiliaria Rincón Bedoya y Asociados`,
        pageWidth / 2,
        pageHeight - 5,
        { align: 'center' }
      );
    }

    // ==================== DESCARGAR ====================
    const fileName = `Ficha_${property.title?.replace(/\s+/g, '_').substring(0, 30)}_${Date.now()}.pdf`;
    doc.save(fileName);

    return true;
  } catch (error) {
    console.error('Error generando PDF:', error);
    throw error;
  }
};