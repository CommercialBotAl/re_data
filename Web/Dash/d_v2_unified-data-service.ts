// unified-data-service.ts
// Service to create relationships between redfin_master_index.json and zip_master_index.csv

import Papa from "papaparse"

// Type definitions
interface PropertyType {
  name: string
  table_id: string
}

interface StateInfo {
  state_code: string
  property_types: Record<string, PropertyType>
  primary_table_id: number
}

interface CountyInfo {
  county_name: string
  state_code: string
  property_types: Record<string, PropertyType>
  primary_table_id: number
  cities: string[]
  zip_codes: string[]
}

interface CityInfo {
  city_name: string
  state_code: string
  property_types: Record<string, PropertyType>
  primary_table_id: number
}

interface ZipInfo {
  zip_code: string
  state_code: string
  property_types: Record<string, PropertyType>
  primary_table_id: number
}

interface RedfInMasterIndex {
  metadata: {
    created: string
    target_year: number
    total_states: number
    total_counties: number
    total_cities: number
    total_zips: number
  }
  states: Record<string, StateInfo>
  counties: Record<string, CountyInfo>
  cities: Record<string, CityInfo>
  zip_codes: Record<string, ZipInfo>
  search_terms: string[]
  property_types: Record<string, string>
  geographic_hierarchy?: any
}

interface ZipMasterRecord {
  zipcode: string
  state_code: string
  state_name: string
  data_source: string
  has_census_data: boolean
  has_redfin_data: boolean
  has_geometry: boolean
  geojson_file: string
  data_file: string
  redfin_tableid_zip?: number
  redfin_table_id_city?: number
  redfin_table_id_county?: number
  redfin_city?: string
  census_city?: string
  parent_metro_region?: string
  parent_metro_region_metro_code?: number
  redfin_county_name?: string
  region_type_id?: number
  INTPTLAT: number
  INTPTLON: number
  ALAND: number
  AWATER: number
}

// Unified location interface
interface UnifiedLocation {
  // Core identifiers
  zipCode?: string
  stateCode: string
  stateName: string

  // Hierarchical information (from redfin_master_index)
  propertyTypes: Record<string, PropertyType>
  primaryTableId: number
  hierarchicalPath: string

  // Geographic information (from zip_master_index)
  coordinates: [number, number]
  geoJsonFile?: string
  dataFile?: string
  hasData: {
    census: boolean
    redfin: boolean
    geometry: boolean
  }

  // Additional metadata
  landArea?: number
  waterArea?: number
  metroRegion?: string
  dataSource?: string

  // Related locations
  parentCounty?: string
  parentState?: string
  childCities?: string[]
  childZips?: string[]
}

class UnifiedDataService {
  private redfInIndex: RedfInMasterIndex | null = null
  private zipMasterData: ZipMasterRecord[] = []
  private unifiedLookup: Map<string, UnifiedLocation> = new Map()
  private isLoaded = false

