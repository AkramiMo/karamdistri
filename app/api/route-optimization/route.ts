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
  usingGoogle: boolean
}

// Default depot location (fallback)
const DEFAULT_DEPOT: Location = {
  latitude: 31.6295,
  longitude: -7.9811
}

// Calculate distance between two points using Haversine formula (fallback)
function calculateHaversineDistance(loc1: Location, loc2: Location): number {
  const R = 6371 // Earth's radius in km
  const dLat = (loc2.latitude - loc1.latitude) * Math.PI / 180
  const dLon = (loc2.longitude - loc1.longitude) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(loc1.latitude * Math.PI / 180) * Math.cos(loc2.latitude * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Use Google Distance Matrix API to get real road distances
async function getGoogleDistanceMatrix(
  origins: Location[],
  destinations: Location[],
  apiKey: string
): Promise<{ distances: number[][], durations: number[][] } | null> {
  try {
    const originsStr = origins.map(o => `${o.latitude},${o.longitude}`).join('|')
    const destinationsStr = destinations.map(d => `${d.latitude},${d.longitude}`).join('|')

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originsStr}&destinations=${destinationsStr}&key=${apiKey}&units=metric`

    const response = await fetch(url)
    const data = await response.json()

    if (data.status !== 'OK') {
      console.error('Google Distance Matrix error:', data.status, data.error_message)
      return null
    }

    const distances: number[][] = []
    const durations: number[][] = []

    for (const row of data.rows) {
      const distRow: number[] = []
      const durRow: number[] = []

      for (const element of row.elements) {
        if (element.status === 'OK') {
          distRow.push(element.distance.value / 1000) // Convert meters to km
          durRow.push(element.duration.value / 60) // Convert seconds to minutes
        } else {
          distRow.push(Infinity)
          durRow.push(Infinity)
        }
      }

      distances.push(distRow)
      durations.push(durRow)
    }

    return { distances, durations }
  } catch (error) {
    console.error('Google API error:', error)
    return null
  }
}

// Optimize route using nearest neighbor with distance matrix
function optimizeWithDistanceMatrix(
  deliveries: Delivery[],
  distanceMatrix: number[][],
  durationMatrix: number[][]
): { optimized: Delivery[], totalDistance: number, totalDuration: number } {
  if (deliveries.length <= 1) {
    const totalDist = deliveries.length === 1 ? distanceMatrix[0][0] * 2 : 0
    const totalDur = deliveries.length === 1 ? durationMatrix[0][0] * 2 : 0
    return { optimized: deliveries, totalDistance: totalDist, totalDuration: totalDur }
  }

  const n = deliveries.length
  const optimized: Delivery[] = []
  const visited = new Set<number>()
  let currentIndex = -1 // Start from depot (index -1 means depot)
  let totalDistance = 0
  let totalDuration = 0

  while (optimized.length < n) {
    let nearestIndex = -1
    let nearestDistance = Infinity

    for (let i = 0; i < n; i++) {
      if (visited.has(i)) continue

      // Get distance from current position
      let distance: number
      if (currentIndex === -1) {
        // From depot (first row of matrix is depot to all deliveries)
        distance = distanceMatrix[0][i]
      } else {
        // From previous delivery (row currentIndex+1 because first row is depot)
        distance = distanceMatrix[currentIndex + 1][i]
      }

      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestIndex = i
      }
    }

    if (nearestIndex !== -1) {
      visited.add(nearestIndex)
      optimized.push(deliveries[nearestIndex])

      // Add distance and duration
      if (currentIndex === -1) {
        totalDistance += distanceMatrix[0][nearestIndex]
        totalDuration += durationMatrix[0][nearestIndex]
      } else {
        totalDistance += distanceMatrix[currentIndex + 1][nearestIndex]
        totalDuration += durationMatrix[currentIndex + 1][nearestIndex]
      }

      currentIndex = nearestIndex
    }
  }

  // Add return to depot distance (last delivery to depot)
  // We need to make another API call or estimate this
  // For simplicity, we'll use the reverse of depot to last delivery
  if (optimized.length > 0) {
    const lastIdx = deliveries.indexOf(optimized[optimized.length - 1])
    // Approximate return distance (can be refined with another API call)
    totalDistance += distanceMatrix[0][lastIdx] * 1.1 // Add 10% for return
    totalDuration += durationMatrix[0][lastIdx] * 1.1
  }

  return {
    optimized,
    totalDistance: Math.round(totalDistance * 10) / 10,
    totalDuration: Math.round(totalDuration)
  }
}

// Fallback: Nearest neighbor with Haversine distance
function optimizeRouteNearestNeighbor(deliveries: Delivery[], startLocation: Location): {
  optimized: Delivery[],
  totalDistance: number,
  totalDuration: number
} {
  if (deliveries.length <= 1) {
    const dist = deliveries.length === 1
      ? calculateHaversineDistance(startLocation, deliveries[0].location) * 2
      : 0
    return {
      optimized: deliveries,
      totalDistance: Math.round(dist * 10) / 10,
      totalDuration: Math.round(dist / 40 * 60) // 40 km/h average
    }
  }

  const optimized: Delivery[] = []
  const remaining = [...deliveries]
  let currentLocation = startLocation
  let totalDistance = 0

  while (remaining.length > 0) {
    let nearestIndex = 0
    let nearestDistance = Infinity

    for (let i = 0; i < remaining.length; i++) {
      const distance = calculateHaversineDistance(currentLocation, remaining[i].location)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestIndex = i
      }
    }

    totalDistance += nearestDistance
    const nearest = remaining.splice(nearestIndex, 1)[0]
    optimized.push(nearest)
    currentLocation = nearest.location
  }

  // Return to start
  totalDistance += calculateHaversineDistance(currentLocation, startLocation)

  return {
    optimized,
    totalDistance: Math.round(totalDistance * 10) / 10,
    totalDuration: Math.round(totalDistance / 40 * 60) // 40 km/h average
  }
}

export async function POST(request: NextRequest) {
  try {
    const { deliveries, startLocation } = await request.json()

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

    // Determine start location (depot or custom)
    const depot: Location = startLocation && startLocation.latitude && startLocation.longitude
      ? { latitude: startLocation.latitude, longitude: startLocation.longitude }
      : DEFAULT_DEPOT

    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY

    // Try Google Distance Matrix API if key is available
    if (googleApiKey && googleApiKey.length > 10) {
      // Build origins: depot + all delivery locations
      const allLocations = [depot, ...validDeliveries.map((d: Delivery) => d.location)]

      // Get distance matrix from Google
      const matrix = await getGoogleDistanceMatrix(allLocations, validDeliveries.map((d: Delivery) => d.location), googleApiKey)

      if (matrix) {
        const { optimized, totalDistance, totalDuration } = optimizeWithDistanceMatrix(
          validDeliveries,
          matrix.distances,
          matrix.durations
        )

        const result: OptimizedRoute = {
          deliveries: optimized,
          totalDistance,
          totalDuration,
          usingGoogle: true
        }

        return NextResponse.json(result)
      }
    }

    // Fallback to Haversine-based optimization
    const { optimized, totalDistance, totalDuration } = optimizeRouteNearestNeighbor(validDeliveries, depot)

    const result: OptimizedRoute = {
      deliveries: optimized,
      totalDistance,
      totalDuration,
      usingGoogle: false
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
  const hasGoogleApi = !!(process.env.GOOGLE_MAPS_API_KEY && process.env.GOOGLE_MAPS_API_KEY.length > 10)

  return NextResponse.json({
    status: 'ok',
    googleApiAvailable: hasGoogleApi,
    defaultDepot: DEFAULT_DEPOT,
  })
}
