"use client"

import { useState, useEffect } from "react"
import { MapPin, Search, Loader2, ChevronRight } from "lucide-react"
import { unifiedDataService, type UnifiedLocation } from "@/lib/unified-data-service"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface IntegratedLocationNavigatorProps {
  onLocationSelect: (location: UnifiedLocation) => void
  onInitialized: (initialized: boolean) => void
}

export default function IntegratedLocationNavigator({
  onLocationSelect,
  onInitialized,
}: IntegratedLocationNavigatorProps) {
  const [selectedState, setSelectedState] = useState<UnifiedLocation | null>(null)
  const [selectedLevel, setSelectedLevel] = useState("state")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<UnifiedLocation[]>([])
  const [locations, setLocations] = useState<UnifiedLocation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const [breadcrumb, setBreadcrumb] = useState<UnifiedLocation[]>([])

  // Initialize the unified data service
  useEffect(() => {
    const initializeService = async () => {
      try {
        setIsLoading(true)
        await unifiedDataService.initialize()
        setIsInitialized(true)
        onInitialized(true)

        // Load initial states
        const states = unifiedDataService.getStates()
        setLocations(states)
      } catch (error) {
        console.error("Failed to initialize unified data service:", error)

        // More specific error messages
        let errorMessage = "Failed to load data"
        if (error instanceof Error) {
          if (error.message.includes("redfin_master_index.json")) {
            errorMessage = "Missing redfin_master_index.json in /public folder"
          } else if (error.message.includes("zip_master_index.csv")) {
            errorMessage = "Missing zip_master_index.csv in /public folder"
          } else {
            errorMessage = error.message
          }
        }

        setInitError(errorMessage)

        // Still try to initialize with mock data
        try {
          await unifiedDataService.initialize()
          setIsInitialized(true)
          onInitialized(true)
          const states = unifiedDataService.getStates()
          setLocations(states)
        } catch (mockError) {
          onInitialized(false)
        }
      } finally {
        setIsLoading(false)
      }
    }

    initializeService()
  }, [onInitialized])

  // Handle level change
  const handleLevelChange = async (level: string) => {
    if (!selectedState && level !== "state") return

    setIsLoading(true)
    setSelectedLevel(level)

    try {
      let newLocations: UnifiedLocation[] = []

      switch (level) {
        case "state":
          newLocations = unifiedDataService.getStates()
          setBreadcrumb([])
          break
        case "county":
          newLocations = unifiedDataService.getCountiesInState(selectedState!.stateCode)
          setBreadcrumb([selectedState!])
          break
        case "city":
          newLocations = unifiedDataService.getCitiesInState(selectedState!.stateCode)
          setBreadcrumb([selectedState!])
          break
        case "zip":
          newLocations = unifiedDataService.getZipsInState(selectedState!.stateCode)
          setBreadcrumb([selectedState!])
          break
      }

      setLocations(newLocations)
    } catch (error) {
      console.error("Error loading locations:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (query.length > 2) {
      const results = unifiedDataService.searchLocations(query)
      setSearchResults(results.slice(0, 10))
    } else {
      setSearchResults([])
    }
  }

  // Handle location selection
  const handleLocationSelect = (location: UnifiedLocation) => {
    onLocationSelect(location)

    // If selecting a state, load its counties by default
    if (location.hierarchicalPath.split(" > ").length === 1) {
      setSelectedState(location)
      setSelectedLevel("county")
      handleLevelChange("county")
    }
  }

  if (!isInitialized) {
    return (
      <div className="p-6 text-center">
        {isLoading ? (
          <div className="flex items-center justify-center space-x-3">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span>Loading real estate data indices...</span>
          </div>
        ) : initError ? (
          <div className="text-red-600">
            <h3 className="text-lg font-semibold mb-2">Using Mock Data</h3>
            <p className="text-sm mb-2">Could not load real data files, using mock data instead.</p>
            <details className="text-xs">
              <summary className="cursor-pointer text-blue-600 hover:text-blue-800">Show error details</summary>
              <div className="mt-2 p-2 bg-gray-100 rounded">
                <p className="font-mono">{initError}</p>
              </div>
            </details>
            <div className="mt-3 p-3 bg-blue-50 rounded text-blue-800">
              <h4 className="font-semibold text-sm">To use real data:</h4>
              <ol className="text-xs mt-1 list-decimal list-inside space-y-1">
                <li>
                  Add <code>redfin_master_index.json</code> to your <code>/public</code> folder
                </li>
                <li>
                  Add <code>zip_master_index.csv</code> to your <code>/public</code> folder
                </li>
                <li>Refresh the page</li>
              </ol>
            </div>
          </div>
        ) : (
          <span>Initializing...</span>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb Navigation */}
      {breadcrumb.length > 0 && (
        <div className="flex items-center space-x-2 text-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedState(null)
              setSelectedLevel("state")
              handleLevelChange("state")
            }}
          >
            All States
          </Button>
          {breadcrumb.map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <span className="font-medium">{item.stateName}</span>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by location name or ZIP code..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />

        {searchResults.length > 0 && searchQuery.length > 2 && (
          <div className="absolute top-full left-0 right-0 mt-1 border rounded-md bg-white shadow-lg z-10 max-h-60 overflow-y-auto">
            {searchResults.map((result, index) => (
              <div
                key={index}
                onClick={() => {
                  handleLocationSelect(result)
                  setSearchQuery("")
                  setSearchResults([])
                }}
                className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium">{result.hierarchicalPath}</div>
                  {result.zipCode && <div className="text-sm text-gray-500">ZIP: {result.zipCode}</div>}
                </div>
                <div className="flex space-x-1">
                  {result.hasData.census && (
                    <Badge variant="secondary" className="text-xs">
                      Census
                    </Badge>
                  )}
                  {result.hasData.redfin && (
                    <Badge variant="secondary" className="text-xs">
                      Redfin
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Level Navigation */}
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium">Browse by:</span>
        {["state", "county", "city", "zip"].map((level) => (
          <Button
            key={level}
            onClick={() => handleLevelChange(level)}
            disabled={!selectedState && level !== "state"}
            variant={selectedLevel === level ? "default" : "outline"}
            size="sm"
          >
            {level.charAt(0).toUpperCase() + level.slice(1)}
          </Button>
        ))}
      </div>

      {/* Locations Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">
            {selectedLevel.charAt(0).toUpperCase() + selectedLevel.slice(1)} Locations
            {selectedState && ` in ${selectedState.stateName}`}
          </h3>
          {isLoading && (
            <div className="flex items-center text-sm text-gray-500">
              <Loader2 className="animate-spin h-4 w-4 mr-2" />
              Loading...
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
          {locations.map((location, index) => {
            const pathParts = location.hierarchicalPath.split(" > ")

            return (
              <div
                key={index}
                onClick={() => handleLocationSelect(location)}
                className="border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md hover:border-blue-300"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{pathParts[pathParts.length - 1]}</h4>
                    {location.zipCode && <p className="text-xs text-blue-600 font-mono">ZIP: {location.zipCode}</p>}
                  </div>
                  <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </div>

                <div className="flex flex-wrap gap-1 mb-2">
                  {location.hasData.census && (
                    <Badge variant="secondary" className="text-xs">
                      Census
                    </Badge>
                  )}
                  {location.hasData.redfin && (
                    <Badge variant="secondary" className="text-xs">
                      Redfin
                    </Badge>
                  )}
                  {location.hasData.geometry && (
                    <Badge variant="secondary" className="text-xs">
                      Map
                    </Badge>
                  )}
                </div>

                <div className="text-xs text-gray-500">
                  📍 {location.coordinates[0].toFixed(4)}, {location.coordinates[1].toFixed(4)}
                </div>
              </div>
            )
          })}
        </div>

        {locations.length === 0 && !isLoading && (
          <div className="text-center text-gray-500 py-8">
            {selectedLevel === "state"
              ? "No states available"
              : `No ${selectedLevel}s found${selectedState ? ` in ${selectedState.stateName}` : ""}`}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-3 text-center">
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="text-lg font-bold text-blue-600">{locations.length}</div>
          <div className="text-xs text-gray-600">Available</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3">
          <div className="text-lg font-bold text-green-600">{locations.filter((l) => l.hasData.census).length}</div>
          <div className="text-xs text-gray-600">Census</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-3">
          <div className="text-lg font-bold text-purple-600">{locations.filter((l) => l.hasData.redfin).length}</div>
          <div className="text-xs text-gray-600">Redfin</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-3">
          <div className="text-lg font-bold text-orange-600">{locations.filter((l) => l.hasData.geometry).length}</div>
          <div className="text-xs text-gray-600">Geometry</div>
        </div>
      </div>
    </div>
  )
}
