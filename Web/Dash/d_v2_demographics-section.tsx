"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, Pie, PieChart, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

// More muted colors for race distribution
const MUTED_COLORS = ["#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0", "#f1f5f9", "#f8fafc"]

interface DemographicsSectionProps {
  data: any
  allData: any[]
}

export default function DemographicsSection({ data, allData }: DemographicsSectionProps) {
  // Age distribution data using actual column names
  const ageData = [
    { age: "Under 19", percentage: data.pct_under_19 || 0, value: data.pct_under_19 || 0 },
    { age: "20-29", percentage: data.pct_20_29 || 0, value: data.pct_20_29 || 0 },
    { age: "30-39", percentage: data.pct_30_39 || 0, value: data.pct_30_39 || 0 },
    { age: "40-49", percentage: data.pct_40_49 || 0, value: data.pct_40_49 || 0 },
    { age: "50-59", percentage: data.pct_50_59 || 0, value: data.pct_50_59 || 0 },
    { age: "60-69", percentage: data.pct_60_69 || 0, value: data.pct_60_69 || 0 },
    { age: "70+", percentage: data.pct_over_70 || 0, value: data.pct_over_70 || 0 },
  ]

  // Gender distribution data using actual column names
  const genderData = [
    { gender: "Male", percentage: data.population_male_percent || 50, value: data.population_male_percent || 50 },
    { gender: "Female", percentage: data.population_female_percent || 50, value: data.population_female_percent || 50 },
  ]

  // Race/ethnicity data with actual column names and muted colors
  const raceData = [
    { name: "White", value: data.pct_white || 0, percentage: data.pct_white || 0 },
    { name: "Black", value: data.pct_black || 0, percentage: data.pct_black || 0 },
    { name: "Asian", value: data.pct_asian || 0, percentage: data.pct_asian || 0 },
    { name: "Native", value: data.pct_native || 0, percentage: data.pct_native || 0 },
    { name: "Pacific", value: data.pct_pacific || 0, percentage: data.pct_pacific || 0 },
    { name: "Other", value: data.pct_other || 0, percentage: data.pct_other || 0 },
    { name: "Multiracial", value: data.pct_multiracial || 0, percentage: data.pct_multiracial || 0 },
  ].filter((item) => item.value > 0)

  // Population comparison across areas
  const populationComparison = allData.map((item) => ({
    area: item.zip || item.county_name || item.tract_id || "Unknown",
    population: item.population_total || 0,
    city: item.preferred_city || item.city || "",
  }))

  return (
    <div className="space-y-6">
      {/* Key Demographics Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Demographics Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <h4 className="font-semibold">Population Profile</h4>
              <p className="text-sm text-muted-foreground">{data.population_description || "N/A"}</p>
              <p className="text-lg font-bold">{data.population_total?.toLocaleString() || "N/A"} residents</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Predominant Demographics</h4>
              <p className="text-sm text-muted-foreground">
                {data.predominant_race || "N/A"}: {data.predominant_race_pct?.toFixed(1) || "N/A"}%
              </p>
              <p className="text-sm text-muted-foreground">
                {data.second_predominant_race || "N/A"}: {data.second_predominant_race_pct?.toFixed(1) || "N/A"}%
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Education Level</h4>
              <p className="text-sm text-muted-foreground">{data.education_level || "N/A"}</p>
              <p className="text-lg font-bold">{data.education_higher_education_pct?.toFixed(1) || "N/A"}%</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Gender Split</h4>
              <p className="text-sm text-muted-foreground">{data.population_male_percent?.toFixed(1) || "50"}% Male</p>
              <p className="text-sm text-muted-foreground">
                {data.population_female_percent?.toFixed(1) || "50"}% Female
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Age Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Age Distribution</CardTitle>
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
                <BarChart data={ageData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="age" />
                  <YAxis tickFormatter={(value) => `${value}%`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="percentage" fill="var(--color-percentage)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Gender Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Gender Distribution</CardTitle>
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
                <BarChart data={genderData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="gender" />
                  <YAxis tickFormatter={(value) => `${value}%`} domain={[45, 55]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="percentage" fill="var(--color-percentage)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Race/Ethnicity Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Race/Ethnicity Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                value: {
                  label: "Percentage",
                  color: "hsl(var(--chart-3))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={raceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {raceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={MUTED_COLORS[index % MUTED_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${(value as number).toFixed(1)}%`, "Percentage"]} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Population Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Population Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                population: {
                  label: "Population",
                  color: "hsl(var(--chart-4))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={populationComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="area" />
                  <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    formatter={(value) => [(value as number).toLocaleString(), "Population"]}
                  />
                  <Bar dataKey="population" fill="var(--color-population)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
