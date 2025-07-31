import { getEssentialColumns, getDatabaseMatchingFields, normalizeCountyId } from '@/lib/data_column_selections_tract_opt'
import { loadStateIndexes, getRedfinId, checkStateCoverage } from '@/lib/improved_index_manager_nor_opt'

const BASE_URL = "https://pub-349a836622034df3a45c179d98e8328a.r2.dev"

// ============================================================================
// OPTIMIZED STATE INFO - All 50 states
// ============================================================================
const STATES = {
  AL: { name: "Alabama", fredCode: "01" },
  AK: { name: "Alaska", fredCode: "02" },
  AZ: { name: "Arizona", fredCode: "04" },
  AR: { name: "Arkansas", fredCode: "05" },
  CA: { name: "California", fredCode: "06" },
  CO: { name: "Colorado", fredCode: "08" },
  CT: { name: "Connecticut", fredCode: "09" },
  DE: { name: "Delaware", fredCode: "10" },
  FL: { name: "Florida", fredCode: "12" },
  GA: { name: "Georgia", fredCode: "13" },
  HI: { name: "Hawaii", fredCode: "15" },
  ID: { name: "Idaho", fredCode: "16" },
  IL: { name: "Illinois", fredCode: "17" },
  IN: { name: "Indiana", fredCode: "18" },
  IA: { name: "Iowa", fredCode: "19" },
  KS: { name: "Kansas", fredCode: "20" },
  KY: { name: "Kentucky", fredCode: "21" },
  LA: { name: "Louisiana", fredCode: "22" },
  ME: { name: "Maine", fredCode: "23" },
  MD: { name: "Maryland", fredCode: "24" },
  MA: { name: "Massachusetts", fredCode: "25" },
  MI: { name: "Michigan", fredCode: "26" },
  MN: { name: "Minnesota", fredCode: "27" },
  MS: { name: "Mississippi", fredCode: "28" },
  MO: { name: "Missouri", fredCode: "29" },
  MT: { name: "Montana", fredCode: "30" },
  NE: { name: "Nebraska", fredCode: "31" },
  NV: { name: "Nevada", fredCode: "32" },
  NH: { name: "New Hampshire", fredCode: "33" },
  NJ: { name: "New Jersey", fredCode: "34" },
  NM: { name: "New Mexico", fredCode: "35" },
  NY: { name: "New York", fredCode: "36" },
  NC: { name: "North Carolina", fredCode: "37" },
  ND: { name: "North Dakota", fredCode: "38" },
  OH: { name: "Ohio", fredCode: "39" },
  OK: { name: "Oklahoma", fredCode: "40" },
  OR: { name: "Oregon", fredCode: "41" },
  PA: { name: "Pennsylvania", fredCode: "42" },
  RI: { name: "Rhode Island", fredCode: "44" },
  SC: { name: "South Carolina", fredCode: "45" },
  SD: { name: "South Dakota", fredCode: "46" },
  TN: { name: "Tennessee", fredCode: "47" },
  TX: { name: "Texas", fredCode: "48" },
  UT: { name: "Utah", fredCode: "49" },
  VT: { name: "Vermont", fredCode: "50" },
  VA: { name: "Virginia", fredCode: "51" },
  WA: { name: "Washington", fredCode: "53" },
  WV: { name: "West Virginia", fredCode: "54" },
  WI: { name: "Wisconsin", fredCode: "55" },
  WY: { name: "Wyoming", fredCode: "56" },
}

interface OptimizedLoadResult {
  geoJson: any
  censusData: any
  fredData: any
  redfinData: any
  loadingStatus: {
    geoJson: "loading" | "success" | "failed" | "not-attempted"
    censusData: "loading" | "success" | "failed" | "not-attempted"
    fredData: "loading" | "success" | "failed" | "not-attempted" 
    redfinData: "loading" | "success" | "failed" | "not-attempted"
  }
  matchingStats: {
    totalFeatures: number
    matchedFeatures: number
    unmatchedFeatures: number
    matchRate: number
  }
  dataSource: string
  loadTime?: number
  essentialColumnsUsed: string[]
  indexStats?: {
    indexLoadTime: number
    redfinIdsFound: number
    dataReduction: string
  }
}

