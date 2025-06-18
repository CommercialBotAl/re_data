"use client"

import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle, MapPin, RefreshCw, Search, Zap, X } from "lucide-react"
import { scaleQuantize } from "d3-scale"
import { extent } from "d3-array"
import EnhancedFastLeafletMap from "@/components/enhanced-fast-leaflet-map"
import { TractMetricsSelector } from "@/components/tract-metrics-selector"
import { loadTractMapData, getTractMapSettings, getPopularAreas, getAvailableStates } from "@/utils/tract-data-loader"
import {
  getTractMetrics,
  matchTractFeatureToData,
  getTractMetricValue,
  formatTractValue,
  getCategoricalColorScale,
  getTractViewModes,
} from "@/utils/tract-data-mapping"

export default function TractMapPage() {
  const [selectedState, setSelectedState] = useState<string>("NV")
  const [selectedViewMode, setSelectedViewMode] = useState<"county" | "zip">("county") // Default to county
  const [selectedYear] = useState<string>("2023") // Fixed to 2023
  const [selectedMetric, setSelectedMetric] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [filteredAreas, setFilteredAreas] = useState<string[]>([])
  const [selectedArea, setSelectedArea] = useState<string | null>(null)

  // Tract data state
  const [mapData, setMapData] = useState<{
    geoJson: any
    tractData: any[]
    viewMode: "county" | "zip"
    loadingStats: any
  } | null>(null)

  // Get available states and view modes
  const availableStates = getAvailableStates()
  const viewModes = getTractViewModes()

  // Get popular areas for the selected state
  const popularAreas = useMemo(() => getPopularAreas(selectedState), [selectedState])

  // Get available metrics
  const availableMetrics = useMemo(() => getTractMetrics(), [])

  // Search input ref for focus management
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Filter areas based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredAreas([])
      return
    }

    // Filter areas based on search query
    // This is a simple implementation - in a real app, you might want to use a more sophisticated search
    const query = searchQuery.toLowerCase().trim()

    // For county view, filter county names
    if (selectedViewMode === "county" && mapData?.tractData) {
      const counties = new Set<string>()
      mapData.tractData.forEach((row) => {
        if (row.county_name && typeof row.county_name === "string") {
          counties.add(row.county_name)
        }
      })

      const filtered = Array.from(counties)
        .filter((county) => county.toLowerCase().includes(query))
        .sort()
        .slice(0, 10) // Limit to 10 results

      setFilteredAreas(filtered)
    }
    // For ZIP view, filter ZIP codes
    else if (selectedViewMode === "zip" && mapData?.tractData) {
      const zips = new Set<string>()
      mapData.tractData.forEach((row) => {
        if (row.zip && typeof row.zip === "string") {
          zips.add(row.zip)
        }
      })

      const filtered = Array.from(zips)
        .filter((zip) => zip.includes(query))
        .sort()
        .slice(0, 10) // Limit to 10 results

      setFilteredAreas(filtered)
    }
    // If no data is loaded yet, show popular areas that match
    else {
      const filtered = popularAreas.filter((area) => area.toLowerCase().includes(query)).slice(0, 10) // Limit to 10 results

      setFilteredAreas(filtered)
    }
  }, [searchQuery, selectedViewMode, mapData, popularAreas])

  // Load tract data
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    setMapData(null)
    setSelectedMetric("")
    setSelectedArea(null)

    try {
      console.log(`🚀 Loading tract map data: ${selectedState} ${selectedViewMode} ${selectedYear}`)

      const result = await loadTractMapData(selectedState, selectedViewMode, selectedYear)

      if (!result.geoJson && result.tractData.length === 0) {
        throw new Error(`No tract data found for ${selectedState} ${selectedViewMode}`)
      }

      setMapData(result)

      // Auto-select first metric
      if (availableMetrics.length > 0) {
        const defaultMetric = availableMetrics.find((m) => m.id === "demographic_profile") || availableMetrics[0]
        setSelectedMetric(defaultMetric.id)
        console.log(`🎯 Auto-selected: ${defaultMetric.label}`)
      }

      console.log(`✅ Tract map loaded successfully`)
    } catch (error) {
      console.error("❌ Error loading tract map:", error)
      setError(`Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setLoading(false)
    }
  }, [selectedState, selectedViewMode, selectedYear, availableMetrics])

  // Load data when state or view mode changes
  useEffect(() => {
    loadData()
  }, [loadData])

  // Get feature value
  const getFeatureValue = useCallback(
    (feature: any, metricId: string): any => {
      if (!mapData?.tractData || !metricId) return null

      const matchedRow = matchTractFeatureToData(feature, mapData.tractData)
      if (!matchedRow) return null

      return getTractMetricValue(matchedRow, metricId)
    },
    [mapData],
  )

  // Color scale
  const colorScale = useMemo(() => {
    if (!mapData?.geoJson?.features || !selectedMetric) return null

    const currentMetric = availableMetrics.find((m) => m.id === selectedMetric)
    if (!currentMetric) return null

    // For categorical data, create a categorical color scale
    if (currentMetric.type === "categorical") {
      const values = mapData.geoJson.features
        .map((feature: any) => getFeatureValue(feature, selectedMetric))
        .filter(Boolean)

      return getCategoricalColorScale(selectedMetric, values)
    }

    // For numeric data, create a quantize scale
    const values = mapData.geoJson.features
      .map((feature: any) => getFeatureValue(feature, selectedMetric))
      .filter((value: any) => value !== null && !isNaN(value))

    if (values.length === 0) return null

    const [min, max] = extent(values) as [number, number]
    if (min === max) return null

    return scaleQuantize<string>().domain([min, max]).range(currentMetric.colors)
  }, [mapData, selectedMetric, getFeatureValue, availableMetrics])

  const currentMetric = availableMetrics.find((m) => m.id === selectedMetric)

  // Get map center and zoom based on state
  const mapSettings = useMemo(() => getTractMapSettings(selectedState), [selectedState])

  // Format tooltip value
  const formatTooltipValue = useCallback(
    (value: any) => {
      if (!selectedMetric) return "N/A"
      return formatTractValue(value, selectedMetric)
    },
    [selectedMetric],
  )

  // Handle area selection
  const handleAreaSelect = (area: string) => {
    setSelectedArea(area)
    setSearchQuery(area)
    setFilteredAreas([])
    // In a real implementation, you would zoom to the selected area on the map
    console.log(`Selected area: ${area}`)
  }

  // Clear search
  const clearSearch = () => {
    setSearchQuery("")
    setSelectedArea(null)
    setFilteredAreas([])
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }

  return (
    <div className="flex h-screen">
      {/* Left Sidebar */}
      <div className="w-80 bg-gray-50 border-r overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold">Tract Map</h2>
          </div>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="mb-4 p-3 bg-blue-50 rounded border">
          <div className="text-sm font-medium text-blue-800">Census Tract Data</div>
          <div className="text-xs text-blue-600">Detailed neighborhood-level analysis</div>
        </div>

        {/* State Selection */}
        <div className="mb-4">
          <label className="text-sm font-medium mb-2 block">State</label>
          <Select value={selectedState} onValueChange={setSelectedState} disabled={loading}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableStates.map((state) => (
                <SelectItem key={state.code} value={state.code}>
                  {state.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* View Mode Tabs */}
        <div className="mb-4">
          <label className="text-sm font-medium mb-2 block">View Mode</label>
          <Tabs value={selectedViewMode} onValueChange={(value) => setSelectedViewMode(value as "county" | "zip")}>
            <TabsList className="grid w-full grid-cols-2">
              {viewModes.map((mode) => (
                <TabsTrigger key={mode.id} value={mode.id} disabled={loading}>
                  {mode.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Search Bar (replacing Year Selection) */}
        <div className="mb-4">
          <label className="text-sm font-medium mb-2 block">
            {selectedViewMode === "county" ? "Search Counties" : "Search ZIP Codes"}
          </label>
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder={selectedViewMode === "county" ? "Search counties..." : "Search ZIP codes..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-8"
                disabled={loading}
              />
              {searchQuery && (
                <button onClick={clearSearch} className="absolute right-2 top-2.5 text-gray-500 hover:text-gray-700">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Search Results */}
            {filteredAreas.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                {filteredAreas.map((area) => (
                  <button
                    key={area}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                    onClick={() => handleAreaSelect(area)}
                  >
                    {area}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Popular Areas */}
        {popularAreas.length > 0 && (
          <div className="mb-4">
            <label className="text-sm font-medium mb-2 block">Popular Areas</label>
            <div className="flex flex-wrap gap-2">
              {popularAreas.map((area) => (
                <Badge
                  key={area}
                  variant={selectedArea === area ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => handleAreaSelect(area)}
                >
                  {area}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Tract Metrics Selector */}
        <div className="mb-4">
          <TractMetricsSelector
            metrics={availableMetrics}
            selectedMetric={selectedMetric}
            onMetricSelect={setSelectedMetric}
          />
        </div>

        {/* Performance Stats */}
        {mapData?.loadingStats && (
          <div className="p-3 bg-white rounded border">
            <h3 className="text-sm font-semibold mb-2">Performance</h3>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm">Load Time:</span>
                <Badge variant="outline" className="bg-green-50">
                  {mapData.loadingStats.loadTime.toFixed(0)}ms
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Features:</span>
                <Badge variant="outline">{mapData.loadingStats.featuresCount}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Data Rows:</span>
                <Badge variant="outline">{mapData.loadingStats.dataRowsCount}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">File Size:</span>
                <Badge variant="outline">{(mapData.loadingStats.fileSize / 1024).toFixed(1)} KB</Badge>
              </div>
            </div>
          </div>
        )}

        {/* Debug Info */}
        {mapData && (
          <div className="mt-4 p-3 bg-gray-100 rounded border text-xs">
            <h4 className="font-semibold mb-1">Debug Info</h4>
            <div>GeoJSON: {mapData.loadingStats.geoJsonStatus}</div>
            <div>Data: {mapData.loadingStats.dataStatus}</div>
            <div>View Mode: {selectedViewMode}</div>
            {selectedArea && <div>Selected Area: {selectedArea}</div>}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 bg-white border-b">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">
                {availableStates.find((s) => s.code === selectedState)?.name} Census Tracts
              </h1>
              <p className="text-sm text-gray-600">
                {mapData ? (
                  <span className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-50">
                      {selectedViewMode === "county" ? "By County" : "By ZIP"}
                    </Badge>
                    • {selectedYear} Data • Census Tract Level
                    {selectedArea && (
                      <>
                        •{" "}
                        <Badge variant="outline" className="bg-blue-50">
                          {selectedArea}
                        </Badge>
                      </>
                    )}
                  </span>
                ) : (
                  "Detailed tract-level visualization"
                )}
              </p>
            </div>
            {loading ? (
              <Badge variant="outline" className="bg-yellow-50">
                Loading...
              </Badge>
            ) : mapData ? (
              <Badge variant="outline" className="bg-green-50">
                ⏱️ {mapData.loadingStats.loadTime.toFixed(0)}ms
              </Badge>
            ) : null}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative">
          {error ? (
            <div className="flex items-center justify-center h-full">
              <Card className="p-6 max-w-lg">
                <div className="flex items-center gap-2 text-amber-600 mb-2">
                  <AlertCircle className="h-5 w-5" />
                  <h3 className="font-semibold">Loading Error</h3>
                </div>
                <p className="text-gray-600">{error}</p>
                <div className="mt-4 text-xs text-gray-500">
                  <div>State: {selectedState}</div>
                  <div>View Mode: {selectedViewMode}</div>
                  <div>Year: {selectedYear}</div>
                </div>
              </Card>
            </div>
          ) : mapData?.geoJson && selectedMetric ? (
            <div style={{ height: "100%", width: "100%" }}>
              <EnhancedFastLeafletMap
                geoJsonData={mapData.geoJson}
                selectedMetric={selectedMetric}
                metricLabel={currentMetric?.label || selectedMetric}
                dataSource="census"
                onCountySelect={() => {}}
                selectedCounty={null}
                getCountyValue={getFeatureValue}
                colorScale={colorScale}
                center={mapSettings.center}
                zoom={mapSettings.zoom}
                metricFormat={currentMetric?.format}
                formatTooltipValue={formatTooltipValue}
                isCategorical={currentMetric?.type === "categorical"}
                selectedArea={selectedArea}
              />
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-gray-600">Loading tract map...</p>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedState} • {selectedViewMode} • {selectedYear}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <Card className="p-6 max-w-md">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                  <MapPin className="h-5 w-5" />
                  <h3 className="font-semibold">Select a Metric</h3>
                </div>
                <p className="text-gray-600">Choose a metric to visualize tract-level data.</p>
              </Card>
            </div>
          )}

          {/* Legend */}
          {colorScale && currentMetric && (
            <Card className="absolute bottom-4 left-4 p-3 shadow-md">
              <h4 className="text-sm font-semibold mb-2">{currentMetric.label}</h4>

              {/* Categorical Legend */}
              {currentMetric.type === "categorical" && (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {Object.entries(colorScale as Record<string, string>).map(([value, color]) => (
                    <div key={value} className="flex items-center gap-2">
                      <div className="w-4 h-4" style={{ backgroundColor: color }}></div>
                      <span className="text-xs">{value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Numeric Legend */}
              {currentMetric.type !== "categorical" && (
                <>
                  <div className="flex">
                    {currentMetric.colors.map((color: string, i: number) => (
                      <div key={i} className="w-6 h-4" style={{ backgroundColor: color }} />
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                </>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
