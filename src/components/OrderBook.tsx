
import React from 'react';
import { OrderBookData } from '@/lib/types';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface OrderBookProps {
  data: OrderBookData | null;
}

const OrderBook: React.FC<OrderBookProps> = ({ data }) => {
  const [viewType, setViewType] = React.useState<"both" | "asks" | "bids">("both");
  
  if (!data || !data.asks || !data.bids) {
    return <div className="text-center text-muted-foreground py-4">No order book data available</div>;
  }

  // Limit the number of entries to display
  const displayLimit = 8;
  const asks = data.asks.slice(0, displayLimit);
  const bids = data.bids.slice(0, displayLimit);
  
  const formatNumber = (value: string) => {
    return parseFloat(value).toLocaleString(undefined, { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };
  
  const formatAmount = (value: string) => {
    return parseFloat(value).toLocaleString(undefined, { 
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    });
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm font-medium">Orderbook</div>
        <ToggleGroup type="single" value={viewType} onValueChange={(value) => value && setViewType(value as "both" | "asks" | "bids")}>
          <ToggleGroupItem value="asks" size="sm" className="text-xs">Asks</ToggleGroupItem>
          <ToggleGroupItem value="both" size="sm" className="text-xs">Both</ToggleGroupItem>
          <ToggleGroupItem value="bids" size="sm" className="text-xs">Bids</ToggleGroupItem>
        </ToggleGroup>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(viewType === "both" || viewType === "asks") && (
          <div>
            <div className="text-sm font-medium mb-1">Asks (Sell Orders)</div>
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left text-negative">Price</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {asks.map((ask, index) => (
                  <TableRow key={`ask-${index}`}>
                    <TableCell className="text-left text-negative font-mono">{formatNumber(ask[0])}</TableCell>
                    <TableCell className="text-right font-mono">{formatAmount(ask[1])}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {(viewType === "both" || viewType === "bids") && (
          <div>
            <div className="text-sm font-medium mb-1">Bids (Buy Orders)</div>
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left text-positive">Price</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bids.map((bid, index) => (
                  <TableRow key={`bid-${index}`}>
                    <TableCell className="text-left text-positive font-mono">{formatNumber(bid[0])}</TableCell>
                    <TableCell className="text-right font-mono">{formatAmount(bid[1])}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderBook;
