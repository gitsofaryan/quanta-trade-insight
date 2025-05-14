import { Decimal } from 'decimal.js';
import { OrderBookData } from './types';
import { calculateMarketMetrics, calculateVWAP, calculatePriceImpact } from './marketMetrics';

Decimal.set({ precision: 20 });

/**
 * Calculates expected slippage based on order book data and quantity using an enhanced model
 * that considers market depth and order book imbalance
 * @param orderBook Current order book state
 * @param quantity Order quantity in base currency
 * @returns Calculated slippage as a percentage
 */
export function calculateSlippage(orderBook: OrderBookData, quantity: number): number {
  if (!orderBook || !orderBook.asks || orderBook.asks.length === 0) {
    return 0;
  }

  const metrics = calculateMarketMetrics(orderBook);
  const priceImpact = calculatePriceImpact(orderBook, quantity, 'buy');
  
  // Enhanced slippage model considering market metrics
  const baseSlippage = priceImpact.toNumber();
  const imbalanceFactor = metrics.imbalance.abs().mul(0.5).toNumber(); // Imbalance penalty
  const depthFactor = new Decimal(1).div(metrics.depth.plus(1)).mul(100).toNumber(); // Depth adjustment
  
  return Math.max(0, baseSlippage * (1 + imbalanceFactor) * (1 + depthFactor));
}

/**
 * Calculates expected fees based on fee tier and quantity using exchange fee structure
 * @param feeTier Exchange fee tier
 * @param quantity Order quantity
 * @param price Current market price
 * @returns Calculated fees in quote currency
 */
export function calculateFees(feeTier: string, quantity: number, price: number): number {
  const feeTiers: Record<string, number> = {
    'VIP 0': 0.0010, // 0.10%
    'VIP 1': 0.0008, // 0.08%
    'VIP 2': 0.0006, // 0.06%
    'VIP 3': 0.0004, // 0.04%
    'VIP 4': 0.0002, // 0.02%
    'VIP 5': 0.0000, // 0.00%
  };
  
  const feeRate = feeTiers[feeTier] || feeTiers['VIP 0'];
  return new Decimal(quantity).mul(price).mul(feeRate).toNumber();
}

/**
 * Implements the Almgren-Chriss market impact model with adaptations for crypto markets
 * @param orderBook Current order book state
 * @param quantity Order quantity
 * @param volatility Market volatility parameter
 * @returns Estimated market impact as a percentage
 * 
 * Model Parameters:
 * - α (alpha): Temporary impact factor
 * - β (beta): Permanent impact factor
 * - σ (sigma): Volatility
 * 
 * Reference: Almgren, R., & Chriss, N. (2001). 
 * "Optimal execution of portfolio transactions"
 */
export function calculateMarketImpact(
  orderBook: OrderBookData, 
  quantity: number, 
  volatility: number
): number {
  if (!orderBook || !orderBook.asks || orderBook.asks.length === 0) {
    return 0;
  }
  
  const metrics = calculateMarketMetrics(orderBook);
  const marketDepth = metrics.depth.toNumber();
  const spread = metrics.spread.toNumber();
  
  // Model parameters
  const alpha = 0.1; // Temporary impact factor
  const beta = 0.6;  // Permanent impact factor
  const gamma = 0.1; // Spread impact factor
  
  // Calculate market impact components
  const temporaryImpact = alpha * volatility * Math.pow(quantity, beta) / Math.sqrt(marketDepth);
  const permanentImpact = gamma * spread * quantity / marketDepth;
  
  // Total impact with volatility adjustment
  const totalImpact = (temporaryImpact + permanentImpact) * (1 + volatility / 100);
  
  return Math.max(0, totalImpact);
}

/**
 * Estimates maker/taker proportion using an advanced logistic regression model
 * that considers market conditions and order size
 * @param orderBook Current order book state
 * @param quantity Order quantity
 * @returns Estimated maker portion (0-1)
 */
export function calculateMakerTakerProportion(
  orderBook: OrderBookData, 
  quantity: number
): number {
  if (!orderBook || !orderBook.asks || orderBook.asks.length === 0) {
    return 0;
  }
  
  const metrics = calculateMarketMetrics(orderBook);
  const spread = metrics.spread.toNumber();
  const depth = metrics.depth.toNumber();
  
  // Calculate relative order size
  const availableLiquidity = new Decimal(orderBook.asks[0][1]).toNumber();
  const relativeOrderSize = quantity / availableLiquidity;
  
  // Enhanced logistic function with market metrics
  const spreadFactor = spread / depth;
  const depthFactor = Math.log1p(depth) / 10;
  
  // Logistic regression with multiple factors
  const z = -3 * relativeOrderSize + 
           -2 * spreadFactor + 
           1.5 * depthFactor + 
           -0.5 * metrics.imbalance.toNumber();
  
  const makerPortion = 1 / (1 + Math.exp(-z));
  return Math.max(0, Math.min(1, makerPortion));
}

/**
 * Calculates total transaction cost including all components
 * @param slippage Calculated slippage
 * @param fees Exchange fees
 * @param marketImpact Estimated market impact
 * @param quantity Order quantity
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
  const baseAmount = new Decimal(quantity).mul(price);
  const slippageCost = baseAmount.mul(slippage).div(100);
  const marketImpactCost = baseAmount.mul(marketImpact).div(100);
  
  return slippageCost.plus(fees).plus(marketImpactCost).toNumber();
}