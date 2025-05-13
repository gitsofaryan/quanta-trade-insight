
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SimulationResults } from '@/lib/types';
import { Progress } from '@/components/ui/progress';
import { ArrowUpCircle, ArrowDownCircle, Clock } from 'lucide-react';

interface OutputPanelProps {
  results: SimulationResults;
  lastUpdated: string;
  isConnected: boolean;
}

const OutputPanel: React.FC<OutputPanelProps> = ({ 
  results, 
  lastUpdated,
  isConnected
}) => {
  const [flashState, setFlashState] = useState<Record<string, boolean>>({});
  
  useEffect(() => {
    // Create flash effect when values update
    const newFlashState = { ...flashState };
    Object.keys(results).forEach((key) => {
      newFlashState[key] = true;
    });
    
    setFlashState(newFlashState);
    
    const timer = setTimeout(() => {
      setFlashState({});
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [results]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-US', { 
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    });
  };
  
  const formatPercentage = (value: number) => {
    return `${value.toLocaleString('en-US', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    })}%`;
  };
  
  const formatLatency = (value: number) => {
    return `${value.toFixed(2)} ms`;
  };
  
  return (
    <Card className="h-full bg-darkCard border-darkBorder">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-semibold">Simulation Results</CardTitle>
        <div className="flex items-center space-x-2">
          <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-positive' : 'bg-negative'} animate-pulse-subtle`}></div>
          <span className="text-xs text-muted-foreground">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className={`metric-card ${flashState.netCost ? 'data-updated' : ''}`}>
          <div className="metric-title">Net Cost</div>
          <div className="flex items-center">
            <div className="metric-value text-2xl">
              {formatCurrency(results.netCost)}
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Total estimated cost for the transaction
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className={`metric-card ${flashState.expectedSlippage ? 'data-updated' : ''}`}>
            <div className="metric-title">Slippage</div>
            <div className="flex items-center">
              <div className="metric-value">{formatPercentage(results.expectedSlippage)}</div>
              {results.expectedSlippage > 0 ? 
                <ArrowUpCircle className="h-4 w-4 text-negative ml-2" /> : 
                <ArrowDownCircle className="h-4 w-4 text-positive ml-2" />
              }
            </div>
          </div>
          
          <div className={`metric-card ${flashState.expectedFees ? 'data-updated' : ''}`}>
            <div className="metric-title">Fees</div>
            <div className="metric-value">{formatCurrency(results.expectedFees)}</div>
          </div>
        </div>
        
        <div className={`metric-card ${flashState.expectedMarketImpact ? 'data-updated' : ''}`}>
          <div className="metric-title">Market Impact</div>
          <div className="metric-value">{formatPercentage(results.expectedMarketImpact)}</div>
          <div className="mt-2">
            <Progress value={results.expectedMarketImpact * 10} className="h-2" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`metric-card ${flashState.makerTakerProportion ? 'data-updated' : ''}`}>
            <div className="metric-title">Maker/Taker Proportion</div>
            <div className="flex justify-between items-center">
              <span className="text-xs">Taker</span>
              <span className="text-xs">Maker</span>
            </div>
            <div className="relative h-4 bg-muted rounded-full mt-1">
              <div 
                className="absolute top-0 left-0 h-full bg-chartBlue rounded-full"
                style={{ width: `${results.makerTakerProportion * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span>{`${Math.round((1 - results.makerTakerProportion) * 100)}%`}</span>
              <span>{`${Math.round(results.makerTakerProportion * 100)}%`}</span>
            </div>
          </div>
          
          <div className={`metric-card ${flashState.internalLatency ? 'data-updated' : ''}`}>
            <div className="metric-title">Processing Latency</div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
              <div className="metric-value">
                {formatLatency(results.internalLatency)}
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-xs text-right text-muted-foreground">
          Last updated: {lastUpdated || "Never"}
        </div>
      </CardContent>
    </Card>
  );
};

export default OutputPanel;
