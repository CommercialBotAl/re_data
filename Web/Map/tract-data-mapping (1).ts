// Tract data mapping - specialized for census tract data visualization

interface TractColumnMapping {
  display: string
  category: string
  type: string // 'numeric' | 'categorical' | 'currency' | 'percentage'
  format?: string
  description?: string
}

interface TractMapping {
  geographic: {
    county: string[]
    zip: string[]
  }
  metrics: Record<string, TractColumnMapping>
}

// Tract-specific column mapping
const TRACT_MAPPING: TractMapping = {
  geographic: {
    county: ["GEOID", "county", "county_name", "tract"],
    zip: ["GEOID", "zip", "preferred_city", "tract"],
  },

  metrics: {
    // Demographics
    population_description: {
      display: "Population Density",
      category: "demographics",
      type: "categorical",
      description: "Population density classification",
    },
    predominant_race: {
      display: "Predominant Race",
      category: "demographics",
      type: "categorical",
      description: "Most common racial group in the tract",
    },
    predominant_race_pct: {
      display: "Predominant Race %",
      category: "demographics",
      type: "numeric",
      format: "percentage",
      description: "Percentage of population in the predominant racial group",
    },
    demographic_profile: {
      display: "Demographic Profile",
      category: "demographics",
      type: "categorical",
      description: "Overall demographic characterization",
    },

    // Housing
    housing_occupancy_rate: {
      display: "Occupancy Rate",
      category: "housing",
      type: "numeric",
      format: "percentage",
      description: "Percentage of housing units that are occupied",
    },
    vacancy_description: {
      display: "Vacancy Level",
      category: "housing",
      type: "categorical",
      description: "Classification of vacancy rates",
    },
    primary_building_type: {
      display: "Building Type",
      category: "housing",
      type: "categorical",
      description: "Predominant type of residential buildings",
    },

    // Economic
    income_level: {
      display: "Income Level",
      category: "economic",
      type: "categorical",
      description: "Classification of median household income",
    },
    unemployment_summary: {
      display: "Unemployment",
      category: "economic",
      type: "categorical",
      description: "Classification of unemployment rate",
    },
    poverty_summary: {
      display: "Poverty Level",
      category: "economic",
      type: "categorical",
      description: "Classification of poverty rate",
    },
    affordability: {
      display: "Affordability",
      category: "economic",
      type: "categorical",
      description: "Housing affordability classification",
    },

    // Real Estate
    home_value_description: {
      display: "Home Values",
      category: "real_estate",
      type: "categorical",
      description: "Classification of median home values",
    },
    rent_level: {
      display: "Rent Level",
      category: "real_estate",
      type: "categorical",
      description: "Classification of median rent",
    },
    rental_2br: {
      display: "2BR Rental",
      category: "real_estate",
      type: "currency",
      description: "Median rent for 2-bedroom units",
    },
    rental_3br: {
      display: "3BR Rental",
      category: "real_estate",
      type: "currency",
      description: "Median rent for 3-bedroom units",
    },

    // Education
    education_level: {
      display: "Education Level",
      category: "education",
      type: "categorical",
      description: "Classification of educational attainment",
    },
  },
}

// Get available metrics for tract mapping
export function getTractMetrics(): Array<{
  id: string
  label: string
  category: string
  type: string
  format?: string
  description?: string
  colors: string[]
}> {
  // Color schemes for different categories
  const colorSchemes = {
    demographics: ["#dbeafe", "#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8"],
    housing: ["#dcfce7", "#bbf7d0", "#86efac", "#4ade80", "#22c55e", "#15803d"],
    economic: ["#fef3c7", "#fde68a", "#fcd34d", "#f59e0b", "#d97706", "#b45309"],
    real_estate: ["#fff7ed", "#ffedd5", "#fed7aa", "#fdba74", "#fb923c", "#f97316"],
    education: ["#f3e8ff", "#ddd6fe", "#c4b5fd", "#a78bfa", "#8b5cf6", "#7c3aed"],
    default: ["#f1f5f9", "#e2e8f0", "#cbd5e1", "#94a3b8", "#64748b", "#475569"],
  }

  // Categorical color schemes (for non-numeric data)
  const categoricalColorSchemes = {
    predominant_race: ["#fecdd3", "#fda4af", "#f43f5e", "#be123c", "#881337"],
    demographic_profile: ["#d8b4fe", "#c084fc", "#a855f7", "#7e22ce", "#581c87"],
    primary_building_type: ["#bae6fd", "#7dd3fc", "#38bdf8", "#0284c7", "#0c4a6e"],
    income_level: ["#fef9c3", "#fde047", "#eab308", "#ca8a04", "#854d0e"],
    vacancy_description: ["#86efac", "#4ade80", "#22c55e", "#16a34a", "#166534"],
  }

  return Object.entries(TRACT_MAPPING.metrics).map(([columnName, metadata]) => {
    // Use categorical color scheme if available, otherwise use category colors
    const colors =
      metadata.type === "categorical" && categoricalColorSchemes[columnName]
        ? categoricalColorSchemes[columnName]
        : colorSchemes[metadata.category as keyof typeof colorSchemes] || colorSchemes.default

    return {
      id: columnName,
      label: metadata.display,
      category: metadata.category,
      type: metadata.type,
      format: metadata.format,
      description: metadata.description,
      colors: colors,
    }
  })
}

