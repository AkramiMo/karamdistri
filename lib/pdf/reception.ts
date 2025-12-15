import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface ReceptionItem {
  article: {
    code: string
    name: string
    description: string | null
  }
  quantity_expected: number
  quantity_received: number
  unit_price: number
}

interface Supplier {
  code: string
  name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  address: string | null
}

interface Reception {
  id: string
  reception_number: string
  reception_date: string
  total_ht: number
  notes: string | null
  supplier: Supplier
  purchase_order?: {
    po_number: string
  } | null
  reception_items: ReceptionItem[]
}

export function generateReceptionPDF(reception: Reception): void {
  const doc = new jsPDF()

  // Company info
  const companyName = 'KARAM Olives & Sauces'
  const companyAddress = 'Zone Industrielle, Marrakech'
  const companyPhone = '+212 5XX XX XX XX'
  const companyEmail = 'contact@karam-olives.ma'

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

  // Reception title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('BON DE RECEPTION', 130, 25)

  // BR info box
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setDrawColor(200, 200, 200)
  doc.setFillColor(245, 245, 245)
  doc.roundedRect(140, 30, 55, 30, 2, 2, 'FD')

  doc.text(`N°: ${reception.reception_number}`, 145, 38)
  doc.text(`Date: ${formatDate(reception.reception_date)}`, 145, 45)
  if (reception.purchase_order?.po_number) {
    doc.text(`Ref BC: ${reception.purchase_order.po_number}`, 145, 52)
  }

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
  doc.text(`${reception.supplier.code} - ${reception.supplier.name}`, 25, 72)
  doc.setFont('helvetica', 'normal')

  let yPos = 78
  if (reception.supplier.contact_name) {
    doc.text(`Contact: ${reception.supplier.contact_name}`, 25, yPos)
    yPos += 5
  }
  if (reception.supplier.phone) {
    doc.text(`Tel: ${reception.supplier.phone}`, 25, yPos)
    yPos += 5
  }
  if (reception.supplier.address) {
    doc.text(`${reception.supplier.address}`, 25, yPos)
  }

  // Items table
  const tableData = reception.reception_items.map((item, index) => [
    (index + 1).toString(),
    item.article.code,
    item.article.description || item.article.name,
    item.quantity_expected.toString(),
    item.quantity_received.toString(),
    formatPrice(item.unit_price),
    formatPrice(item.quantity_received * item.unit_price),
  ])

  autoTable(doc, {
    startY: 105,
    head: [['#', 'Code', 'Designation', 'Qte Cmd', 'Qte Reçue', 'Prix Unit.', 'Total HT']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [34, 139, 34],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'left', cellWidth: 55 },
      3: { halign: 'center', cellWidth: 18 },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'right', cellWidth: 22 },
      6: { halign: 'right', cellWidth: 22 },
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
  doc.roundedRect(totalsX, finalY, 65, 20, 2, 2, 'D')

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(34, 139, 34)
  doc.text('Total HT:', totalsX + 5, finalY + 13)
  doc.text(formatPrice(reception.total_ht), totalsX + 55, finalY + 13, { align: 'right' })

  // Notes
  if (reception.notes) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text('Notes:', 20, finalY + 10)
    doc.text(reception.notes, 20, finalY + 16)
  }

  // Signature boxes
  const sigY = finalY + 40
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)

  // Receiver signature
  doc.text('Signature Recepteur:', 20, sigY)
  doc.setDrawColor(200, 200, 200)
  doc.rect(20, sigY + 5, 60, 25)

  // Warehouse manager signature
  doc.text('Signature Magasinier:', 120, sigY)
  doc.rect(120, sigY + 5, 60, 25)

  // Footer
  const pageHeight = doc.internal.pageSize.height
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(150, 150, 150)
  doc.text(
    `${companyName} - ICE: XXXXXXXXXX - IF: XXXXXXXX - RC: XXXXXX`,
    doc.internal.pageSize.width / 2,
    pageHeight - 15,
    { align: 'center' }
  )
  doc.text(
    `Document genere le ${new Date().toLocaleDateString('fr-FR')}`,
    doc.internal.pageSize.width / 2,
    pageHeight - 10,
    { align: 'center' }
  )

  // Save the PDF
  doc.save(`BR_${reception.reception_number}.pdf`)
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