// ============================================================================
// FILTER DATA TO ESSENTIAL COLUMNS ONLY - ENHANCED FOR TRACT
// ============================================================================
function filterToEssentialColumns(data: any[], level: string): any[] {
  // Special case: tract files are already lean, no filtering needed
  if (level === 'tract') {
    console.log(`📊 TRACT: Keeping all ${Object.keys(data[0] || {}).length} columns (lean files pre-optimized)`)
    return data
  }
  
  const essentialCols = getEssentialColumns(level as 'state' | 'county' | 'zip' | 'tract')
  
  return data.map(row => {
    const filtered: any = {}
    essentialCols.forEach(col => {
      if (row.hasOwnProperty(col)) {
        filtered[col] = row[col]
      }
    })
    return filtered
  })
}

// ============================================================================
// BUILD OPTIMIZED URLS - ENHANCED WITH TRACT SUPPORT
// ============================================================================
function buildOptimizedUrls(stateAbbrev: string, level: string, selectedViewMode?: string) {
  const state = STATES[stateAbbrev as keyof typeof STATES]
  if (!state) throw new Error(`Unsupported state: ${stateAbbrev}`)

  console.log(`🔗 Building URLs for: ${stateAbbrev} (${state.name}) at ${level} level`)

  // TRACT LEVEL - Special handling
  if (level === "tract") {
    if (!selectedViewMode) {
      throw new Error("selectedViewMode required for tract level")
    }
    
    const urls = {
      geoJson: `${BASE_URL}/geojson/${stateAbbrev}/tract.geojson`,
      census: `${BASE_URL}/census/${stateAbbrev}/tract/Cen_${state.name}_tract_${selectedViewMode}_2023_lean.json`,
      fred: `${BASE_URL}/fred/${stateAbbrev}/fred_counties_${state.fredCode}.json`,
      redfin: selectedViewMode === "county" 
        ? `${BASE_URL}/redfin/${stateAbbrev}/redfin_${stateAbbrev}_county.json`
        : `${BASE_URL}/redfin/${stateAbbrev}/redfin_${stateAbbrev}_zip.json`
    }
    console.log(`🏗️ TRACT URLs:`, urls)
    return urls
  }

  // STATE LEVEL
  if (level === "state") {
    const urls = {
      geoJson: `${BASE_URL}/geojson/${stateAbbrev}/state.geojson`,
      census: `${BASE_URL}/census/${stateAbbrev}/Cen_${state.name}_state_2023_summary.json`,
      fred: `${BASE_URL}/fred/${stateAbbrev}/fred_counties_${state.fredCode}.json`,
      redfin: `${BASE_URL}/redfin/${stateAbbrev}/redfin_${stateAbbrev}_county.json`
    }
    return urls
  }

  // REGULAR LEVELS (county, zip)
  const urls = {
    geoJson: `${BASE_URL}/geojson/${stateAbbrev}/${level}.geojson`,
    census: `${BASE_URL}/census/${stateAbbrev}/Cen_${state.name}_${level}_2023_summary.json`,
    fred: `${BASE_URL}/fred/${stateAbbrev}/fred_counties_${state.fredCode}.json`,
    redfin: `${BASE_URL}/redfin/${stateAbbrev}/redfin_${stateAbbrev}_${level}.json`
  }

  return urls
}

// ============================================================================
// PERFORMANCE OPTIMIZATION FUNCTIONS
// ============================================================================
function filterRedfinByPropertyType(rawRedfinData: any[]): any[] {
  if (!Array.isArray(rawRedfinData)) return rawRedfinData
  
  console.log(`🏠 BEFORE property filtering: ${rawRedfinData.length} records`)

  // 🔍 DEBUG: Show actual property_type values
  const actualTypes = [...new Set(rawRedfinData.map(r => r.property_type))].slice(0, 10)
  console.log(`🔍 ACTUAL property_type values found:`, actualTypes)
  
  const essentialTypeIds = ["-1", "6", "13"]  // ← Changed: use IDs
  
  const filtered = rawRedfinData.filter(record => {
    const propTypeId = record.property_type_id?.toString()  // ← Changed: use property_type_id
    return essentialTypeIds.includes(propTypeId)
  })
  
  const reduction = ((1 - filtered.length / rawRedfinData.length) * 100).toFixed(1)
  console.log(`🏠 AFTER property filtering: ${filtered.length} records (${reduction}% reduction)`)
  
  return filtered
}

function filterRedfinToEssentials(redfinData: any[]): any[] {
  if (!Array.isArray(redfinData)) return redfinData
  
  const essentialColumns = [
    'table_id',           // For matching
    'region',             // For display  
    'median_sale_price',  // Current
    'median_list_price',  // Add this
    'median_ppsf',        // Add this
    'inventory',          // Current
    'homes_sold',         // Current
    'pending_sales',      // Add this
    'median_dom'          // Current
]
  
  console.log(`📊 Filtering to ${essentialColumns.length} essential Redfin columns`)
  
  return redfinData.map(record => {
    const filtered: any = {}
    essentialColumns.forEach(col => {
      if (record.hasOwnProperty(col)) {
        filtered[col] = record[col]
      }
    })
    return filtered
  })
}

