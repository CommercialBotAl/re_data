// ============================================================================
// SIMPLE INDEX MANAGER - Geographic Intelligence Layer (NO REPEAT OPTIMIZATION)
// ============================================================================
// Purpose: Handle all geographic lookups and relationships
// Usage: Import this in any component that needs geographic data

const BASE_URL = "https://pub-349a836622034df3a45c179d98e8328a.r2.dev"

// ============================================================================
// CACHED STATE DATA - Load once per state, reuse forever
// ============================================================================
const stateIndexCache = new Map<string, {
  counties: any[]
  zips: any[]
  tracts: any[]
  loadTime: number
}>()

// ============================================================================
// CORE FUNCTION: Load State Index Files - ALWAYS LOAD ALL (NO REPEAT CALLS)
// ============================================================================
export async function loadStateIndexes(stateAbbrev: string, level?: 'county' | 'zip' | 'tract'): Promise<boolean> {
  // Return cached data if already loaded
  if (stateIndexCache.has(stateAbbrev)) {
    console.log(`📋 Using cached indexes for ${stateAbbrev}`)
    return true
  }

  console.log(`🔄 Loading ALL ${stateAbbrev} index files (preventing API call loops)...`)
  const startTime = performance.now()

  try {
    // ALWAYS load all 3 files to prevent repeated API calls
    const [counties, zips, tracts] = await Promise.all([
      loadStateCSV(stateAbbrev, 'county'),
      loadStateCSV(stateAbbrev, 'zip'), 
      loadStateCSV(stateAbbrev, 'tract')
    ])

    // Cache the loaded data
    stateIndexCache.set(stateAbbrev, {
      counties: counties || [],
      zips: zips || [],
      tracts: tracts || [],
      loadTime: performance.now() - startTime
    })

    const loadTime = performance.now() - startTime
    console.log(`✅ ${stateAbbrev} ALL indexes loaded in ${loadTime.toFixed(0)}ms`)
    console.log(`  Counties: ${(counties || []).length}`)
    console.log(`  ZIPs: ${(zips || []).length}`) 
    console.log(`  Tracts: ${(tracts || []).length}`)

    return true

  } catch (error) {
    console.error(`❌ Failed to load ${stateAbbrev} indexes:`, error)
    return false
  }
}

// ============================================================================
// HELPER: Load Individual State CSV File
// ============================================================================
async function loadStateCSV(stateAbbrev: string, level: string): Promise<any[]> {
  try {
    const url = `${BASE_URL}/index/csv/${stateAbbrev}/${level}.csv`
    const response = await fetch(url)
    
    if (!response.ok) {
      console.log(`⚠️ No ${level} index for ${stateAbbrev} (${response.status})`)
      return []
    }

    const csvText = await response.text()
    const lines = csvText.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',').map(h => h.trim())
    
    return lines.slice(1).map(line => {
      const values = line.split(',')
      const record: any = {}
      headers.forEach((header, index) => {
        const value = values[index]?.trim() || ''
        
        // Convert numeric fields
        if (header.includes('zipcode') || header.includes('table_id') || header.includes('fips') || header === 'GEOID') {
          record[header] = value && value !== '' ? parseInt(value) : null
        } else {
          record[header] = value
        }
      })
      return record
    })

  } catch (error) {
    console.error(`❌ Error loading ${stateAbbrev} ${level}:`, error)
    return []
  }
}

// ============================================================================
// NORMALIZATION FUNCTIONS - For leading zero fixes
// ============================================================================
function normalizeZipCode(zip: string | number | null | undefined): string {
  if (!zip && zip !== 0) return ''
  const zipStr = zip.toString().trim()
  const cleanZip = zipStr.replace(/\D/g, '')
  return cleanZip.padStart(5, '0')
}

function normalizeCountyCode(county: string | number | null | undefined): string {
  if (!county && county !== 0) return ''
  const countyStr = county.toString().trim()
  const cleanCounty = countyStr.replace(/\D/g, '')
  
  // If it's a 5-digit FIPS (state+county), take last 3 digits
  if (cleanCounty.length === 5) {
    return cleanCounty.slice(-3)
  }
  
  return cleanCounty.padStart(3, '0')
}

