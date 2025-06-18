import { getTractEssentialColumns } from "./tract-data-mapping"

interface TractDataResult {
  geoJson: any
  tractData: any[]
  viewMode: "county" | "zip"
  state: string
  year: string
  loadingStats: {
    geoJsonStatus: string
    dataStatus: string
    loadTime: number
    featuresCount: number
    dataRowsCount: number
    fileSize: number
  }
}

// State information for tract data
const TRACT_STATES = {
  NV: {
    name: "Nevada",
    center: [39.5, -116.8],
    zoom: 7,
  },
  MA: {
    name: "Massachusetts",
    center: [42.3, -71.8],
    zoom: 8,
  },
  CA: {
    name: "California",
    center: [37.1, -119.4],
    zoom: 6,
    popularAreas: ["Los Angeles County", "San Francisco County", "San Diego County", "Sacramento County"],
  },
  TX: {
    name: "Texas",
    center: [31.5, -99.3],
    zoom: 6,
    popularAreas: ["Harris County", "Dallas County", "Travis County", "Bexar County"],
  },
}

// Resolve path to tract GeoJSON file - using your existing pattern
function resolveTractGeoJsonPath(state: string): string {
  const BASE_URL = "https://raw.githubusercontent.com/CommercialBotAl/re_data/main"
  return `${BASE_URL}/Index/geojson/${state}_tract_geometry.geojson`
}

// Resolve path to tract data file - using your actual file naming
function resolveTractDataPath(state: string, viewMode: "county" | "zip", year: string): string {
  const BASE_URL = "https://raw.githubusercontent.com/CommercialBotAl/re_data/main"
  const stateInfo = TRACT_STATES[state as keyof typeof TRACT_STATES]

  if (!stateInfo) {
    throw new Error(`Unknown state for tract data: ${state}`)
  }

  // Format: Cen_{StateName}_tract_{level}_{year}_lean.json
  const fileName = `Cen_${stateInfo.name}_tract_${viewMode}_${year}_lean.json`
  return `${BASE_URL}/${state}/${fileName}`
}

