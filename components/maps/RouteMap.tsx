'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface MapPoint {
  lat: number
  lng: number
  label: string
  order?: number
  isDepot?: boolean
}

interface DriverPosition {
  lat: number
  lng: number
  heading?: number
  speed?: number
  timestamp?: number
}

interface RouteMapProps {
  points: MapPoint[]
  depot?: { lat: number; lng: number } | null
  height?: string
  driverPosition?: DriverPosition | null
  showDriverPath?: boolean
  driverPath?: [number, number][]
}

// Fetch route from OSRM (Open Source Routing Machine)
async function fetchRoute(coordinates: [number, number][]): Promise<[number, number][] | null> {
  if (coordinates.length < 2) return null

  try {
    // Format coordinates as lng,lat;lng,lat;...
    const coordString = coordinates.map(c => `${c[1]},${c[0]}`).join(';')
    const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`

    const response = await fetch(url)
    const data = await response.json()

    if (data.code === 'Ok' && data.routes && data.routes[0]) {
      // OSRM returns coordinates as [lng, lat], we need [lat, lng] for Leaflet
      return data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]])
    }
  } catch (error) {
    console.error('Error fetching route:', error)
  }

  return null
}

export function RouteMap({ points, depot, height = '400px', driverPosition, showDriverPath, driverPath }: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const driverMarkerRef = useRef<L.Marker | null>(null)
  const driverPathLineRef = useRef<L.Polyline | null>(null)
  const [isLoadingRoute, setIsLoadingRoute] = useState(false)

  useEffect(() => {
    if (!mapRef.current) return

    // Clean up previous map instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }

    // Filter valid points
    const validPoints = points.filter(p => p.lat && p.lng)

    if (validPoints.length === 0 && !depot) {
      return
    }

    // Calculate center
    let centerLat = 31.6295 // Default: Marrakech
    let centerLng = -7.9811

    if (depot?.lat && depot?.lng) {
      centerLat = depot.lat
      centerLng = depot.lng
    } else if (validPoints.length > 0) {
      centerLat = validPoints.reduce((sum, p) => sum + p.lat, 0) / validPoints.length
      centerLng = validPoints.reduce((sum, p) => sum + p.lng, 0) / validPoints.length
    }

    // Initialize map
    const map = L.map(mapRef.current).setView([centerLat, centerLng], 11)
    mapInstanceRef.current = map

    // Add satellite tile layer (Esri World Imagery)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '© Esri, Maxar, Earthstar Geographics'
    }).addTo(map)

    // Add labels layer on top of satellite
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      attribution: ''
    }).addTo(map)

    // Custom icon for depot
    const depotIcon = L.divIcon({
      className: 'custom-depot-icon',
      html: `
        <div style="
          background: linear-gradient(135deg, #FF6B00 0%, #FF8C00 100%);
          color: white;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
          border: 4px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </div>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 48],
      popupAnchor: [0, -48]
    })

    // Add depot marker
    if (depot?.lat && depot?.lng) {
      L.marker([depot.lat, depot.lng], { icon: depotIcon })
        .addTo(map)
        .bindPopup('<strong>Depot</strong><br/>Point de depart')
    }

    // Create numbered icons for each point
    const createNumberedIcon = (number: number) => {
      return L.divIcon({
        className: 'custom-numbered-icon',
        html: `
          <div style="
            background: linear-gradient(135deg, #2563EB 0%, #3B82F6 100%);
            color: white;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 16px;
            border: 4px solid white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          ">
            ${number}
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36]
      })
    }

    // Add client markers
    const markers: L.Marker[] = []
    validPoints.forEach((point, index) => {
      const icon = createNumberedIcon(point.order || index + 1)
      const marker = L.marker([point.lat, point.lng], { icon })
        .addTo(map)
        .bindPopup(`<strong>${point.order || index + 1}. ${point.label}</strong>`)
      markers.push(marker)
    })

    // Build coordinates array for routing
    const routeCoordinates: [number, number][] = []

    // Start from depot
    if (depot?.lat && depot?.lng) {
      routeCoordinates.push([depot.lat, depot.lng])
    }

    // Add all client points in order
    validPoints.forEach(point => {
      routeCoordinates.push([point.lat, point.lng])
    })

    // Fetch and draw the road route
    if (routeCoordinates.length >= 2) {
      setIsLoadingRoute(true)

      fetchRoute(routeCoordinates).then(roadRoute => {
        // Check if map is still valid (not destroyed during async operation)
        if (!mapInstanceRef.current || mapInstanceRef.current !== map) {
          return
        }

        setIsLoadingRoute(false)

        if (roadRoute && roadRoute.length > 0) {
          // Draw the actual road route
          // White border for visibility on satellite
          L.polyline(roadRoute, {
            color: '#FFFFFF',
            weight: 8,
            opacity: 0.9
          }).addTo(map)

          // Main route line (blue like Google Maps)
          L.polyline(roadRoute, {
            color: '#4285F4',
            weight: 5,
            opacity: 1
          }).addTo(map)
        } else {
          // Fallback to straight lines if routing fails
          const fallbackPoints: L.LatLngExpression[] = routeCoordinates.map(c => [c[0], c[1]])

          L.polyline(fallbackPoints, {
            color: '#FFFFFF',
            weight: 6,
            opacity: 0.8
          }).addTo(map)

          L.polyline(fallbackPoints, {
            color: '#FFD700',
            weight: 4,
            opacity: 1,
            dashArray: '10, 10'
          }).addTo(map)
        }
      })
    }

    // Fit bounds to show all markers
    const allPoints: L.LatLngExpression[] = []
    if (depot?.lat && depot?.lng) {
      allPoints.push([depot.lat, depot.lng])
    }
    validPoints.forEach(p => allPoints.push([p.lat, p.lng]))

    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints)
      map.fitBounds(bounds, { padding: [50, 50] })
    }

    // Cleanup function
    return () => {
      // Clear driver marker ref when map is destroyed
      driverMarkerRef.current = null
      driverPathLineRef.current = null
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [points, depot])

  // Create driver icon (delivery truck) - defined outside useEffect to be reusable
  const createDriverIcon = () => L.divIcon({
    className: 'custom-driver-icon',
    html: `
      <div style="
        background: linear-gradient(135deg, #10B981 0%, #059669 100%);
        color: white;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        border: 4px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 17h4V5H2v12h3m5 0a3 3 0 1 0 6 0m-6 0a3 3 0 1 1-6 0"/>
          <path d="M14 17V5h7l3 5v7h-4"/>
        </svg>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22]
  })

  // Update driver position marker
  useEffect(() => {
    if (!mapInstanceRef.current) return
    if (!driverPosition?.lat || !driverPosition?.lng) {
      // Remove marker if no position
      if (driverMarkerRef.current) {
        driverMarkerRef.current.remove()
        driverMarkerRef.current = null
      }
      return
    }

    const map = mapInstanceRef.current

    // Check if marker exists and is still on the map
    const markerIsValid = driverMarkerRef.current && map.hasLayer(driverMarkerRef.current)

    if (markerIsValid) {
      // Update existing marker position
      driverMarkerRef.current!.setLatLng([driverPosition.lat, driverPosition.lng])
      driverMarkerRef.current!.setPopupContent(`
        <strong>Livreur en route</strong><br/>
        ${driverPosition.speed ? `Vitesse: ${Math.round(driverPosition.speed * 3.6)} km/h<br/>` : ''}
        ${driverPosition.timestamp ? `Mis à jour: ${new Date(driverPosition.timestamp).toLocaleTimeString('fr-FR')}` : ''}
      `)
    } else {
      // Remove old invalid marker if exists
      if (driverMarkerRef.current) {
        try { driverMarkerRef.current.remove() } catch (e) { /* ignore */ }
      }
      // Create new marker
      const driverIcon = createDriverIcon()
      driverMarkerRef.current = L.marker([driverPosition.lat, driverPosition.lng], {
        icon: driverIcon,
        zIndexOffset: 1000
      })
        .addTo(map)
        .bindPopup(`
          <strong>Livreur en route</strong><br/>
          ${driverPosition.speed ? `Vitesse: ${Math.round(driverPosition.speed * 3.6)} km/h<br/>` : ''}
          ${driverPosition.timestamp ? `Mis à jour: ${new Date(driverPosition.timestamp).toLocaleTimeString('fr-FR')}` : ''}
        `)
    }
  }, [driverPosition])

  // Draw driver path
  useEffect(() => {
    if (!mapInstanceRef.current) return
    if (!showDriverPath || !driverPath || driverPath.length < 2) {
      // Remove path if not needed
      if (driverPathLineRef.current) {
        try { driverPathLineRef.current.remove() } catch (e) { /* ignore */ }
        driverPathLineRef.current = null
      }
      return
    }

    const map = mapInstanceRef.current

    // Check if path line is still valid
    const pathIsValid = driverPathLineRef.current && map.hasLayer(driverPathLineRef.current)

    if (pathIsValid) {
      // Update existing path
      driverPathLineRef.current!.setLatLngs(driverPath)
    } else {
      // Remove old invalid line if exists
      if (driverPathLineRef.current) {
        try { driverPathLineRef.current.remove() } catch (e) { /* ignore */ }
      }

      // Create new path lines
      // Path border (white)
      L.polyline(driverPath, {
        color: '#FFFFFF',
        weight: 6,
        opacity: 0.8
      }).addTo(map)

      // Main path line (green)
      driverPathLineRef.current = L.polyline(driverPath, {
        color: '#10B981',
        weight: 4,
        opacity: 1
      }).addTo(map)
    }
  }, [showDriverPath, driverPath])

  const validPointsCount = points.filter(p => p.lat && p.lng).length

  if (validPointsCount === 0 && !depot) {
    return (
      <div
        className="flex items-center justify-center bg-gray-100 rounded-lg text-gray-500"
        style={{ height }}
      >
        Aucune coordonnee GPS disponible pour afficher la carte
      </div>
    )
  }

  return (
    <div className="relative">
      <div
        ref={mapRef}
        style={{ height, width: '100%' }}
        className="rounded-lg overflow-hidden border border-gray-200"
      />
      {isLoadingRoute && (
        <div className="absolute top-2 left-2 bg-white px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 text-sm">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Calcul de l&apos;itineraire...</span>
        </div>
      )}
    </div>
  )
}