// ============================================================================
// INDEX-DRIVEN REDFIN FILTERING - FIXED NO REPEAT CALLS!
// ============================================================================
async function getRelevantRedfinIds(stateAbbrev: string, level: string, geoJsonFeatures: any[]): Promise<number[]> {
  console.log(`🎯 INDEX-DRIVEN FILTERING: Getting relevant Redfin IDs for ${level} level`)
  
  // LOAD STATE INDEXES ONCE - no repeated calls in loop!
  await loadStateIndexes(stateAbbrev)
  
  const relevantIds = new Set<number>()
  
  // Extract geographic identifiers from GeoJSON features
  for (const feature of geoJsonFeatures.slice(0, 50)) { // Limit to avoid too many lookups
    const props = feature.properties
    
    if (level === 'zip') {
      // Look for ZIP codes in GeoJSON properties
      const zipCode = props.ZIPCODE || props.zipcode || props.zip_code
      if (zipCode) {
        const redfinId = await getRedfinId(stateAbbrev, zipCode.toString(), 'zip')
        if (redfinId) {
          relevantIds.add(redfinId)
        }
      }
    } else if (level === 'county') {
      // Look for county identifiers in GeoJSON properties  
      const countyId = props.GEOID || props.COUNTYFP || props.county_fips
      if (countyId) {
        const redfinId = await getRedfinId(stateAbbrev, countyId.toString(), 'county')
        if (redfinId) {
          relevantIds.add(redfinId)
        }
      }
    }
  }
  
  const idArray = Array.from(relevantIds)
  console.log(`🎯 Found ${idArray.length} relevant Redfin IDs: [${idArray.slice(0, 5).join(', ')}${idArray.length > 5 ? '...' : ''}]`)
  
  return idArray
}

function filterRedfinByRelevantIds(redfinData: any[], relevantIds: number[]): any[] {
  if (!relevantIds.length) {
    console.log(`⚠️ No relevant IDs found, returning all data`)
    return redfinData
  }
  
  const originalCount = redfinData.length
  const filtered = redfinData.filter(record => 
    relevantIds.includes(parseInt(record.table_id))
  )
  
  const reduction = originalCount > 0 ? ((1 - filtered.length / originalCount) * 100).toFixed(1) : "0"
  console.log(`🎯 INDEX FILTERING: ${originalCount} → ${filtered.length} records (${reduction}% reduction)`)
  
  return filtered
}

// ============================================================================
// SMART STATE FILTERING
// ============================================================================
function smartStateFilter(data: any[], stateAbbrev: string, level: string): any[] {
  if (!Array.isArray(data) || data.length === 0) return data
  if (level === "state") return data
  
  const stateFips = STATES[stateAbbrev as keyof typeof STATES]?.fredCode
  
  console.log(`🔍 SMART STATE FILTERING: ${stateAbbrev} (FIPS: ${stateFips})`)
  console.log(`  Original data: ${data.length} records`)
  
  const strategies = [
    { name: 'state === stateFips', filter: (row: any) => row.state === stateFips },
    { name: 'state_code === stateAbbrev', filter: (row: any) => row.state_code === stateAbbrev },
    { name: 'state === stateAbbrev', filter: (row: any) => row.state === stateAbbrev },
    { name: 'state_fips === stateFips', filter: (row: any) => row.state_fips === stateFips }
  ]
  
  for (const {name, filter} of strategies) {
    const filtered = data.filter(filter)
    if (filtered.length > 0) {
      const reduction = ((1 - filtered.length / data.length) * 100).toFixed(1)
      console.log(`✅ State filter '${name}' worked: ${filtered.length}/${data.length} records (${reduction}% reduction)`)
      return filtered
    }
  }
  
  console.log(`⚠️ No state filtering worked, returning ALL data`)
  return data
}

