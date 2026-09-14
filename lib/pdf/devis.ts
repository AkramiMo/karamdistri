import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { CompanySettings, defaultCompanySettings, formatCompanyAddress } from '../company'

interface DDCItem {
  article_code: string
  article_name: string
  quantity: number
  unit_price: number
}

interface Client {
  code: string
  name: string
  phone: string | null
  city: string | null
}

interface DDC {
  id: string
  ddc_number: string
  request_date: string
  validity_date: string | null
  status: string
  total_ht: number
  notes: string | null
  client: Client
  ddc_items: DDCItem[]
}

export function generateDevisPDF(ddc: DDC, company?: CompanySettings): void {
  const doc = new jsPDF()
  const settings = company || defaultCompanySettings

  // Load logo
  const logoUrl = '/Logo.png'
  const img = new Image()
  img.crossOrigin = 'Anonymous'

  img.onload = () => {
    try {
      // Calculate aspect ratio to fit logo - larger size
      const maxWidth = 60
      const maxHeight = 45
      let width = img.width
      let height = img.height

      if (width > maxWidth) {
        height = (maxWidth / width) * height
        width = maxWidth
      }
      if (height > maxHeight) {
        width = (maxHeight / height) * width
        height = maxHeight
      }

      // Align logo to the left
      doc.addImage(img, 'PNG', 5, 10, width, height)
      generateContent(doc, ddc, settings, true, width)
    } catch (error) {
      // If logo fails to load, continue without it
      generateContent(doc, ddc, settings, false, 0)
    }
  }

  img.onerror = () => {
    // Fallback to text if logo fails
    generateContent(doc, ddc, settings, false, 0)
  }

  img.src = logoUrl
}

function generateContent(doc: jsPDF, ddc: DDC, settings: CompanySettings, hasLogo: boolean, logoWidth: number): void {
  // Devis title centered in page
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(184, 134, 11)
  doc.text('DEVIS', 105, 20, { align: 'center' })

  // Devis info box on the right (sans fond)
  doc.setDrawColor(184, 134, 11)
  doc.setLineWidth(0.5)
  doc.roundedRect(140, 28, 55, 25, 2, 2, 'S')
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.text(`N°: ${ddc.ddc_number}`, 145, 36)
  doc.setFont('helvetica', 'normal')
  doc.text(`Date: ${new Date(ddc.request_date).toLocaleDateString('fr-FR')}`, 145, 44)

  // Client info box (sans fond)
  doc.setDrawColor(184, 134, 11)
  doc.setLineWidth(0.5)
  doc.roundedRect(10, 78, 90, 30, 2, 2, 'S')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(184, 134, 11)
  doc.text('CLIENT', 15, 86)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`${ddc.client?.code || ''} - ${ddc.client?.name || ''}`, 15, 93)
  if (ddc.client?.phone) {
    doc.text(`Tel: ${ddc.client.phone}`, 15, 100)
  }
  if (ddc.client?.city) {
    doc.text(`Ville: ${ddc.client.city}`, 15, 107)
  }

  // Validity notice before table (with more space after client box)
  let tableStartY = 125
  if (ddc.validity_date) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(184, 134, 11)
    doc.text(`Devis valable jusqu'au : ${new Date(ddc.validity_date).toLocaleDateString('fr-FR')}`, 10, 120)
    tableStartY = 128
  }

  // Items table (sans Quantité et Total)
  const tableData = ddc.ddc_items?.map((item) => [
    item.article_code,
    item.article_name,
    `${item.unit_price.toFixed(2)} MAD`,
  ]) || []

  autoTable(doc, {
    startY: tableStartY,
    head: [['Code', 'Désignation', 'Prix Unit.']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [184, 134, 11],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 110 },
      2: { cellWidth: 40, halign: 'right' },
    },
    styles: {
      fontSize: 9,
    },
  })

  const finalY = (doc as any).lastAutoTable.finalY + 10

  // Section Conditions (avec encadrement)
  const conditionsHeight = ddc.notes ? 25 : 20
  doc.setDrawColor(184, 134, 11)
  doc.setLineWidth(0.5)
  doc.roundedRect(10, finalY, 190, conditionsHeight, 2, 2, 'S')

  // Titre Conditions
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(184, 134, 11)
  doc.text('Conditions :', 15, finalY + 8)

  // Contenu des conditions (notes)
  if (ddc.notes) {
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(ddc.notes, 15, finalY + 16)
  }

  const conditionsEndY = finalY + conditionsHeight

  // Validation section
  const validationY = conditionsEndY + 10

  // Box for validation
  doc.setDrawColor(184, 134, 11)
  doc.setLineWidth(0.5)
  doc.roundedRect(10, validationY, 190, 55, 2, 2, 'S')

  // Title
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(184, 134, 11)
  doc.text('Validation du devis', 15, validationY + 8)

  // Validation text
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  doc.text('Devis valable après signature.', 15, validationY + 16)

  // Left column - Fait à / Le
  doc.setFont('helvetica', 'bold')
  doc.text('Fait à :', 15, validationY + 26)
  doc.setFont('helvetica', 'normal')
  doc.text('___________________________', 33, validationY + 26)

  doc.setFont('helvetica', 'bold')
  doc.text('Le :', 15, validationY + 34)
  doc.setFont('helvetica', 'normal')
  doc.text('___________________________', 25, validationY + 34)

  // Right column - Signature
  doc.setFont('helvetica', 'bold')
  doc.text('Signature du client :', 115, validationY + 26)
  doc.setFont('helvetica', 'normal')
  doc.text('« Bon pour accord »', 160, validationY + 26)

  // Signature box
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.rect(115, validationY + 30, 75, 20, 'S')

  // Company address at bottom
  const pageHeight = doc.internal.pageSize.height
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)

  let footerY = pageHeight - 25
  const companyAddress = formatCompanyAddress(settings)
  if (companyAddress) {
    doc.text(companyAddress, 105, footerY, { align: 'center' })
    footerY += 4
  }
  if (settings.phone) {
    doc.text(`Tel: ${settings.phone}`, 105, footerY, { align: 'center' })
    footerY += 4
  }
  if (settings.email) {
    doc.text(`Email: ${settings.email}`, 105, footerY, { align: 'center' })
  }

  // Footer
  doc.setTextColor(150, 150, 150)
  doc.text('Conditions générales de vente applicables.', 105, pageHeight - 5, { align: 'center' })

  // Save PDF
  doc.save(`Devis_${ddc.ddc_number}.pdf`)
}
