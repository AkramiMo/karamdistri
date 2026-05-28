// Company settings type and utilities

export interface CompanySettings {
  company_name: string
  address: string | null
  city: string | null
  postal_code: string | null
  phone: string | null
  fax: string | null
  email: string | null
  website: string | null
  ice: string | null
  if_number: string | null
  rc: string | null
  patente: string | null
  cnss: string | null
  capital: string | null
  bank_name: string | null
  bank_account: string | null
  bank_rib: string | null
  logo_url: string | null
  invoice_footer: string | null
  depot_lat: number | null
  depot_lng: number | null
  depot_address: string | null
}

// Default company settings (fallback)
export const defaultCompanySettings: CompanySettings = {
  company_name: 'KARAM Olives & Sauces',
  address: 'Zone Industrielle',
  city: 'Marrakech',
  postal_code: null,
  phone: '+212 5XX XX XX XX',
  fax: null,
  email: 'contact@karam-olives.ma',
  website: null,
  ice: null,
  if_number: null,
  rc: null,
  patente: null,
  cnss: null,
  capital: null,
  bank_name: null,
  bank_account: null,
  bank_rib: null,
  logo_url: null,
  invoice_footer: 'Merci pour votre confiance!',
  depot_lat: 34.001605,
  depot_lng: -5.060824,
  depot_address: null,
}

// Format company address for display
export function formatCompanyAddress(settings: CompanySettings): string {
  const parts: string[] = []
  if (settings.address) parts.push(settings.address)
  if (settings.postal_code && settings.city) {
    parts.push(`${settings.postal_code} ${settings.city}`)
  } else if (settings.city) {
    parts.push(settings.city)
  }
  return parts.join(', ')
}

// Format company identifiers for footer
export function formatCompanyIdentifiers(settings: CompanySettings): string {
  const parts: string[] = []
  if (settings.ice) parts.push(`ICE: ${settings.ice}`)
  if (settings.if_number) parts.push(`IF: ${settings.if_number}`)
  if (settings.rc) parts.push(`RC: ${settings.rc}`)
  if (settings.patente) parts.push(`Patente: ${settings.patente}`)
  return parts.join(' - ')
}

// Format bank info
export function formatBankInfo(settings: CompanySettings): string | null {
  if (!settings.bank_name && !settings.bank_rib) return null
  const parts: string[] = []
  if (settings.bank_name) parts.push(settings.bank_name)
  if (settings.bank_rib) parts.push(`RIB: ${settings.bank_rib}`)
  return parts.join(' - ')
}
