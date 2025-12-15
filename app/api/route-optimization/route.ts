import { NextRequest, NextResponse } from 'next/server'

interface Location {
  latitude: number
  longitude: number
}

interface Delivery {
  id: string
  delivery_number: string
  client_name: string
  client_code: string
  address: string
  city: string
  location: Location
  total_ht: number
}

interface OptimizedRoute {
  deliveries: Delivery[]
  totalDistance: number
  totalDuration: number
  polyline?: string
}

// Depot location (KARAM headquarters in Marrakech)
const DEPOT_LOCATION: Location = {
  latitude: 31.6295,
  longitude: -7.9811
}

// Calculate distance between two points using Haversine formula
function calculateDistance(loc1: Location, loc2: Location): number {
  const R = 6371 // Earth's radius in km
  const dLat = (loc2.latitude - loc1.latitude) * Math.PI / 180
  const dLon = (loc2.longitude - loc1.longitude) * Math.PI / 180
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(loc1.latitude * Math.PI / 180) * Math.cos(loc2.latitude * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// Nearest neighbor algorithm for route optimization
function optimizeRouteNearestNeighbor(deliveries: Delivery[]): Delivery[] {
  if (deliveries.length <= 1) return deliveries

  const optimized: Delivery[] = []
  const remaining = [...deliveries]
  let currentLocation = DEPOT_LOCATION

  while (remaining.length > 0) {
    let nearestIndex = 0
    let nearestDistance = Infinity

    for (let i = 0; i < remaining.length; i++) {
      const distance = calculateDistance(currentLocation, remaining[i].location)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestIndex = i
      }
    }

    const nearest = remaining.splice(nearestIndex, 1)[0]
    optimized.push(nearest)
    currentLocation = nearest.location
  }

  return optimized
}

// Calculate total route distance
function calculateTotalDistance(deliveries: Delivery[]): number {
  let total = 0
  let currentLocation = DEPOT_LOCATION

  for (const delivery of deliveries) {
    total += calculateDistance(currentLocation, delivery.location)
    currentLocation = delivery.location
  }

  // Add return to depot
  if (deliveries.length > 0) {
    total += calculateDistance(deliveries[deliveries.length - 1].location, DEPOT_LOCATION)
  }

  return Math.round(total * 10) / 10
}

// Estimate duration (assuming average speed of 40 km/h in city)
function estimateDuration(distanceKm: number): number {
  const avgSpeedKmH = 40
  const hours = distanceKm / avgSpeedKmH
  return Math.round(hours * 60) // Return in minutes
}

export async function POST(request: NextRequest) {
  try {
    const { deliveries, useGoogleApi } = await request.json()

    if (!deliveries || !Array.isArray(deliveries) || deliveries.length === 0) {
      return NextResponse.json(
        { error: 'No deliveries provided' },
        { status: 400 }
      )
    }

    // Filter deliveries with valid GPS coordinates
    const validDeliveries = deliveries.filter(
      (d: Delivery) => d.location && d.location.latitude && d.location.longitude
    )

    if (validDeliveries.length === 0) {
      return NextResponse.json(
        { error: 'No deliveries with valid GPS coordinates' },
        { status: 400 }
      )
    }

    // If Google API key is available and requested, use Google Route Optimization
    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY

    if (useGoogleApi && googleApiKey) {
      // For now, we'll use the basic optimization
      // Google Route Optimization API integration can be added later
      // with proper project setup and billing
    }

    // Use nearest neighbor algorithm
    const optimizedDeliveries = optimizeRouteNearestNeighbor(validDeliveries)
    const totalDistance = calculateTotalDistance(optimizedDeliveries)
    const totalDuration = estimateDuration(totalDistance)

    const result: OptimizedRoute = {
      deliveries: optimizedDeliveries,
      totalDistance,
      totalDuration,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Route optimization error:', error)
    return NextResponse.json(
      { error: 'Failed to optimize route' },
      { status: 500 }
    )
  }
}

// GET endpoint to check API status
export async function GET() {
  const hasGoogleApi = !!process.env.GOOGLE_MAPS_API_KEY

  return NextResponse.json({
    status: 'ok',
    googleApiAvailable: hasGoogleApi,
    depot: DEPOT_LOCATION,
  })
}
