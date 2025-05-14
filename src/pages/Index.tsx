import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import InputPanel from '@/components/InputPanel';
import OutputPanel from '@/components/OutputPanel';
import ChartPanel from '@/components/ChartPanel';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const [activeTab, setActiveTab] = useState<'chart' | 'cpp'>('chart');

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
      setError('Failed to connect to WebSocket. Please check your connection and VPN if needed.');
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
          <ResizablePanel defaultSize={25} minSize={20}>
            <div className="h-full">
              <InputPanel 
                parameters={parameters}
                onParametersChange={setParameters}
              />
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          {/* Middle Panel - Chart View */}
          <ResizablePanel defaultSize={50}>
            <div className="h-full">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'chart' | 'cpp')} className="h-full">
                <div className="p-4 border-b border-darkBorder">
                  <TabsList>
                    <TabsTrigger value="chart">Market Visualization</TabsTrigger>
                    <TabsTrigger value="cpp">C++ Implementation</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="chart" className="h-[calc(100%-56px)]">
                  <ChartPanel 
                    orderBookData={orderBookData}
                    timeSeriesData={timeSeriesData}
                    lastUpdated={lastUpdated}
                  />
                </TabsContent>
                <TabsContent value="cpp" className="h-[calc(100%-56px)]">
                  <div className="p-4 h-full overflow-auto">
                    <CppImplementation />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          {/* Right Panel - Output Results */}
          <ResizablePanel defaultSize={25} minSize={20}>
            <div className="h-full">
              <OutputPanel 
                results={results}
                lastUpdated={lastUpdated}
                isConnected={isConnected}
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

