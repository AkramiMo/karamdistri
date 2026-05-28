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

export async function generatePurchaseOrderPDF(order: PurchaseOrder, company?: CompanySettings): Promise<void> {
  const doc = new jsPDF()
  const settings = company || defaultCompanySettings

  // Header - Logo
  try {
    const logoUrl = '/logo.jpg'
    const img = new Image()
    img.crossOrigin = 'anonymous'

    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        // Calculate aspect ratio to fit logo
        const maxWidth = 50
        const maxHeight = 25
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

        doc.addImage(img, 'JPEG', 20, 10, width, height)
        resolve()
      }
      img.onerror = () => {
        // If logo fails to load, use text fallback
        doc.setFontSize(24)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(34, 139, 34)
        doc.text(settings.company_name, 20, 25)
        resolve()
      }
      img.src = logoUrl
    })
  } catch {
    // Fallback to text if logo fails
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(34, 139, 34)
    doc.text(settings.company_name, 20, 25)
  }

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)

  let headerY = 38
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
      fillColor: [76, 175, 80],
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
    const totalsX = 145
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('Total HT:', totalsX, finalY + 8)
    doc.text(formatPrice(order.total_ht), totalsX + 45, finalY + 8, { align: 'right' })
  } else {
    finalY -= 10 // Adjust if no totals box
  }

  // Notes
  if (order.notes) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text('Notes:', 20, finalY + 30)
    doc.text(order.notes, 20, finalY + 36)
  }

  // Signature - position below totals box
  const signatureY = finalY + 15
  try {
    const signatureUrl = '/signature.png'
    const signatureImg = new Image()
    signatureImg.crossOrigin = 'anonymous'

    await new Promise<void>((resolve) => {
      signatureImg.onload = () => {
        // Calculate aspect ratio for signature
        const maxSigWidth = 50
        const maxSigHeight = 30
        let sigWidth = signatureImg.width
        let sigHeight = signatureImg.height

        if (sigWidth > maxSigWidth) {
          sigHeight = (maxSigWidth / sigWidth) * sigHeight
          sigWidth = maxSigWidth
        }
        if (sigHeight > maxSigHeight) {
          sigWidth = (maxSigHeight / sigHeight) * sigWidth
          sigHeight = maxSigHeight
        }

        // Position signature on the right side, below the totals
        const sigX = 140

        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text('Signature:', sigX, signatureY)

        // White background for signature
        doc.setFillColor(255, 255, 255)
        doc.rect(sigX, signatureY + 2, sigWidth + 4, sigHeight + 4, 'F')

        doc.addImage(signatureImg, 'PNG', sigX + 2, signatureY + 4, sigWidth, sigHeight)
        resolve()
      }
      signatureImg.onerror = () => {
        resolve()
      }
      signatureImg.src = signatureUrl
    })
  } catch {
    // Signature not available, skip
  }

  // Footer with company identifiers
  const pageHeight = doc.internal.pageSize.height
  const pageWidth = doc.internal.pageSize.width

  // Top border for footer
  doc.setDrawColor(200, 200, 200)
  doc.line(20, pageHeight - 25, pageWidth - 20, pageHeight - 25)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)

  const identifiers = formatCompanyIdentifiers(settings)
  if (identifiers) {
    doc.text(
      `${settings.company_name} - ${identifiers}`,
      pageWidth / 2,
      pageHeight - 18,
      { align: 'center' }
    )
  }

  doc.text(
    `Document genere le ${new Date().toLocaleDateString('fr-FR')}`,
    20,
    pageHeight - 10
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
