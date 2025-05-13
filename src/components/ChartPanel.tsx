
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrderBookData, TimeSeriesData } from '@/lib/types';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  ReferenceLine
} from 'recharts';

interface ChartPanelProps {
  orderBookData: OrderBookData | null;
  timeSeriesData: TimeSeriesData[];
  lastUpdated: string;
}

const ChartPanel: React.FC<ChartPanelProps> = ({ orderBookData, timeSeriesData, lastUpdated }) => {
  const [chartType, setChartType] = useState<'orderBook' | 'metrics' | 'slippage'>('orderBook');

  // Process order book data for visualization
  const processOrderBookData = () => {
    if (!orderBookData || !orderBookData.asks || !orderBookData.bids) {
      return { askData: [], bidData: [] };
    }

    // Take just first 15 levels for visualization clarity
    const askData = orderBookData.asks.slice(0, 15).map((level, index) => ({
      price: parseFloat(level[0]),
      size: parseFloat(level[1]),
      depth: orderBookData.asks
        .slice(0, index + 1)
        .reduce((sum, item) => sum + parseFloat(item[1]), 0),
      type: 'ask'
    }));

    const bidData = orderBookData.bids.slice(0, 15).map((level, index) => ({
      price: parseFloat(level[0]),
      size: parseFloat(level[1]),
      depth: orderBookData.bids
        .slice(0, index + 1)
        .reduce((sum, item) => sum + parseFloat(item[1]), 0),
      type: 'bid'
    }));

    return { askData, bidData };
  };

  const { askData, bidData } = processOrderBookData();

  // Format time for x-axis
  const formatTime = (time: Date) => {
    return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Format large numbers with K, M, etc.
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(1);
  };

  return (
    <Card className="h-full bg-darkCard border-darkBorder flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">Market Visualization</CardTitle>
          <Tabs value={chartType} onValueChange={(v) => setChartType(v as any)} className="w-auto">
            <TabsList>
              <TabsTrigger value="orderBook">Order Book</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="slippage">Slippage Analysis</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <TabsContent value="orderBook" className="h-full">
          {orderBookData ? (
            <div className="space-y-6 h-full">
              <div className="h-1/2">
                <h3 className="text-sm font-medium mb-2">Depth Chart</h3>
                <ResponsiveContainer width="100%" height="90%">
                  <AreaChart
                    data={[...bidData.reverse(), ...askData]}
                    margin={{ top: 5, right: 20, bottom: 5, left: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis 
                      dataKey="price" 
                      type="number" 
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={(value) => value.toFixed(1)}
                    />
                    <YAxis 
                      dataKey="depth" 
                      orientation="right"
                      tickFormatter={formatNumber}
                    />
                    <Tooltip 
                      formatter={(value: number) => [value.toFixed(2), '']}
                      labelFormatter={(label: number) => `Price: ${label.toFixed(2)}`}
                    />
                    <Area 
                      type="stepAfter" 
                      dataKey="depth" 
                      stroke="#ef4444" 
                      fill="#ef4444" 
                      fillOpacity={0.2}
                      data={askData}
                    />
                    <Area 
                      type="stepAfter" 
                      dataKey="depth" 
                      stroke="#10b981" 
                      fill="#10b981" 
                      fillOpacity={0.2}
                      data={bidData}
                    />
                    <ReferenceLine 
                      x={orderBookData.asks[0][0]} 
                      stroke="#fff" 
                      strokeDasharray="3 3"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              
              <div className="h-1/2 grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Asks (Sell Orders)</h3>
                  <ResponsiveContainer width="100%" height="90%">
                    <BarChart
                      data={askData}
                      layout="vertical"
                      margin={{ top: 5, right: 20, bottom: 5, left: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                      <XAxis type="number" />
                      <YAxis 
                        dataKey="price" 
                        type="category" 
                        tickFormatter={(value) => value.toFixed(1)}
                        width={60}
                      />
                      <Tooltip />
                      <Bar dataKey="size" fill="#ef4444" name="Size" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-2">Bids (Buy Orders)</h3>
                  <ResponsiveContainer width="100%" height="90%">
                    <BarChart
                      data={bidData.slice(0, 15)}
                      layout="vertical"
                      margin={{ top: 5, right: 20, bottom: 5, left: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                      <XAxis type="number" />
                      <YAxis 
                        dataKey="price" 
                        type="category" 
                        tickFormatter={(value) => value.toFixed(1)}
                        width={60}
                      />
                      <Tooltip />
                      <Bar dataKey="size" fill="#10b981" name="Size" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Waiting for order book data...</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="metrics" className="h-full">
          <div className="space-y-6 h-full">
            {timeSeriesData.length > 0 ? (
              <>
                <div className="h-1/2">
                  <h3 className="text-sm font-medium mb-2">Cost Components Over Time</h3>
                  <ResponsiveContainer width="100%" height="90%">
                    <LineChart
                      data={timeSeriesData.map(item => ({
                        ...item,
                        time: formatTime(item.timestamp)
                      }))}
                      margin={{ top: 5, right: 20, bottom: 5, left: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="slippage" 
                        stroke="#8884d8" 
                        name="Slippage (%)"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="marketImpact" 
                        stroke="#82ca9d" 
                        name="Market Impact (%)"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="fees" 
                        stroke="#ffc658" 
                        name="Fees ($)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="h-1/2">
                  <h3 className="text-sm font-medium mb-2">Net Cost & Price</h3>
                  <ResponsiveContainer width="100%" height="90%">
                    <LineChart
                      data={timeSeriesData.map(item => ({
                        ...item,
                        time: formatTime(item.timestamp)
                      }))}
                      margin={{ top: 5, right: 20, bottom: 5, left: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                      <XAxis dataKey="time" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="netCost" 
                        stroke="#ff7300" 
                        yAxisId="left"
                        name="Net Cost ($)"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="bestAsk" 
                        stroke="#387908" 
                        yAxisId="right" 
                        name="Best Ask ($)"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="bestBid" 
                        stroke="#38abc8" 
                        yAxisId="right" 
                        name="Best Bid ($)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Waiting for time series data...</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="slippage" className="h-full">
          {timeSeriesData.length > 0 ? (
            <div className="h-full">
              <h3 className="text-sm font-medium mb-2">Slippage Analysis</h3>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart
                  data={timeSeriesData.slice(-20).map(item => ({
                    ...item,
                    time: formatTime(item.timestamp)
                  }))}
                  margin={{ top: 5, right: 20, bottom: 5, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="slippage" fill="#8884d8" name="Slippage (%)" />
                </BarChart>
              </ResponsiveContainer>
              
              <div className="mt-4 px-4">
                <p className="text-sm text-muted-foreground">
                  Slippage Analysis: This chart shows the slippage percentage over time. 
                  Positive values indicate that the execution price is higher than the best available price,
                  resulting in additional cost.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Waiting for slippage data...</p>
            </div>
          )}
        </TabsContent>
      </CardContent>
      <div className="px-4 py-2 text-xs text-right text-muted-foreground border-t border-darkBorder">
        Last updated: {lastUpdated || "Never"}
      </div>
    </Card>
  );
};

export default ChartPanel;