  // Load and initialize all data
  async initialize(): Promise<void> {
    try {
      console.log("🔄 Loading real estate data indices...")

      // Check if files exist first
      const fileChecks = await this.checkDataFiles()

      if (!fileChecks.redfin && !fileChecks.zip) {
        console.log("📁 No data files found, using mock data...")
        this.initializeMockData()
        this.isLoaded = true
        return
      }

      // Load redfin master index if available
      if (fileChecks.redfin) {
        try {
          const redfInResponse = await fetch("/redfin_master_index.json")
          if (!redfInResponse.ok) {
            throw new Error(`HTTP ${redfInResponse.status}`)
          }

          const contentType = redfInResponse.headers.get("content-type")
          if (!contentType?.includes("application/json")) {
            throw new Error("Response is not JSON (likely 404 page)")
          }

          const redfInText = await redfInResponse.text()
          this.redfInIndex = JSON.parse(redfInText)
          console.log("✅ Loaded redfin_master_index.json")
        } catch (error) {
          console.warn("⚠️ Could not load redfin_master_index.json:", error)
          throw new Error("redfin_master_index.json not found in /public folder")
        }
      }

      // Load zip master index if available
      if (fileChecks.zip) {
        try {
          const zipResponse = await fetch("/zip_master_index.csv")
          if (!zipResponse.ok) {
            throw new Error(`HTTP ${zipResponse.status}`)
          }

          const contentType = zipResponse.headers.get("content-type")
          if (contentType?.includes("text/html")) {
            throw new Error("Response is HTML (likely 404 page)")
          }

          const zipCsvText = await zipResponse.text()

          // Parse CSV
          const zipParsed = Papa.parse<ZipMasterRecord>(zipCsvText, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
          })

          if (zipParsed.errors.length > 0) {
            console.warn("CSV parsing warnings:", zipParsed.errors)
          }

          this.zipMasterData = zipParsed.data
          console.log("✅ Loaded zip_master_index.csv")
        } catch (error) {
          console.warn("⚠️ Could not load zip_master_index.csv:", error)
          throw new Error("zip_master_index.csv not found in /public folder")
        }
      }

      // Build unified lookup
      this.buildUnifiedLookup()

      this.isLoaded = true
      console.log("✅ Real estate data loaded successfully")
      console.log(`📊 Loaded ${this.unifiedLookup.size} unified locations`)
    } catch (error) {
      console.error("❌ Error loading real estate data:", error)

      // Fallback to mock data
      console.log("🔄 Falling back to mock data...")
      this.initializeMockData()

      this.isLoaded = true
      console.log("✅ Mock data loaded successfully")
      console.log(`📊 Loaded ${this.unifiedLookup.size} mock locations`)
    }
  }

  // Check if data files exist
  private async checkDataFiles(): Promise<{ redfin: boolean; zip: boolean }> {
    const checks = { redfin: false, zip: false }

    try {
      // Check redfin file
      const redfInResponse = await fetch("/redfin_master_index.json", { method: "HEAD" })
      checks.redfin =
        redfInResponse.ok && redfInResponse.headers.get("content-type")?.includes("application/json") === true
    } catch (error) {
      console.log("redfin_master_index.json not accessible")
    }

    try {
      // Check zip file
      const zipResponse = await fetch("/zip_master_index.csv", { method: "HEAD" })
      checks.zip = zipResponse.ok && !zipResponse.headers.get("content-type")?.includes("text/html")
    } catch (error) {
      console.log("zip_master_index.csv not accessible")
    }

    console.log("📁 File availability check:", checks)
    return checks
  }

  // Add mock data initialization method
  private initializeMockData(): void {
    console.log("🔄 Initializing mock data...")

    // Create mock redfin index
    this.redfInIndex = {
      metadata: {
        created: "2024-01-01",
        target_year: 2024,
        total_states: 3,
        total_counties: 6,
        total_cities: 12,
        total_zips: 50,
      },
      states: {
        California: {
          state_code: "CA",
          property_types: {
            SFR: { name: "Single Family Residential", table_id: "1001" },
            CON: { name: "Condominiums", table_id: "1002" },
          },
          primary_table_id: 1001,
        },
        Nevada: {
          state_code: "NV",
          property_types: {
            SFR: { name: "Single Family Residential", table_id: "2001" },
            CON: { name: "Condominiums", table_id: "2002" },
          },
          primary_table_id: 2001,
        },
        Massachusetts: {
          state_code: "MA",
          property_types: {
            SFR: { name: "Single Family Residential", table_id: "3001" },
            CON: { name: "Condominiums", table_id: "3002" },
          },
          primary_table_id: 3001,
        },
      },
      counties: {
        "Los Angeles County, CA": {
          county_name: "Los Angeles County",
          state_code: "CA",
          property_types: {
            SFR: { name: "Single Family Residential", table_id: "1101" },
          },
          primary_table_id: 1101,
          cities: ["Los Angeles", "Beverly Hills"],
          zip_codes: ["90210", "90001"],
        },
        "Clark County, NV": {
          county_name: "Clark County",
          state_code: "NV",
          property_types: {
            SFR: { name: "Single Family Residential", table_id: "2101" },
          },
          primary_table_id: 2101,
          cities: ["Las Vegas", "Henderson"],
          zip_codes: ["89101", "89102"],
        },
        "Suffolk County, MA": {
          county_name: "Suffolk County",
          state_code: "MA",
          property_types: {
            SFR: { name: "Single Family Residential", table_id: "3101" },
          },
          primary_table_id: 3101,
          cities: ["Boston"],
          zip_codes: ["02101", "02102"],
        },
      },
      cities: {
        "Los Angeles, CA": {
          city_name: "Los Angeles",
          state_code: "CA",
          property_types: {
            SFR: { name: "Single Family Residential", table_id: "1201" },
          },
          primary_table_id: 1201,
        },
        "Las Vegas, NV": {
          city_name: "Las Vegas",
          state_code: "NV",
          property_types: {
            SFR: { name: "Single Family Residential", table_id: "2201" },
          },
          primary_table_id: 2201,
        },
        "Boston, MA": {
          city_name: "Boston",
          state_code: "MA",
          property_types: {
            SFR: { name: "Single Family Residential", table_id: "3201" },
          },
          primary_table_id: 3201,
        },
      },
      zip_codes: {
        "90210": {
          zip_code: "90210",
          state_code: "CA",
          property_types: {
            SFR: { name: "Single Family Residential", table_id: "90210001" },
          },
          primary_table_id: 90210001,
        },
        "89101": {
          zip_code: "89101",
          state_code: "NV",
          property_types: {
            SFR: { name: "Single Family Residential", table_id: "89101001" },
          },
          primary_table_id: 89101001,
        },
        "02101": {
          zip_code: "02101",
          state_code: "MA",
          property_types: {
            SFR: { name: "Single Family Residential", table_id: "02101001" },
          },
          primary_table_id: 2101001,
        },
      },
      search_terms: ["California", "Nevada", "Massachusetts", "Los Angeles", "Las Vegas", "Boston"],
      property_types: {
        SFR: "Single Family Residential",
        CON: "Condominiums",
        TH: "Townhomes",
      },
    }

    // Create mock zip master data
    this.zipMasterData = [
      {
        zipcode: "90210",
        state_code: "CA",
        state_name: "California",
        data_source: "mock",
        has_census_data: true,
        has_redfin_data: true,
        has_geometry: true,
        geojson_file: "/mock/90210.geojson",
        data_file: "/mock/90210_data.json",
        redfin_city: "Beverly Hills",
        census_city: "Beverly Hills",
        redfin_county_name: "Los Angeles County",
        INTPTLAT: 34.0901,
        INTPTLON: -118.4065,
        ALAND: 14000000,
        AWATER: 0,
      },
      {
        zipcode: "89101",
        state_code: "NV",
        state_name: "Nevada",
        data_source: "mock",
        has_census_data: true,
        has_redfin_data: true,
        has_geometry: true,
        geojson_file: "/mock/89101.geojson",
        data_file: "/mock/89101_data.json",
        redfin_city: "Las Vegas",
        census_city: "Las Vegas",
        redfin_county_name: "Clark County",
        INTPTLAT: 36.1699,
        INTPTLON: -115.1398,
        ALAND: 25000000,
        AWATER: 0,
      },
      {
        zipcode: "02101",
        state_code: "MA",
        state_name: "Massachusetts",
        data_source: "mock",
        has_census_data: true,
        has_redfin_data: true,
        has_geometry: true,
        geojson_file: "/mock/02101.geojson",
        data_file: "/mock/02101_data.json",
        redfin_city: "Boston",
        census_city: "Boston",
        redfin_county_name: "Suffolk County",
        INTPTLAT: 42.3601,
        INTPTLON: -71.0589,
        ALAND: 5000000,
        AWATER: 1000000,
      },
    ]

    // Build unified lookup with mock data
    this.buildUnifiedLookup()
  }

  // Build the unified lookup that combines both data sources
  private buildUnifiedLookup(): void {
    if (!this.redfInIndex) return

    console.log("🔄 Building unified location lookup...")

    // Create zip lookup from zip_master_index
    const zipLookup = new Map<string, ZipMasterRecord>()
    this.zipMasterData.forEach((record) => {
      zipLookup.set(record.zipcode, record)
    })

    // Process states
    Object.entries(this.redfInIndex.states).forEach(([stateName, stateInfo]) => {
      const stateKey = `state:${stateInfo.state_code}`

      // Find representative zip for state coordinates (use first available)
      const stateZips = this.zipMasterData.filter((z) => z.state_code === stateInfo.state_code)
      const repZip = stateZips[0]

      const unifiedState: UnifiedLocation = {
        stateCode: stateInfo.state_code,
        stateName: stateName,
        propertyTypes: stateInfo.property_types,
        primaryTableId: stateInfo.primary_table_id,
        hierarchicalPath: stateName,
        coordinates: repZip ? [repZip.INTPTLAT, repZip.INTPTLON] : [0, 0],
        hasData: {
          census: stateZips.some((z) => z.has_census_data),
          redfin: stateZips.some((z) => z.has_redfin_data),
          geometry: stateZips.some((z) => z.has_geometry),
        },
        childZips: stateZips.map((z) => z.zipcode),
      }

      this.unifiedLookup.set(stateKey, unifiedState)
    })

    // Process counties
    Object.entries(this.redfInIndex.counties).forEach(([countyKey, countyInfo]) => {
      const unifiedCountyKey = `county:${countyKey}`

      // Find zips in this county (approximate by state and county name matching)
      const countyZips = this.zipMasterData.filter(
        (z) =>
          z.state_code === countyInfo.state_code &&
          z.redfin_county_name &&
          z.redfin_county_name.toLowerCase().includes(countyInfo.county_name.toLowerCase().split(",")[0]),
      )

      const repZip = countyZips[0]
      const stateName = this.getStateName(countyInfo.state_code)

      const unifiedCounty: UnifiedLocation = {
        stateCode: countyInfo.state_code,
        stateName: stateName,
        propertyTypes: countyInfo.property_types,
        primaryTableId: countyInfo.primary_table_id,
        hierarchicalPath: `${stateName} > ${countyInfo.county_name}`,
        coordinates: repZip ? [repZip.INTPTLAT, repZip.INTPTLON] : [0, 0],
        hasData: {
          census: countyZips.some((z) => z.has_census_data),
          redfin: countyZips.some((z) => z.has_redfin_data),
          geometry: countyZips.some((z) => z.has_geometry),
        },
        parentState: stateName,
        childCities: countyInfo.cities,
        childZips: countyZips.map((z) => z.zipcode),
      }

      this.unifiedLookup.set(unifiedCountyKey, unifiedCounty)
    })

    // Process cities
    Object.entries(this.redfInIndex.cities).forEach(([cityKey, cityInfo]) => {
      const unifiedCityKey = `city:${cityKey}`

      // Find zips in this city
      const cityZips = this.zipMasterData.filter(
        (z) =>
          z.state_code === cityInfo.state_code &&
          (z.redfin_city?.toLowerCase().includes(cityInfo.city_name.toLowerCase().split(",")[0]) ||
            z.census_city?.toLowerCase().includes(cityInfo.city_name.toLowerCase().split(",")[0])),
      )

      const repZip = cityZips[0]
      const stateName = this.getStateName(cityInfo.state_code)

      const unifiedCity: UnifiedLocation = {
        stateCode: cityInfo.state_code,
        stateName: stateName,
        propertyTypes: cityInfo.property_types,
        primaryTableId: cityInfo.primary_table_id,
        hierarchicalPath: `${stateName} > ${cityInfo.city_name}`,
        coordinates: repZip ? [repZip.INTPTLAT, repZip.INTPTLON] : [0, 0],
        hasData: {
          census: cityZips.some((z) => z.has_census_data),
          redfin: cityZips.some((z) => z.has_redfin_data),
          geometry: cityZips.some((z) => z.has_geometry),
        },
        parentState: stateName,
        childZips: cityZips.map((z) => z.zipcode),
      }

      this.unifiedLookup.set(unifiedCityKey, unifiedCity)
    })

    // Process ZIP codes (most detailed level)
    Object.entries(this.redfInIndex.zip_codes).forEach(([zipCode, zipInfo]) => {
      const zipMasterRecord = zipLookup.get(zipCode)
      const unifiedZipKey = `zip:${zipCode}`
      const stateName = this.getStateName(zipInfo.state_code)

      const unifiedZip: UnifiedLocation = {
        zipCode: zipCode,
        stateCode: zipInfo.state_code,
        stateName: stateName,
        propertyTypes: zipInfo.property_types,
        primaryTableId: zipInfo.primary_table_id,
        hierarchicalPath: `${stateName} > ${zipCode}`,
        coordinates: zipMasterRecord ? [zipMasterRecord.INTPTLAT, zipMasterRecord.INTPTLON] : [0, 0],
        geoJsonFile: zipMasterRecord?.geojson_file,
        dataFile: zipMasterRecord?.data_file,
        hasData: {
          census: zipMasterRecord?.has_census_data || false,
          redfin: zipMasterRecord?.has_redfin_data || false,
          geometry: zipMasterRecord?.has_geometry || false,
        },
        landArea: zipMasterRecord?.ALAND,
        waterArea: zipMasterRecord?.AWATER,
        metroRegion: zipMasterRecord?.parent_metro_region,
        dataSource: zipMasterRecord?.data_source,
        parentState: stateName,
        parentCounty: zipMasterRecord?.redfin_county_name,
      }

      this.unifiedLookup.set(unifiedZipKey, unifiedZip)
    })

    console.log(`✅ Built unified lookup with ${this.unifiedLookup.size} locations`)
  }

  // Helper method to get state name from code
  private getStateName(stateCode: string): string {
    if (!this.redfInIndex) return stateCode

    for (const [stateName, stateInfo] of Object.entries(this.redfInIndex.states)) {
      if (stateInfo.state_code === stateCode) {
        return stateName
      }
    }
    return stateCode
  }

  // Public API methods

  // Get all states for navigation
  getStates(): UnifiedLocation[] {
    this.ensureLoaded()
    return Array.from(this.unifiedLookup.values())
      .filter((loc) => loc.hierarchicalPath.split(" > ").length === 1)
      .sort((a, b) => a.stateName.localeCompare(b.stateName))
  }

  // Get counties in a state
  getCountiesInState(stateCode: string): UnifiedLocation[] {
    this.ensureLoaded()
    return Array.from(this.unifiedLookup.values())
      .filter(
        (loc) =>
          loc.stateCode === stateCode &&
          loc.hierarchicalPath.split(" > ").length === 2 &&
          loc.hierarchicalPath.includes("County"),
      )
      .sort((a, b) => a.hierarchicalPath.localeCompare(b.hierarchicalPath))
  }

  // Get cities in a state
  getCitiesInState(stateCode: string): UnifiedLocation[] {
    this.ensureLoaded()
    return Array.from(this.unifiedLookup.values())
      .filter(
        (loc) =>
          loc.stateCode === stateCode &&
          loc.hierarchicalPath.split(" > ").length === 2 &&
          !loc.hierarchicalPath.includes("County"),
      )
      .sort((a, b) => a.hierarchicalPath.localeCompare(b.hierarchicalPath))
  }

  // Get ZIP codes in a state
  getZipsInState(stateCode: string): UnifiedLocation[] {
    this.ensureLoaded()
    return Array.from(this.unifiedLookup.values())
      .filter((loc) => loc.stateCode === stateCode && loc.zipCode)
      .sort((a, b) => (a.zipCode || "").localeCompare(b.zipCode || ""))
  }

  // Find location by ZIP code
  findByZip(zipCode: string): UnifiedLocation | null {
    this.ensureLoaded()
    return this.unifiedLookup.get(`zip:${zipCode}`) || null
  }

  // Find location by coordinates (approximate)
  findByCoordinates(lat: number, lon: number, tolerance = 0.1): UnifiedLocation[] {
    this.ensureLoaded()
    return Array.from(this.unifiedLookup.values())
      .filter((loc) => {
        const [locLat, locLon] = loc.coordinates
        return Math.abs(locLat - lat) <= tolerance && Math.abs(locLon - lon) <= tolerance
      })
      .sort((a, b) => {
        const distA = Math.sqrt(Math.pow(a.coordinates[0] - lat, 2) + Math.pow(a.coordinates[1] - lon, 2))
        const distB = Math.sqrt(Math.pow(b.coordinates[0] - lat, 2) + Math.pow(b.coordinates[1] - lon, 2))
        return distA - distB
      })
  }

  // Search locations by name
  searchLocations(query: string): UnifiedLocation[] {
    this.ensureLoaded()
    const lowerQuery = query.toLowerCase()

    return Array.from(this.unifiedLookup.values())
      .filter((loc) => loc.hierarchicalPath.toLowerCase().includes(lowerQuery) || loc.zipCode?.includes(query))
      .sort((a, b) => a.hierarchicalPath.localeCompare(b.hierarchicalPath))
      .slice(0, 50) // Limit results
  }

  // Get all available property types
  getAvailablePropertyTypes(): Record<string, string> {
    if (!this.isLoaded) {
      return {} // Return empty object instead of throwing error
    }
    return this.redfInIndex?.property_types || {}
  }

  // Get data loading info for a location
  getDataLoadingInfo(location: UnifiedLocation): {
    geoJsonUrl?: string
    dataUrl?: string
    tableId: number
    hasRequiredData: boolean
  } {
    return {
      geoJsonUrl: location.geoJsonFile,
      dataUrl: location.dataFile,
      tableId: location.primaryTableId,
      hasRequiredData: location.hasData.geometry && (location.hasData.census || location.hasData.redfin),
    }
  }

  // Utility method to ensure data is loaded
  private ensureLoaded(): void {
    if (!this.isLoaded) {
      throw new Error("UnifiedDataService not initialized. Call initialize() first.")
    }
  }

  // Get loading status
  isDataLoaded(): boolean {
    return this.isLoaded
  }

  // Get statistics
  getStats(): {
    totalLocations: number
    byType: Record<string, number>
    byState: Record<string, number>
    dataAvailability: {
      withGeometry: number
      withCensus: number
      withRedfin: number
    }
  } {
    this.ensureLoaded()

    const locations = Array.from(this.unifiedLookup.values())
    const byType: Record<string, number> = {}
    const byState: Record<string, number> = {}
    let withGeometry = 0
    let withCensus = 0
    let withRedfin = 0

    locations.forEach((loc) => {
      // Count by type
      const parts = loc.hierarchicalPath.split(" > ")
      const type =
        parts.length === 1
          ? "state"
          : parts.length === 2 && loc.zipCode
            ? "zip"
            : parts.length === 2 && parts[1].includes("County")
              ? "county"
              : "city"
      byType[type] = (byType[type] || 0) + 1

      // Count by state
      byState[loc.stateCode] = (byState[loc.stateCode] || 0) + 1

      // Count data availability
      if (loc.hasData.geometry) withGeometry++
      if (loc.hasData.census) withCensus++
      if (loc.hasData.redfin) withRedfin++
    })

    return {
      totalLocations: locations.length,
      byType,
      byState,
      dataAvailability: {
        withGeometry,
        withCensus,
        withRedfin,
      },
    }
  }
}

// Export singleton instance
export const unifiedDataService = new UnifiedDataService()
export type { UnifiedLocation }