// C++ Implementation Component
const CppImplementation: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Almgren-Chriss Market Impact Model (C++)</h3>
        <pre className="bg-black p-4 rounded-md overflow-x-auto">
          <code className="text-green-400 text-xs">
{`#include <cmath>
#include <vector>
#include <string>
#include <chrono>
#include <iostream>
#include <algorithm>

struct OrderBookLevel {
    double price;
    double size;
};

struct OrderBook {
    std::vector<OrderBookLevel> asks;
    std::vector<OrderBookLevel> bids;
    std::string timestamp;
    std::string exchange;
    std::string symbol;
};

// Calculate expected slippage based on order book data and quantity
double calculateSlippage(const OrderBook& orderBook, double quantity) {
    if (orderBook.asks.empty()) {
        return 0.0;
    }
    
    double bestAsk = orderBook.asks[0].price;
    double remainingQuantity = quantity;
    double totalCost = 0.0;
    
    for (size_t i = 0; i < orderBook.asks.size() && remainingQuantity > 0; ++i) {
        double price = orderBook.asks[i].price;
        double size = orderBook.asks[i].size;
        
        double fillSize = std::min(remainingQuantity, size);
        totalCost += fillSize * price;
        remainingQuantity -= fillSize;
    }
    
    double avgExecutionPrice = totalCost / (quantity - remainingQuantity);
    return ((avgExecutionPrice / bestAsk) - 1.0) * 100.0;
}

// Calculate market impact using Almgren-Chriss model
double calculateMarketImpact(
    const OrderBook& orderBook, 
    double quantity, 
    double volatility
) {
    if (orderBook.asks.empty()) {
        return 0.0;
    }
    
    // Estimate market depth/liquidity
    double depth = 0.0;
    for (const auto& level : orderBook.asks) {
        depth += level.size;
    }
    
    // Constants for the model
    const double alpha = 0.1; // Temporary impact factor
    const double beta = 0.6;  // Permanent impact factor
    
    // Calculate market impact
    double marketImpact = alpha * volatility * std::pow(quantity, beta) / std::sqrt(depth);
    
    return std::max(0.0, marketImpact);
}

// Main processing function for order book updates
void processOrderBook(const OrderBook& orderBook, double quantity, double volatility) {
    auto startTime = std::chrono::high_resolution_clock::now();
    
    // Calculate metrics
    double slippage = calculateSlippage(orderBook, quantity);
    double marketImpact = calculateMarketImpact(orderBook, quantity, volatility);
    
    // Calculate execution time
    auto endTime = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(endTime - startTime);
    
    double latency = static_cast<double>(duration.count()) / 1000.0; // convert to milliseconds
    
    std::cout << "Processed order book in " << latency << " ms" << std::endl;
    std::cout << "Slippage: " << slippage << "%" << std::endl;
    std::cout << "Market Impact: " << marketImpact << "%" << std::endl;
}`}
          </code>
        </pre>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-2">WebSocket Handler (C++)</h3>
        <pre className="bg-black p-4 rounded-md overflow-x-auto">
          <code className="text-green-400 text-xs">
{`#include <websocketpp/config/asio_client.hpp>
#include <websocketpp/client.hpp>
#include <nlohmann/json.hpp>
#include <iostream>
#include <thread>
#include <mutex>
#include <condition_variable>

using json = nlohmann::json;
using client = websocketpp::client<websocketpp::config::asio_tls_client>;
using message_ptr = websocketpp::config::asio_client::message_type::ptr;

class OrderBookWebSocket {
private:
    client m_client;
    websocketpp::connection_hdl m_hdl;
    std::string m_uri;
    std::thread m_thread;
    std::mutex m_mutex;
    std::condition_variable m_cv;
    bool m_connected = false;
    bool m_running = false;
    
    OrderBook m_currentOrderBook;

public:
    OrderBookWebSocket(const std::string& uri) : m_uri(uri) {
        // Set up logging and initialize asio
        m_client.set_access_channels(websocketpp::log::alevel::none);
        m_client.set_error_channels(websocketpp::log::elevel::fatal);
        m_client.init_asio();
        
        // Register handlers
        m_client.set_open_handler([this](auto hdl) {
            {
                std::lock_guard<std::mutex> lock(m_mutex);
                m_connected = true;
                m_hdl = hdl;
            }
            m_cv.notify_one();
            std::cout << "WebSocket connected!" << std::endl;
        });
        
        m_client.set_fail_handler([this](auto hdl) {
            std::cout << "Connection failed!" << std::endl;
            reconnect();
        });
        
        m_client.set_close_handler([this](auto hdl) {
            {
                std::lock_guard<std::mutex> lock(m_mutex);
                m_connected = false;
            }
            std::cout << "Connection closed!" << std::endl;
            reconnect();
        });
        
        m_client.set_message_handler([this](auto hdl, message_ptr msg) {
            try {
                auto j = json::parse(msg->get_payload());
                
                // Parse order book data
                OrderBook orderBook;
                orderBook.timestamp = j["timestamp"];
                orderBook.exchange = j["exchange"];
                orderBook.symbol = j["symbol"];
                
                for (const auto& ask : j["asks"]) {
                    orderBook.asks.push_back({
                        std::stod(ask[0].get<std::string>()), 
                        std::stod(ask[1].get<std::string>())
                    });
                }
                
                for (const auto& bid : j["bids"]) {
                    orderBook.bids.push_back({
                        std::stod(bid[0].get<std::string>()), 
                        std::stod(bid[1].get<std::string>())
                    });
                }
                
                {
                    std::lock_guard<std::mutex> lock(m_mutex);
                    m_currentOrderBook = orderBook;
                }
                
                // Process the new order book data
                processOrderBook(orderBook, 100.0, 2.0);
                
            } catch (const std::exception& e) {
                std::cerr << "Error parsing message: " << e.what() << std::endl;
            }
        });
    }
    
    void connect() {
        if (m_running) return;
        
        m_running = true;
        m_thread = std::thread([this]() {
            try {
                websocketpp::lib::error_code ec;
                client::connection_ptr con = m_client.get_connection(m_uri, ec);
                
                if (ec) {
                    std::cerr << "Could not create connection: " << ec.message() << std::endl;
                    return;
                }
                
                m_client.connect(con);
                m_client.run();
                
            } catch (const std::exception& e) {
                std::cerr << "Exception: " << e.what() << std::endl;
            }
        });
    }
    
    void disconnect() {
        if (!m_running) return;
        
        m_running = false;
        
        if (m_connected) {
            websocketpp::lib::error_code ec;
            m_client.close(m_hdl, websocketpp::close::status::normal, "Closing connection", ec);
        }
        
        if (m_thread.joinable()) {
            m_thread.join();
        }
    }
    
    void reconnect() {
        // Simple reconnection logic
        if (!m_running) return;
        
        std::this_thread::sleep_for(std::chrono::seconds(1));
        
        try {
            websocketpp::lib::error_code ec;
            client::connection_ptr con = m_client.get_connection(m_uri, ec);
            
            if (ec) {
                std::cerr << "Could not create connection: " << ec.message() << std::endl;
                return;
            }
            
            m_client.connect(con);
            
        } catch (const std::exception& e) {
            std::cerr << "Reconnection exception: " << e.what() << std::endl;
        }
    }
    
    ~OrderBookWebSocket() {
        disconnect();
    }
};`}
          </code>
        </pre>
      </div>
    </div>
  );
};

export default Index;
