"use client"

import { useEffect, useRef } from "react"

interface EnhancedFastLeafletMapProps {
  geoJsonData: any
  selectedMetric: string
  metricLabel: string
  dataSource: string
  onCountySelect: (county: any) => void
  selectedCounty: any
  getCountyValue: (feature: any, metricId: string) => any
  colorScale: any
  center: [number, number]
  zoom: number
  metricFormat?: string
  formatTooltipValue?: (value: any) => string
  isCategorical?: boolean
  selectedArea?: string | null
}

export default function EnhancedFastLeafletMap({
  geoJsonData,
  selectedMetric,
  metricLabel,
  dataSource,
  onCountySelect,
  selectedCounty,
  getCountyValue,
  colorScale,
  center,
  zoom,
  metricFormat,
  formatTooltipValue,
  isCategorical,
  selectedArea,
}: EnhancedFastLeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // For now, just log the data to see what we're getting
    console.log("🗺️ Map component received data:", {
      geoJsonFeatures: geoJsonData?.features?.length || 0,
      selectedMetric,
      metricLabel,
      dataSource,
      center,
      zoom,
      colorScale: colorScale ? "present" : "missing",
      isCategorical,
      selectedArea,
    })

    if (geoJsonData?.features) {
      console.log("🔍 Sample GeoJSON feature:", geoJsonData.features[0])

      // Test the getCountyValue function with first feature
      if (geoJsonData.features.length > 0 && selectedMetric) {
        const testValue = getCountyValue(geoJsonData.features[0], selectedMetric)
        console.log(`🧪 Test value for ${selectedMetric}:`, testValue)

        if (formatTooltipValue) {
          const formattedValue = formatTooltipValue(testValue)
          console.log(`🎨 Formatted value:`, formattedValue)
        }
      }

      // If selectedArea is provided, log it
      if (selectedArea) {
        console.log(`🎯 Selected area: ${selectedArea}`)
        // In a real implementation, you would zoom to the selected area
      }
    }
  }, [geoJsonData, selectedMetric, getCountyValue, formatTooltipValue, selectedArea])

  return (
    <div ref={mapRef} className="w-full h-full bg-gray-100 flex items-center justify-center">
      <div className="text-center p-8">
        <div className="text-lg font-semibold mb-2">Map Placeholder</div>
        <div className="text-sm text-gray-600 space-y-1">
          <div>Features: {geoJsonData?.features?.length || 0}</div>
          <div>Metric: {metricLabel}</div>
          <div>Source: {dataSource}</div>
          <div>
            Center: [{center[0]}, {center[1]}]
          </div>
          <div>Zoom: {zoom}</div>
          <div>Color Scale: {colorScale ? "✅" : "❌"}</div>
          <div>Categorical: {isCategorical ? "Yes" : "No"}</div>
          {selectedArea && <div>Selected Area: {selectedArea}</div>}
        </div>
        <div className="mt-4 text-xs text-gray-500">Check console for detailed data logs</div>
      </div>
    </div>
  )
}
