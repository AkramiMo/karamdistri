import jsPDF from 'jspdf'
import { CompanySettings, defaultCompanySettings, formatBankInfo } from '../company'

interface PaymentReceiptData {
  payment_number: string
  payment_date: string
  amount: number
  payment_method: string
  payment_type?: 'client' | 'fournisseur'
  reference?: string | null
  notes?: string | null
  client?: {
    code: string
    name: string
    address?: string | null
    city?: string | null
    phone?: string | null
    ice?: string | null
  } | null
  supplier?: {
    code: string
    name: string
    address?: string | null
    city?: string | null
    phone?: string | null
    ice?: string | null
  } | null
  document?: {
    type: 'BL' | 'Facture' | 'Vente' | 'BR'
    number: string
  } | null
}

const paymentMethodLabels: Record<string, string> = {
  cash: 'Espèces',
  cash_deposit: "Versement d'espèces",
  check: 'Chèque',
  transfer: 'Virement',
  card: 'Carte bancaire',
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatPrice(price: number): string {
  const formatted = price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${formatted} MAD`
}

function numberToWords(num: number): string {
  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf']
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt']

  if (num < 20) return units[num]
  if (num < 100) {
    const t = Math.floor(num / 10)
    const u = num % 10
    if (t === 7 || t === 9) return tens[t] + '-' + units[10 + u]
    if (u === 0) return tens[t] + (t === 8 ? 's' : '')
    if (u === 1 && t !== 8) return tens[t] + ' et un'
    return tens[t] + '-' + units[u]
  }
  if (num < 1000) {
    const h = Math.floor(num / 100)
    const r = num % 100
    let str = h === 1 ? 'cent' : units[h] + ' cent'
    if (r === 0 && h > 1) str += 's'
    if (r > 0) str += ' ' + numberToWords(r)
    return str
  }
  if (num < 1000000) {
    const t = Math.floor(num / 1000)
    const r = num % 1000
    let str = t === 1 ? 'mille' : numberToWords(t) + ' mille'
    if (r > 0) str += ' ' + numberToWords(r)
    return str
  }
  return num.toString()
}

function amountToWords(amount: number): string {
  const dirhams = Math.floor(amount)
  const centimes = Math.round((amount - dirhams) * 100)

  let result = numberToWords(dirhams) + ' dirham' + (dirhams > 1 ? 's' : '')
  if (centimes > 0) {
    result += ' et ' + numberToWords(centimes) + ' centime' + (centimes > 1 ? 's' : '')
  }
  return result.charAt(0).toUpperCase() + result.slice(1)
}

// Helper function to get full URL for images
function getFullImageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  // If already a full URL, return as is
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url
  }
  // For relative paths, prepend the current origin
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`
  }
  return url
}