// Load tract map data
export async function loadTractMapData(
  state: string,
  viewMode: "county" | "zip",
  year = "2023",
): Promise<TractDataResult> {
  const startTime = performance.now()

  console.log(`🗺️ Loading tract map data: ${state} ${viewMode} ${year}`)

  const result: TractDataResult = {
    geoJson: null,
    tractData: [],
    viewMode,
    state,
    year,
    loadingStats: {
      geoJsonStatus: "not-attempted",
      dataStatus: "not-attempted",
      loadTime: 0,
      featuresCount: 0,
      dataRowsCount: 0,
      fileSize: 0,
    },
  }

  // Load GeoJSON
  try {
    result.loadingStats.geoJsonStatus = "loading"
    const geoJsonUrl = resolveTractGeoJsonPath(state)
    console.log(`🗺️ Fetching Tract GeoJSON: ${geoJsonUrl}`)

    const geoResponse = await fetch(geoJsonUrl)
    console.log(`🗺️ GeoJSON Response: ${geoResponse.status} ${geoResponse.statusText}`)

    if (geoResponse.ok) {
      result.geoJson = await geoResponse.json()
      result.loadingStats.geoJsonStatus = "success"
      result.loadingStats.featuresCount = result.geoJson?.features?.length || 0
      console.log(`✅ Tract GeoJSON loaded: ${result.loadingStats.featuresCount} features`)

      // Log sample feature for debugging
      if (result.geoJson.features && result.geoJson.features.length > 0) {
        console.log(`🔍 Sample tract feature properties:`, Object.keys(result.geoJson.features[0].properties))
        console.log(`🔍 Sample tract feature:`, result.geoJson.features[0].properties)
      }
    } else {
      result.loadingStats.geoJsonStatus = "failed"
      console.log(`❌ Tract GeoJSON failed: ${geoResponse.status}`)
    }
  } catch (error) {
    result.loadingStats.geoJsonStatus = "failed"
    console.log(`❌ Tract GeoJSON error:`, error)
  }

  // Load tract data
  try {
    result.loadingStats.dataStatus = "loading"
    const dataUrl = resolveTractDataPath(state, viewMode, year)
    console.log(`📊 Fetching tract data: ${dataUrl}`)

    const dataResponse = await fetch(dataUrl)
    console.log(`📊 Tract Data Response: ${dataResponse.status} ${dataResponse.statusText}`)

    if (dataResponse.ok) {
      // Get file size from headers if available
      const contentLength = dataResponse.headers.get("content-length")
      if (contentLength) {
        result.loadingStats.fileSize = Number.parseInt(contentLength, 10)
      }

      const jsonData = await dataResponse.json()
      console.log(`📊 Raw tract JSON structure:`, Object.keys(jsonData))

      // Convert to array if needed
      const rawData = convertTractJsonToArray(jsonData)
      console.log(`📊 Converted to array: ${rawData.length} rows`)

      // Filter to essential columns only
      const essentialColumns = getTractEssentialColumns(viewMode)
      result.tractData = rawData.map((row) => filterToEssentialColumns(row, essentialColumns))

      result.loadingStats.dataStatus = "success"
      result.loadingStats.dataRowsCount = result.tractData.length

      // If file size wasn't in headers, estimate from JSON
      if (!result.loadingStats.fileSize) {
        const jsonString = JSON.stringify(jsonData)
        result.loadingStats.fileSize = new Blob([jsonString]).size
      }

      console.log(`✅ Tract data loaded: ${result.loadingStats.dataRowsCount} rows`)
      console.log(`📦 File size: ${(result.loadingStats.fileSize / 1024).toFixed(1)} KB`)
      console.log(`📋 Essential columns: ${essentialColumns.join(", ")}`)

      // Log sample data
      if (result.tractData.length > 0) {
        console.log(`🔍 Sample tract data:`, result.tractData[0])
        console.log(`🔍 Tract data columns:`, Object.keys(result.tractData[0]))
      }
    } else {
      result.loadingStats.dataStatus = "failed"
      console.log(`❌ Tract data failed: ${dataResponse.status}`)
    }
  } catch (error) {
    result.loadingStats.dataStatus = "failed"
    console.log(`❌ Tract data error:`, error)
  }

  const endTime = performance.now()
  result.loadingStats.loadTime = endTime - startTime

  console.log(`⏱️ Tract map data loaded in ${result.loadingStats.loadTime.toFixed(0)}ms`)

  return result
}

// Convert JSON to array (handles different possible formats)
function convertTractJsonToArray(jsonData: any): any[] {
  console.log(`🔄 Converting tract JSON data to array format`)

  if (Array.isArray(jsonData)) {
    console.log(`📊 Data is already an array`)
    return jsonData
  } else if (jsonData.data && Array.isArray(jsonData.data)) {
    console.log(`📊 Using jsonData.data array`)
    return jsonData.data
  } else if (jsonData.features && Array.isArray(jsonData.features)) {
    console.log(`📊 Extracting from GeoJSON-like features`)
    return jsonData.features.map((feature: any) => feature.properties || feature)
  } else {
    console.log(`📊 Converting object keys to array`)
    return Object.keys(jsonData).map((key) => ({
      id: key,
      ...jsonData[key],
    }))
  }
}

// Filter to only essential columns
function filterToEssentialColumns(row: any, essentialColumns: string[]): any {
  const filtered: any = {}
  essentialColumns.forEach((col) => {
    if (row.hasOwnProperty(col)) {
      filtered[col] = row[col]
    }
  })
  return filtered
}

// Get map settings for tract visualization
export function getTractMapSettings(state: string): { center: [number, number]; zoom: number } {
  const stateInfo = TRACT_STATES[state as keyof typeof TRACT_STATES]
  if (!stateInfo) {
    return { center: [39.8, -98.6], zoom: 4 } // Default US center
  }
  return { center: stateInfo.center, zoom: stateInfo.zoom }
}

// Get popular areas for a state
export function getPopularAreas(state: string): string[] {
  const stateInfo = TRACT_STATES[state as keyof typeof TRACT_STATES]
  if (!stateInfo || !stateInfo.popularAreas) {
    return []
  }
  return stateInfo.popularAreas
}

// Get all available states
export function getAvailableStates(): Array<{ code: string; name: string }> {
  return Object.entries(TRACT_STATES).map(([code, info]) => ({
    code,
    name: info.name,
  }))
}
