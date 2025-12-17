import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { CompanySettings, defaultCompanySettings, formatCompanyAddress, formatCompanyIdentifiers } from '../company'

interface PurchaseOrderItem {
  article: {
    code: string
    name: string
    description: string | null
  }
  quantity: number
  unit_price: number | null
  total_ht: number | null
}

interface Supplier {
  code: string
  name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  address: string | null
}

interface PurchaseOrder {
  id: string
  po_number: string
  order_date: string
  status: string
  total_ht: number | null
  notes: string | null
  supplier: Supplier
  purchase_order_items: PurchaseOrderItem[]
}

export function generatePurchaseOrderPDF(order: PurchaseOrder, company?: CompanySettings): void {
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
  }

  // Purchase Order title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('BON DE COMMANDE', 130, 25)

  // BC info box
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setDrawColor(200, 200, 200)
  doc.setFillColor(245, 245, 245)
  doc.roundedRect(140, 30, 55, 25, 2, 2, 'FD')

  doc.text(`N°: ${order.po_number}`, 145, 38)
  doc.text(`Date: ${formatDate(order.order_date)}`, 145, 45)
  doc.text(`Statut: ${getStatusLabel(order.status)}`, 145, 52)

  // Supplier info
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Fournisseur', 20, 60)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setDrawColor(34, 139, 34)
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(20, 63, 80, 35, 2, 2, 'D')

  doc.setFont('helvetica', 'bold')
  doc.text(`${order.supplier.code} - ${order.supplier.name}`, 25, 72)
  doc.setFont('helvetica', 'normal')

  let yPos = 78
  if (order.supplier.contact_name) {
    doc.text(`Contact: ${order.supplier.contact_name}`, 25, yPos)
    yPos += 5
  }
  if (order.supplier.phone) {
    doc.text(`Tel: ${order.supplier.phone}`, 25, yPos)
    yPos += 5
  }
  if (order.supplier.email) {
    doc.text(`Email: ${order.supplier.email}`, 25, yPos)
    yPos += 5
  }
  if (order.supplier.address) {
    doc.text(`${order.supplier.address}`, 25, yPos)
  }

  // Check what columns we have data for
  const hasCode = order.purchase_order_items.some(item => item.article.code && item.article.code !== '-')
  const hasPrice = order.purchase_order_items.some(item => item.unit_price !== null && item.unit_price > 0)
  const hasTotal = order.purchase_order_items.some(item => item.total_ht !== null && item.total_ht > 0)

  // Build table headers and data dynamically
  const headers: string[] = ['#']
  if (hasCode) headers.push('Code')
  headers.push('Designation')
  headers.push('Qte')
  if (hasPrice) headers.push('Prix Unit.')
  if (hasTotal) headers.push('Total HT')

  const tableData = order.purchase_order_items.map((item, index) => {
    const row: string[] = [(index + 1).toString()]
    if (hasCode) row.push(item.article.code || '-')
    row.push(item.article.description || item.article.name)
    row.push(item.quantity.toString())
    if (hasPrice) row.push(item.unit_price ? formatPrice(item.unit_price) : '-')
    if (hasTotal) row.push(item.total_ht ? formatPrice(item.total_ht) : '-')
    return row
  })

  // Build column styles dynamically
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columnStyles: Record<number, any> = {
    0: { halign: 'center', cellWidth: 10 },
  }

  let colIndex = 1
  if (hasCode) {
    columnStyles[colIndex] = { halign: 'center', cellWidth: 25 }
    colIndex++
  }
  // Designation gets remaining space
  const designationWidth = hasCode ? (hasPrice || hasTotal ? 80 : 130) : (hasPrice || hasTotal ? 105 : 155)
  columnStyles[colIndex] = { halign: 'left', cellWidth: designationWidth }
  colIndex++
  columnStyles[colIndex] = { halign: 'center', cellWidth: 15 } // Qte
  colIndex++
  if (hasPrice) {
    columnStyles[colIndex] = { halign: 'right', cellWidth: 25 }
    colIndex++
  }
  if (hasTotal) {
    columnStyles[colIndex] = { halign: 'right', cellWidth: 25 }
  }

  autoTable(doc, {
    startY: 105,
    head: [headers],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [34, 139, 34],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles,
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
  let finalY = (doc as any).lastAutoTable.finalY + 10

  // Totals - only show if we have prices
  if (hasTotal && order.total_ht) {
    const totalsX = 130
    doc.setDrawColor(200, 200, 200)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(totalsX, finalY, 65, 20, 2, 2, 'D')

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(34, 139, 34)
    doc.text('Total HT:', totalsX + 5, finalY + 13)
    doc.text(formatPrice(order.total_ht), totalsX + 55, finalY + 13, { align: 'right' })
  } else {
    finalY -= 10 // Adjust if no totals box
  }

  // Notes
  if (order.notes) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text('Notes:', 20, finalY + 10)
    doc.text(order.notes, 20, finalY + 16)
  }

  // Signature boxes
  const sigY = finalY + 40
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)

  // Company signature
  doc.text('Signature Entreprise:', 20, sigY)
  doc.setDrawColor(200, 200, 200)
  doc.rect(20, sigY + 5, 60, 25)

  // Supplier signature
  doc.text('Signature Fournisseur:', 120, sigY)
  doc.rect(120, sigY + 5, 60, 25)

  // Footer with company identifiers
  const pageHeight = doc.internal.pageSize.height
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(150, 150, 150)

  const identifiers = formatCompanyIdentifiers(settings)
  if (identifiers) {
    doc.text(
      `${settings.company_name} - ${identifiers}`,
      doc.internal.pageSize.width / 2,
      pageHeight - 15,
      { align: 'center' }
    )
  }

  doc.text(
    `Document genere le ${new Date().toLocaleDateString('fr-FR')}`,
    doc.internal.pageSize.width / 2,
    pageHeight - 10,
    { align: 'center' }
  )

  // Save the PDF
  doc.save(`BC_${order.po_number}.pdf`)
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatPrice(price: number | null): string {
  if (price === null || price === 0) return '-'
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    minimumFractionDigits: 2,
  }).format(price)
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Brouillon',
    sent: 'Envoyee',
    partial: 'Partielle',
    received: 'Recue',
    cancelled: 'Annulee',
  }
  return labels[status] || status
}
