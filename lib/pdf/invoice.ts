import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { CompanySettings, defaultCompanySettings, formatCompanyAddress, formatCompanyIdentifiers } from '../company'

interface OrderItem {
  article: {
    code: string
    name: string
    description: string | null
  }
  quantity: number
  unit_price: number
  total_ht: number
}

interface Client {
  code: string
  name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  ice?: string | null
}

interface Order {
  id: string
  order_number: string
  order_date: string
  status: string
  total_ht: number
  total_tva: number
  total_ttc: number
  notes: string | null
  client: Client
  order_items: OrderItem[]
}

export function generateInvoicePDF(order: Order, company?: CompanySettings): void {
  const doc = new jsPDF()
  const settings = company || defaultCompanySettings

  // Header - Company info
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(34, 139, 34) // Green color
  doc.text(settings.company_name, 20, 25)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)

  let headerY = 32
  const companyAddress = formatCompanyAddress(settings)
  if (companyAddress) {
    doc.text(companyAddress, 20, headerY)
    headerY += 5
  }
  if (settings.phone) {
    doc.text(`Tel: ${settings.phone}`, 20, headerY)
    headerY += 5
  }
  if (settings.fax) {
    doc.text(`Fax: ${settings.fax}`, 20, headerY)
    headerY += 5
  }
  if (settings.email) {
    doc.text(`Email: ${settings.email}`, 20, headerY)
    headerY += 5
  }
  if (settings.website) {
    doc.text(`Web: ${settings.website}`, 20, headerY)
  }

  // Invoice title
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('FACTURE', 150, 25)

  // Invoice info box
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setDrawColor(200, 200, 200)
  doc.setFillColor(245, 245, 245)
  doc.roundedRect(140, 30, 55, 25, 2, 2, 'FD')

  doc.text(`N°: ${order.order_number}`, 145, 38)
  doc.text(`Date: ${formatDate(order.order_date)}`, 145, 45)
  doc.text(`Statut: ${getStatusLabel(order.status)}`, 145, 52)

  // Client info
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Client', 20, 60)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setDrawColor(34, 139, 34)
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(20, 63, 80, 40, 2, 2, 'D')

  doc.setFont('helvetica', 'bold')
  doc.text(`${order.client.code} - ${order.client.name}`, 25, 72)
  doc.setFont('helvetica', 'normal')

  let yPos = 78
  if (order.client.contact_name) {
    doc.text(`Contact: ${order.client.contact_name}`, 25, yPos)
    yPos += 5
  }
  if (order.client.phone) {
    doc.text(`Tel: ${order.client.phone}`, 25, yPos)
    yPos += 5
  }
  if (order.client.address) {
    doc.text(`${order.client.address}`, 25, yPos)
    yPos += 5
  }
  if (order.client.city) {
    doc.text(`${order.client.city}`, 25, yPos)
    yPos += 5
  }
  if (order.client.ice) {
    doc.text(`ICE: ${order.client.ice}`, 25, yPos)
  }

  // Items table
  const tableData = order.order_items.map((item, index) => [
    (index + 1).toString(),
    item.article.code,
    item.article.description || item.article.name,
    item.quantity.toString(),
    formatPrice(item.unit_price),
    formatPrice(item.total_ht),
  ])

  autoTable(doc, {
    startY: 108,
    head: [['#', 'Code', 'Designation', 'Qte', 'Prix Unit.', 'Total HT']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [34, 139, 34],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 25 },
      2: { halign: 'left', cellWidth: 70 },
      3: { halign: 'center', cellWidth: 15 },
      4: { halign: 'right', cellWidth: 25 },
      5: { halign: 'right', cellWidth: 25 },
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  })

  // Get the Y position after the table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable.finalY + 10

  // Totals
  const totalsX = 130
  doc.setDrawColor(200, 200, 200)
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(totalsX, finalY, 65, 35, 2, 2, 'D')

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  doc.text('Total HT:', totalsX + 5, finalY + 10)
  doc.text(formatPrice(order.total_ht), totalsX + 55, finalY + 10, { align: 'right' })

  doc.text('TVA (20%):', totalsX + 5, finalY + 18)
  doc.text(formatPrice(order.total_tva), totalsX + 55, finalY + 18, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(34, 139, 34)
  doc.text('Total TTC:', totalsX + 5, finalY + 28)
  doc.text(formatPrice(order.total_ttc), totalsX + 55, finalY + 28, { align: 'right' })

  // Notes
  if (order.notes) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text('Notes:', 20, finalY + 10)
    doc.text(order.notes, 20, finalY + 16)
  }

  // Footer with company identifiers
  const pageHeight = doc.internal.pageSize.height
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)

  const identifiers = formatCompanyIdentifiers(settings)
  if (identifiers) {
    doc.text(
      `${settings.company_name} - ${identifiers}`,
      doc.internal.pageSize.width / 2,
      pageHeight - 20,
      { align: 'center' }
    )
  }

  if (settings.capital) {
    doc.text(
      `Capital: ${settings.capital}`,
      doc.internal.pageSize.width / 2,
      pageHeight - 15,
      { align: 'center' }
    )
  }

  doc.text(
    settings.invoice_footer || 'Merci pour votre confiance!',
    doc.internal.pageSize.width / 2,
    pageHeight - 10,
    { align: 'center' }
  )

  // Save the PDF
  doc.save(`Facture_${order.order_number}.pdf`)
}

