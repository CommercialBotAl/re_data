"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle, MapPin, Database } from "lucide-react"
import { dataService } from "@/lib/data-service"
import type { UnifiedLocation } from "@/lib/unified-data-service"

// Import components
import DemographicsSection from "@/components/demographics-section"
import HousingSection from "@/components/housing-section"
import EconomicsSection from "@/components/economics-section"
import InvestmentSection from "@/components/investment-section"
import HybridMarketSection from "@/components/hybrid-market-section"
import LocationNavigator from "@/components/integrated-location-navigator"
import DataFileChecker from "@/components/data-file-checker"

export default function IntegratedCensusDashboard() {
  const [selectedLocation, setSelectedLocation] = useState<UnifiedLocation | null>(null)
  const [censusData, setCensusData] = useState<any[]>([])
  const [selectedData, setSelectedData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isNavigatorInitialized, setIsNavigatorInitialized] = useState(false)

  // Handle location selection from navigator
  const handleLocationSelect = async (location: UnifiedLocation) => {
    setSelectedLocation(location)
    setError(null)

    // Only load census data for ZIP codes
    if (location.zipCode) {
      await loadCensusDataForLocation(location)
    } else {
      // For state/county/city level, show summary or instructions
      setSelectedData(null)
      setCensusData([])
    }
  }

  // Load census data for selected location
  const loadCensusDataForLocation = async (location: UnifiedLocation) => {
    setLoading(true)
    setError(null)

    try {
      // Load ZIP-level data for the state
      const data = await dataService.loadCensusData(location.stateCode, "zip")
      const dataArray = Array.isArray(data) ? data : [data]

      // Find the specific ZIP code data
      const zipData = dataArray.find(
        (item) =>
          (item.zip || item.zipcode || "").toString() === location.zipCode ||
          (item.geoid || "").toString().endsWith(location.zipCode || ""),
      )

      if (zipData) {
        setSelectedData(zipData)
        setCensusData(dataArray) // Keep all data for comparisons
      } else {
        setError(`No census data found for ZIP ${location.zipCode}`)
        setSelectedData(null)
        setCensusData([])
      }
    } catch (err) {
      console.error("Error loading census data:", err)
      setError(err instanceof Error ? err.message : "Failed to load census data")
      setSelectedData(null)
      setCensusData([])
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    if (!value) return "N/A"
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value?.toLocaleString()}`
  }

  const formatPercent = (value: number) => {
    if (value === null || value === undefined) return "N/A"
    return `${value?.toFixed(1)}%`
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">🏠 Integrated Real Estate & Census Dashboard</h1>
            <p className="text-muted-foreground">
              Navigate locations and explore comprehensive demographic and economic data
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isNavigatorInitialized && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Database className="h-3 w-3" />
                Data Sources Connected
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Data Files Status */}
      <DataFileChecker />

      {/* Location Navigator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Navigator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LocationNavigator onLocationSelect={handleLocationSelect} onInitialized={setIsNavigatorInitialized} />
        </CardContent>
      </Card>

      {/* Selected Location Info */}
      {selectedLocation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Selected Location
              </span>
              <Badge variant="outline">{selectedLocation.zipCode ? "ZIP Level" : "Area Level"}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-semibold text-sm text-gray-600 mb-1">Location Path</h4>
                <p className="font-medium">{selectedLocation.hierarchicalPath}</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-600 mb-1">Coordinates</h4>
                <p className="font-mono text-sm">
                  {selectedLocation.coordinates[0].toFixed(4)}, {selectedLocation.coordinates[1].toFixed(4)}
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-600 mb-1">Data Availability</h4>
                <div className="flex gap-1">
                  {selectedLocation.hasData.census && (
                    <Badge variant="secondary" className="text-xs">
                      Census
                    </Badge>
                  )}
                  {selectedLocation.hasData.redfin && (
                    <Badge variant="secondary" className="text-xs">
                      Redfin
                    </Badge>
                  )}
                  {selectedLocation.hasData.geometry && (
                    <Badge variant="secondary" className="text-xs">
                      Geometry
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {!selectedLocation.zipCode && (
              <div className="mt-4 p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-800">💡 Select a ZIP code to view detailed census data and analytics</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p>Loading census data for {selectedLocation?.zipCode}...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Error loading data</span>
            </div>
            <p className="text-red-600 mt-2">{error}</p>
            {selectedLocation?.zipCode && (
              <Button onClick={() => loadCensusDataForLocation(selectedLocation)} className="mt-4" variant="outline">
                Try Again
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Census Data Dashboard */}
      {selectedData && selectedLocation?.zipCode && (
        <>
          {/* Area Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>
                  ZIP {selectedLocation.zipCode}
                  {selectedData.preferred_city && ` - ${selectedData.preferred_city}`}
                </span>
                <Badge variant="outline">{selectedData.county || selectedData.county_name || "Unknown County"}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {selectedData.population_total?.toLocaleString() || "N/A"}
                  </div>
                  <div className="text-sm text-muted-foreground">Population</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(selectedData.housing_median_value || selectedData.median_home_value)}
                  </div>
                  <div className="text-sm text-muted-foreground">Median Home Value</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatCurrency(selectedData.income_median || selectedData.median_income)}
                  </div>
                  <div className="text-sm text-muted-foreground">Median Income</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {formatPercent(selectedData.housing_ownership_rate || selectedData.ownership_rate)}
                  </div>
                  <div className="text-sm text-muted-foreground">Ownership Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {formatPercent(selectedData.employment_unemployment_rate || selectedData.unemployment_rate)}
                  </div>
                  <div className="text-sm text-muted-foreground">Unemployment</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-teal-600">
                    {selectedData.investment_cap_rate?.toFixed(2) || "N/A"}%
                  </div>
                  <div className="text-sm text-muted-foreground">Cap Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Analysis Tabs */}
          <Tabs defaultValue="demographics" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="demographics">Demographics</TabsTrigger>
              <TabsTrigger value="housing">Housing</TabsTrigger>
              <TabsTrigger value="economics">Economics</TabsTrigger>
              <TabsTrigger value="investment">Investment</TabsTrigger>
              <TabsTrigger value="hybrid">Market Overview</TabsTrigger>
            </TabsList>

            <TabsContent value="demographics" className="mt-6">
              <DemographicsSection data={selectedData} allData={censusData} />
            </TabsContent>

            <TabsContent value="housing" className="mt-6">
              <HousingSection data={selectedData} allData={censusData} />
            </TabsContent>

            <TabsContent value="economics" className="mt-6">
              <EconomicsSection data={selectedData} allData={censusData} />
            </TabsContent>

            <TabsContent value="investment" className="mt-6">
              <InvestmentSection data={selectedData} allData={censusData} />
            </TabsContent>

            <TabsContent value="hybrid" className="mt-6">
              <HybridMarketSection data={selectedData} allData={censusData} />
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Instructions when no location selected */}
      {!selectedLocation && isNavigatorInitialized && (
        <Card>
          <CardContent className="p-8 text-center">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Location to Begin</h3>
            <p className="text-gray-600 mb-4">
              Use the location navigator above to browse states, counties, cities, and ZIP codes.
            </p>
            <p className="text-sm text-gray-500">Select a ZIP code to view detailed census data and analytics.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
