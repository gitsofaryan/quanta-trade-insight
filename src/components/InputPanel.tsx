
import React from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { SimulationParameters } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';

interface InputPanelProps {
  parameters: SimulationParameters;
  onParametersChange: (parameters: SimulationParameters) => void;
}

const InputPanel: React.FC<InputPanelProps> = ({ parameters, onParametersChange }) => {
  const handleChange = (key: keyof SimulationParameters, value: string | number) => {
    onParametersChange({
      ...parameters,
      [key]: value,
    });
  };

  const assets = ["BTC-USDT-SWAP", "ETH-USDT-SWAP", "SOL-USDT-SWAP", "BNB-USDT-SWAP"];
  const feeTiers = ["VIP 0", "VIP 1", "VIP 2", "VIP 3", "VIP 4", "VIP 5"];

  return (
    <Card className="h-full bg-darkCard border-darkBorder">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Input Parameters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="parameter-group">
          <Label className="parameter-label">Exchange</Label>
          <Select 
            disabled
            value={parameters.exchange} 
            onValueChange={(value) => handleChange("exchange", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Exchange" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OKX">OKX</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="parameter-group">
          <Label className="parameter-label">Asset</Label>
          <Select 
            value={parameters.asset} 
            onValueChange={(value) => handleChange("asset", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Asset" />
            </SelectTrigger>
            <SelectContent>
              {assets.map((asset) => (
                <SelectItem key={asset} value={asset}>{asset}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="parameter-group">
          <Label className="parameter-label">Order Type</Label>
          <Select 
            value={parameters.orderType} 
            onValueChange={(value: 'market' | 'limit') => handleChange("orderType", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Order Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="market">Market</SelectItem>
              <SelectItem value="limit">Limit</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="parameter-group">
          <Label className="parameter-label">Quantity (USD)</Label>
          <Input 
            type="number" 
            value={parameters.quantity} 
            onChange={(e) => handleChange("quantity", parseFloat(e.target.value))}
            min={1}
            step={1}
          />
        </div>
        
        <div className="parameter-group">
          <Label className="parameter-label">Volatility (%)</Label>
          <div className="flex items-center space-x-4">
            <Slider
              value={[parameters.volatility]}
              min={0.1}
              max={10}
              step={0.1}
              onValueChange={(value) => handleChange("volatility", value[0])}
              className="flex-grow"
            />
            <span className="w-12 text-right font-mono">{parameters.volatility.toFixed(1)}</span>
          </div>
        </div>
        
        <div className="parameter-group">
          <Label className="parameter-label">Fee Tier</Label>
          <Select 
            value={parameters.feeTier} 
            onValueChange={(value) => handleChange("feeTier", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Fee Tier" />
            </SelectTrigger>
            <SelectContent>
              {feeTiers.map((tier) => (
                <SelectItem key={tier} value={tier}>{tier}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};

export default InputPanel;