// ============================================================================
// SMART DATA MATCHING - ENHANCED FOR TRACT
// ============================================================================
function matchDataSmart(features: any[], censusData: any[], level: string, stateAbbrev?: string): number {
  if (!features || !censusData) {
    console.log('❌ No features or census data to match')
    return 0
  }
  
  let matchedCount = 0
  const matchingFields = getDatabaseMatchingFields(level as 'state' | 'county' | 'zip' | 'tract', 'census')
  
  console.log(`🔍 Starting ${level} matching:`)
  console.log(`  Features: ${features.length}`)
  console.log(`  Census records: ${censusData.length}`)

  let relevantData = censusData
  if (stateAbbrev && level !== "state") {
    relevantData = smartStateFilter(censusData, stateAbbrev, level)
  }

  features.forEach((feature, index) => {
    const props = feature.properties
    
    const featureIds = matchingFields.featureFields
      .map(field => props[field])
      .filter(id => id !== undefined && id !== null && id !== '')
      .map(id => id.toString().trim())

    if (featureIds.length === 0) return

    const dataMatch = relevantData.find(row => {
      return featureIds.some(featureId => {
        return matchingFields.dataFields.some(dataField => {
          const dataValue = row[dataField]
          if (dataValue !== undefined && dataValue !== null) {
            if (level === 'county') {
              const stateFips = STATES[stateAbbrev as keyof typeof STATES]?.fredCode
              const featureVariations = normalizeCountyId(featureId, stateFips)
              const dataVariations = normalizeCountyId(dataValue, stateFips) 
              return featureVariations.some(fv => dataVariations.includes(fv))
            } else if (level === 'tract') {
              // NEW: Direct GEOID matching for tracts
              return dataValue.toString().trim() === featureId
            } else {
              return dataValue.toString().trim() === featureId
            }
          }
          return false
        })
      })
    })
    
    if (dataMatch) {
      matchedCount++
      feature.properties._optimized_data = filterToEssentialColumns([dataMatch], level)[0]
    }
  })

  const matchRate = features.length > 0 ? (matchedCount / features.length) * 100 : 0
  console.log(`📊 ${level.toUpperCase()} RESULT: ${matchedCount}/${features.length} matched (${matchRate.toFixed(1)}%)`)
  
  return matchedCount
}

