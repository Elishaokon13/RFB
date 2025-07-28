// ComparisonPage.tsx - This feature is currently disabled
import React from 'react';

export default function ComparisonPage() {
  return (
    <div className="container mx-auto p-8 text-center">
      <h1 className="text-xl font-medium">Token Comparison Feature Disabled</h1>
      <p className="text-muted-foreground mt-2">
        This feature is currently disabled.
      </p>
    </div>
  );
}

/*
Original implementation kept for reference:

import { useState } from 'react';
import { TokenSelector } from '@/components/comparison/TokenSelector';
import { ComparisonGrid } from '@/components/comparison/ComparisonGrid';
import { ComparisonCharts } from '@/components/comparison/ComparisonCharts';
import { useComparison, TimeframeOption, ChartType } from '@/context/ComparisonContext';
import { useComparisonTokens } from '@/hooks/useComparisonTokens';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  ToggleGroup, 
  ToggleGroupItem 
} from "@/components/ui/toggle-group";
import {
  ChartBarIcon,
  RefreshCwIcon,
  BarChart2,
  LineChart,
  AreaChart,
} from 'lucide-react';

export default function ComparisonPage() {
  const { state, setTimeframe, toggleRelativeMode, setChartType } = useComparison();
  const { data, loading, error } = useComparisonTokens(state.tokens, state.timeframe);
  
  // Handle timeframe selection
  const handleTimeframeChange = (value: string) => {
    if (value) {
      setTimeframe(value as TimeframeOption);
    }
  };
  
  // Handle chart type selection
  const handleChartTypeChange = (value: string) => {
    if (value) {
      setChartType(value as ChartType);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-6 max-w-[1800px]">
      <div className="flex flex-col space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Token Comparison</h1>
          <p className="text-muted-foreground">
            Compare metrics across multiple tokens to identify trends and opportunities
          </p>
        </div>
        
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TokenSelector />
          </div>
          <div className="flex flex-col justify-end gap-4">
            <div>
              <Label className="mb-2 block">Timeframe</Label>
              <ToggleGroup 
                type="single" 
                value={state.timeframe}
                onValueChange={handleTimeframeChange}
                className="justify-start"
              >
                <ToggleGroupItem value="1h">1h</ToggleGroupItem>
                <ToggleGroupItem value="24h">24h</ToggleGroupItem>
                <ToggleGroupItem value="7d">7d</ToggleGroupItem>
                <ToggleGroupItem value="30d">30d</ToggleGroupItem>
                <ToggleGroupItem value="1y">1y</ToggleGroupItem>
              </ToggleGroup>
            </div>
            
            <div>
              <Label className="mb-2 block">Chart Type</Label>
              <ToggleGroup 
                type="single" 
                value={state.chartType}
                onValueChange={handleChartTypeChange}
                className="justify-start"
              >
                <ToggleGroupItem value="line">
                  <LineChart className="w-4 h-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="bar">
                  <BarChart2 className="w-4 h-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="area">
                  <AreaChart className="w-4 h-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch 
                id="relative-mode" 
                checked={state.isRelative}
                onCheckedChange={toggleRelativeMode}
              />
              <Label htmlFor="relative-mode">Relative Mode</Label>
            </div>
          </div>
        </div>
        
        <ComparisonGrid 
          data={data} 
          loading={loading} 
          isRelative={state.isRelative}
        />
        
        <ComparisonCharts 
          data={data}
          loading={loading}
          chartType={state.chartType}
          isRelative={state.isRelative}
        />
      </div>
    </div>
  );
}
*/