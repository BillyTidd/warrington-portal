"use client";

import { useTheme } from "next-themes";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Area,
  AreaChart,
  ComposedChart,
  Brush,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useMemo, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Download,
  BarChart3,
  LineChartIcon,
  TrendingUp,
  LayoutPanelTop,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface MonthlyRevenueChartProps {
  data: any;
  isLoading?: boolean;
  timeframe?: string;
}

export function MonthlyRevenueChart({
  data = { chartData: [], statistics: {} },
  isLoading = false,
  timeframe = "month",
}: MonthlyRevenueChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [chartType, setChartType] = useState<
    "bar" | "line" | "area" | "composed"
  >("bar");
  const chartRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // If no data is provided, use sample data
  const chartData =
    data.chartData && data.chartData.length > 0
      ? data.chartData
      : [
          { name: "Jan", total: 1500, count: 15 },
          { name: "Feb", total: 2300, count: 23 },
          { name: "Mar", total: 3200, count: 32 },
          { name: "Apr", total: 2800, count: 28 },
          { name: "May", total: 3800, count: 38 },
          { name: "Jun", total: 4300, count: 43 },
          { name: "Jul", total: 3900, count: 39 },
          { name: "Aug", total: 4800, count: 48 },
          { name: "Sep", total: 5200, count: 52 },
          { name: "Oct", total: 4700, count: 47 },
          { name: "Nov", total: 5900, count: 59 },
          { name: "Dec", total: 6500, count: 65 },
        ];

  // Get statistics
  const statistics = data.statistics || {
    totalRevenue: chartData.reduce((sum, item) => sum + item.total, 0),
    averageRevenue:
      chartData.reduce((sum, item) => sum + item.total, 0) / chartData.length,
    growthRate: 12,
    entriesCount: chartData.reduce((sum, item) => sum + (item.count || 0), 0),
  };

  // Calculate moving average
  const movingAverageData = useMemo(() => {
    return chartData.map((item, index, array) => {
      if (index < 2) return { ...item, average: item.total };

      const avg =
        (array[index].total + array[index - 1].total + array[index - 2].total) /
        3;
      return { ...item, average: Math.round(avg) };
    });
  }, [chartData]);

  // Calculate min width for the chart container based on data points
  const minChartWidth = useMemo(() => {
    const dataToUse = chartType === "composed" ? movingAverageData : chartData;
    return Math.max(dataToUse.length * 50, 400) + "px";
  }, [chartData, movingAverageData, chartType]);

  // Calculate max value for y-axis
  const maxValue = useMemo(() => {
    let max = 0;
    chartData.forEach((item) => {
      if (item.total > max) max = item.total;
    });
    // Round up to nearest 1000
    return Math.ceil(max / 1000) * 1000;
  }, [chartData]);

  // Format x-axis ticks based on timeframe
  const formatXAxisTick = useCallback(
    (value) => {
      if (timeframe === "week" || timeframe === "last7") {
        // For weekly view, show day of week
        return value;
      } else if (timeframe === "month" || timeframe === "last30") {
        // For monthly view, abbreviate
        return value;
      } else if (timeframe === "quarter" || timeframe === "last90") {
        // For quarterly view, further abbreviate
        return value;
      }
      return value;
    },
    [timeframe]
  );

  // Download chart as image
  const downloadChart = useCallback(() => {
    if (!chartRef.current) return;

    setIsDownloading(true);

    try {
      // Get the SVG element
      const svgElement = chartRef.current.querySelector("svg");
      if (!svgElement) {
        toast({
          title: "Error",
          description: "Could not find chart to download",
          variant: "destructive",
        });
        setIsDownloading(false);
        return;
      }

      // Create a canvas element
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        toast({
          title: "Error",
          description: "Your browser doesn't support canvas",
          variant: "destructive",
        });
        setIsDownloading(false);
        return;
      }

      // Set canvas dimensions
      const svgRect = svgElement.getBoundingClientRect();
      canvas.width = svgRect.width;
      canvas.height = svgRect.height;

      // Create an image from the SVG
      const image = new Image();
      image.crossOrigin = "anonymous";

      // Convert SVG to data URL
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);

      image.onload = () => {
        // Draw the image on the canvas
        ctx.fillStyle = isDark ? "#1e1e1e" : "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0);

        // Convert canvas to PNG
        const pngUrl = canvas.toDataURL("image/png");

        // Create download link
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `monthly-revenue-${chartType}-${
          new Date().toISOString().split("T")[0]
        }.png`;

        // Trigger download
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        // Clean up
        URL.revokeObjectURL(url);
        setIsDownloading(false);

        toast({
          title: "Success",
          description: "Chart downloaded successfully",
        });
      };

      image.onerror = () => {
        toast({
          title: "Error",
          description: "Failed to generate image",
          variant: "destructive",
        });
        setIsDownloading(false);
      };

      image.src = url;
    } catch (error) {
      console.error("Error downloading chart:", error);
      toast({
        title: "Error",
        description: "An error occurred while downloading the chart",
        variant: "destructive",
      });
      setIsDownloading(false);
    }
  }, [isDark, chartType]);

  // Render tooltip for bar, line, and area charts
  const renderSimpleTooltip = useCallback(({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Card className="border shadow-sm">
          <CardContent className="p-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="font-medium">{label}</div>
              <div className="text-right font-medium">
                £{payload[0].value.toLocaleString()}
              </div>
              {payload[0].payload.count && (
                <>
                  <div className="font-medium">Entries</div>
                  <div className="text-right font-medium">
                    {payload[0].payload.count}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }
    return null;
  }, []);

  // Render tooltip for composed chart
  const renderComposedTooltip = useCallback(({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Card className="border shadow-sm">
          <CardContent className="p-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="font-medium">{label}</div>
              <div className="font-medium">Amount</div>
              {payload.map((entry) => (
                <div key={entry.dataKey} className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span>{entry.name}</span>
                </div>
              ))}
              {payload.map((entry) => (
                <div key={entry.dataKey} className="text-right font-medium">
                  £{entry.value.toLocaleString()}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      );
    }
    return null;
  }, []);

  return (
    <div className="h-full">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          defaultValue="bar"
          onValueChange={(value) =>
            setChartType(value as "bar" | "line" | "area" | "composed")
          }
        >
          <TabsList className="grid w-full sm:w-[400px] grid-cols-4">
            <TabsTrigger value="bar" className="flex items-center gap-1">
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Bar</span>
            </TabsTrigger>
            <TabsTrigger value="line" className="flex items-center gap-1">
              <LineChartIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Line</span>
            </TabsTrigger>
            <TabsTrigger value="area" className="flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Area</span>
            </TabsTrigger>
            <TabsTrigger value="composed" className="flex items-center gap-1">
              <LayoutPanelTop className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Composed</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={downloadChart}
            disabled={isDownloading}
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            {isDownloading ? "Downloading..." : "Download"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Badge variant="outline" className="bg-primary/10 text-primary">
          Total: £{statistics.totalRevenue?.toLocaleString()}
        </Badge>
        <Badge
          variant="outline"
          className="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
        >
          Avg: £{statistics.averageRevenue?.toLocaleString()}
        </Badge>
        <Badge
          variant="outline"
          className="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
        >
          Growth: {statistics.growthRate}%
        </Badge>
        {statistics.entriesCount && (
          <Badge
            variant="outline"
            className="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
          >
            Entries: {statistics.entriesCount}
          </Badge>
        )}
      </div>

      <div className="h-[calc(100%-120px)]" ref={chartRef}>
        <div className="overflow-x-auto" style={{ width: "100%" }}>
          {chartType === "bar" && (
            <div style={{ minWidth: minChartWidth, height: "400px" }}>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={chartData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 60,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={
                      isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
                    }
                  />
                  <XAxis
                    dataKey="name"
                    stroke={isDark ? "#888888" : "#888888"}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatXAxisTick}
                    height={50}
                    tick={{ angle: -45, textAnchor: "end", dy: 20 }}
                  />
                  <YAxis
                    stroke={isDark ? "#888888" : "#888888"}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `£${value}`}
                    domain={[0, maxValue]}
                  />
                  <Tooltip content={renderSimpleTooltip} />
                  <Legend />
                  <Brush
                    dataKey="name"
                    height={30}
                    stroke={isDark ? "#666" : "#8884d8"}
                    fill={isDark ? "#333" : "#f5f5f5"}
                    tickFormatter={formatXAxisTick}
                  />
                  <Bar
                    dataKey="total"
                    fill="#06b6d4"
                    radius={[4, 4, 0, 0]}
                    name="Revenue"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {chartType === "line" && (
            <div style={{ minWidth: minChartWidth, height: "400px" }}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={chartData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 60,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={
                      isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
                    }
                  />
                  <XAxis
                    dataKey="name"
                    stroke={isDark ? "#888888" : "#888888"}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatXAxisTick}
                    height={50}
                    tick={{ angle: -45, textAnchor: "end", dy: 20 }}
                  />
                  <YAxis
                    stroke={isDark ? "#888888" : "#888888"}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `£${value}`}
                    domain={[0, maxValue]}
                  />
                  <Tooltip content={renderSimpleTooltip} />
                  <Legend />
                  <Brush
                    dataKey="name"
                    height={30}
                    stroke={isDark ? "#666" : "#8884d8"}
                    fill={isDark ? "#333" : "#f5f5f5"}
                    tickFormatter={formatXAxisTick}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    activeDot={{ r: 8 }}
                    name="Revenue"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {chartType === "area" && (
            <div style={{ minWidth: minChartWidth, height: "400px" }}>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart
                  data={chartData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 60,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={
                      isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
                    }
                  />
                  <XAxis
                    dataKey="name"
                    stroke={isDark ? "#888888" : "#888888"}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatXAxisTick}
                    height={50}
                    tick={{ angle: -45, textAnchor: "end", dy: 20 }}
                  />
                  <YAxis
                    stroke={isDark ? "#888888" : "#888888"}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `£${value}`}
                    domain={[0, maxValue]}
                  />
                  <Tooltip content={renderSimpleTooltip} />
                  <Legend />
                  <Brush
                    dataKey="name"
                    height={30}
                    stroke={isDark ? "#666" : "#8884d8"}
                    fill={isDark ? "#333" : "#f5f5f5"}
                    tickFormatter={formatXAxisTick}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#06b6d4"
                    fill="#06b6d4"
                    fillOpacity={0.3}
                    name="Revenue"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {chartType === "composed" && (
            <div style={{ minWidth: minChartWidth, height: "400px" }}>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart
                  data={movingAverageData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 60,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={
                      isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
                    }
                  />
                  <XAxis
                    dataKey="name"
                    stroke={isDark ? "#888888" : "#888888"}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatXAxisTick}
                    height={50}
                    tick={{ angle: -45, textAnchor: "end", dy: 20 }}
                  />
                  <YAxis
                    stroke={isDark ? "#888888" : "#888888"}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `£${value}`}
                    domain={[0, maxValue]}
                  />
                  <Tooltip content={renderComposedTooltip} />
                  <Legend />
                  <Brush
                    dataKey="name"
                    height={30}
                    stroke={isDark ? "#666" : "#8884d8"}
                    fill={isDark ? "#333" : "#f5f5f5"}
                    tickFormatter={formatXAxisTick}
                  />
                  <Bar
                    dataKey="total"
                    fill="#06b6d4"
                    radius={[4, 4, 0, 0]}
                    name="Revenue"
                  />
                  <Line
                    type="monotone"
                    dataKey="average"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 8 }}
                    name="3-Month Avg"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 text-xs text-center text-muted-foreground">
        <span>
          Tip: Use brush below chart to zoom. Scroll horizontally to view more
          data.
        </span>
      </div>
    </div>
  );
}
