// ============================================================================
// DATA COLUMN SELECTIONS - TRACT OPTIMIZED VERSION
// ============================================================================
// Enhanced version with full tract support
// Based on original data_column_selections.ts + tract-data-mapping.ts

// ============================================================================
// GEOGRAPHIC IDENTIFIERS - Used across all levels
// ============================================================================
export const GEOGRAPHIC_SELECTIONS = {
  state: ["state_name", "state_code", "state_fips"],
  county: ["GEOID", "NAME", "FIPS", "state", "county"],
  zip: ["ZIPCODE", "GEOID", "preferred_city", "state", "county", "zip"],
  tract: ["GEOID", "tract", "county", "county_name", "zip", "preferred_city"] // NEW: tract geographic fields
}

// ============================================================================
// CENSUS MAP SELECTIONS - Essential demographic & housing data
// ============================================================================
export const CENSUS_MAP_SELECTIONS = [
  // Core demographics
  "population_total",
  
  // Housing essentials
  "housing_median_value",
  "housing_ownership_rate", 
  "housing_occupancy_rate",
  
  // Rental market
  "rental_median_rent",
  
  // Economic indicators
  "employment_unemployment_rate",
  "employment_labor_force_participation",
  "poverty_rate",
  
  // Income data
  "income_median"
]

// ============================================================================
// TRACT MAP SELECTIONS - Tract-specific essential columns
// ============================================================================
export const TRACT_MAP_SELECTIONS = [
  // Demographics
  "demographic_profile",
  "population_description", 
  "predominant_race",
  "predominant_race_pct",
  
  // Housing
  "housing_occupancy_rate",
  "vacancy_description",
  "primary_building_type",
  "home_value_description",
  
  // Economic
  "income_level",
  "unemployment_summary", 
  "poverty_summary",
  "affordability",
  "employment_sector_summary",
  
  // Real Estate
  "rent_level",
  "rental_2br",
  "rental_3br",
  
  // Education
  "education_level"
]

// ============================================================================
// REDFIN MAP SELECTIONS - Essential real estate market data
// ============================================================================
export const REDFIN_MAP_SELECTIONS = [
  // Pricing essentials
  "median_sale_price",
  "median_list_price", 
  "median_ppsf",
  
  // Sales activity
  "homes_sold",
  "pending_sales",
  
  // Inventory & market
  "inventory",
  "new_listings",
  "median_dom",
  
  // Market dynamics
  "avg_sale_to_list",
  "months_of_supply"
]

// ============================================================================
// FRED MAP SELECTIONS - Essential economic indicators
// ============================================================================
export const FRED_MAP_SELECTIONS = [
  // Economic health
  "gdp",
  "per_capita_personal_income",
  "people_poverty",
  
  // Employment 
  "labor_participation",
  "ump", // unemployment rate
  
  // Real estate economics
  "house_price_index",
  "homeownership_rate",
  
  // Development
  "bld_perm_units",
  
  // Composite scores
  "affordability_index"
]

// ============================================================================
// COMBINED SELECTIONS BY GEOGRAPHIC LEVEL - ENHANCED WITH TRACT
// ============================================================================
export const MAP_ESSENTIAL_COLUMNS = {
  state: [
    ...GEOGRAPHIC_SELECTIONS.state,
    ...FRED_MAP_SELECTIONS // State-level primarily uses FRED data
  ],
  
  county: [
    ...GEOGRAPHIC_SELECTIONS.county,
    ...CENSUS_MAP_SELECTIONS,
    ...REDFIN_MAP_SELECTIONS.slice(0, 6) // Top 6 Redfin metrics only
  ],
  
  zip: [
    ...GEOGRAPHIC_SELECTIONS.zip,
    ...CENSUS_MAP_SELECTIONS,
    ...REDFIN_MAP_SELECTIONS.slice(0, 8) // More Redfin metrics for ZIP level
  ],
  
  // NEW: Tract level uses ALL columns (lean files are pre-optimized)
  tract: "ALL_COLUMNS" // Special case - indicates no filtering needed
}