export async function generatePaymentReceiptPDF(
  payment: PaymentReceiptData,
  company?: CompanySettings,
  logoUrl?: string
): Promise<void> {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  const settings = company || defaultCompanySettings

  // Get full URLs for images
  const fullLogoUrl = getFullImageUrl(logoUrl)
  const fullSignatureUrl = getFullImageUrl(settings.signature_url)

  // === LEFT SIDE: Logo + Company identifiers ===
  // Load logo if available
  if (fullLogoUrl) {
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise<void>((resolve) => {
        img.onload = () => {
          try {
            doc.addImage(img, 'PNG', 10, 6, 40, 24)
          } catch (e) {
            console.error('Error adding logo to PDF:', e)
          }
          resolve()
        }
        img.onerror = () => {
          console.error('Error loading logo:', fullLogoUrl)
          resolve()
        }
        img.src = fullLogoUrl
      })
    } catch (e) {
      console.error('Logo loading failed:', e)
    }
  }

  // Company identifiers sous le logo, aligné à gauche
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)

  let idY = 32
  const idX = 18  // Aligné avec le contenu visuel du logo
  if (settings.ice) {
    doc.text(`ICE: ${settings.ice}`, idX, idY)
    idY += 4
  }
  if (settings.if_number) {
    doc.text(`IF: ${settings.if_number}`, idX, idY)
    idY += 4
  }
  if (settings.patente) {
    doc.text(`TP: ${settings.patente}`, idX, idY)
  }

  // === Title - centered ===
  const isSupplier = payment.payment_type === 'fournisseur'
  const title = isSupplier ? 'RECU DE DECAISSEMENT' : 'RECU DE PAIEMENT'

  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text(title, pageWidth / 2, 25, { align: 'center' })

  // Receipt number and date - right side, aligned left
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  const rightInfoX = pageWidth - 65
  doc.text(`N°: ${payment.payment_number}`, rightInfoX, 35)
  doc.text(`Date: ${formatDate(payment.payment_date)}`, rightInfoX, 42)

  // === Client/Supplier info box ===
  const clientBoxY = 60
  const entity = isSupplier ? payment.supplier : payment.client
  const entityLabel = isSupplier ? 'Fournisseur' : 'Client'

  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.3)
  doc.roundedRect(15, clientBoxY, 85, 35, 2, 2, 'D')

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 100, 100)
  doc.text(entityLabel, 20, clientBoxY + 7)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  if (entity) {
    doc.text(`${entity.code} - ${entity.name}`, 20, clientBoxY + 15)
  }

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  let clientY = clientBoxY + 22
  if (entity?.address) {
    doc.text(entity.address, 20, clientY)
    clientY += 5
  }
  if (entity?.city) {
    doc.text(entity.city, 20, clientY)
  }

  // === Payment details box (only reference) ===
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.3)
  doc.roundedRect(105, clientBoxY, 90, 35, 2, 2, 'D')

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 100, 100)
  doc.text('Details du paiement', 110, clientBoxY + 7)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  let paymentY = clientBoxY + 16

  doc.text(`Mode: ${paymentMethodLabels[payment.payment_method] || payment.payment_method}`, 110, paymentY)
  paymentY += 7

  // Afficher le document (BL, Facture, BR, Vente)
  if (payment.document) {
    doc.text(`${payment.document.type}: ${payment.document.number}`, 110, paymentY)
    paymentY += 7
  }

  // Afficher la référence seulement si différente du document (ex: n° chèque, réf virement)
  if (payment.reference && !payment.reference.includes('BR-') && !payment.reference.includes('BL-')) {
    doc.text(`Ref: ${payment.reference}`, 110, paymentY)
  }

  // === Amount section ===
  const amountBoxY = 105
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.3)
  doc.roundedRect(15, amountBoxY, pageWidth - 30, 35, 2, 2, 'D')

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 100, 100)
  doc.text(isSupplier ? 'Montant paye:' : 'Montant recu:', 25, amountBoxY + 12)

  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0) // Black color for amount
  doc.text(formatPrice(payment.amount), pageWidth - 25, amountBoxY + 14, { align: 'right' })

  // Amount in words
  doc.setFontSize(9)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(80, 80, 80)
  const amountWords = amountToWords(payment.amount)
  const amountLabel = isSupplier
    ? `Arrete le present decaissement a la somme de: ${amountWords}`
    : `Arrete le present recu a la somme de: ${amountWords}`
  doc.text(amountLabel, 25, amountBoxY + 27)

  // === Notes section (if any) - between amount and signature ===
  let notesEndY = amountBoxY + 40
  if (payment.notes) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 100, 100)
    doc.text('Observations:', 15, amountBoxY + 48)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    // Split notes into multiple lines if needed
    const notesLines = doc.splitTextToSize(payment.notes, pageWidth - 40)
    doc.text(notesLines, 15, amountBoxY + 56)
    notesEndY = amountBoxY + 56 + (notesLines.length * 5)
  }

  // === Signature section with image ===
  const signY = Math.max(notesEndY + 15, 160)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('Signature & Cachet', pageWidth - 60, signY)

  // Load signature image if available
  if (fullSignatureUrl) {
    try {
      const signImg = new Image()
      signImg.crossOrigin = 'anonymous'
      await new Promise<void>((resolve) => {
        signImg.onload = () => {
          try {
            // Place signature image in the signature box area
            doc.addImage(signImg, 'PNG', pageWidth - 75, signY + 5, 55, 30)
          } catch (e) {
            console.error('Error adding signature to PDF:', e)
            // Signature loading failed, draw empty box
            doc.setDrawColor(0, 0, 0)
            doc.setLineWidth(0.3)
            doc.rect(pageWidth - 80, signY + 5, 65, 35)
          }
          resolve()
        }
        signImg.onerror = () => {
          console.error('Error loading signature:', fullSignatureUrl)
          // Draw empty box if signature fails to load
          doc.setDrawColor(0, 0, 0)
          doc.setLineWidth(0.3)
          doc.rect(pageWidth - 80, signY + 5, 65, 35)
          resolve()
        }
        signImg.src = fullSignatureUrl
      })
    } catch (e) {
      console.error('Signature loading failed:', e)
      // Draw empty box if signature fails
      doc.setDrawColor(0, 0, 0)
      doc.setLineWidth(0.3)
      doc.rect(pageWidth - 80, signY + 5, 65, 35)
    }
  } else {
    // No signature URL, draw empty box
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.3)
    doc.rect(pageWidth - 80, signY + 5, 65, 35)
  }

  // === Footer ===
  const pageHeight = doc.internal.pageSize.height
  doc.setDrawColor(150, 150, 150)
  doc.setLineWidth(0.3)
  doc.line(15, pageHeight - 30, pageWidth - 15, pageHeight - 30)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(150, 150, 150)

  const bankInfo = formatBankInfo(settings)
  if (bankInfo) {
    doc.text(bankInfo, pageWidth / 2, pageHeight - 22, { align: 'center' })
  }

  doc.text(
    settings.invoice_footer || 'Merci pour votre confiance!',
    pageWidth / 2,
    pageHeight - 15,
    { align: 'center' }
  )

  // Save the PDF
  doc.save(`Recu_${payment.payment_number}.pdf`)
}
