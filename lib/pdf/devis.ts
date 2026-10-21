import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { CompanySettings, defaultCompanySettings, formatCompanyIdentifiers } from '../company'

interface DDCItem {
  article_code: string
  article_name: string
  description?: string | null
  quantity: number
  unit_price: number
}

interface EmballageItem {
  code: string
  name: string
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
  emballages?: EmballageItem[]
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
  // Devis title centered in page - repositionné plus haut
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(184, 134, 11)
  doc.text('DEVIS', 105, 15, { align: 'center' })

  // Devis info box on the right (sans fond) - repositionné
  doc.setDrawColor(184, 134, 11)
  doc.setLineWidth(0.5)
  doc.roundedRect(140, 20, 55, 22, 2, 2, 'S')
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.text(`N°: ${ddc.ddc_number}`, 145, 28)
  doc.setFont('helvetica', 'normal')
  doc.text(`Date: ${new Date(ddc.request_date).toLocaleDateString('fr-FR')}`, 145, 36)

  // Identifiants société sous le logo (ICE, IF, TP) - alignés avec le logo
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  let infoY = 58
  if (settings.ice) {
    doc.text(`ICE: ${settings.ice}`, 15, infoY)
    infoY += 5
  }
  if (settings.if_number) {
    doc.text(`IF: ${settings.if_number}`, 15, infoY)
    infoY += 5
  }
  if (settings.patente) {
    doc.text(`TP: ${settings.patente}`, 15, infoY)
  }

  // Client info box (sans fond) - à droite
  doc.setDrawColor(184, 134, 11)
  doc.setLineWidth(0.5)
  doc.roundedRect(105, 48, 90, 28, 2, 2, 'S')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(184, 134, 11)
  doc.text('CLIENT', 110, 56)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`${ddc.client?.code || ''} - ${ddc.client?.name || ''}`, 110, 63)
  if (ddc.client?.phone) {
    doc.text(`Tel: ${ddc.client.phone}`, 110, 70)
  }
  if (ddc.client?.city) {
    doc.text(`Ville: ${ddc.client.city}`, 150, 70)
  }

  // Validity notice before table - repositionné
  let tableStartY = 85
  if (ddc.validity_date) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(184, 134, 11)
    doc.text(`Devis valable jusqu'au : ${new Date(ddc.validity_date).toLocaleDateString('fr-FR')}`, 10, 82)
    tableStartY = 88
  }

  // Items table (sans Quantité et Total)
  const articleRows = ddc.ddc_items?.map((item) => {
    // Combiner nom et description si présente
    const designation = item.description
      ? `${item.article_name}\n${item.description}`
      : item.article_name
    return [
      item.article_code,
      designation,
      `${item.unit_price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} MAD`,
    ]
  }) || []

  // Ajouter les emballages au tableau
  const emballageRows = ddc.emballages?.map((emb) => [
    emb.code,
    `[Emballage] ${emb.name}`,
    `${emb.unit_price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} MAD`,
  ]) || []

  const tableData = [...articleRows, ...emballageRows]

  const pageHeight = doc.internal.pageSize.height

  autoTable(doc, {
    startY: tableStartY,
    head: [['Code', 'Description', 'Prix Unit.']],
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
    // Gestion multi-pages
    showHead: 'everyPage',
    margin: { top: 15, bottom: 15 },
    didDrawPage: (data) => {
      // Numéro de page en bas de chaque page
      const pageNumber = doc.getNumberOfPages()
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(`Page ${data.pageNumber}`, 105, pageHeight - 8, { align: 'center' })
    },
  })

  let finalY = (doc as any).lastAutoTable.finalY + 8

  // Vérifier si on a assez d'espace pour les sections conditions et validation
  const conditionsHeight = ddc.notes ? 22 : 18
  const validationHeight = 50
  const requiredSpace = conditionsHeight + validationHeight + 25

  if (finalY + requiredSpace > pageHeight) {
    doc.addPage()
    finalY = 15
  }

  // Section Conditions (avec encadrement)
  doc.setDrawColor(184, 134, 11)
  doc.setLineWidth(0.5)
  doc.roundedRect(10, finalY, 190, conditionsHeight, 2, 2, 'S')

  // Titre Conditions
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(184, 134, 11)
  doc.text('Conditions :', 15, finalY + 6)

  // Contenu des conditions (notes)
  if (ddc.notes) {
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(ddc.notes, 15, finalY + 13)
  }

  const conditionsEndY = finalY + conditionsHeight

  // Validation section
  const validationY = conditionsEndY + 5

  // Box for validation
  doc.setDrawColor(184, 134, 11)
  doc.setLineWidth(0.5)
  doc.roundedRect(10, validationY, 190, validationHeight, 2, 2, 'S')

  // Title
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(184, 134, 11)
  doc.text('Validation du devis', 15, validationY + 6)

  // Validation text
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  doc.text('Devis valable après signature.', 15, validationY + 12)

  // Left column - Fait à / Le
  doc.setFont('helvetica', 'bold')
  doc.text('Fait à :', 15, validationY + 20)
  doc.setFont('helvetica', 'normal')
  doc.text('_______________________', 30, validationY + 20)

  doc.setFont('helvetica', 'bold')
  doc.text('Le :', 15, validationY + 28)
  doc.setFont('helvetica', 'normal')
  doc.text('_______________________', 24, validationY + 28)

  // Right column - Signature
  doc.setFont('helvetica', 'bold')
  doc.text('Signature du client :', 115, validationY + 20)
  doc.setFont('helvetica', 'normal')
  doc.text('« Bon pour accord »', 155, validationY + 20)

  // Signature box
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.rect(115, validationY + 24, 75, 22, 'S')


  // Save PDF
  doc.save(`Devis_${ddc.ddc_number}.pdf`)
}
