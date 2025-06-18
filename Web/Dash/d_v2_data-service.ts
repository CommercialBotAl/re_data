import { resolveDataPath, resolveGeoJsonPath, getDataSourceForLevel, STATES } from "./file-path-resolver"

export interface CensusData {
  [key: string]: any
}

export interface GeoJsonData {
  type: string
  features: Array<{
    type: string
    properties: { [key: string]: any }
    geometry: any
  }>
}

export class DataService {
  private cache = new Map<string, any>()

  async loadCensusData(stateAbbrev: string, level: string): Promise<CensusData[]> {
    const cacheKey = `census-${stateAbbrev}-${level}`

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }

    try {
      const dataSource = getDataSourceForLevel(level)
      const url = resolveDataPath(stateAbbrev, level, dataSource)

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to load data: ${response.status}`)
      }

      const data = await response.json()
      this.cache.set(cacheKey, data)
      return data
    } catch (error) {
      console.error(`Error loading census data for ${stateAbbrev}-${level}:`, error)
      throw error
    }
  }

  async loadGeoJsonData(stateAbbrev: string, level: string): Promise<GeoJsonData> {
    const cacheKey = `geojson-${stateAbbrev}-${level}`

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }

    try {
      const url = resolveGeoJsonPath(stateAbbrev, level)

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to load GeoJSON: ${response.status}`)
      }

      const data = await response.json()
      this.cache.set(cacheKey, data)
      return data
    } catch (error) {
      console.error(`Error loading GeoJSON data for ${stateAbbrev}-${level}:`, error)
      throw error
    }
  }

  async loadFredData(stateAbbrev: string): Promise<any[]> {
    const cacheKey = `fred-${stateAbbrev}`

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }

    try {
      const url = resolveDataPath(stateAbbrev, "county", "fred")

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to load FRED data: ${response.status}`)
      }

      const data = await response.json()
      this.cache.set(cacheKey, data)
      return data
    } catch (error) {
      console.error(`Error loading FRED data for ${stateAbbrev}:`, error)
      throw error
    }
  }

  async loadRedfinData(stateAbbrev: string): Promise<any[]> {
    const cacheKey = `redfin-${stateAbbrev}`

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }

    try {
      const url = resolveDataPath(stateAbbrev, "county", "redfin")

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to load Redfin data: ${response.status}`)
      }

      const data = await response.json()
      this.cache.set(cacheKey, data)
      return data
    } catch (error) {
      console.error(`Error loading Redfin data for ${stateAbbrev}:`, error)
      throw error
    }
  }

  getAvailableStates(): string[] {
    return Object.keys(STATES)
  }

  getStateInfo(stateAbbrev: string) {
    return STATES[stateAbbrev]
  }

  clearCache() {
    this.cache.clear()
  }
}

// Export singleton instance
export const dataService = new DataService()
