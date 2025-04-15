"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useTheme } from "next-themes";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Sector,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, Eye, EyeOff, PieChartIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ClientDistributionChartProps {
  data: any;
  isLoading?: boolean;
  timeframe?: string;
}

export function ClientDistributionChart({
  data = { chartData: [], clientTotals: [] },
  isLoading = false,
  timeframe = "month",
}: ClientDistributionChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [chartType, setChartType] = useState<"pie" | "line" | "bar">("pie");
  const [activeIndex, setActiveIndex] = useState(0);
  const [hiddenClients, setHiddenClients] = useState<string[]>([]);
  const chartRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Add this effect to measure and update the container width
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

  // Sample data for when no data is provided
  const pieChartData =
    data.chartData && data.chartData.length > 0
      ? data.chartData
      : [
          { name: "Plant Plan", value: 35, amount: 3500 },
          { name: "Globex Corp", value: 25, amount: 2500 },
          { name: "Stark Industries", value: 20, amount: 2000 },
          { name: "Wayne Enterprises", value: 15, amount: 1500 },
          { name: "Umbrella Corp", value: 5, amount: 500 },
        ];

  const lineChartData =
    data.chartData &&
    data.chartData.length > 0 &&
    (chartType === "line" || chartType === "bar")
      ? data.chartData
      : [
          {
            name: "Jan 01",
            "Plant Plan": 400,
            "Globex Corp": 240,
            "Stark Industries": 320,
            "Wayne Enterprises": 180,
            "Umbrella Corp": 120,
          },
          {
            name: "Jan 08",
            "Plant Plan": 300,
            "Globex Corp": 290,
            "Stark Industries": 380,
            "Wayne Enterprises": 200,
            "Umbrella Corp": 150,
          },
          {
            name: "Jan 15",
            "Plant Plan": 500,
            "Globex Corp": 400,
            "Stark Industries": 420,
            "Wayne Enterprises": 250,
            "Umbrella Corp": 180,
          },
          {
            name: "Jan 22",
            "Plant Plan": 280,
            "Globex Corp": 380,
            "Stark Industries": 310,
            "Wayne Enterprises": 220,
            "Umbrella Corp": 160,
          },
          {
            name: "Jan 29",
            "Plant Plan": 590,
            "Globex Corp": 420,
            "Stark Industries": 450,
            "Wayne Enterprises": 280,
            "Umbrella Corp": 190,
          },
        ];

  const COLORS = [
    "#06b6d4",
    "#f97316",
    "#8b5cf6",
    "#10b981",
    "#f43f5e",
    "#ec4899",
    "#a855f7",
  ];

  // Get all client names from the line chart data
  const clientNames = useMemo(() => {
    return lineChartData.length > 0
      ? Object.keys(lineChartData[0]).filter((key) => key !== "name")
      : [];
  }, [lineChartData]);

  // Filter out hidden clients
  const filteredLineChartData = useMemo(() => {
    if (hiddenClients.length === 0) return lineChartData;

    return lineChartData.map((dataPoint: any) => {
      const newDataPoint: any = { name: dataPoint.name };
      Object.keys(dataPoint).forEach((key) => {
        if (key === "name" || !hiddenClients.includes(key)) {
          newDataPoint[key] = dataPoint[key];
        }
      });
      return newDataPoint;
    });
  }, [lineChartData, hiddenClients]);

  // Filter pie chart data based on hidden clients
  const filteredPieChartData = useMemo(() => {
    if (hiddenClients.length === 0) return pieChartData;
    return pieChartData.filter(
      (item: any) => !hiddenClients.includes(item.name)
    );
  }, [pieChartData, hiddenClients]);

  // Calculate max value for y-axis
  const maxValue = useMemo(() => {
    let max = 0;
    filteredLineChartData.forEach((item: any) => {
      clientNames.forEach((name) => {
        if (!hiddenClients.includes(name) && item[name] > max) {
          max = item[name];
        }
      });
    });
    // Round up to nearest 100
    return Math.ceil(max / 100) * 100;
  }, [filteredLineChartData, clientNames, hiddenClients]);

  // Calculate min width for the chart container based on data points
  const minChartWidth = useMemo(() => {
    if (chartType === "pie") return "100%";

    // Base width on container size with a minimum
    const baseWidth = Math.max(containerWidth - 40, 300);
    // Ensure enough width per data point
    const dataPointWidth = 50; // width per data point
    const dataLength = filteredLineChartData.length;
    const neededWidth = dataLength * dataPointWidth;

    return Math.max(neededWidth, baseWidth) + "px";
  }, [filteredLineChartData.length, containerWidth, chartType]);

  // Reset hidden clients when timeframe changes
  useEffect(() => {
    setHiddenClients([]);
  }, [timeframe]);

  const onPieEnter = useCallback((_: any, index: any) => {
    setActiveIndex(index);
  }, []);

  // Handle legend click to toggle visibility
  const handleLegendClick = useCallback((dataKey: any) => {
    setHiddenClients((prev) => {
      if (prev.includes(dataKey)) {
        return prev.filter((item) => item !== dataKey);
      } else {
        return [...prev, dataKey];
      }
    });
  }, []);

  // Handle client visibility checkbox change
  const handleClientVisibilityChange = useCallback(
    (client: any, checked: any) => {
      setHiddenClients((prev) => {
        if (checked) {
          // Show client
          return prev.filter((item) => item !== client);
        } else {
          // Hide client
          return [...prev, client];
        }
      });
    },
    []
  );

  // Toggle all clients
  const toggleAllClients = useCallback(
    (show: any) => {
      if (show) {
        // Show all clients
        setHiddenClients([]);
      } else {
        // Hide all clients
        setHiddenClients(
          chartType === "pie"
            ? pieChartData.map((item: any) => item.name)
            : clientNames
        );
      }
    },
    [chartType, pieChartData, clientNames]
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
        downloadLink.download = `client-distribution-${chartType}-${
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

  // Custom legend renderer with clickable items
  const renderLegend = useCallback(
    (props: any) => {
      const { payload } = props;

      return (
        <div className="flex flex-wrap justify-center gap-2 mt-2">
          {payload.map((entry: any, index: any) => (
            <div
              key={`legend-${index}`}
              className={`flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer transition-all ${
                hiddenClients.includes(entry.dataKey || entry.payload?.name)
                  ? "opacity-50 bg-gray-100 dark:bg-gray-800"
                  : "bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
              }`}
              onClick={() =>
                handleLegendClick(entry.dataKey || entry.payload?.name)
              }
            >
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span
                className={`text-xs font-medium ${
                  hiddenClients.includes(entry.dataKey || entry.payload?.name)
                    ? "line-through"
                    : ""
                }`}
              >
                {entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    },
    [hiddenClients, handleLegendClick]
  );

  const renderActiveShape = useCallback(
    (props: any) => {
      const RADIAN = Math.PI / 180;
      const {
        cx,
        cy,
        midAngle,
        innerRadius,
        outerRadius,
        startAngle,
        endAngle,
        fill,
        payload,
        percent,
        value,
      } = props;
      const sin = Math.sin(-RADIAN * midAngle);
      const cos = Math.cos(-RADIAN * midAngle);
      const sx = cx + (outerRadius + 10) * cos;
      const sy = cy + (outerRadius + 10) * sin;
      const mx = cx + (outerRadius + 30) * cos;
      const my = cy + (outerRadius + 30) * sin;
      const ex = mx + (cos >= 0 ? 1 : -1) * 22;
      const ey = my;
      const textAnchor = cos >= 0 ? "start" : "end";

      return (
        <g>
          <text
            x={cx}
            y={cy}
            dy={8}
            textAnchor="middle"
            fill={fill}
            className="text-xs font-medium"
          >
            {payload.name}
          </text>
          <Sector
            cx={cx}
            cy={cy}
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            startAngle={startAngle}
            endAngle={endAngle}
            fill={fill}
          />
          <Sector
            cx={cx}
            cy={cy}
            startAngle={startAngle}
            endAngle={endAngle}
            innerRadius={outerRadius + 6}
            outerRadius={outerRadius + 10}
            fill={fill}
          />
          <path
            d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
            stroke={fill}
            fill="none"
          />
          <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
          <text
            x={ex + (cos >= 0 ? 1 : -1) * 12}
            y={ey}
            textAnchor={textAnchor}
            fill={isDark ? "#e0e0e0" : "#333"}
            className="text-xs"
          >
            {`£${payload.amount.toLocaleString()}`}
          </text>
          <text
            x={ex + (cos >= 0 ? 1 : -1) * 12}
            y={ey}
            dy={18}
            textAnchor={textAnchor}
            fill={isDark ? "#a0a0a0" : "#999"}
            className="text-xs"
          >
            {`(${(percent * 100).toFixed(2)}%)`}
          </text>
        </g>
      );
    },
    [isDark]
  );

  // Format x-axis ticks based on timeframe
  const formatXAxisTick = useCallback(
    (value: any) => {
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

  // Enhanced tooltip for line chart
  const renderLineTooltip = useCallback(({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Calculate total for this date point
      const dateTotal = payload.reduce(
        (sum: any, entry: any) => sum + (entry.value || 0),
        0
      );

      // Sort entries by value (highest first)
      const sortedPayload = [...payload].sort((a, b) => b.value - a.value);

      return (
        <Card className="border shadow-sm">
          <CardContent className="p-3">
            <div className="mb-2 border-b pb-1">
              <div className="font-semibold text-sm">{label}</div>
              <div className="text-xs text-muted-foreground">
                Total: £{dateTotal.toLocaleString()}
              </div>
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
                  <div className="text-right text-xs font-semibold">
                    £{entry.value.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      );
    }
    return null;
  }, []);

  // Get client names based on chart type
  const displayedClients = useMemo(() => {
    if (chartType === "pie") {
      return pieChartData.map((item: any) => item.name);
    } else {
      return clientNames;
    }
  }, [chartType, pieChartData, clientNames]);

  return (
    <div className="h-full" ref={containerRef}>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          defaultValue="pie"
          onValueChange={(value) =>
            setChartType(value as "pie" | "line" | "bar")
          }
        >
          <TabsList className="grid w-[300px] grid-cols-">
            <TabsTrigger value="pie" className="flex items-center gap-1">
              <PieChartIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Pie</span>
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

          {data.totalAmount && (
            <Badge variant="outline" className="bg-primary/10 text-primary">
              Total: £{data.totalAmount.toLocaleString()}
            </Badge>
          )}
        </div>
      </div>

      {/* Client visibility panel */}
      <Card className="mb-4 p-4 border shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium">Show/Hide Clients</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => toggleAllClients(true)}
            >
              <Eye className="h-3.5 w-3.5 mr-1" />
              Show All
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => toggleAllClients(false)}
            >
              <EyeOff className="h-3.5 w-3.5 mr-1" />
              Hide All
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {displayedClients.map((client: any, index: any) => {
            const isVisible = !hiddenClients.includes(client);
            return (
              <div key={client} className="flex items-center gap-2">
                <Checkbox
                  id={`client-${client}`}
                  checked={isVisible}
                  onCheckedChange={(checked) =>
                    handleClientVisibilityChange(client, checked)
                  }
                />
                <Label
                  htmlFor={`client-${client}`}
                  className={`flex items-center gap-1 cursor-pointer text-xs ${
                    !isVisible ? "opacity-50" : ""
                  }`}
                >
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className={!isVisible ? "line-through" : ""}>
                    {client}
                  </span>
                </Label>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="h-[300px]" ref={chartRef}>
        {chartType === "pie" && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={filteredPieChartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                onMouseEnter={onPieEnter}
              >
                {filteredPieChartData.map((entry: any, index: any) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                content={renderLegend}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <Card className="border shadow-sm">
                        <CardContent className="p-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="font-medium">{payload[0].name}</div>
                            <div className="text-right font-medium">
                              {payload[0].value}%
                            </div>
                            {payload[0].payload.amount && (
                              <>
                                <div className="font-medium">Total Amount</div>
                                <div className="text-right font-medium">
                                  £{payload[0].payload.amount.toLocaleString()}
                                </div>
                              </>
                            )}
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
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-2 text-xs text-center text-muted-foreground">
        <span>
          {chartType === "pie"
            ? "Tip: Hover over segments for details. Click legend items to toggle visibility."
            : "Tip: Click legend items to toggle visibility. Use brush below chart to zoom."}
        </span>
      </div>
    </div>
  );
}
