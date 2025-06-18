// Simple data mapping - only essential columns for fast loading

interface SimpleColumnMapping {
  display: string
  category: string
  type: string
  format?: string
}

interface SimpleMapping {
  geographic: {
    state: string[]
    county: string[]
    zip: string[]
  }
  census: Record<string, SimpleColumnMapping>
  redfin: Record<string, SimpleColumnMapping>
  fred: Record<string, SimpleColumnMapping>
}

// Essential columns only - exactly as you specified
const SIMPLE_MAPPING: SimpleMapping = {
  geographic: {
    state: ["state_code", "state_name"],
    county: ["county_fips", "county_name", "state_code"],
    zip: ["zip", "preferred_city", "primary_county", "state_code"],
  },

  census: {
    employment_unemployment_rate: {
      display: "Unemployment Rate",
      category: "economic",
      type: "float",
      format: "percentage",
    },
    income_median: { display: "Median Income", category: "income", type: "currency" },
    rental_median_rent: { display: "Median Rent", category: "housing", type: "currency" },
    housing_median_value: { display: "Median Home Value", category: "housing", type: "currency" },
    population_total: { display: "Total Population", category: "demographics", type: "integer" },
  },

  redfin: {
    median_dom: { display: "Days on Market", category: "market", type: "integer" },
    months_of_supply: { display: "Months of Supply", category: "inventory", type: "float" },
    inventory: { display: "Active Inventory", category: "inventory", type: "integer" },
    new_listings: { display: "New Listings", category: "inventory", type: "integer" },
    homes_sold: { display: "Homes Sold", category: "sales", type: "integer" },
    median_ppsf: { display: "Price per Sq Ft", category: "pricing", type: "currency" },
    median_sale_price: { display: "Median Sale Price", category: "pricing", type: "currency" },
  },

  fred: {
    house_price_index: { display: "House Price Index", category: "real_estate", type: "float" },
    gdp: { display: "GDP", category: "economic", type: "currency" },
    per_capita_personal_income: { display: "Per Capita Income", category: "income", type: "currency" },
    bld_perm_units: { display: "Building Permits", category: "housing", type: "integer" },
    median_home_sqft: { display: "Median Home Sq Ft", category: "housing", type: "integer" },
  },
}

// Get data source for level
export function getSimpleDataSource(level: string): "census" | "redfin" | "fred" {
  if (level === "county") return "fred"
  if (level === "zip") return "census"
  return "census" // default
}

// Get available metrics for simple mapping
export function getSimpleMetrics(dataSource: string): Array<{
  id: string
  label: string
  category: string
  type: string
  format?: string
  colors: string[]
}> {
  const sourceColumns = SIMPLE_MAPPING[dataSource as keyof typeof SIMPLE_MAPPING] as Record<string, SimpleColumnMapping>

  if (!sourceColumns) return []

  // Color schemes
  const colorSchemes = {
    economic: ["#fef3c7", "#fde68a", "#fcd34d", "#f59e0b", "#d97706", "#b45309"],
    income: ["#f0fdf4", "#dcfce7", "#bbf7d0", "#86efac", "#4ade80", "#22c55e"],
    housing: ["#dcfce7", "#bbf7d0", "#86efac", "#4ade80", "#22c55e", "#15803d"],
    demographics: ["#dbeafe", "#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8"],
    market: ["#ecfdf5", "#d1fae5", "#a7f3d0", "#6ee7b7", "#34d399", "#10b981"],
    inventory: ["#fef7ff", "#f3e8ff", "#e9d5ff", "#d8b4fe", "#c084fc", "#a855f7"],
    sales: ["#f3e8ff", "#ddd6fe", "#c4b5fd", "#a78bfa", "#8b5cf6", "#7c3aed"],
    pricing: ["#fee2e2", "#fecaca", "#f87171", "#ef4444", "#dc2626", "#b91c1c"],
    real_estate: ["#fff7ed", "#ffedd5", "#fed7aa", "#fdba74", "#fb923c", "#f97316"],
    default: ["#f1f5f9", "#e2e8f0", "#cbd5e1", "#94a3b8", "#64748b", "#475569"],
  }

  return Object.entries(sourceColumns).map(([columnName, metadata]) => ({
    id: columnName,
    label: metadata.display,
    category: metadata.category,
    type: metadata.type,
    format: metadata.format,
    colors: colorSchemes[metadata.category as keyof typeof colorSchemes] || colorSchemes.default,
  }))
}

// Get essential columns for a level
export function getEssentialColumns(level: string, dataSource: string): string[] {
  const geographic = SIMPLE_MAPPING.geographic[level as keyof typeof SIMPLE_MAPPING.geographic] || []
  const dataColumns = Object.keys(SIMPLE_MAPPING[dataSource as keyof typeof SIMPLE_MAPPING] || {})
  return [...geographic, ...dataColumns]
}

// Extract feature ID for simple mapping
export function extractSimpleFeatureId(feature: any, level: string): string | null {
  if (!feature?.properties) return null

  const idFields = {
    state: ["state_code", "STATE", "STUSPS"],
    county: ["county_fips", "GEOID", "COUNTYFP"],
    zip: ["zip", "ZIPCODE", "ZIP", "GEOID10"],
  }

  const possibleFields = idFields[level as keyof typeof idFields] || []

  for (const field of possibleFields) {
    const value = feature.properties[field]
    if (value !== undefined && value !== null && value !== "") {
      let cleanValue = value.toString().trim()

      // For ZIP codes, ensure 5-digit format
      if (level === "zip" && cleanValue.length < 5 && !isNaN(Number(cleanValue))) {
        cleanValue = cleanValue.padStart(5, "0")
      }

      return cleanValue
    }
  }

  return null
}

// Match feature to data with simple logic
export function matchSimpleFeatureToData(feature: any, dataRows: any[], level: string): any | null {
  if (!feature || !dataRows || dataRows.length === 0) return null

  const featureId = extractSimpleFeatureId(feature, level)
  if (!featureId) return null

  const dataFields = {
    state: ["state_code", "STATE"],
    county: ["county_fips", "GEOID", "fips"],
    zip: ["zip", "ZIP", "zipcode"],
  }

  const possibleDataFields = dataFields[level as keyof typeof dataFields] || []

  for (const dataField of possibleDataFields) {
    const matchingRow = dataRows.find((row) => {
      const rowValue = row[dataField]
      if (!rowValue) return false
      return rowValue.toString().trim() === featureId
    })

    if (matchingRow) return matchingRow
  }

  return null
}

// Get metric value with simple logic
export function getSimpleMetricValue(dataRow: any, metricId: string): number | null {
  if (!dataRow || !metricId) return null

  const value = dataRow[metricId]
  if (value !== undefined && value !== null && value !== "") {
    const numValue = Number.parseFloat(value)
    return isNaN(numValue) ? null : numValue
  }

  return null
}

// Format value for display
export function formatSimpleValue(value: number, format?: string): string {
  if (value === null || value === undefined || isNaN(value)) return "N/A"

  switch (format) {
    case "percentage":
      return `${value.toFixed(1)}%`
    case "currency":
      return value >= 1000000
        ? `$${(value / 1000000).toFixed(1)}M`
        : value >= 1000
          ? `$${(value / 1000).toFixed(0)}K`
          : `$${value.toLocaleString()}`
    default:
      return value >= 1000000
        ? `${(value / 1000000).toFixed(1)}M`
        : value >= 1000
          ? `${(value / 1000).toFixed(0)}K`
          : value.toLocaleString()
  }
}