// ============================================================================
// DATA SOURCE MAPPING - Which selections come from which files
// ============================================================================
export const DATA_SOURCE_MAPPING = {
  census: CENSUS_MAP_SELECTIONS,
  redfin: REDFIN_MAP_SELECTIONS,
  fred: FRED_MAP_SELECTIONS,
  tract: TRACT_MAP_SELECTIONS // NEW: tract-specific selections
}

// ============================================================================
// METRIC CATEGORIES - Enhanced with tract categories
// ============================================================================
export const METRIC_CATEGORIES = {
  demographics: {
    label: "Demographics",
    icon: "👥",
    columns: ["population_total", "poverty_rate", "income_median", "demographic_profile", "predominant_race"]
  },
  
  housing: {
    label: "Housing",
    icon: "🏠", 
    columns: ["housing_median_value", "housing_ownership_rate", "rental_median_rent", "primary_building_type", "vacancy_description"]
  },
  
  employment: {
    label: "Employment",
    icon: "💼",
    columns: ["employment_unemployment_rate", "employment_labor_force_participation", "unemployment_summary"]
  },
  
  real_estate: {
    label: "Real Estate Market",
    icon: "🏡",
    columns: ["median_sale_price", "homes_sold", "inventory", "median_dom", "home_value_description", "rent_level"]
  },
  
  economic: {
    label: "Economic Indicators", 
    icon: "📊",
    columns: ["gdp", "per_capita_personal_income", "house_price_index", "income_level", "affordability"]
  },
  
  education: {
    label: "Education",
    icon: "🎓",
    columns: ["education_level"]
  }
}

// ============================================================================
// UTILITY FUNCTIONS - Enhanced for tract support
// ============================================================================

/**
 * Get essential columns for a specific geographic level
 */
export function getEssentialColumns(level: 'state' | 'county' | 'zip' | 'tract'): string[] {
  // Special handling for tract - lean files are already optimized
  if (level === 'tract') {
    return [] // Empty array means "keep all columns"
  }
  
  return MAP_ESSENTIAL_COLUMNS[level] || []
}

/**
 * Get columns for a specific data source
 */
export function getColumnsForDataSource(source: 'census' | 'redfin' | 'fred' | 'tract'): string[] {
  return DATA_SOURCE_MAPPING[source] || []
}

/**
 * Check if a column exists in our selections
 */
export function isEssentialColumn(columnName: string, level: 'state' | 'county' | 'zip' | 'tract'): boolean {
  // Tract level keeps all columns
  if (level === 'tract') return true
  
  const essentials = getEssentialColumns(level)
  return essentials.includes(columnName)
}

/**
 * Get column count by data source for a level
 */
export function getColumnStats(level: 'state' | 'county' | 'zip' | 'tract') {
  // Special handling for tract
  if (level === 'tract') {
    return {
      total: 'ALL',
      geographic: GEOGRAPHIC_SELECTIONS.tract?.length || 0,
      tract: TRACT_MAP_SELECTIONS.length,
      census: 0,
      redfin: 0,
      fred: 0
    }
  }
  
  const essentials = getEssentialColumns(level)
  const geographic = GEOGRAPHIC_SELECTIONS[level]?.length || 0
  
  return {
    total: essentials.length,
    geographic: geographic,
    census: essentials.filter(col => CENSUS_MAP_SELECTIONS.includes(col)).length,
    redfin: essentials.filter(col => REDFIN_MAP_SELECTIONS.includes(col)).length,
    fred: essentials.filter(col => FRED_MAP_SELECTIONS.includes(col)).length
  }
}

