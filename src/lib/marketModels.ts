
import { OrderBookData } from "./types";

// Calculate expected slippage based on order book data and quantity
export function calculateSlippage(orderBook: OrderBookData, quantity: number): number {
  // Simple implementation - could be enhanced with more sophisticated models
  if (!orderBook || !orderBook.asks || orderBook.asks.length === 0) {
    return 0;
  }
  
  const bestAsk = parseFloat(orderBook.asks[0][0]);
  let remainingQuantity = quantity;
  let totalCost = 0;
  
  for (let i = 0; i < orderBook.asks.length && remainingQuantity > 0; i++) {
    const price = parseFloat(orderBook.asks[i][0]);
    const size = parseFloat(orderBook.asks[i][1]);
    
    const fillSize = Math.min(remainingQuantity, size);
    totalCost += fillSize * price;
    remainingQuantity -= fillSize;
  }
  
  const avgExecutionPrice = totalCost / (quantity - remainingQuantity);
  return ((avgExecutionPrice / bestAsk) - 1) * 100;
}

// Calculate expected fees based on fee tier and quantity
export function calculateFees(feeTier: string, quantity: number, price: number): number {
  // Fee tiers based on OKX fee structure (simplified)
  const feeTiers: Record<string, number> = {
    'VIP 0': 0.0010, // 0.10%
    'VIP 1': 0.0008, // 0.08%
    'VIP 2': 0.0006, // 0.06%
    'VIP 3': 0.0004, // 0.04%
    'VIP 4': 0.0002, // 0.02%
    'VIP 5': 0.0000, // 0.00%
  };
  
  const feeRate = feeTiers[feeTier] || feeTiers['VIP 0'];
  return feeRate * quantity * price;
}

// Calculate market impact using Almgren-Chriss model (simplified)
export function calculateMarketImpact(
  orderBook: OrderBookData, 
  quantity: number, 
  volatility: number
): number {
  if (!orderBook || !orderBook.asks || orderBook.asks.length === 0) {
    return 0;
  }
  
  // Simplified Almgren-Chriss model
  // Market impact = σ * |quantity| / √V where:
  // σ = volatility
  // V = volume (represented by sum of available liquidity in the book)
  
  // Estimate market depth/liquidity
  const depth = orderBook.asks.reduce((sum, level) => {
    return sum + parseFloat(level[1]);
  }, 0);
  
  // Constants for the model
  const alpha = 0.1; // Temporary impact factor
  const beta = 0.6;  // Permanent impact factor
  
  // Calculate market impact (simplified version)
  const marketImpact = alpha * volatility * Math.pow(quantity, beta) / Math.sqrt(depth);
  
  return Math.max(0, marketImpact); // Ensure non-negative
}

// Calculate maker/taker proportion (simplified logistic regression model)
export function calculateMakerTakerProportion(
  orderBook: OrderBookData, 
  quantity: number
): number {
  if (!orderBook || !orderBook.asks || orderBook.asks.length === 0) {
    return 0;
  }
  
  // Calculate bid-ask spread
  const bestAsk = parseFloat(orderBook.asks[0][0]);
  const bestBid = parseFloat(orderBook.bids[0][0]);
  const spread = bestAsk - bestBid;
  
  // Calculate relative order size compared to available liquidity
  const availableLiquidity = parseFloat(orderBook.asks[0][1]);
  const relativeOrderSize = quantity / availableLiquidity;
  
  // Logistic function to estimate maker portion
  // 1 = 100% maker, 0 = 100% taker
  const makerPortion = 1 / (1 + Math.exp(3 * relativeOrderSize - 2 * spread));
  
  return makerPortion;
}

// Calculate total net cost
export function calculateNetCost(
  slippage: number,
  fees: number,
  marketImpact: number,
  quantity: number,
  price: number
): number {
  const slippageCost = (slippage / 100) * quantity * price;
  const marketImpactCost = marketImpact * quantity * price;
  
  return slippageCost + fees + marketImpactCost;
}
