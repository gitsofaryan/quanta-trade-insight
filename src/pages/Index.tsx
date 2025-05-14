import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import InputPanel from '@/components/InputPanel';
import OutputPanel from '@/components/OutputPanel';
import { OrderBookWebSocket } from '@/lib/websocket';
import { OrderBookData, SimulationParameters, SimulationResults, TimeSeriesData } from '@/lib/types';
import { 
  calculateSlippage, 
  calculateFees, 
  calculateMarketImpact, 
  calculateMakerTakerProportion,
  calculateNetCost
} from '@/lib/marketModels';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

const Index: React.FC = () => {
  const [orderBookData, setOrderBookData] = useState<OrderBookData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [parameters, setParameters] = useState<SimulationParameters>({
    exchange: 'OKX',
    asset: 'BTC-USDT-SWAP',
    orderType: 'market',
    quantity: 100,
    volatility: 2.0,
    feeTier: 'VIP 0'
  });
  
  const [results, setResults] = useState<SimulationResults>({
    expectedSlippage: 0,
    expectedFees: 0,
    expectedMarketImpact: 0,
    netCost: 0,
    makerTakerProportion: 0,
    internalLatency: 0
  });

  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [webSocket, setWebSocket] = useState<OrderBookWebSocket | null>(null);

  // Initialize WebSocket
  useEffect(() => {
    const wsUrl = 'wss://ws.gomarket-cpp.goquant.io/ws/l2-orderbook/okx/BTC-USDT-SWAP';

    const onMessage = (data: OrderBookData) => {
      const startTime = performance.now();
      
      setOrderBookData(data);
      setLastUpdated(new Date().toLocaleTimeString());
      
      // Calculate all metrics based on new orderbook data
      if (data && data.asks && data.asks.length > 0 && data.bids && data.bids.length > 0) {
        const bestAskPrice = parseFloat(data.asks[0][0]);
        
        const slippage = calculateSlippage(data, parameters.quantity);
        const fees = calculateFees(parameters.feeTier, parameters.quantity, bestAskPrice);
        const marketImpact = calculateMarketImpact(data, parameters.quantity, parameters.volatility);
        const makerTakerProportion = calculateMakerTakerProportion(data, parameters.quantity);
        const netCost = calculateNetCost(slippage, fees, marketImpact, parameters.quantity, bestAskPrice);
        
        const endTime = performance.now();
        const latency = endTime - startTime;
        
        const newResults = {
          expectedSlippage: slippage,
          expectedFees: fees,
          expectedMarketImpact: marketImpact,
          netCost,
          makerTakerProportion,
          internalLatency: latency
        };
        
        setResults(newResults);
        
        // Update time series data
        setTimeSeriesData(prev => {
          const timestamp = new Date();
          const newData = [
            ...prev, 
            {
              timestamp,
              slippage,
              fees,
              marketImpact,
              netCost,
              bestAsk: bestAskPrice,
              bestBid: parseFloat(data.bids[0][0]),
            }
          ];
          
          // Keep only the last 100 data points to avoid memory issues
          return newData.slice(-100);
        });
      }
    };
    
    const onConnect = () => {
      setIsConnected(true);
      setError(null);
    };
    
    const onError = (error: Event) => {
      setIsConnected(false);
      setError('Connection failed. Please check your network connection and VPN settings. Attempting to reconnect...');
    };
    
    const ws = new OrderBookWebSocket(wsUrl, onMessage, onConnect, onError);
    ws.connect();
    setWebSocket(ws);
    
    return () => {
      if (ws) {
        ws.disconnect();
      }
    };
  }, []);
  
  // Recalculate results when parameters change
  useEffect(() => {
    if (orderBookData && orderBookData.asks && orderBookData.asks.length > 0) {
      const bestAskPrice = parseFloat(orderBookData.asks[0][0]);
      
      const startTime = performance.now();
      
      const slippage = calculateSlippage(orderBookData, parameters.quantity);
      const fees = calculateFees(parameters.feeTier, parameters.quantity, bestAskPrice);
      const marketImpact = calculateMarketImpact(orderBookData, parameters.quantity, parameters.volatility);
      const makerTakerProportion = calculateMakerTakerProportion(orderBookData, parameters.quantity);
      const netCost = calculateNetCost(slippage, fees, marketImpact, parameters.quantity, bestAskPrice);
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      
      setResults({
        expectedSlippage: slippage,
        expectedFees: fees,
        expectedMarketImpact: marketImpact,
        netCost,
        makerTakerProportion,
        internalLatency: latency
      });
    }
  }, [parameters, orderBookData]);

  return (
    <div className="min-h-screen flex flex-col bg-darkBg text-lightText">
      <Header 
        title="GoQuant Trade Simulator" 
        connectionStatus={isConnected} 
      />
      
      {error && (
        <Alert variant="destructive" className="mx-4 mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <main className="flex-1 p-4">
        <ResizablePanelGroup 
          direction="horizontal" 
          className="min-h-[calc(100vh-10rem)] border border-darkBorder rounded-lg overflow-hidden"
        >
          {/* Left Panel - Input Parameters */}
          <ResizablePanel defaultSize={40} minSize={30}>
            <div className="h-full">
              <InputPanel 
                parameters={parameters}
                onParametersChange={setParameters}
              />
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          {/* Right Panel - Output Results */}
          <ResizablePanel defaultSize={60} minSize={30}>
            <div className="h-full">
              <OutputPanel 
                results={results}
                lastUpdated={lastUpdated}
                isConnected={isConnected}
                orderBookData={orderBookData}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
      
      <footer className="py-2 px-4 border-t border-darkBorder text-xs text-center text-muted-foreground">
        GoQuant Trade Simulator - Almgren-Chriss Market Impact Model
      </footer>
    </div>
  );
};

export default Index;