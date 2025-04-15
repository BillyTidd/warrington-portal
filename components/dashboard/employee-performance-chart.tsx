"use client";

import { useTheme } from "next-themes";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Bar,
  BarChart,
  ReferenceArea,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  LineChartIcon,
  Eye,
  EyeOff,
  TrendingUp,
  Download,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

interface EmployeePerformanceChartProps {
  data: any;
  isLoading?: boolean;
  timeframe?: string;
}

export function EmployeePerformanceChart({
  data = { chartData: [], employeeTotals: [] },
  isLoading = false,
  timeframe = "month",
}: EmployeePerformanceChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const chartRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // State for toggling visibility of employee data
  const [hiddenEmployees, setHiddenEmployees] = useState<string[]>([]);

  // State for zoom functionality
  const [zoomState, setZoomState] = useState({
    refAreaLeft: "",
    refAreaRight: "",
    isZooming: false,
    zoomedData: null,
  });

  // State for trend lines
  const [showTrends, setShowTrends] = useState(false);

  // If no data is provided, use sample data
  const chartData =
    data.chartData && data.chartData.length > 0
      ? data.chartData
      : [
          {
            name: "Jan 01",
            "Ewan Fitzgerald": 400,
            "Sarah Johnson": 240,
            "Michael Brown": 320,
          },
          {
            name: "Jan 08",
            "Ewan Fitzgerald": 300,
            "Sarah Johnson": 290,
            "Michael Brown": 380,
          },
          {
            name: "Jan 15",
            "Ewan Fitzgerald": 500,
            "Sarah Johnson": 400,
            "Michael Brown": 420,
          },
          {
            name: "Jan 22",
            "Ewan Fitzgerald": 280,
            "Sarah Johnson": 380,
            "Michael Brown": 310,
          },
          {
            name: "Jan 29",
            "Ewan Fitzgerald": 590,
            "Sarah Johnson": 420,
            "Michael Brown": 450,
          },
        ];

  // Get all employee names from the data
  const employeeNames = useMemo(() => {
    return chartData.length > 0
      ? Object.keys(chartData[0]).filter((key) => key !== "name")
      : [];
  }, [chartData]);

  // Generate colors for each employee
  const colors = [
    "#06b6d4",
    "#f97316",
    "#8b5cf6",
    "#10b981",
    "#f43f5e",
    "#ec4899",
    "#a855f7",
  ];

  // Calculate total for each employee
  const employeeTotals = useMemo(() => {
    return data.employeeTotals && data.employeeTotals.length > 0
      ? data.employeeTotals
      : employeeNames.map((name, index) => ({
          name,
          total: chartData.reduce((sum, item) => sum + (item[name] || 0), 0),
          count: chartData.length,
        }));
  }, [data.employeeTotals, employeeNames, chartData]);

  // Calculate trend lines for each employee
  const trendData = useMemo(() => {
    if (!showTrends) return [];

    return employeeNames.reduce((acc, name) => {
      if (hiddenEmployees.includes(name)) return acc;

      // Simple linear regression
      const points = chartData.map((item, index) => ({
        x: index,
        y: item[name] || 0,
      }));
      const n = points.length;

      if (n < 2) return acc;

      const sumX = points.reduce((sum, p) => sum + p.x, 0);
      const sumY = points.reduce((sum, p) => sum + p.y, 0);
      const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
      const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      const trendPoints = chartData.map((item, index) => ({
        name: item.name,
        [`${name}_trend`]: Math.max(0, Math.round(intercept + slope * index)),
      }));

      return [...acc, ...trendPoints];
    }, []);
  }, [chartData, employeeNames, hiddenEmployees, showTrends]);

  // Filter out hidden employees from the chart data
  const filteredChartData = useMemo(() => {
    if (hiddenEmployees.length === 0) return chartData;

    return chartData.map((dataPoint) => {
      const newDataPoint = { name: dataPoint.name };
      Object.keys(dataPoint).forEach((key) => {
        if (key === "name" || !hiddenEmployees.includes(key)) {
          newDataPoint[key] = dataPoint[key];
        }
      });
      return newDataPoint;
    });
  }, [chartData, hiddenEmployees]);

  // Display data - either zoomed or filtered
  const displayData = zoomState.zoomedData || filteredChartData;

  // Calculate max value for y-axis
  const maxValue = useMemo(() => {
    let max = 0;
    displayData.forEach((item) => {
      employeeNames.forEach((name) => {
        if (!hiddenEmployees.includes(name) && item[name] > max) {
          max = item[name];
        }
      });
    });
    // Round up to nearest 100
    return Math.ceil(max / 100) * 100;
  }, [displayData, employeeNames, hiddenEmployees]);

  // Calculate min width for the chart container based on data points
  const minChartWidth = useMemo(() => {
    // Base width on container size with a minimum
    const baseWidth = Math.max(containerWidth - 40, 300);
    // Ensure enough width per data point
    const dataPointWidth = 50; // width per data point
    const dataLength = displayData.length;
    const neededWidth = dataLength * dataPointWidth;

    return Math.max(neededWidth, baseWidth) + "px";
  }, [displayData.length, containerWidth]);

  // Handle legend click to toggle visibility
  const handleLegendClick = useCallback((dataKey) => {
    setHiddenEmployees((prev) => {
      if (prev.includes(dataKey)) {
        return prev.filter((item) => item !== dataKey);
      } else {
        return [...prev, dataKey];
      }
    });
  }, []);

  // Handle employee visibility checkbox change
  const handleEmployeeVisibilityChange = useCallback((employee, checked) => {
    setHiddenEmployees((prev) => {
      if (checked) {
        // Show employee
        return prev.filter((item) => item !== employee);
      } else {
        // Hide employee
        return [...prev, employee];
      }
    });
  }, []);

  // Toggle all employees
  const toggleAllEmployees = useCallback(
    (show) => {
      if (show) {
        // Show all employees
        setHiddenEmployees([]);
      } else {
        // Hide all employees
        setHiddenEmployees([...employeeNames]);
      }
    },
    [employeeNames]
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
        downloadLink.download = `employee-performance-${
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
  }, [isDark]);

  // Custom legend renderer with clickable items
  const renderLegend = useCallback(
    (props) => {
      const { payload } = props;

      return (
        <div className="flex flex-wrap justify-center gap-2 mt-2">
          {payload.map((entry, index) => (
            <div
              key={`legend-${index}`}
              className={`flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer transition-all ${
                hiddenEmployees.includes(entry.dataKey)
                  ? "opacity-50 bg-gray-100 dark:bg-gray-800"
                  : "bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
              }`}
              onClick={() => handleLegendClick(entry.dataKey)}
            >
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span
                className={`text-xs font-medium ${
                  hiddenEmployees.includes(entry.dataKey) ? "line-through" : ""
                }`}
              >
                {entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    },
    [hiddenEmployees, handleLegendClick]
  );

  // Zoom functionality
  const handleMouseDown = useCallback((e) => {
    if (!e) return;
    setZoomState((prev) => ({
      ...prev,
      refAreaLeft: e.activeLabel,
      isZooming: true,
    }));
  }, []);

  const handleMouseMove = useCallback(
    (e) => {
      if (!e || !zoomState.isZooming) return;
      setZoomState((prev) => ({
        ...prev,
        refAreaRight: e.activeLabel,
      }));
    },
    [zoomState.isZooming]
  );

  const handleMouseUp = useCallback(() => {
    if (!zoomState.refAreaLeft || !zoomState.refAreaRight) {
      setZoomState((prev) => ({
        ...prev,
        isZooming: false,
        refAreaLeft: "",
        refAreaRight: "",
      }));
      return;
    }

    // Ensure left is always less than right
    let left = chartData.findIndex(
      (item) => item.name === zoomState.refAreaLeft
    );
    let right = chartData.findIndex(
      (item) => item.name === zoomState.refAreaRight
    );

    if (left > right) {
      [left, right] = [right, left];
    }

    // Get the zoomed data
    const zoomedData = chartData.slice(left, right + 1);

    setZoomState({
      isZooming: false,
      refAreaLeft: "",
      refAreaRight: "",
      zoomedData: zoomedData.length > 1 ? zoomedData : null,
    });
  }, [zoomState.refAreaLeft, zoomState.refAreaRight, chartData]);

  // Reset zoom when timeframe changes
  useEffect(() => {
    setZoomState({
      isZooming: false,
      refAreaLeft: "",
      refAreaRight: "",
      zoomedData: null,
    });
  }, [timeframe]);

  // Enhanced tooltip with more details
  const renderTooltip = useCallback(({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // Filter out trend lines from tooltip
      const filteredPayload = payload.filter(
        (entry) => !entry.dataKey.includes("_trend")
      );

      // Calculate total for this date point
      const dateTotal = filteredPayload.reduce(
        (sum, entry) => sum + (entry.value || 0),
        0
      );

      // Sort entries by value (highest first)
      const sortedPayload = [...filteredPayload].sort(
        (a, b) => b.value - a.value
      );

      return (
        <Card className="border shadow-sm">
          <CardContent className="p-3">
            <div className="mb-2 border-b pb-1">
              <div className="font-semibold text-sm">{label}</div>
              <div className="text-xs text-muted-foreground">{`Total: £${dateTotal.toLocaleString()}`}</div>
            </div>
            <div className="grid grid-cols-3 gap-x-4 gap-y-1">
              {sortedPayload.map((entry) => (
                <div
                  key={entry.dataKey}
                  className="col-span-3 grid grid-cols-3 items-center"
                >
                  <div className="col-span-2 flex items-center gap-2 text-xs">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="font-medium truncate">
                      {entry.dataKey}
                    </span>
                  </div>
                  <div className="text-right text-xs font-semibold">{`£${entry.value.toLocaleString()}`}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      );
    }
    return null;
  }, []);

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

  // Format y-axis ticks
  const formatYAxisTick = useCallback((value) => {
    return `£${value}`;
  }, []);

  // Memoize chart components to prevent unnecessary re-renders
  const renderLineChart = useMemo(
    () => (
      <LineChart
        data={displayData}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 60,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
        />
        <XAxis
          dataKey="name"
          stroke={isDark ? "#888888" : "#888888"}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          allowDataOverflow
          tickFormatter={formatXAxisTick}
          height={50}
          tick={{ angle: -45, textAnchor: "end", dy: 20 }}
        />
        <YAxis
          stroke={isDark ? "#888888" : "#888888"}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatYAxisTick}
          allowDataOverflow
          domain={[0, maxValue]}
        />
        <Tooltip content={renderTooltip} />
        <Legend content={renderLegend} />

        {/* Reference area for zoom */}
        {zoomState.refAreaLeft && zoomState.refAreaRight ? (
          <ReferenceArea
            x1={zoomState.refAreaLeft}
            x2={zoomState.refAreaRight}
            strokeOpacity={0.3}
            fill={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
          />
        ) : null}

        {/* Employee lines */}
        {employeeNames.map((employee, index) => (
          <Line
            key={employee}
            type="monotone"
            dataKey={employee}
            stroke={colors[index % colors.length]}
            strokeWidth={2}
            activeDot={{ r: 6 }}
            dot={{ r: 4 }}
            hide={hiddenEmployees.includes(employee)}
            isAnimationActive={!zoomState.isZooming}
          />
        ))}

        {/* Trend lines - only show for visible employees when trends are enabled */}
        {showTrends &&
          employeeNames.map(
            (employee, index) =>
              !hiddenEmployees.includes(employee) && (
                <Line
                  key={`${employee}_trend`}
                  type="monotone"
                  dataKey={`${employee}_trend`}
                  stroke={colors[index % colors.length]}
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
              )
          )}
      </LineChart>
    ),
    [
      displayData,
      isDark,
      formatXAxisTick,
      formatYAxisTick,
      renderTooltip,
      renderLegend,
      zoomState,
      employeeNames,
      colors,
      hiddenEmployees,
      showTrends,
      maxValue,
      handleMouseDown,
      handleMouseMove,
      handleMouseUp,
    ]
  );

  const renderBarChart = useMemo(
    () => (
      <BarChart
        data={displayData}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 60,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
        />
        <XAxis
          dataKey="name"
          stroke={isDark ? "#888888" : "#888888"}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          allowDataOverflow
          tickFormatter={formatXAxisTick}
          height={50}
          tick={{ angle: -45, textAnchor: "end", dy: 20 }}
        />
        <YAxis
          stroke={isDark ? "#888888" : "#888888"}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatYAxisTick}
          allowDataOverflow
          domain={[0, maxValue]}
        />
        <Tooltip content={renderTooltip} />
        <Legend content={renderLegend} />

        {/* Reference area for zoom */}
        {zoomState.refAreaLeft && zoomState.refAreaRight ? (
          <ReferenceArea
            x1={zoomState.refAreaLeft}
            x2={zoomState.refAreaRight}
            strokeOpacity={0.3}
            fill={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
          />
        ) : null}

        {/* Employee bars */}
        {employeeNames.map((employee, index) => (
          <Bar
            key={employee}
            dataKey={employee}
            fill={colors[index % colors.length]}
            radius={[4, 4, 0, 0]}
            hide={hiddenEmployees.includes(employee)}
            isAnimationActive={!zoomState.isZooming}
          />
        ))}
      </BarChart>
    ),
    [
      displayData,
      isDark,
      formatXAxisTick,
      formatYAxisTick,
      renderTooltip,
      renderLegend,
      zoomState,
      employeeNames,
      colors,
      hiddenEmployees,
      maxValue,
      handleMouseDown,
      handleMouseMove,
      handleMouseUp,
    ]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    // Initial measurement
    updateWidth();

    // Set up resize observer for responsive updates
    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(containerRef.current);

    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="h-full" ref={containerRef}>
      {/* Controls section */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Tabs
            defaultValue="line"
            onValueChange={(value) => setChartType(value as "line" | "bar")}
          >
            <TabsList className="grid w-[200px] grid-cols-2">
              <TabsTrigger value="line" className="flex items-center gap-1">
                <LineChartIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Line</span>
              </TabsTrigger>
              <TabsTrigger value="bar" className="flex items-center gap-1">
                <BarChart3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Bar</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id="show-trends"
              checked={showTrends}
              onCheckedChange={setShowTrends}
            />
            <Label
              htmlFor="show-trends"
              className="flex items-center gap-1 cursor-pointer text-xs"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Show Trends</span>
            </Label>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={downloadChart}
            disabled={isDownloading}
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            {isDownloading ? "Downloading..." : "Download Chart"}
          </Button>
        </div>
      </div>

      {/* Employee visibility panel */}
      <Card className="mb-4 p-4 border shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium">Show/Hide Employees</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => toggleAllEmployees(true)}
            >
              <Eye className="h-3.5 w-3.5 mr-1" />
              Show All
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => toggleAllEmployees(false)}
            >
              <EyeOff className="h-3.5 w-3.5 mr-1" />
              Hide All
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {employeeNames.map((employee, index) => {
            const isVisible = !hiddenEmployees.includes(employee);
            return (
              <div key={employee} className="flex items-center gap-2">
                <Checkbox
                  id={`employee-${employee}`}
                  checked={isVisible}
                  onCheckedChange={(checked) =>
                    handleEmployeeVisibilityChange(employee, checked)
                  }
                />
                <Label
                  htmlFor={`employee-${employee}`}
                  className={`flex items-center gap-1 cursor-pointer text-xs ${
                    !isVisible ? "opacity-50" : ""
                  }`}
                >
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: colors[index % colors.length] }}
                  />
                  <span className={!isVisible ? "line-through" : ""}>
                    {employee}
                  </span>
                </Label>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="flex flex-wrap gap-2 justify-start mb-2">
        {employeeTotals.slice(0, 3).map((employee, index) => (
          <Badge
            key={employee.name}
            variant="outline"
            className={`bg-primary/10 ${
              hiddenEmployees.includes(employee.name) ? "opacity-50" : ""
            }`}
            style={{ color: colors[index % colors.length] }}
          >
            {employee.name}: £{employee.total.toLocaleString()}
          </Badge>
        ))}
      </div>

      <div
        className="overflow-x-auto overflow-y-hidden"
        style={{ height: "450px" }}
        ref={chartRef}
      >
        <div style={{ minWidth: minChartWidth, height: "400px" }}>
          <ResponsiveContainer width="100%" height={400}>
            {chartType === "line" && renderLineChart}
            {chartType === "bar" && renderBarChart}
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-2 text-xs text-center text-muted-foreground">
        <span>
          Tip: Click and drag on chart to zoom. Click legend items to toggle
          visibility.
        </span>
      </div>
    </div>
  );
}
