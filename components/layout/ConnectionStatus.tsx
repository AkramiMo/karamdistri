'use client'

import { useConnectionStatus } from '@/hooks/useConnectionStatus'
import { Button } from '@/components/ui/button'
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function ConnectionStatus() {
  const { status, healthy, isChecking, checkConnection, lastError, retryCount } = useConnectionStatus()

  const getStatusConfig = () => {
    switch (status) {
      case 'healthy':
        return {
          icon: Wifi,
          color: 'text-green-500',
          bgColor: 'bg-green-100',
          label: 'Connecte',
        }
      case 'degraded':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-100',
          label: 'Connexion lente',
        }
      case 'failed':
        return {
          icon: WifiOff,
          color: 'text-red-500',
          bgColor: 'bg-red-100',
          label: 'Deconnecte',
        }
      case 'checking':
        return {
          icon: RefreshCw,
          color: 'text-blue-500',
          bgColor: 'bg-blue-100',
          label: 'Verification...',
        }
      default:
        return {
          icon: AlertTriangle,
          color: 'text-gray-500',
          bgColor: 'bg-gray-100',
          label: 'Inconnu',
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-2 ${config.bgColor} hover:${config.bgColor}`}
            onClick={checkConnection}
            disabled={isChecking}
          >
            <Icon className={`h-4 w-4 ${config.color} ${status === 'checking' ? 'animate-spin' : ''}`} />
            <span className={`ml-1 text-xs ${config.color}`}>
              {config.label}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="text-sm">
            <p className="font-medium">Etat de la connexion: {config.label}</p>
            {lastError && (
              <p className="text-red-500 text-xs mt-1">Erreur: {lastError}</p>
            )}
            {retryCount > 0 && (
              <p className="text-yellow-500 text-xs mt-1">Tentatives: {retryCount}</p>
            )}
            <p className="text-gray-400 text-xs mt-1">Cliquez pour rafraichir</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default ConnectionStatus
