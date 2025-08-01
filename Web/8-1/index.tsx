"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, MapPin, BarChart3, Database, TrendingUp } from "lucide-react"
import { loadDataWithCloudflare, checkDataCoverage } from "@/lib/cloud_patterns_tract_opt"
import { loadStateIndexes, getCacheStats } from "@/lib/improved_index_manager_nor_opt"

// US States for dropdown
const US_STATES = [
  { code: "CA", name: "California" },
  { code: "TX", name: "Texas" },
  { code: "FL", name: "Florida" },
  { code: "NY", name: "New York" },
  { code: "PA", name: "Pennsylvania" },
  { code: "IL", name: "Illinois" },
  { code: "OH", name: "Ohio" },
  { code: "GA", name: "Georgia" },
  { code: "NC", name: "North Carolina" },
  { code: "MI", name: "Michigan" },
  { code: "NJ", name: "New Jersey" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "AZ", name: "Arizona" },
  { code: "MA", name: "Massachusetts" },
  { code: "TN", name: "Tennessee" },
  { code: "IN", name: "Indiana" },
  { code: "MO", name: "Missouri" },
  { code: "MD", name: "Maryland" },
  { code: "WI", name: "Wisconsin" },
]

const GEOGRAPHIC_LEVELS = [
  { value: "county", label: "County Level", description: "County-level analysis" },
  { value: "zip", label: "ZIP Code Level", description: "ZIP code analysis" },
  { value: "tract", label: "Census Tract Level", description: "Detailed tract analysis" },
]

interface LoadingStatus {
  geoJson: "loading" | "success" | "failed" | "not-attempted"
  censusData: "loading" | "success" | "failed" | "not-attempted"
  fredData: "loading" | "success" | "failed" | "not-attempted"
  redfinData: "loading" | "success" | "failed" | "not-attempted"
}

interface MatchingStats {
  totalFeatures: number
  matchedFeatures: number
  unmatchedFeatures: number
  matchRate: number
}

export default function Dashboard() {
  const [selectedState, setSelectedState] = useState<string>("")
  const [selectedLevel, setSelectedLevel] = useState<string>("county")
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState<LoadingStatus>({
    geoJson: "not-attempted",
    censusData: "not-attempted",
    fredData: "not-attempted",
    redfinData: "not-attempted",
  })
  const [matchingStats, setMatchingStats] = useState<MatchingStats>({
    totalFeatures: 0,
    matchedFeatures: 0,
    unmatchedFeatures: 0,
    matchRate: 0,
  })
  const [loadTime, setLoadTime] = useState<number>(0)
  const [coverage, setCoverage] = useState<any>(null)
  const [cacheStats, setCacheStats] = useState<any>(null)

  const handleLoadData = async () => {
    if (!selectedState || !selectedLevel) return

    setIsLoading(true)
    setLoadingStatus({
      geoJson: "not-attempted",
      censusData: "not-attempted",
      fredData: "not-attempted",
      redfinData: "not-attempted",
    })

    try {
      // Load state indexes first
      await loadStateIndexes(selectedState)

      // Check coverage
      const coverageInfo = await checkDataCoverage(selectedState, selectedLevel as "county" | "zip" | "tract")
      setCoverage(coverageInfo)

      // Load data with real-time status updates
      const result = await loadDataWithCloudflare(selectedState, selectedLevel, "county")

      setLoadingStatus(result.loadingStatus)
      setMatchingStats(result.matchingStats)
      setLoadTime(result.loadTime || 0)

      // Update cache stats
      const stats = getCacheStats()
      setCacheStats(stats)
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-500"
      case "loading":
        return "bg-yellow-500 animate-pulse"
      case "failed":
        return "bg-red-500"
      default:
        return "bg-gray-300"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "success":
        return "Success"
      case "loading":
        return "Loading..."
      case "failed":
        return "Failed"
      default:
        return "Not Started"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <MapPin className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Real Estate Data Platform</h1>
                <p className="text-sm text-gray-500">Advanced geographic data analysis</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              Powered by Cloudflare R2
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Control Panel */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Controls</span>
                </CardTitle>
                <CardDescription>Select state and geographic level</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">State</label>
                  <Select value={selectedState} onValueChange={setSelectedState}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a state" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((state) => (
                        <SelectItem key={state.code} value={state.code}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Geographic Level</label>
                  <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GEOGRAPHIC_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          <div>
                            <div className="font-medium">{level.label}</div>
                            <div className="text-xs text-gray-500">{level.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleLoadData}
                  disabled={!selectedState || !selectedLevel || isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading Data...
                    </>
                  ) : (
                    <>
                      <Database className="mr-2 h-4 w-4" />
                      Load Data
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Data Coverage Info */}
            {coverage && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Data Coverage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Records:</span>
                    <span className="font-medium">{coverage.total || "N/A"}</span>
                  </div>
                  {coverage.withRedfin && (
                    <div className="flex justify-between text-sm">
                      <span>With Redfin Data:</span>
                      <span className="font-medium">{coverage.withRedfin}</span>
                    </div>
                  )}
                  {coverage.redfinPercent && (
                    <div className="flex justify-between text-sm">
                      <span>Coverage:</span>
                      <Badge variant={coverage.redfinPercent > 60 ? "default" : "secondary"}>
                        {coverage.redfinPercent.toFixed(1)}%
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Loading Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Data Loading Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(loadingStatus).map(([key, status]) => (
                    <div key={key} className="text-center">
                      <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${getStatusColor(status)}`} />
                      <div className="text-xs font-medium capitalize">{key.replace(/([A-Z])/g, " $1")}</div>
                      <div className="text-xs text-gray-500">{getStatusText(status)}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Map Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle>Geographic Visualization</CardTitle>
                <CardDescription>
                  {selectedState && selectedLevel
                    ? `${US_STATES.find((s) => s.code === selectedState)?.name} - ${selectedLevel} level`
                    : "Select state and level to view map"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">Interactive Map</p>
                    <p className="text-sm text-gray-400">
                      {selectedState && selectedLevel
                        ? `Ready to display ${selectedLevel} data for ${selectedState}`
                        : "Select parameters and load data to view map"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistics */}
            {matchingStats.totalFeatures > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Database className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Features</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {matchingStats.totalFeatures.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <TrendingUp className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Match Rate</p>
                        <p className="text-2xl font-bold text-gray-900">{matchingStats.matchRate.toFixed(1)}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <BarChart3 className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Load Time</p>
                        <p className="text-2xl font-bold text-gray-900">{loadTime.toFixed(0)}ms</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Cache Statistics */}
            {cacheStats && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">System Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-600">
                    <p>
                      Cached States: <span className="font-medium">{cacheStats.cachedStates}</span>
                    </p>
                    {cacheStats.details.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {cacheStats.details.map((detail: any) => (
                          <div key={detail.state} className="flex justify-between">
                            <span>{detail.state}:</span>
                            <span>{detail.counties + detail.zips + detail.tracts} records</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
