// File path resolver to centralize all file naming logic

interface StateInfo {
  name: string
  fredCode: string
  center: [number, number]
  zoom: number
}

// Centralized state information
export const STATES: Record<string, StateInfo> = {
  MA: {
    name: "Massachusetts",
    fredCode: "25",
    center: [42.3, -71.8],
    zoom: 8,
  },
  NV: {
    name: "Nevada",
    fredCode: "32",
    center: [39.5, -116.8],
    zoom: 7,
  },
  GA: {
    name: "Georgia",
    fredCode: "13",
    center: [32.9, -83.4],
    zoom: 7,
  },
  AL: {
    name: "Alabama",
    fredCode: "01",
    center: [32.8, -86.8],
    zoom: 7,
  },
}

// Data source information
export const DATA_SOURCES = {
  census: {
    name: "Census",
    description: "US Census Bureau Data",
    filePattern: "Cen_{state}_{level}_2023_summary.json",
  },
  fred: {
    name: "FRED",
    description: "Federal Reserve Economic Data",
    filePattern: "fred_counties_{code}.json",
  },
  redfin: {
    name: "Redfin",
    description: "Redfin Real Estate Market Data",
    filePattern: "redfin_{state}_county_{year}.json",
  },
}

// Get the correct file path for a data source
export function resolveDataPath(stateAbbrev: string, level: string, dataSource: string): string {
  const BASE_URL = "https://raw.githubusercontent.com/CommercialBotAl/re_data/main"
  const state = STATES[stateAbbrev]

  if (!state) {
    throw new Error(`Unknown state: ${stateAbbrev}`)
  }

  const sourceInfo = DATA_SOURCES[dataSource as keyof typeof DATA_SOURCES]
  if (!sourceInfo) {
    throw new Error(`Unknown data source: ${dataSource}`)
  }

  let filePath = ""

  // Generate path based on data source pattern
  if (dataSource === "census") {
    filePath = sourceInfo.filePattern.replace("{state}", state.name).replace("{level}", level)
  } else if (dataSource === "fred") {
    filePath = sourceInfo.filePattern.replace("{code}", state.fredCode)
  } else if (dataSource === "redfin") {
    filePath = sourceInfo.filePattern.replace("{state}", state.name).replace("{year}", "2020") // Default to 2020 data
  }

  return `${BASE_URL}/${stateAbbrev}/${filePath}`
}

// Get the correct GeoJSON path
export function resolveGeoJsonPath(stateAbbrev: string, level: string): string {
  const BASE_URL = "https://raw.githubusercontent.com/CommercialBotAl/re_data/main"
  return `${BASE_URL}/Index/geojson/${stateAbbrev}_${level}_geometry.geojson`
}

// Get the appropriate data source for a level
export function getDataSourceForLevel(level: string): "census" | "redfin" | "fred" {
  if (level === "county") return "fred"
  if (level === "zip") return "census"
  if (level === "tract") return "census"
  return "census" // Default
}

// Get map center and zoom for a state
export function getMapSettings(stateAbbrev: string): { center: [number, number]; zoom: number } {
  const state = STATES[stateAbbrev]
  if (!state) {
    return { center: [39.8, -98.6], zoom: 4 } // Default US center
  }
  return { center: state.center, zoom: state.zoom }
}
