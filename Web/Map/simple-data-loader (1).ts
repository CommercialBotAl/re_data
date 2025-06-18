import { resolveDataPath, resolveGeoJsonPath } from "./file-path-resolver"
import { getSimpleDataSource, getSimpleMetrics, getEssentialColumns } from "./simple-data-mapping"

interface SimpleDataResult {
  geoJson: any
  csvData: any[]
  dataSource: string
  availableMetrics: any[]
  level: string
  state: string
  loadingStats: {
    geoJsonStatus: string
    dataStatus: string
    loadTime: number
    featuresCount: number
    dataRowsCount: number
  }
}

// Simple data loader - only essential columns
export async function loadSimpleMapData(state: string, level: string): Promise<SimpleDataResult> {
  const startTime = performance.now()

  console.log(`🗺️ Loading simple map data: ${state} ${level}`)

  const dataSource = getSimpleDataSource(level)
  const availableMetrics = getSimpleMetrics(dataSource)

  const result: SimpleDataResult = {
    geoJson: null,
    csvData: [],
    dataSource,
    availableMetrics,
    level,
    state,
    loadingStats: {
      geoJsonStatus: "not-attempted",
      dataStatus: "not-attempted",
      loadTime: 0,
      featuresCount: 0,
      dataRowsCount: 0,
    },
  }

  // Load GeoJSON
  try {
    result.loadingStats.geoJsonStatus = "loading"
    const geoJsonUrl = resolveGeoJsonPath(state, level)
    console.log(`🗺️ Fetching GeoJSON: ${geoJsonUrl}`)

    const geoResponse = await fetch(geoJsonUrl)
    if (geoResponse.ok) {
      result.geoJson = await geoResponse.json()
      result.loadingStats.geoJsonStatus = "success"
      result.loadingStats.featuresCount = result.geoJson?.features?.length || 0
      console.log(`✅ GeoJSON loaded: ${result.loadingStats.featuresCount} features`)
    } else {
      result.loadingStats.geoJsonStatus = "failed"
      console.log(`❌ GeoJSON failed: ${geoResponse.status}`)
    }
  } catch (error) {
    result.loadingStats.geoJsonStatus = "failed"
    console.log(`❌ GeoJSON error:`, error)
  }

  // Load data
  try {
    result.loadingStats.dataStatus = "loading"
    const dataUrl = resolveDataPath(state, level, dataSource)
    console.log(`📊 Fetching data: ${dataUrl}`)

    const dataResponse = await fetch(dataUrl)
    if (dataResponse.ok) {
      const jsonData = await dataResponse.json()

      // Convert to array and filter to essential columns only
      const rawData = convertJsonToArray(jsonData)
      const essentialColumns = getEssentialColumns(level, dataSource)

      result.csvData = rawData.map((row) => filterToEssentialColumns(row, essentialColumns))
      result.loadingStats.dataStatus = "success"
      result.loadingStats.dataRowsCount = result.csvData.length

      console.log(`✅ Data loaded: ${result.loadingStats.dataRowsCount} rows`)
      console.log(`📋 Essential columns: ${essentialColumns.join(", ")}`)

      // Log sample data
      if (result.csvData.length > 0) {
        console.log(`🔍 Sample data:`, result.csvData[0])
      }
    } else {
      result.loadingStats.dataStatus = "failed"
      console.log(`❌ Data failed: ${dataResponse.status}`)
    }
  } catch (error) {
    result.loadingStats.dataStatus = "failed"
    console.log(`❌ Data error:`, error)
  }

  const endTime = performance.now()
  result.loadingStats.loadTime = endTime - startTime

  console.log(`⏱️ Simple map data loaded in ${result.loadingStats.loadTime.toFixed(0)}ms`)

  return result
}

// Convert JSON to array (simplified)
function convertJsonToArray(jsonData: any): any[] {
  if (Array.isArray(jsonData)) {
    return jsonData
  } else if (jsonData.data && Array.isArray(jsonData.data)) {
    return jsonData.data
  } else if (jsonData.features && Array.isArray(jsonData.features)) {
    return jsonData.features.map((feature: any) => feature.properties || feature)
  } else {
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