export async function generateDeliveryNotePDF(order: Order, company?: CompanySettings, logoUrl?: string): Promise<void> {
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
            doc.addImage(img, 'JPEG', 15, 10, 40, 25)
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

  // Delivery note title - centered
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('BON DE LIVRAISON', pageWidth / 2, 22, { align: 'center' })

  // Info box - top right (compact)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setDrawColor(184, 134, 11)
  doc.setFillColor(250, 245, 230)
  doc.roundedRect(pageWidth - 58, 12, 45, 18, 2, 2, 'FD')

  doc.text(`N°: ${order.order_number}`, pageWidth - 55, 20)
  doc.text(`Date: ${formatDate(order.order_date)}`, pageWidth - 55, 26)

  // Client info
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(184, 134, 11)
  doc.text('Client', 20, 45)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text(`${order.client.code} - ${order.client.name}`, 20, 53)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)

  let yPos = 60
  if (order.client.address) {
    doc.text(`${order.client.address}`, 20, yPos)
    yPos += 5
  }
  if (order.client.city) {
    doc.text(`${order.client.city}`, 20, yPos)
    yPos += 5
  }
  if (order.client.phone) {
    doc.text(`Tel: ${order.client.phone}`, 20, yPos)
  }

  // Items table with prices
  const tableData = order.order_items.map((item, index) => [
    (index + 1).toString(),
    item.article.code,
    item.article.description || item.article.name,
    item.quantity.toString(),
    formatPrice(item.unit_price),
    formatPrice(item.total_ht),
  ])

  const tableMargin = 14

  autoTable(doc, {
    startY: 80,
    head: [['#', 'Code', 'Designation', 'Qte', 'Prix U. HT', 'Total HT']],
    body: tableData,
    theme: 'grid',
    margin: { left: tableMargin, right: tableMargin },
    headStyles: {
      fillColor: [184, 134, 11],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 25 },
      2: { halign: 'left', cellWidth: 65 },
      3: { halign: 'center', cellWidth: 15 },
      4: { halign: 'right', cellWidth: 28 },
      5: { halign: 'right', cellWidth: 28 },
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
  })

  // Get the Y position after the table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableEndY = (doc as any).lastAutoTable.finalY

  // Calculate table right edge (margin + sum of column widths)
  const tableWidth = 10 + 25 + 65 + 15 + 28 + 28 // = 171
  const tableRightEdge = tableMargin + tableWidth
  const totalBoxWidth = 55
  const signatureBoxWidth = 60

  // Total HT - bottom right aligned with table
  const totalBoxX = tableRightEdge - totalBoxWidth
  doc.setDrawColor(184, 134, 11)
  doc.setLineWidth(0.5)
  doc.setFillColor(250, 245, 230)
  doc.roundedRect(totalBoxX, tableEndY + 5, totalBoxWidth, 15, 2, 2, 'FD')

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(184, 134, 11)
  doc.text('Total HT:', totalBoxX + 5, tableEndY + 14)
  doc.text(formatPrice(order.total_ht), tableRightEdge - 5, tableEndY + 14, { align: 'right' })

  const finalY = tableEndY + 35

  // Signature boxes
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)

  // Livreur signature - aligned with table left edge
  doc.text('Signature Livreur:', tableMargin, finalY)
  doc.setDrawColor(200, 200, 200)
  doc.rect(tableMargin, finalY + 5, signatureBoxWidth, 25)

  // Client signature - aligned with table right edge
  const clientSignatureX = tableRightEdge - signatureBoxWidth
  doc.text('Signature Client:', clientSignatureX, finalY)
  doc.rect(clientSignatureX, finalY + 5, signatureBoxWidth, 25)

  // Footer
  const pageHeight = doc.internal.pageSize.height
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(150, 150, 150)

  doc.text(
    `Document genere le ${new Date().toLocaleDateString('fr-FR')}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  )

  // Save the PDF
  doc.save(`BL_${order.order_number}.pdf`)
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
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    minimumFractionDigits: 2,
  }).format(price)
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Brouillon',
    confirmed: 'Confirmee',
    delivered: 'Livree',
    cancelled: 'Annulee',
  }
  return labels[status] || status
}
