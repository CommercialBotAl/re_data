"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight, HelpCircle } from "lucide-react"

interface TractMetric {
  id: string
  label: string
  category: string
  type: string
  format?: string
  description?: string
  colors: string[]
}

interface TractMetricsSelectorProps {
  metrics: TractMetric[]
  selectedMetric: string
  onMetricSelect: (metricId: string) => void
}

// Categories for tract data
const TRACT_CATEGORIES = {
  demographics: { label: "Demographics", icon: "👥", order: 1 },
  housing: { label: "Housing", icon: "🏠", order: 2 },
  economic: { label: "Economic", icon: "📊", order: 3 },
  real_estate: { label: "Real Estate", icon: "🏡", order: 4 },
  education: { label: "Education", icon: "🎓", order: 5 },
}

export function TractMetricsSelector({ metrics, selectedMetric, onMetricSelect }: TractMetricsSelectorProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["demographics", "housing"]))

  // Group metrics by category
  const metricsByCategory = metrics.reduce(
    (acc, metric) => {
      const category = metric.category || "other"
      if (!acc[category]) acc[category] = []
      acc[category].push(metric)
      return acc
    },
    {} as Record<string, TractMetric[]>,
  )

  // Sort categories by order
  const sortedCategories = Object.keys(metricsByCategory).sort((a, b) => {
    const aOrder = TRACT_CATEGORIES[a as keyof typeof TRACT_CATEGORIES]?.order || 100
    const bOrder = TRACT_CATEGORIES[b as keyof typeof TRACT_CATEGORIES]?.order || 100
    return aOrder - bOrder
  })

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  if (metrics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tract Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No metrics available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex justify-between items-center">
          <span>Tract Metrics</span>
          <Badge variant="outline" className="w-fit">
            Census
          </Badge>
        </CardTitle>
        <div className="text-xs text-gray-500">{metrics.length} metrics available</div>
      </CardHeader>
      <CardContent className="space-y-2">
        {sortedCategories.map((categoryKey) => {
          const categoryMetrics = metricsByCategory[categoryKey]
          const categoryConfig = TRACT_CATEGORIES[categoryKey as keyof typeof TRACT_CATEGORIES] || {
            label: categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1),
            icon: "📋",
            order: 100,
          }
          const isExpanded = expandedCategories.has(categoryKey)

          return (
            <div key={categoryKey} className="border rounded-lg">
              <Button
                variant="ghost"
                className="w-full justify-between p-3 h-auto"
                onClick={() => toggleCategory(categoryKey)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{categoryConfig.icon}</span>
                  <div className="text-left">
                    <div className="font-medium text-sm">{categoryConfig.label}</div>
                    <div className="text-xs text-gray-500">{categoryMetrics.length} metrics</div>
                  </div>
                </div>
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>

              {isExpanded && (
                <div className="border-t bg-gray-50 p-2 space-y-1">
                  {categoryMetrics.map((metric) => (
                    <Button
                      key={metric.id}
                      variant={selectedMetric === metric.id ? "default" : "ghost"}
                      className="w-full justify-start text-left h-auto p-2"
                      onClick={() => onMetricSelect(metric.id)}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm flex items-center gap-1">
                          {metric.label}
                          {metric.description && (
                            <HelpCircle className="h-3 w-3 text-gray-400" title={metric.description} />
                          )}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            {metric.type}
                          </Badge>
                          {metric.format && (
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              {metric.format}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* Selected metric info */}
        {selectedMetric && (
          <div className="mt-4 p-3 bg-blue-50 rounded border">
            <h4 className="text-sm font-semibold mb-1">Selected</h4>
            <div className="text-sm">{metrics.find((m) => m.id === selectedMetric)?.label || selectedMetric}</div>
            {metrics.find((m) => m.id === selectedMetric)?.description && (
              <div className="text-xs text-gray-600 mt-1">
                {metrics.find((m) => m.id === selectedMetric)?.description}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
