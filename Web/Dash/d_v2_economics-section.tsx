"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, DollarSign, Users, GraduationCap } from "lucide-react"

export default function EconomicsSection({ data, allData }: { data: any; allData: any[] }) {
  // Economic metrics for current area
  const economicMetrics = [
    {
      metric: "Median Income",
      value: data.income_median,
      format: "currency",
      description: data.income_level,
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      metric: "Unemployment Rate",
      value: data.employment_unemployment_rate,
      format: "percent",
      description:
        data.employment_unemployment_rate > 8 ? "High" : data.employment_unemployment_rate > 5 ? "Moderate" : "Low",
      icon: Users,
      color: data.employment_unemployment_rate > 8 ? "text-red-600" : "text-blue-600",
    },
    {
      metric: "Poverty Rate",
      value: data.poverty_rate,
      format: "percent",
      description: data.poverty_rate > 20 ? "High" : data.poverty_rate > 10 ? "Moderate" : "Low",
      icon: TrendingUp,
      color: data.poverty_rate > 20 ? "text-red-600" : "text-yellow-600",
    },
    {
      metric: "Higher Education",
      value: data.education_higher_education_pct,
      format: "percent",
      description:
        data.education_higher_education_pct > 40
          ? "High"
          : data.education_higher_education_pct > 25
            ? "Moderate"
            : "Low",
      icon: GraduationCap,
      color: "text-purple-600",
    },
  ]

  // Income comparison across ZIP codes
  const incomeComparison = allData.map((item) => ({
    zip: item.zip,
    income: item.income_median,
    unemployment: item.employment_unemployment_rate,
    poverty: item.poverty_rate,
    education: item.education_higher_education_pct,
  }))

  const formatNumber = (value: number, format: string) => {
    switch (format) {
      case "currency":
        return formatCurrency(value)
      case "percent":
        return `${value?.toFixed(1)}%`
      default:
        return value?.toString()
    }
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value?.toLocaleString()}`
  }

  return (
    <div className="space-y-6">
      {/* Economic Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {economicMetrics.map((metric, index) => {
          const IconComponent = metric.icon
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{metric.metric}</p>
                    <p className="text-2xl font-bold">{formatNumber(metric.value, metric.format)}</p>
                    <Badge variant="outline" className="mt-2">
                      {metric.description}
                    </Badge>
                  </div>
                  <IconComponent className={`h-8 w-8 ${metric.color}`} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Median Income by ZIP Code</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                income: {
                  label: "Income",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="zip" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    formatter={(value) => [formatCurrency(value as number), "Income"]}
                  />
                  <Bar dataKey="income" fill="var(--color-income)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Unemployment Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Unemployment Rate by ZIP Code</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                unemployment: {
                  label: "Unemployment Rate",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="zip" />
                  <YAxis tickFormatter={(value) => `${value}%`} />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    formatter={(value) => [`${(value as number).toFixed(1)}%`, "Unemployment Rate"]}
                  />
                  <Bar dataKey="unemployment" fill="var(--color-unemployment)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Economic Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Economic Analysis Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <h4 className="font-semibold">Income Level</h4>
              <p className="text-sm text-muted-foreground">{data.income_level}</p>
              <p className="text-lg font-bold">{formatCurrency(data.income_median)}</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Employment</h4>
              <p className="text-sm text-muted-foreground">
                {data.employment_unemployment_rate > 8 ? "High Unemployment" : "Stable Employment"}
              </p>
              <p className="text-lg font-bold">{data.employment_unemployment_rate?.toFixed(1)}% Unemployed</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Education</h4>
              <p className="text-sm text-muted-foreground">
                {data.education_higher_education_pct > 40 ? "Highly Educated" : "Moderate Education"}
              </p>
              <p className="text-lg font-bold">{data.education_higher_education_pct?.toFixed(1)}% Higher Ed</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Economic Rank</h4>
              <p className="text-sm text-muted-foreground">By Income</p>
              <p className="text-lg font-bold">
                #
                {allData.sort((a, b) => b.income_median - a.income_median).findIndex((item) => item.zip === data.zip) +
                  1}{" "}
                of {allData.length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
