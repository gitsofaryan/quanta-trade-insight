
export interface OrderBookEntry {
  price: string;
  size: string;
}

export interface OrderBookData {
  timestamp: string;
  exchange: string;
  symbol: string;
  asks: [string, string][];
  bids: [string, string][];
}

export interface SimulationParameters {
  exchange: string;
  asset: string;
  orderType: 'market' | 'limit';
  quantity: number;
  volatility: number;
  feeTier: string;
}

export interface SimulationResults {
  expectedSlippage: number;
  expectedFees: number;
  expectedMarketImpact: number;
  netCost: number;
  makerTakerProportion: number;
  internalLatency: number;
}
