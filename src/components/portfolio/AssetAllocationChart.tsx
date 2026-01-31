import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PieChart as PieChartIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

const COLORS = [
  'hsl(43, 74%, 49%)',   // Gold
  'hsl(199, 89%, 48%)',  // Blue
  'hsl(160, 84%, 39%)',  // Green
  'hsl(280, 65%, 60%)',  // Purple
  'hsl(38, 92%, 50%)',   // Orange
  'hsl(215, 20%, 55%)',  // Gray
];

export interface AllocationItem {
  name: string;
  value: number;
  percentage: number;
  targetPercentage?: number;
}

interface AssetAllocationChartProps {
  allocations: AllocationItem[];
  totalValue: number;
  onFilterChange?: (assetClass: string | null) => void;
  selectedFilter?: string | null;
}

export const AssetAllocationChart = ({ 
  allocations, 
  totalValue, 
  onFilterChange,
  selectedFilter 
}: AssetAllocationChartProps) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const handleClick = (data: any, index: number) => {
    if (onFilterChange) {
      const newFilter = selectedFilter === data.name ? null : data.name;
      onFilterChange(newFilter);
    }
  };

  return (
    <Card className="glass border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <PieChartIcon className="h-4 w-4 text-primary" />
          Asset Allocation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="relative w-44 h-44 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocations}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="percentage"
                  onClick={handleClick}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  className="cursor-pointer"
                >
                  {allocations.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]}
                      opacity={selectedFilter && selectedFilter !== entry.name ? 0.3 : 1}
                      stroke={activeIndex === index ? 'hsl(var(--primary))' : 'transparent'}
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as AllocationItem;
                      return (
                        <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                          <p className="text-sm font-medium">{data.name}</p>
                          <p className="text-sm text-primary">{formatCurrency(data.value, true)}</p>
                          <p className="text-xs text-muted-foreground">{data.percentage.toFixed(1)}% of portfolio</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-lg font-semibold">{formatCurrency(totalValue, true)}</span>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            {allocations.map((item, index) => {
              const drift = item.targetPercentage 
                ? item.percentage - item.targetPercentage 
                : null;
              const hasDrift = drift && Math.abs(drift) > 5;
              
              return (
                <div 
                  key={item.name} 
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer",
                    selectedFilter === item.name ? "bg-primary/10" : "hover:bg-muted/50",
                    selectedFilter && selectedFilter !== item.name && "opacity-50"
                  )}
                  onClick={() => onFilterChange?.(selectedFilter === item.name ? null : item.name)}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm">{item.name}</span>
                    {hasDrift && (
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[10px] px-1.5",
                          drift! > 0 ? "text-warning border-warning/50" : "text-destructive border-destructive/50"
                        )}
                      >
                        {drift! > 0 ? '+' : ''}{drift!.toFixed(1)}%
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium tabular-nums">{item.percentage.toFixed(1)}%</span>
                    <span className="text-xs text-muted-foreground ml-2">{formatCurrency(item.value, true)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
