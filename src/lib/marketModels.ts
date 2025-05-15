
import { Decimal } from 'decimal.js';
import { OrderBookData } from './types';
import { calculateMarketMetrics, calculateVWAP, calculatePriceImpact } from './marketMetrics';

Decimal.set({ precision: 20 });

// Fee rates for OKX perpetual swaps
const feeRates: Record<string, { maker: number, taker: number }> = {
  "VIP 0": { maker: 0.0008, taker: 0.0010 },
  "VIP 1": { maker: 0.00045, taker: 0.0005 },
  "VIP 2": { maker: 0.0004, taker: 0.00045 },
  "VIP 3": { maker: 0.0003, taker: 0.0004 },
  "VIP 4": { maker: 0.0002, taker: 0.00035 },
  "VIP 5": { maker: 0.0, taker: 0.0003 },
  "VIP 6": { maker: -0.00002, taker: 0.00025 },
  "VIP 7": { maker: -0.00005, taker: 0.0002 },
  "VIP 8": { maker: -0.00005, taker: 0.00015 }
};

// Almgren-Chriss model parameters
const almgrenChriss = {
  eta: 0.01,  // Permanent impact parameter
  gamma: 0.1, // Temporary impact parameter
};

/**
 * Calculates expected slippage based on order book data and quantity using a simplified linear model
 * as a proxy for regression
 * @param orderBook Current order book state
 * @param quantity Order quantity in quote currency (e.g., USD)
 * @returns Calculated slippage as a percentage
 */
export function calculateSlippage(orderBook: OrderBookData, quantity: number): number {
  if (!orderBook?.asks || orderBook.asks.length === 0) {
    return 0;
  }

  // Get the best ask price to convert quantity to base currency
  const bestAsk = parseFloat(orderBook.asks[0][0]);
  const quantityBase = quantity / bestAsk;
  
  // Calculate available depth at best 10 levels
  const sortedAsks = [...orderBook.asks].sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));
  let cumulativeDepth = 0;
  for (let i = 0; i < Math.min(10, sortedAsks.length); i++) {
    cumulativeDepth += parseFloat(sortedAsks[i][1]);
  }

  // Get market metrics for additional factors
  const metrics = calculateMarketMetrics(orderBook);
  
  // Simplified linear model: slippage = k * (orderSize / depth) * volatility * (1 + abs(imbalance))
  const k = 0.1; // Sensitivity factor (calibrated constant)
  const volatilityFactor = metrics.volatility.toNumber() / 100; // Convert from percentage
  const imbalanceFactor = 1 + metrics.imbalance.abs().toNumber(); // Imbalance adjustment
  
  const slippage = k * (quantityBase / (cumulativeDepth || 1)) * volatilityFactor * imbalanceFactor;
  return slippage * 100; // Convert to percentage
}

/**
 * Calculates expected fees based on fee tier and quantity using exchange fee structure
 * @param feeTier Exchange fee tier
 * @param quantity Order quantity in quote currency
 * @param price Current market price
 * @returns Calculated fees in quote currency
 */
export function calculateFees(feeTier: string, quantity: number, price: number): number {
  // Use the actual OKX fee schedule
  const tierRates = feeRates[feeTier] || feeRates["VIP 0"];
  
  // For market orders, we use the taker rate
  const feeRate = tierRates.taker;
  
  return quantity * feeRate;
}

/**
 * Implements the Almgren-Chriss market impact model
 * @param orderBook Current order book state
 * @param quantity Order quantity in quote currency
 * @param volatility Market volatility parameter (percentage)
 * @returns Estimated market impact as a percentage
 * 
 * Reference: Almgren, R., & Chriss, N. (2001). 
 * "Optimal execution of portfolio transactions"
 */
export function calculateMarketImpact(
  orderBook: OrderBookData, 
  quantity: number, 
  volatility: number
): number {
  if (!orderBook?.asks || orderBook.asks.length === 0) {
    return 0;
  }
  
  // Get the best ask price to convert quantity to base currency
  const bestAsk = parseFloat(orderBook.asks[0][0]);
  const quantityBase = quantity / bestAsk;
  
  // Calculate market depth and metrics
  const metrics = calculateMarketMetrics(orderBook);
  const marketDepth = metrics.depth.toNumber();
  
  // Convert volatility from percentage to decimal
  const volatilityDecimal = volatility / 100;
  
  // Calculate market impact components using Almgren-Chriss model
  const permanentImpact = almgrenChriss.eta * quantityBase;
  const temporaryImpact = (almgrenChriss.gamma / 2) * (quantityBase ** 2) * volatilityDecimal;
  
  // Total impact scaled by market depth factor
  const depthFactor = 1 + (1 / Math.sqrt(marketDepth || 1));
  const totalImpact = (permanentImpact + temporaryImpact) * depthFactor;
  
  return totalImpact * 100; // Convert to percentage
}

/**
 * Estimates maker/taker proportion using a logistic regression model
 * @param orderBook Current order book state
 * @param quantity Order quantity in quote currency
 * @returns Estimated maker portion (0-1)
 */
export function calculateMakerTakerProportion(
  orderBook: OrderBookData, 
  quantity: number
): number {
  if (!orderBook?.asks || orderBook.asks.length === 0) {
    return 0;
  }
  
  // For market orders, we always assume 100% taker
  // This is a simplification, as the assignment mentions a logistic regression model
  
  const metrics = calculateMarketMetrics(orderBook);
  const bestAsk = parseFloat(orderBook.asks[0][0]);
  const quantityBase = quantity / bestAsk;
  
  // Calculate available liquidity at the best ask
  const availableLiquidity = parseFloat(orderBook.asks[0][1]);
  
  // Calculate relative order size
  const relativeOrderSize = quantityBase / availableLiquidity;
  
  // Logistic regression model:
  // P(maker) = 1 / (1 + e^(-z))
  // where z is a linear combination of features
  
  const z = -2 * relativeOrderSize +
           -1 * metrics.spread.div(bestAsk).toNumber() +
           -0.5 * metrics.imbalance.toNumber() +
           0.5;  // Base term
  
  const makerProportion = 1 / (1 + Math.exp(-z));
  
  // Ensure the result is between 0 and 1
  return Math.max(0, Math.min(1, makerProportion));
}

/**
 * Calculates total transaction cost including all components
 * @param slippage Calculated slippage percentage
 * @param fees Exchange fees
 * @param marketImpact Estimated market impact percentage
 * @param quantity Order quantity in quote currency
 * @param price Current market price
 * @returns Total cost in quote currency
 */
export function calculateNetCost(
  slippage: number,
  fees: number,
  marketImpact: number,
  quantity: number,
  price: number
): number {
  // Convert percentages to decimal
  const slippageDecimal = slippage / 100;
  const marketImpactDecimal = marketImpact / 100;
  
  // Calculate costs
  const slippageCost = quantity * slippageDecimal;
  const marketImpactCost = quantity * marketImpactDecimal;
  
  // Net cost is the sum of all costs
  return slippageCost + fees + marketImpactCost;
}
