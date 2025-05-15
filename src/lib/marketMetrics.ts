
import { Decimal } from 'decimal.js';
import { OrderBookData, MarketMetrics } from './types';

Decimal.set({ precision: 20 });

/**
 * Calculates key market metrics from order book data
 * @param orderBook Current order book state
 * @returns Object containing spread, depth, imbalance, and volatility metrics
 */
export function calculateMarketMetrics(orderBook: OrderBookData): MarketMetrics {
  if (!orderBook?.asks?.[0] || !orderBook?.bids?.[0]) {
    return {
      spread: new Decimal(0),
      depth: new Decimal(0),
      imbalance: new Decimal(0),
      volatility: new Decimal(0)
    };
  }

  // Calculate spread
  const bestAsk = new Decimal(orderBook.asks[0][0]);
  const bestBid = new Decimal(orderBook.bids[0][0]);
  const spread = bestAsk.minus(bestBid);
  const midPrice = bestAsk.plus(bestBid).div(2);
  
  // Calculate market depth (sum of volumes within 2% of mid price)
  const depthThreshold = midPrice.mul('0.02'); // 2% threshold
  
  let bidDepth = new Decimal(0);
  let askDepth = new Decimal(0);
  
  // Calculate bid depth
  for (const [price, size] of orderBook.bids) {
    if (midPrice.minus(new Decimal(price)).abs().lte(depthThreshold)) {
      bidDepth = bidDepth.plus(new Decimal(size));
    }
  }
  
  // Calculate ask depth
  for (const [price, size] of orderBook.asks) {
    if (midPrice.minus(new Decimal(price)).abs().lte(depthThreshold)) {
      askDepth = askDepth.plus(new Decimal(size));
    }
  }
  
  const depth = bidDepth.plus(askDepth);
  
  // Calculate order book imbalance
  const imbalance = depth.isZero() ? new Decimal(0) : bidDepth.minus(askDepth).div(depth);
  
  // Calculate short-term volatility estimate
  // We use spread as a proxy for short-term volatility
  const volatility = spread.div(midPrice).mul('100');

  return {
    spread,
    depth,
    imbalance,
    volatility
  };
}

/**
 * Calculates Volume-Weighted Average Price for one side of the order book
 * @param orderBook Current order book state
 * @param side Which side of the book to calculate VWAP for ('bids' or 'asks')
 * @returns Calculated VWAP as a Decimal
 */
export function calculateVWAP(orderBook: OrderBookData, side: 'bids' | 'asks'): Decimal {
  if (!orderBook?.[side] || orderBook[side].length === 0) {
    return new Decimal(0);
  }

  let totalVolume = new Decimal(0);
  let weightedSum = new Decimal(0);

  for (const [price, size] of orderBook[side]) {
    const decPrice = new Decimal(price);
    const decSize = new Decimal(size);
    
    weightedSum = weightedSum.plus(decPrice.mul(decSize));
    totalVolume = totalVolume.plus(decSize);
  }

  return totalVolume.isZero() ? new Decimal(0) : weightedSum.div(totalVolume);
}

/**
 * Calculates price impact for an order of specified quantity
 * @param orderBook Current order book state
 * @param quantity Order quantity in base currency
 * @param side 'buy' or 'sell'
 * @returns Price impact as a percentage
 */
export function calculatePriceImpact(
  orderBook: OrderBookData,
  quantity: number,
  side: 'buy' | 'sell'
): Decimal {
  const levels = side === 'buy' ? orderBook.asks : orderBook.bids;
  if (!levels || levels.length === 0) {
    return new Decimal(0);
  }

  let remainingQty = new Decimal(quantity);
  let totalCost = new Decimal(0);
  const basePrice = new Decimal(levels[0][0]);

  for (const [price, size] of levels) {
    if (remainingQty.lte(0)) break;

    const levelPrice = new Decimal(price);
    const levelSize = new Decimal(size);
    const fillSize = Decimal.min(remainingQty, levelSize);
    
    totalCost = totalCost.plus(levelPrice.mul(fillSize));
    remainingQty = remainingQty.minus(fillSize);
  }

  if (remainingQty.gt(0)) {
    // Not enough liquidity in the order book to fill the order
    return new Decimal(100); // Maximum impact (100%)
  }

  const avgPrice = totalCost.div(quantity);
  const impact = side === 'buy' 
    ? avgPrice.minus(basePrice).div(basePrice).mul(100) // For buys, impact is positive
    : basePrice.minus(avgPrice).div(basePrice).mul(100); // For sells, impact is positive when price decreases
  
  return impact;
}

/**
 * Estimates market volatility based on recent price history
 * @param timeSeriesData Array of price data points
 * @param window Window size for rolling volatility calculation
 * @returns Annualized volatility as a percentage
 */
export function estimateVolatility(timeSeriesData: { price: number }[], window: number = 20): number {
  if (timeSeriesData.length < 2) return 0;

  const returns = [];
  for (let i = 1; i < timeSeriesData.length; i++) {
    const returnVal = Math.log(timeSeriesData[i].price / timeSeriesData[i - 1].price);
    returns.push(returnVal);
  }

  const windowReturns = returns.slice(-window);
  const mean = windowReturns.reduce((a, b) => a + b, 0) / windowReturns.length;
  const variance = windowReturns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (windowReturns.length - 1);
  const annualizedVol = Math.sqrt(variance * 252) * 100; // Annualized volatility in percentage

  return annualizedVol;
}
