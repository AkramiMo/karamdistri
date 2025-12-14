import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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

export function generateInvoicePDF(order: Order): void {
  const doc = new jsPDF()

  // Company info
  const companyName = 'AKKA Olives & Sauces'
  const companyAddress = 'Zone Industrielle, Marrakech'
  const companyPhone = '+212 5XX XX XX XX'
  const companyEmail = 'contact@akka-olives.ma'

  // Header
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(34, 139, 34) // Green color
  doc.text(companyName, 20, 25)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(companyAddress, 20, 32)
  doc.text(`Tel: ${companyPhone}`, 20, 37)
  doc.text(`Email: ${companyEmail}`, 20, 42)

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
  doc.roundedRect(20, 63, 80, 35, 2, 2, 'D')

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
    startY: 105,
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
  const finalY = (doc as any).lastAutoTable.finalY + 10

  // Totals
  const totalsX = 130
  doc.setDrawColor(200, 200, 200)
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(totalsX, finalY, 65, 35, 2, 2, 'D')

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
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

  // Footer
  const pageHeight = doc.internal.pageSize.height
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(
    `${companyName} - ICE: XXXXXXXXXX - IF: XXXXXXXX - RC: XXXXXX`,
    doc.internal.pageSize.width / 2,
    pageHeight - 15,
    { align: 'center' }
  )
  doc.text(
    'Merci pour votre confiance!',
    doc.internal.pageSize.width / 2,
    pageHeight - 10,
    { align: 'center' }
  )

  // Save the PDF
  doc.save(`Facture_${order.order_number}.pdf`)
}

export function generateDeliveryNotePDF(order: Order): void {
  const doc = new jsPDF()

  // Company info
  const companyName = 'AKKA Olives & Sauces'
  const companyAddress = 'Zone Industrielle, Marrakech'
  const companyPhone = '+212 5XX XX XX XX'

  // Header
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(34, 139, 34)
  doc.text(companyName, 20, 25)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(companyAddress, 20, 32)
  doc.text(`Tel: ${companyPhone}`, 20, 37)

  // Delivery note title
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('BON DE LIVRAISON', 130, 25)

  // Info box
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setDrawColor(200, 200, 200)
  doc.setFillColor(245, 245, 245)
  doc.roundedRect(140, 30, 55, 20, 2, 2, 'FD')

  doc.text(`N°: ${order.order_number}`, 145, 38)
  doc.text(`Date: ${formatDate(order.order_date)}`, 145, 45)

  // Client info
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Client', 20, 55)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(`${order.client.code} - ${order.client.name}`, 20, 63)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)

  let yPos = 70
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

  // Items table (simplified for delivery note)
  const tableData = order.order_items.map((item, index) => [
    (index + 1).toString(),
    item.article.code,
    item.article.description || item.article.name,
    item.quantity.toString(),
    '', // Empty column for received qty
  ])

  autoTable(doc, {
    startY: 90,
    head: [['#', 'Code', 'Designation', 'Qte', 'Recu']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [34, 139, 34],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 30 },
      2: { halign: 'left', cellWidth: 90 },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'center', cellWidth: 20 },
    },
    styles: {
      fontSize: 10,
      cellPadding: 4,
    },
  })

  // Get the Y position after the table
  const finalY = (doc as any).lastAutoTable.finalY + 20

  // Signature boxes
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')

  // Livreur signature
  doc.text('Signature Livreur:', 20, finalY)
  doc.setDrawColor(200, 200, 200)
  doc.rect(20, finalY + 5, 60, 25)

  // Client signature
  doc.text('Signature Client:', 120, finalY)
  doc.rect(120, finalY + 5, 60, 25)

  // Footer
  const pageHeight = doc.internal.pageSize.height
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(150, 150, 150)
  doc.text(
    `${companyName} - Document genere le ${new Date().toLocaleDateString('fr-FR')}`,
    doc.internal.pageSize.width / 2,
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
