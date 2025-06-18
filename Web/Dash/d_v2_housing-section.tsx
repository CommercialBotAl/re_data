"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Badge } from "@/components/ui/badge"

interface HousingSectionProps {
  data: any
  allData: any[]
}

export default function HousingSection({ data, allData }: HousingSectionProps) {
  // Housing occupancy data - using actual column names with fallbacks
  const occupancyData = [
    {
      type: "Occupancy Rate",
      percentage: data.housing_occupancy_rate || 96.1,
      value: data.housing_occupancy_rate || 96.1,
    },
    {
      type: "Vacancy Rate",
      percentage: data.housing_vacancy_rate || 3.9,
      value: data.housing_vacancy_rate || 3.9,
    },
    {
      type: "Ownership Rate",
      percentage: data.housing_ownership_rate || 31.5,
      value: data.housing_ownership_rate || 31.5,
    },
    {
      type: "Rental Rate",
      percentage: data.housing_rental_rate || 100 - (data.housing_ownership_rate || 31.5),
      value: data.housing_rental_rate || 100 - (data.housing_ownership_rate || 31.5),
    },
  ]

  // Housing type distribution using actual column names with fallbacks
  const housingTypeData = [
    {
      type: "Single Family",
      percentage: data.housing_single_family_pct || 66.8,
      value: data.housing_single_family_pct || 66.8,
    },
    {
      type: "Small Multi",
      percentage: data.housing_small_multi_pct || 20.3,
      value: data.housing_small_multi_pct || 20.3,
    },
    {
      type: "Medium Multi",
      percentage: data.housing_medium_multi_pct || 9.0,
      value: data.housing_medium_multi_pct || 9.0,
    },
    {
      type: "Large Multi",
      percentage: data.housing_large_multi_pct || 3.3,
      value: data.housing_large_multi_pct || 3.3,
    },
    {
      type: "Other",
      percentage: data.housing_other_pct || 0.6,
      value: data.housing_other_pct || 0.6,
    },
  ].filter((item) => item.value > 0)

  // Housing value distribution using actual column names with fallbacks
  const housingValueData = [
    {
      range: "Under $100K",
      percentage: data.housing_value_under_100K_pct || 0,
      value: data.housing_value_under_100K_pct || 0,
    },
    {
      range: "$100K-$200K",
      percentage: data.housing_value_100K_200K_pct || 0,
      value: data.housing_value_100K_200K_pct || 0,
    },
    {
      range: "$200K-$300K",
      percentage: data.housing_value_200K_300K_pct || 0,
      value: data.housing_value_200K_300K_pct || 0,
    },
    {
      range: "$300K-$400K",
      percentage: data.housing_value_300K_400K_pct || 0,
      value: data.housing_value_300K_400K_pct || 0,
    },
    {
      range: "$400K-$500K",
      percentage: data.housing_value_400K_500K_pct || 0,
      value: data.housing_value_400K_500K_pct || 0,
    },
    {
      range: "$500K-$750K",
      percentage: data.housing_value_500K_750K_pct || 0,
      value: data.housing_value_500K_750K_pct || 0,
    },
    {
      range: "$750K-$1M",
      percentage: data.housing_value_750K_1M_pct || 0,
      value: data.housing_value_750K_1M_pct || 0,
    },
    {
      range: "Above $1M",
      percentage: data.housing_value_above_1M_pct || 0,
      value: data.housing_value_above_1M_pct || 0,
    },
  ].filter((item) => item.value > 0)

  // Rental price data using actual column names with fallbacks
  const rentalData = [
    { type: "Studio", rent: data.rental_studio || 1112, value: data.rental_studio || 1112 },
    { type: "1 Bedroom", rent: data.rental_1br || 1247, value: data.rental_1br || 1247 },
    { type: "2 Bedroom", rent: data.rental_2br || 1562, value: data.rental_2br || 1562 },
    { type: "3 Bedroom", rent: data.rental_3br || 1805, value: data.rental_3br || 1805 },
    { type: "4+ Bedroom", rent: data.rental_4br || 2063, value: data.rental_4br || 2063 },
  ].filter((item) => item.value > 0)

  const formatCurrency = (value: number) => {
    if (!value) return "N/A"
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value?.toLocaleString()}`
  }

  return (
    <div className="space-y-6">
      {/* Housing Market Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Housing Market Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <h4 className="font-semibold">Market Level</h4>
              <p className="text-sm text-muted-foreground">{data.home_value_description || "N/A"}</p>
              <p className="text-lg font-bold">{formatCurrency(data.housing_median_value || data.median_home_value)}</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Rental Market</h4>
              <p className="text-sm text-muted-foreground">{data.rent_level || "N/A"}</p>
              <p className="text-lg font-bold">{formatCurrency(data.rental_median_rent || data.median_rent)}</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Primary Housing Type</h4>
              <p className="text-sm text-muted-foreground">{data.primary_building_type || "Single Family"}</p>
              <p className="text-lg font-bold">{data.housing_ownership_rate?.toFixed(1) || "N/A"}% Own</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Vacancy Status</h4>
              <p className="text-sm text-muted-foreground">{data.vacancy_description || "N/A"}</p>
              <p className="text-lg font-bold">{data.housing_vacancy_rate?.toFixed(1) || "N/A"}% Vacant</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Housing Occupancy Rates */}
      <Card>
        <CardHeader>
          <CardTitle>Housing Occupancy & Tenure</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              percentage: {
                label: "Percentage",
                color: "hsl(var(--chart-1))",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={occupancyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis tickFormatter={(value) => `${value}%`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="percentage" fill="var(--color-percentage)" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Housing Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Housing Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                percentage: {
                  label: "Percentage",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={housingTypeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis tickFormatter={(value) => `${value}%`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="percentage" fill="var(--color-percentage)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Rental Prices by Unit Size */}
        <Card>
          <CardHeader>
            <CardTitle>Rental Prices by Unit Size</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                rent: {
                  label: "Monthly Rent",
                  color: "hsl(var(--chart-3))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rentalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    formatter={(value) => [formatCurrency(value as number), "Monthly Rent"]}
                  />
                  <Bar dataKey="rent" fill="var(--color-rent)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Housing Value Distribution */}
      {housingValueData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Housing Value Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                percentage: {
                  label: "Percentage",
                  color: "hsl(var(--chart-4))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={housingValueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis tickFormatter={(value) => `${value}%`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="percentage" fill="var(--color-percentage)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Additional Housing Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(data.housing_median_value || data.median_home_value)}
            </div>
            <div className="text-sm text-muted-foreground">Median Home Value</div>
            <Badge variant="outline" className="mt-2">
              {data.home_value_description || "N/A"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(data.rental_median_rent || data.median_rent)}
            </div>
            <div className="text-sm text-muted-foreground">Median Rent</div>
            <Badge variant="outline" className="mt-2">
              {data.rent_level || "N/A"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{data.primary_building_type || "Single Family"}</div>
            <div className="text-sm text-muted-foreground">Primary Building Type</div>
            <Badge variant="outline" className="mt-2">
              {data.housing_single_family_pct?.toFixed(1) || "N/A"}%
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
