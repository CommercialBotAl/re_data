"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { AlertCircle, MapPin, RefreshCw, Zap } from "lucide-react"
import { scaleQuantize } from "d3-scale"
import { extent } from "d3-array"
import EnhancedFastLeafletMap from "@/components/enhanced-fast-leaflet-map"
import { SimpleMetricsSelector } from "@/components/simple-metrics-selector"
import { loadSimpleMapData } from "@/utils/simple-data-loader"
import { matchSimpleFeatureToData, getSimpleMetricValue } from "@/utils/simple-data-mapping"
import { getMapSettings } from "@/utils/file-path-resolver"

// Available states - only NV and MA for now
const AVAILABLE_STATES = [
  { code: "MA", name: "Massachusetts" },
  { code: "NV", name: "Nevada" },
]

export default function SimpleMapPage() {
  const [selectedState, setSelectedState] = useState<string>("NV")
  const [selectedLevel, setSelectedLevel] = useState<string>("zip")
  const [selectedMetric, setSelectedMetric] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Simple data state
  const [mapData, setMapData] = useState<{
    geoJson: any
    csvData: any[]
    dataSource: string
    availableMetrics: any[]
    loadingStats: any
  } | null>(null)

  // Get map settings
  const { center, zoom } = getMapSettings(selectedState)

  // Load simple data
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    setMapData(null)
    setSelectedMetric("")

    try {
      console.log(`🚀 Loading simple map data: ${selectedState} ${selectedLevel}`)

      const result = await loadSimpleMapData(selectedState, selectedLevel)

      if (!result.geoJson && result.csvData.length === 0) {
        throw new Error(`No data found for ${selectedState} ${selectedLevel}`)
      }

      setMapData(result)

      // Auto-select first metric
      if (result.availableMetrics.length > 0) {
        const defaultMetric = result.availableMetrics[0]
        setSelectedMetric(defaultMetric.id)
        console.log(`🎯 Auto-selected: ${defaultMetric.label}`)
      }

      console.log(`✅ Simple map loaded successfully`)
    } catch (error) {
      console.error("❌ Error loading simple map:", error)
      setError(`Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setLoading(false)
    }
  }, [selectedState, selectedLevel])

  // Load data when state or level changes
  useEffect(() => {
    loadData()
  }, [loadData])

  // Get feature value
  const getFeatureValue = useCallback(
    (feature: any, metricId: string): number => {
      if (!mapData?.csvData || !metricId) return 0

      const matchedRow = matchSimpleFeatureToData(feature, mapData.csvData, selectedLevel)
      if (!matchedRow) return 0

      const value = getSimpleMetricValue(matchedRow, metricId)
      return value !== null ? value : 0
    },
    [mapData, selectedLevel],
  )

  // Color scale
  const colorScale = useMemo(() => {
    if (!mapData?.geoJson?.features || !selectedMetric) return null

    const currentMetric = mapData.availableMetrics.find((m) => m.id === selectedMetric)
    if (!currentMetric) return null

    const values = mapData.geoJson.features
      .map((feature: any) => getFeatureValue(feature, selectedMetric))
      .filter((value: number) => !isNaN(value) && value > 0)

    if (values.length === 0) return null

    const [min, max] = extent(values) as [number, number]
    if (min === max) return null

    return scaleQuantize<string>().domain([min, max]).range(currentMetric.colors)
  }, [mapData, selectedMetric, getFeatureValue])

  const currentMetric = mapData?.availableMetrics.find((m) => m.id === selectedMetric)

  return (
    <div className="flex h-screen">
      {/* Left Sidebar */}
      <div className="w-80 bg-gray-50 border-r overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold">Simple Map</h2>
          </div>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="mb-4 p-3 bg-blue-50 rounded border">
          <div className="text-sm font-medium text-blue-800">Essential Columns Only</div>
          <div className="text-xs text-blue-600">18 core metrics • Fast loading</div>
        </div>

        {/* State Selection */}
        <div className="mb-4">
          <label className="text-sm font-medium mb-2 block">State</label>
          <Select value={selectedState} onValueChange={setSelectedState} disabled={loading}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_STATES.map((state) => (
                <SelectItem key={state.code} value={state.code}>
                  {state.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Geographic Level Tabs */}
        <div className="mb-4">
          <label className="text-sm font-medium mb-2 block">Geographic Level</label>
          <Tabs value={selectedLevel} onValueChange={setSelectedLevel}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="state" disabled={loading}>
                State
              </TabsTrigger>
              <TabsTrigger value="county" disabled={loading}>
                County
              </TabsTrigger>
              <TabsTrigger value="zip" disabled={loading}>
                ZIP
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Data Source Info */}
        {mapData && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Data Source</h3>
            <Badge variant="outline" className="mb-2">
              {mapData.dataSource.toUpperCase()}
            </Badge>
            <div className="text-xs text-gray-600">
              {mapData.dataSource === "fred" && "Federal Reserve Economic Data"}
              {mapData.dataSource === "redfin" && "Redfin Real Estate Market Data"}
              {mapData.dataSource === "census" && "US Census Bureau Data"}
            </div>
          </div>
        )}

        {/* Simple Metrics Selector */}
        {mapData?.availableMetrics && (
          <div className="mb-4">
            <SimpleMetricsSelector
              metrics={mapData.availableMetrics}
              selectedMetric={selectedMetric}
              onMetricSelect={setSelectedMetric}
              dataSource={mapData.dataSource}
            />
          </div>
        )}

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
            </div>
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
                {AVAILABLE_STATES.find((s) => s.code === selectedState)?.name}{" "}
                {selectedLevel.charAt(0).toUpperCase() + selectedLevel.slice(1)} Data
              </h1>
              <p className="text-sm text-gray-600">
                {mapData ? (
                  <span className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-50">
                      {mapData.dataSource.toUpperCase()}
                    </Badge>
                    • Essential columns only • Fast loading
                  </span>
                ) : (
                  "Simple map with essential columns"
                )}
              </p>
            </div>
            {loading ? (
              <Badge variant="outline" className="bg-yellow-50">
                Loading...
              </Badge>
            ) : mapData ? (
              <Badge variant="outline" className="bg-green-50">
                ⚡ {mapData.loadingStats.loadTime.toFixed(0)}ms
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
              </Card>
            </div>
          ) : mapData?.geoJson && selectedMetric ? (
            <div style={{ height: "100%", width: "100%" }}>
              <EnhancedFastLeafletMap
                geoJsonData={mapData.geoJson}
                selectedMetric={selectedMetric}
                metricLabel={currentMetric?.label || selectedMetric}
                dataSource={mapData.dataSource}
                onCountySelect={() => {}}
                selectedCounty={null}
                getCountyValue={getFeatureValue}
                colorScale={colorScale}
                center={center}
                zoom={zoom}
                metricFormat={currentMetric?.format}
              />
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-gray-600">Loading simple map...</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <Card className="p-6 max-w-md">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                  <MapPin className="h-5 w-5" />
                  <h3 className="font-semibold">Select a Metric</h3>
                </div>
                <p className="text-gray-600">Choose from 18 essential metrics for fast visualization.</p>
              </Card>
            </div>
          )}

          {/* Legend */}
          {colorScale && currentMetric && (
            <Card className="absolute bottom-4 left-4 p-3 shadow-md">
              <h4 className="text-sm font-semibold mb-2">{currentMetric.label}</h4>
              <div className="flex">
                {currentMetric.colors.map((color: string, i: number) => (
                  <div key={i} className="w-6 h-4" style={{ backgroundColor: color }} />
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>Low</span>
                <span>High</span>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
