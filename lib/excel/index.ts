/**
 * Module d'export Excel
 */

// Fonctions de gestion des dossiers
export {
  isFileSystemAccessSupported,
  initExcelFolderHandles,
  selectCommandesFolder,
  selectVentesFolder,
  getCommandesFolderName,
  getVentesFolderName,
  isCommandesFolderReady,
  isVentesFolderReady,
  saveCommandesExcel,
  saveVentesExcel,
  resetExcelFolders,
  appendToCommandesExcel,
  appendToVentesExcel,
} from './saveWithPicker'

// Fonctions d'export
export { exportCommandesToExcel, appendCommandeToExcel, type OrderForExport } from './commandes'
export { exportVentesToExcel, appendVenteToExcel, type SaleForExport } from './ventes'