// ============================================================================
// MAIN OPTIMIZED LOADER - TRACT ENHANCED VERSION
// ============================================================================
export async function loadDataWithCloudflare(
  stateAbbrev: string, 
  level: string, 
  viewMode: string = "county",
  selectedViewMode?: string
): Promise<OptimizedLoadResult> {
  const startTime = performance.now()
  console.log(`🚀 TRACT-OPTIMIZED loader: ${stateAbbrev} ${level}`)

  const result: OptimizedLoadResult = {
    geoJson: null,
    censusData: null,
    fredData: null,
    redfinData: null,
    loadingStatus: {
      geoJson: "not-attempted",
      censusData: "not-attempted", 
      fredData: "not-attempted",
      redfinData: "not-attempted"
    },
    matchingStats: {
      totalFeatures: 0,
      matchedFeatures: 0,
      unmatchedFeatures: 0,
      matchRate: 0
    },
    dataSource: "Cloudflare R2 (Tract-Optimized)",
    essentialColumnsUsed: getEssentialColumns(level as 'state' | 'county' | 'zip' | 'tract'),
    indexStats: {
      indexLoadTime: 0,
      redfinIdsFound: 0,
      dataReduction: "0%"
    }
  }

  try {
    // Build URLs
    const urls = buildOptimizedUrls(stateAbbrev, level, selectedViewMode)

    // Load GeoJSON first (needed for index-driven filtering)
    const indexStartTime = performance.now()
    try {
      result.loadingStatus.geoJson = "loading"
      const geoResponse = await fetch(urls.geoJson)
      if (geoResponse.ok) {
        result.geoJson = await geoResponse.json()
        result.loadingStatus.geoJson = "success"
        result.matchingStats.totalFeatures = result.geoJson?.features?.length || 0
        console.log(`✅ GeoJSON: ${result.matchingStats.totalFeatures} features`)
      } else {
        result.loadingStatus.geoJson = "failed"
        console.log(`❌ GeoJSON failed: ${geoResponse.status}`)
      }
    } catch (error) {
      result.loadingStatus.geoJson = "failed"
      console.error('❌ GeoJSON error:', error)
    }

    // Load Census Data
    try {
      result.loadingStatus.censusData = "loading"
      const censusResponse = await fetch(urls.census)
      if (censusResponse.ok) {
        const rawCensusData = await censusResponse.json()
        const censusArray = Array.isArray(rawCensusData) ? rawCensusData : [rawCensusData]
        result.censusData = filterToEssentialColumns(censusArray, level)
        result.loadingStatus.censusData = "success"
        console.log(`✅ Census data (${result.censusData.length} rows)`)
      } else {
        result.loadingStatus.censusData = "failed"
      }
    } catch (error) {
      result.loadingStatus.censusData = "failed"
      console.error('❌ Census error:', error)
    }

    // Load FRED Data
    try {
      result.loadingStatus.fredData = "loading"
      const fredResponse = await fetch(urls.fred)
      if (fredResponse.ok) {
        const rawFredData = await fredResponse.json()
        const fredArray = Array.isArray(rawFredData) ? rawFredData : [rawFredData]
        result.fredData = fredArray
        result.loadingStatus.fredData = "success"
        console.log(`✅ FRED data (${result.fredData.length} rows)`)
      } else {
        result.loadingStatus.fredData = "failed"
      }
    } catch (error) {
      result.loadingStatus.fredData = "failed"
      console.error('❌ FRED error:', error)
    }

    // Load Redfin Data with NO-REPEAT INDEX OPTIMIZATION
    try {
      result.loadingStatus.redfinData = "loading"
      const redfinResponse = await fetch(urls.redfin)
      if (redfinResponse.ok) {
        const rawRedfinData = await redfinResponse.json()
        const redfinArray = Array.isArray(rawRedfinData) ? rawRedfinData : [rawRedfinData]
        
        // 🚀 NO-REPEAT INDEX OPTIMIZATION PIPELINE
        let optimizedRedfin = redfinArray
        const originalCount = optimizedRedfin.length
        
        // Step 1: Get relevant Redfin IDs using index (FIXED - no repeated calls!)
        if (result.geoJson?.features && (level === 'county' || level === 'zip')) {
          const relevantIds = await getRelevantRedfinIds(stateAbbrev, level, result.geoJson.features)
          result.indexStats!.redfinIdsFound = relevantIds.length
          
          // Step 2: Filter to only relevant records (MASSIVE performance gain)
          optimizedRedfin = filterRedfinByRelevantIds(optimizedRedfin, relevantIds)
        }
        
        // Step 3: Apply existing performance optimizations
        const propertyFiltered = filterRedfinByPropertyType(optimizedRedfin)
        const essentialFiltered = filterRedfinToEssentials(propertyFiltered)
        
        result.redfinData = essentialFiltered
        result.loadingStatus.redfinData = "success"
        
        // Calculate total data reduction
        const finalCount = result.redfinData.length
        const totalReduction = originalCount > 0 ? ((1 - finalCount / originalCount) * 100).toFixed(1) : "0"
        result.indexStats!.dataReduction = `${totalReduction}%`
        
        console.log(`✅ TRACT-OPTIMIZED Redfin: ${originalCount} → ${finalCount} records (${totalReduction}% total reduction)`)
      } else {
        result.loadingStatus.redfinData = "failed"
      }
    } catch (error) {
      result.loadingStatus.redfinData = "failed"
      console.error('❌ Redfin error:', error)
    }

    result.indexStats!.indexLoadTime = performance.now() - indexStartTime

    // Smart data matching
    if (result.geoJson?.features && result.censusData) {
      const matchedCount = matchDataSmart(
        result.geoJson.features,
        result.censusData,
        level,
        stateAbbrev
      )

      result.matchingStats.matchedFeatures = matchedCount
      result.matchingStats.unmatchedFeatures = result.matchingStats.totalFeatures - matchedCount
      result.matchingStats.matchRate = result.matchingStats.totalFeatures > 0 
        ? (matchedCount / result.matchingStats.totalFeatures) * 100 
        : 0
    }

  } catch (error) {
    console.error('❌ Tract-optimized loader error:', error)
  }

  const loadTime = performance.now() - startTime
  result.loadTime = loadTime
  
  console.log(`🎯 TRACT-OPTIMIZED loading completed in ${loadTime.toFixed(0)}ms`)
  console.log(`📊 Index stats: ${result.indexStats!.redfinIdsFound} IDs found, ${result.indexStats!.dataReduction} data reduction`)
  
  return result
}

// ============================================================================
// CONVENIENCE FUNCTIONS FOR FRONTEND
// ============================================================================

// Check data coverage before loading
export async function checkDataCoverage(stateAbbrev: string, level: 'county' | 'zip' | 'tract') {
  return await checkStateCoverage(stateAbbrev, level)
}

// Load with coverage check
export async function loadDataWithCoverageCheck(
  stateAbbrev: string, 
  level: string, 
  viewMode: string = "county"
): Promise<OptimizedLoadResult & { coverageInfo?: any }> {
  // Check coverage first
  const coverage = await checkDataCoverage(stateAbbrev, level as 'county' | 'zip' | 'tract')
  
  // Load data
  const result = await loadDataWithCloudflare(stateAbbrev, level, viewMode)
  
  // Add coverage info
  return {
    ...result,
    coverageInfo: coverage
  }
}