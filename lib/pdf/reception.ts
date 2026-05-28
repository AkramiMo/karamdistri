import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { CompanySettings, defaultCompanySettings, formatCompanyAddress, formatCompanyIdentifiers } from '../company'

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

export async function generateReceptionPDF(reception: Reception, company?: CompanySettings): Promise<void> {
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
  if (settings.email) {
    doc.text(`Email: ${settings.email}`, 20, headerY)
  }

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
      fillColor: [76, 175, 80],
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
  let finalY = (doc as any).lastAutoTable.finalY + 10

  // Totals
  const totalsX = 145
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('Total HT:', totalsX, finalY + 8)
  doc.text(formatPrice(reception.total_ht), totalsX + 45, finalY + 8, { align: 'right' })

  // Notes
  if (reception.notes) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text('Notes:', 20, finalY + 30)
    doc.text(reception.notes, 20, finalY + 36)
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
