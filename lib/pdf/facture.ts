import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { saveFacturePDF } from './saveWithPicker'

interface ArticleItem {
  article_code: string
  article_name: string
  quantity: number
  unit_price: number
  total: number
}

interface DeliveryItem {
  id: string
  delivery_number: string
  delivery_date: string | null
  total_ht: number | null
  items?: ArticleItem[]
}

interface Client {
  code: string
  name: string
  phone: string | null
  city: string | null
  ice: string | null
}

interface CompanyInfo {
  ice?: string | null
  if_number?: string | null
  tp?: string | null  // Taxe Professionnelle (Patente)
}

interface Facture {
  id: string
  facture_number: string
  facture_date: string
  total_ht: number
  transport_fees?: number
  total_tva: number
  total_ttc: number
  tva_rate?: number
  client: Client
}

export async function generateFacturePDF(
  facture: Facture,
  deliveries: DeliveryItem[],
  logoUrl?: string,
  companyInfo?: CompanyInfo
): Promise<void> {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width

  // Load logo if available
  if (logoUrl) {
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          try {
            doc.addImage(img, 'PNG', 5, 5, 40, 25)
          } catch {
            // Logo loading failed, continue without it
          }
          resolve()
        }
        img.onerror = () => reject()
        img.src = logoUrl
      })
    } catch {
      // Continue without logo
    }
  }

  // Company ICE, IF and TP below logo (aligned with visible logo content)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  let companyY = 33
  if (companyInfo?.ice) {
    doc.text(`ICE: ${companyInfo.ice}`, 15, companyY)
    companyY += 4
  }
  if (companyInfo?.if_number) {
    doc.text(`IF: ${companyInfo.if_number}`, 15, companyY)
    companyY += 4
  }
  if (companyInfo?.tp) {
    doc.text(`TP: ${companyInfo.tp}`, 15, companyY)
  }

  // Title: Facture N° - smaller size, centered
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  const title = `Facture N° : ${facture.facture_number}`
  doc.text(title, pageWidth / 2, 20, { align: 'center' })

  // Date - top right
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  const formattedDate = formatDate(facture.facture_date)
  doc.text(formattedDate, pageWidth - 15, 20, { align: 'right' })

  // Client section - right side, no border
  const clientX = pageWidth - 85

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(184, 134, 11)
  doc.text('CLIENT', clientX, 38)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(10)

  let clientY = 45
  doc.setFont('helvetica', 'bold')
  doc.text(facture.client.name, clientX, clientY)
  clientY += 5

  doc.setFont('helvetica', 'normal')
  if (facture.client.phone) {
    doc.text(`Tel: ${facture.client.phone}`, clientX, clientY)
    clientY += 5
  }
  if (facture.client.ice) {
    doc.text(`ICE: ${facture.client.ice}`, clientX, clientY)
    clientY += 5
  }
  if (facture.client.city) {
    doc.text(facture.client.city, clientX, clientY)
  }

  // Check if single or multiple BL
  const isSingleBL = deliveries.length === 1

  // Build table data with BL details
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableData: any[] = []

  let tableStartY = 75

  if (isSingleBL) {
    // Single BL: Show BL info above the table
    const singleDelivery = deliveries[0]
    const blRef = singleDelivery.delivery_number
    const blDate = singleDelivery.delivery_date ? formatDate(singleDelivery.delivery_date) : '-'

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text(`Réf BL: ${blRef}`, 10, 72)
    doc.text(`Date: ${blDate}`, 70, 72)

    tableStartY = 78

    // Add article rows without BL columns
    if (singleDelivery.items && singleDelivery.items.length > 0) {
      singleDelivery.items.forEach((item) => {
        tableData.push([
          item.article_code,
          item.article_name,
          item.quantity.toString(),
          formatPrice(item.unit_price),
          formatPrice(item.total)
        ])
      })
    }
  } else {
    // Multiple BL: Keep current format with BL columns
    deliveries.forEach((del) => {
      const blRef = extractBLNumber(del.delivery_number)
      const blDate = del.delivery_date ? formatDate(del.delivery_date) : '-'
      const itemCount = del.items?.length || 1

      // Add article rows with BL reference and date
      if (del.items && del.items.length > 0) {
        del.items.forEach((item, index) => {
          if (index === 0) {
            // First row with rowSpan for Réf BL and Date
            tableData.push([
              { content: blRef, rowSpan: itemCount, styles: { valign: 'middle', halign: 'center' } },
              { content: blDate, rowSpan: itemCount, styles: { valign: 'middle', halign: 'center' } },
              item.article_code,
              item.article_name,
              item.quantity.toString(),
              formatPrice(item.unit_price),
              formatPrice(item.total)
            ])
          } else {
            // Subsequent rows without Réf BL and Date columns
            tableData.push([
              item.article_code,
              item.article_name,
              item.quantity.toString(),
              formatPrice(item.unit_price),
              formatPrice(item.total)
            ])
          }
        })
      }
    })
  }

  if (isSingleBL) {
    // Table without BL columns - more space for Code
    autoTable(doc, {
      startY: tableStartY,
      head: [['Code', 'Article', 'Qté', 'P.U.', 'Total HT']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [184, 134, 11],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 8,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 25 },  // Code
        1: { halign: 'left', cellWidth: 'auto' }, // Article (flexible)
        2: { halign: 'center', cellWidth: 15 },  // Qté
        3: { halign: 'right', cellWidth: 25 },   // P.U.
        4: { halign: 'right', cellWidth: 25 },   // Total HT
      },
      styles: {
        fontSize: 7,
        cellPadding: 2,
      },
      margin: { left: 10, right: 10 },
    })
  } else {
    // Table with BL columns
    autoTable(doc, {
      startY: tableStartY,
      head: [['Réf BL', 'Date', 'Code', 'Article', 'Qté', 'P.U.', 'Total HT']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [184, 134, 11],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 8,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 18 },  // Réf BL
        1: { halign: 'center', cellWidth: 20 },  // Date
        2: { halign: 'center', cellWidth: 22 },  // Code
        3: { halign: 'left', cellWidth: 'auto' }, // Article (flexible)
        4: { halign: 'center', cellWidth: 13 },  // Qté
        5: { halign: 'right', cellWidth: 23 },   // P.U.
        6: { halign: 'right', cellWidth: 23 },   // Total HT
      },
      styles: {
        fontSize: 7,
        cellPadding: 2,
      },
      margin: { left: 10, right: 10 },
    })
  }

  // Get the Y position after the table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable.finalY + 10

  // Totals - right side, no border
  const totalsX = pageWidth - 85
  const totalsValueX = pageWidth - 15

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)

  let currentY = finalY

  // Total HT
  doc.text('Total HT:', totalsX, currentY)
  doc.text(formatPrice(facture.total_ht), totalsValueX, currentY, { align: 'right' })
  currentY += 7

  // Frais de transport (si > 0)
  const transportFees = facture.transport_fees ?? 0
  if (transportFees > 0) {
    doc.text('Frais de transport:', totalsX, currentY)
    doc.text(formatPrice(transportFees), totalsValueX, currentY, { align: 'right' })
    currentY += 7
  }

  // Total TVA
  const tvaRate = facture.tva_rate ?? 0
  doc.text(`Total TVA (${tvaRate}%):`, totalsX, currentY)
  doc.text(formatPrice(facture.total_tva), totalsValueX, currentY, { align: 'right' })
  currentY += 4

  // Separator line
  doc.setDrawColor(184, 134, 11)
  doc.setLineWidth(0.5)
  doc.line(totalsX, currentY, totalsValueX, currentY)
  currentY += 7

  // Total TTC
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(184, 134, 11)
  doc.text('Total TTC:', totalsX, currentY)
  doc.text(formatPrice(facture.total_ttc), totalsValueX, currentY, { align: 'right' })

  const filename = `${facture.facture_number}.pdf`

  // Télécharger le PDF avec le bon nom de fichier
  const pdfBlob = doc.output('blob')
  const pdfUrl = URL.createObjectURL(pdfBlob)
  const link = document.createElement('a')
  link.href = pdfUrl
  link.download = filename
  link.click()
  URL.revokeObjectURL(pdfUrl)

  // Aussi sauvegarder dans le dossier si configuré
  await saveFacturePDF(doc, filename)
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatPrice(price: number): string {
  const formatted = price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${formatted} MAD`
}

function extractBLNumber(deliveryNumber: string): string {
  // Extract just the number part from "BL-202609-001" -> "001"
  const parts = deliveryNumber.split('-')
  if (parts.length >= 3) {
    return parts.slice(2).join('-')  // Return everything after "BL-YYYYMM-"
  }
  return deliveryNumber  // Return as-is if format doesn't match
}
