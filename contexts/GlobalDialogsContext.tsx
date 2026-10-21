'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'

export type DialogType =
  | 'reception'
  | 'fournisseur'
  | 'fourniture'
  | 'bon-commande'
  | 'lot'
  | 'mouvement-stock'
  | 'commande'
  | 'livraison'
  | 'tournee'
  | 'rblt'
  | 'vente'
  | 'facture'
  | 'article'
  | 'categorie'
  | 'emballage'
  | 'pack'
  | 'client'
  | 'paiement'
  | 'devis'
  | null

interface GlobalDialogsContextType {
  activeDialog: DialogType
  openDialog: (type: DialogType) => void
  closeDialog: () => void
}

const GlobalDialogsContext = createContext<GlobalDialogsContextType | undefined>(undefined)

export function GlobalDialogsProvider({ children }: { children: React.ReactNode }) {
  const [activeDialog, setActiveDialog] = useState<DialogType>(null)

  const openDialog = useCallback((type: DialogType) => {
    setActiveDialog(type)
  }, [])

  const closeDialog = useCallback(() => {
    setActiveDialog(null)
  }, [])

  return (
    <GlobalDialogsContext.Provider value={{ activeDialog, openDialog, closeDialog }}>
      {children}
    </GlobalDialogsContext.Provider>
  )
}

export function useGlobalDialogs() {
  const context = useContext(GlobalDialogsContext)
  if (!context) {
    throw new Error('useGlobalDialogs must be used within a GlobalDialogsProvider')
  }
  return context
}