// ============================================================================
// DATABASE-SPECIFIC MATCHING FIELDS - Enhanced with tract
// ============================================================================
export function getDatabaseMatchingFields(level: 'state' | 'county' | 'zip' | 'tract', database: 'census' | 'redfin' | 'fred') {
  
  const patterns = {
    
    // ============================================================================
    // ZIP LEVEL MATCHING
    // ============================================================================
    zip: {
      census: {
        // GeoJSON → Census matching
        featureFields: ["ZIPCODE", "GEOID", "zip_code"],
        dataFields: ["zip", "zipcode", "ZIPCODE"]
      },
      
      redfin: {
        // GeoJSON → Redfin matching  
        featureFields: [
          "redfin_tableid_zip",       // Direct Redfin ZIP table ID
          "redfin_table_id_county",
        ],
        dataFields: ["table_id"]
      },
      
      fred: {
        // FRED doesn't have ZIP-level data usually
        featureFields: ["state_county_code","STATE_FIPS", "state_code"],
        dataFields: ["state_fips", "state_code"]
      }
    },

    // ============================================================================
    // COUNTY LEVEL MATCHING  
    // ============================================================================
    county: {
      census: {
        // County GEOID (like "01001") → Census state + county
        featureFields: ["GEOID", "COUNTYFP", "NAMELSAD"],
        dataFields: ["county", "county_name"]
      },
      
      redfin: {
        // County table IDs
        featureFields: ["redfin_table_id_county", "table_id", "region"],
        dataFields: ["table_id", "region"]
      },
      
      fred: {
        // FRED uses county FIPS codes
        featureFields: ["fred_county_fips","GEOID", "NAMELSAD"],
        dataFields: ["county_fips", "fips_code", "county_name"]
      }
    },

    // ============================================================================
    // STATE LEVEL MATCHING
    // ============================================================================
    state: {
      census: {
        featureFields: ["STUSPS", "STATE", "NAME"],
        dataFields: ["state", "state_name", "state_fips"]
      },
      
      redfin: {
        featureFields: ["state_code", "STATE"],
        dataFields: ["state_code", "state"]
      },
      
      fred: {
        featureFields: ["STATE_FIPS", "STUSPS"],
        dataFields: ["state_fips", "state_code"]
      }
    },
    
    // ============================================================================
    // TRACT LEVEL MATCHING - NEW!
    // ============================================================================
    tract: {
      census: {
        // GeoJSON → Census matching for tract
        featureFields: ["geoid_tract_20_clean", "GEOID", "tract_str", "TRACTCE"],
        dataFields: ["GEOID", "tract"]
      },
      
      redfin: {
        // For tract, Redfin data comes from county or ZIP files
        featureFields: [
          "redfin_table_id_county",
          "redfin_tableid_zip",
        ],
        dataFields: ["table_id"]
      },
      
      fred: {
        // FRED is county-level, so use county identifiers
        featureFields: ["county_code_str", "STATE_FIPS", "state_code_str"],
        dataFields: ["county_fips", "state_fips"]
      }
    }
  }

  return patterns[level]?.[database] || { featureFields: [], dataFields: [] }
}

// ============================================================================
// ENHANCED MATCHING FUNCTION - Now supports tract
// ============================================================================
export function matchFeatureToData(
  feature: any, 
  dataRecords: any[], 
  level: 'state' | 'county' | 'zip' | 'tract',
  database: 'census' | 'redfin' | 'fred'
): any | null {
  
  const matchingRules = getDatabaseMatchingFields(level, database)
  const props = feature.properties
  
  // Get all possible IDs from this feature for this database
  const featureIds = matchingRules.featureFields
    .map(field => props[field])
    .filter(id => id !== undefined && id !== null && id !== '')
    .map(id => id.toString().trim())

  if (featureIds.length === 0) {
    return null
  }

  // Try to find matching record in data
  const match = dataRecords.find(row => {
    return featureIds.some(featureId => {
      return matchingRules.dataFields.some(dataField => {
        const dataValue = row[dataField]
        if (dataValue !== undefined && dataValue !== null) {
          
          // Special handling for county GEOID construction
          if (level === 'county' && database === 'census' && dataField === 'county') {
            // Build full GEOID from state + county (e.g., "01" + "001" = "01001")
            const fullGeoId = row.state + dataValue.toString().padStart(3, '0')
            return fullGeoId === featureId
          }
          
          // NEW: Special handling for tract GEOID matching
          if (level === 'tract' && database === 'census') {
            // Direct GEOID matching for tracts
            return dataValue.toString().trim() === featureId
          }
          
          // Standard string matching
          return dataValue.toString().trim() === featureId
        }
        return false
      })
    })
  })

  return match || null
}