// ============================================================================
// PRIMARY FUNCTION: Get Redfin ID - NO REPEATED LOADING (FIXED!)
// ============================================================================
export async function getRedfinId(stateAbbrev: string, area: string, level: 'county' | 'zip'): Promise<number | null> {
  // CHECK CACHE ONLY - no repeated API calls!
  if (!stateIndexCache.has(stateAbbrev)) {
    console.log(`⚠️ No cache for ${stateAbbrev} - indexes not loaded yet`)
    return null
  }

  const stateData = stateIndexCache.get(stateAbbrev)!
  
  if (level === 'zip') {
    // First try exact matching (works for most states)
    let zipRecord = stateData.zips.find(row => 
      row.ZIPCODE?.toString() === area ||
      row.ZIPCODE === parseInt(area) ||
      row.zipcode?.toString() === area ||
      row.zip_code?.toString() === area
    )
    
    // If exact matching fails, try normalized matching (for leading zero states)
    if (!zipRecord) {
      console.log(`🔍 Exact match failed, trying normalized matching for ZIP ${area}`)
      const normalizedArea = normalizeZipCode(area)
      
      zipRecord = stateData.zips.find(row => {
        const normalizedZip = normalizeZipCode(row.ZIPCODE)
        return normalizedZip === normalizedArea
      })
    }
    
    if (zipRecord?.redfin_tableid_zip) {
      console.log(`🏠 Found ZIP ${area} → Redfin ID: ${zipRecord.redfin_tableid_zip}`)
      return parseInt(zipRecord.redfin_tableid_zip)
    }
  }
  
  if (level === 'county') {
    let countyRecord = null
    
    // Strategy 1: Try GEOID exact match (most reliable)
    countyRecord = stateData.counties.find(row => 
      row.GEOID === area || row.GEOID === area.toString()
    )
    
    if (countyRecord) {
      console.log(`🏛️ Found county ${area} via GEOID → Redfin ID: ${countyRecord.table_id}`)
      return parseInt(countyRecord.table_id)
    }
    
    // Strategy 2: Try fred_county_fips exact match (fallback)
    countyRecord = stateData.counties.find(row => 
      row.fred_county_fips === area || row.fred_county_fips === area.toString()
    )
    
    if (countyRecord) {
      console.log(`🏛️ Found county ${area} via fred_county_fips → Redfin ID: ${countyRecord.table_id}`)
      return parseInt(countyRecord.table_id)
    }
    
    // Strategy 3: Name matching (fallback)
    countyRecord = stateData.counties.find(row => 
      row.NAME?.toLowerCase().includes(area.toLowerCase()) ||
      row.NAMELSAD?.toLowerCase().includes(area.toLowerCase()) ||
      row.region?.toLowerCase().includes(area.toLowerCase())
    )
    
    if (countyRecord) {
      console.log(`🏛️ Found county ${area} via name matching → Redfin ID: ${countyRecord.table_id}`)
      return parseInt(countyRecord.table_id)
    }
    
    // Strategy 4: Try normalized matching (for leading zero issues)
    if (!countyRecord) {
      console.log(`🔍 Trying normalized county matching for ${area}`)
      countyRecord = stateData.counties.find(row => {
        const normalizedCounty = normalizeCountyCode(row.COUNTYFP || row.GEOID)
        const normalizedArea = normalizeCountyCode(area)
        return normalizedCounty === normalizedArea
      })
      
      if (countyRecord) {
        console.log(`🏛️ Found county ${area} via normalized matching → Redfin ID: ${countyRecord.table_id}`)
        return parseInt(countyRecord.table_id)
      }
    }
  }

  console.log(`❌ No Redfin ID found for ${area} (${level}) in ${stateAbbrev}`)
  return null
}