// Get essential columns for tract data
export function getTractEssentialColumns(viewMode: "county" | "zip"): string[] {
  const geographic = TRACT_MAPPING.geographic[viewMode] || []
  const metricColumns = Object.keys(TRACT_MAPPING.metrics)
  return [...geographic, ...metricColumns]
}

// Extract feature ID for tract mapping
export function extractTractFeatureId(feature: any): string | null {
  if (!feature?.properties) return null

  // Try different possible GEOID fields
  const possibleFields = ["GEOID", "geoid", "TRACTCE", "tract_id"]

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

// Match feature to tract data
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

// Get metric value from tract data
export function getTractMetricValue(dataRow: any, metricId: string): any {
  if (!dataRow || !metricId) return null

  const value = dataRow[metricId]
  if (value === undefined || value === null || value === "") return null

  const metricInfo = TRACT_MAPPING.metrics[metricId]

  // For numeric types, convert to number
  if (metricInfo && (metricInfo.type === "numeric" || metricInfo.type === "currency")) {
    const numValue = Number.parseFloat(value)
    return isNaN(numValue) ? null : numValue
  }

  // For categorical, return as is
  return value
}

// Format tract value for display
export function formatTractValue(value: any, metricId: string): string {
  if (value === null || value === undefined) return "N/A"

  const metricInfo = TRACT_MAPPING.metrics[metricId]
  if (!metricInfo) return String(value)

  switch (metricInfo.type) {
    case "percentage":
      return `${Number(value).toFixed(1)}%`

    case "currency":
      return value >= 1000000
        ? `$${(value / 1000000).toFixed(1)}M`
        : value >= 1000
          ? `$${(value / 1000).toFixed(0)}K`
          : `$${Number(value).toLocaleString()}`

    case "numeric":
      return value >= 1000000
        ? `${(value / 1000000).toFixed(1)}M`
        : value >= 1000
          ? `${(value / 1000).toFixed(0)}K`
          : Number(value).toLocaleString()

    case "categorical":
    default:
      return String(value)
  }
}

// Get color scale for categorical values
export function getCategoricalColorScale(metricId: string, values: string[]): Record<string, string> {
  const metricInfo = TRACT_MAPPING.metrics[metricId]
  if (!metricInfo || metricInfo.type !== "categorical") return {}

  // Get unique values
  const uniqueValues = Array.from(new Set(values)).filter(Boolean)

  // Get colors for this metric or category
  const metrics = getTractMetrics()
  const metric = metrics.find((m) => m.id === metricId)
  const colors = metric?.colors || []

  // Map values to colors
  const colorMap: Record<string, string> = {}
  uniqueValues.forEach((value, index) => {
    const colorIndex = index % colors.length
    colorMap[value] = colors[colorIndex]
  })

  return colorMap
}

// Get view modes for tract data
export function getTractViewModes(): Array<{ id: string; label: string }> {
  return [
    { id: "county", label: "View by County" },
    { id: "zip", label: "View by ZIP" },
  ]
}

// Get available states for tract data
export function getAvailableTractStates(): Array<{ code: string; name: string }> {
  return [
    { code: "CA", name: "California" },
    { code: "TX", name: "Texas" },
    { code: "NV", name: "Nevada" },
    { code: "MA", name: "Massachusetts" },
  ]
}