// ============================================================================
// TRACT-SPECIFIC UTILITY FUNCTIONS - Moved from tract-data-mapping.ts
// ============================================================================

/**
 * Extract tract feature ID from GeoJSON properties
 */
export function extractTractFeatureId(feature: any): string | null {
  if (!feature?.properties) return null

  // Try different possible GEOID fields
  const possibleFields = ["geoid_tract_20_clean", "GEOID", "geoid", "TRACTCE", "tract_id"]

  for (const field of possibleFields) {
    const value = feature.properties[field]
    if (value !== undefined && value !== null && value !== "") {
      return value.toString().trim()
    }
  }

  // If no direct GEOID, try to construct from state+county+tract
  if (feature.properties.state && feature.properties.county && feature.properties.tract) {
    const state = feature.properties.state.toString().padStart(2, "0")
    const county = feature.properties.county.toString().padStart(3, "0")
    const tract = feature.properties.tract.toString().padStart(6, "0")
    return `${state}${county}${tract}`
  }

  return null
}

/**
 * Match tract feature to data using enhanced logic
 */
export function matchTractFeatureToData(feature: any, dataRows: any[]): any | null {
  if (!feature || !dataRows || dataRows.length === 0) return null

  const featureId = extractTractFeatureId(feature)
  if (!featureId) return null

  // Try to match on GEOID first
  const matchingRow = dataRows.find((row) => {
    return row.GEOID === featureId
  })

  if (matchingRow) return matchingRow

  // If no match on GEOID, try other combinations
  return dataRows.find((row) => {
    // Try to match on state+county+tract
    if (
      row.state &&
      row.county &&
      row.tract &&
      feature.properties.state &&
      feature.properties.county &&
      feature.properties.tract
    ) {
      return (
        row.state.toString() === feature.properties.state.toString() &&
        row.county.toString() === feature.properties.county.toString() &&
        row.tract.toString() === feature.properties.tract.toString()
      )
    }
    return false
  })
}

// ============================================================================
// DEBUG FUNCTION - Show what fields are being tried
// ============================================================================
export function debugMatching(
  feature: any,
  level: 'state' | 'county' | 'zip' | 'tract', 
  database: 'census' | 'redfin' | 'fred'
) {
  const matchingRules = getDatabaseMatchingFields(level, database)
  const props = feature.properties
  
  console.log(`🔍 DEBUG: ${level} → ${database} matching`)
  console.log(`Available GeoJSON fields:`, Object.keys(props).slice(0, 20))
  console.log(`Trying feature fields:`, matchingRules.featureFields)
  console.log(`Against data fields:`, matchingRules.dataFields)
  
  const featureIds = matchingRules.featureFields
    .map(field => `${field}=${props[field]}`)
    .filter(str => !str.includes('undefined'))
  
  console.log(`Found feature values:`, featureIds)
}

/**
 * Helper function to normalize county IDs for matching
 * Handles the different formats: "001" vs "6001" vs "06001"
 */
export function normalizeCountyId(id: string | number, addStatePrefix?: string): string[] {
  if (!id) return []
  
  const idStr = id.toString().trim()
  const variations = [idStr]
  
  // If it's a 3-digit county code like "001", create 5-digit version
  if (idStr.length === 3 && addStatePrefix) {
    variations.push(addStatePrefix + idStr)
  }
  
  // If it's a 4-digit code like "6001", create 5-digit version  
  if (idStr.length === 4) {
    variations.push("0" + idStr)
  }
  
  // If it's a 5-digit code like "06001", create 4-digit version
  if (idStr.length === 5) {
    variations.push(idStr.substring(1)) // Remove leading zero
  }
  
  return [...new Set(variations)] // Remove duplicates
}