// ============================================================================
// GEOGRAPHIC RELATIONSHIPS: Tract ↔ ZIP ↔ County
// ============================================================================
export async function getTractsInZip(stateAbbrev: string, zipcode: string): Promise<any[]> {
  if (!stateIndexCache.has(stateAbbrev)) {
    console.log(`⚠️ No cache for ${stateAbbrev} - call loadStateIndexes first`)
    return []
  }

  const stateData = stateIndexCache.get(stateAbbrev)!
  
  // Find tracts that belong to this ZIP
  const tractsInZip = stateData.tracts.filter(row => 
    row.zip_code_clean === zipcode ||
    row.zipcode === zipcode ||
    row.ZIPCODE === zipcode
  )

  console.log(`🎯 Found ${tractsInZip.length} tracts in ZIP ${zipcode}`)
  return tractsInZip
}

export async function getZipsInCounty(stateAbbrev: string, countyName: string): Promise<any[]> {
  if (!stateIndexCache.has(stateAbbrev)) {
    console.log(`⚠️ No cache for ${stateAbbrev} - call loadStateIndexes first`)
    return []
  }

  const stateData = stateIndexCache.get(stateAbbrev)!
  
  // Find ZIPs that belong to this county
  const zipsInCounty = stateData.zips.filter(row => 
    row.redfin_county_name?.toLowerCase().includes(countyName.toLowerCase()) ||
    row.county_name?.toLowerCase().includes(countyName.toLowerCase())
  )

  console.log(`🎯 Found ${zipsInCounty.length} ZIPs in county ${countyName}`)
  return zipsInCounty
}

// ============================================================================
// SIMPLE COVERAGE CHECK - Using Current State Data (OPTIMIZED)
// ============================================================================
export async function checkStateCoverage(stateAbbrev: string, level: 'county' | 'zip' | 'tract'): Promise<any> {
  if (!stateIndexCache.has(stateAbbrev)) {
    return { available: false, reason: 'Indexes not loaded - call loadStateIndexes first' }
  }

  const stateData = stateIndexCache.get(stateAbbrev)!
  
  if (level === 'zip') {
    const totalZips = stateData.zips.length
    const zipsWithRedfin = stateData.zips.filter(row => 
      row.redfin_tableid_zip && row.redfin_tableid_zip !== '' && row.redfin_tableid_zip !== 'null'
    ).length
    
    const redfinPercent = totalZips > 0 ? (zipsWithRedfin / totalZips) * 100 : 0
    
    return {
      available: totalZips > 0,
      total: totalZips,
      withRedfin: zipsWithRedfin,
      redfinPercent,
      quality: redfinPercent > 60 ? 'excellent' : redfinPercent > 30 ? 'good' : 'limited'
    }
  }
  
  if (level === 'county') {
    const totalCounties = stateData.counties.length
    const countiesWithRedfin = stateData.counties.filter(row => 
      row.table_id && row.table_id !== '' && row.table_id !== 'null'
    ).length
    
    return {
      available: totalCounties > 0,
      total: totalCounties,
      withRedfin: countiesWithRedfin,
      redfinPercent: totalCounties > 0 ? (countiesWithRedfin / totalCounties) * 100 : 0
    }
  }

  // Tract level
  return {
    available: stateData.tracts.length > 0,
    total: stateData.tracts.length
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Get all available states (from cache or discover)
export function getLoadedStates(): string[] {
  return Array.from(stateIndexCache.keys())
}

// Clear cache for memory management
export function clearStateCache(stateAbbrev?: string): void {
  if (stateAbbrev) {
    stateIndexCache.delete(stateAbbrev)
    console.log(`🗑️ Cleared cache for ${stateAbbrev}`)
  } else {
    stateIndexCache.clear()
    console.log(`🗑️ Cleared all state cache`)
  }
}

// Get cache stats
export function getCacheStats(): any {
  const stats = Array.from(stateIndexCache.entries()).map(([state, data]) => ({
    state,
    counties: data.counties.length,
    zips: data.zips.length,
    tracts: data.tracts.length,
    loadTime: data.loadTime
  }))
  
  return {
    cachedStates: stats.length,
    details: stats
  }
}