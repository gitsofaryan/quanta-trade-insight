import { Decimal } from 'decimal.js';

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
  vwap?: Decimal;
  twap?: Decimal;
  volumeProfile?: VolumeProfile[];
  priceStats?: PriceStatistics;
}

export interface TimeSeriesData {
  timestamp: Date;
  slippage: number;
  fees: number;
  marketImpact: number;
  netCost: number;
  bestAsk: number;
  bestBid: number;
  volume?: number;
  vwap?: number;
}

export interface VolumeProfile {
  price: number;
  volume: number;
  side: 'bid' | 'ask';
}

export interface PriceStatistics {
  mean: number;
  median: number;
  stdDev: number;
  skewness: number;
  kurtosis: number;
  min: number;
  max: number;
}

export interface MarketMetrics {
  spread: Decimal;
  depth: Decimal;
  imbalance: Decimal;
  volatility: Decimal;
}