import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

export interface PerformanceDataPoint {
  date: string;
  value: number;
  benchmark?: number;
}

interface PerformanceLineChartProps {
  data: PerformanceDataPoint[];
  title?: string;
}

const timeRanges = ['1M', '3M', '6M', '1Y', 'ALL'] as const;

export const PerformanceLineChart = ({ data, title = 'Performance Over Time' }: PerformanceLineChartProps) => {
  const [selectedRange, setSelectedRange] = useState<typeof timeRanges[number]>('1Y');

  const filterDataByRange = (range: typeof timeRanges[number]) => {
    if (range === 'ALL') return data;
    
    const now = new Date();
    const monthsBack = {
      '1M': 1,
      '3M': 3,
      '6M': 6,
      '1Y': 12,
    }[range];

    const cutoff = new Date(now);
    cutoff.setMonth(cutoff.getMonth() - monthsBack);
    
    return data.filter(d => new Date(d.date) >= cutoff);
  };

  const filteredData = filterDataByRange(selectedRange);
  
  const startValue = filteredData[0]?.value || 0;
  const endValue = filteredData[filteredData.length - 1]?.value || 0;
  const periodReturn = startValue > 0 ? ((endValue - startValue) / startValue) * 100 : 0;
  const isPositive = periodReturn >= 0;

  return (
    <Card className="glass border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-1">
            {timeRanges.map((range) => (
              <Button
                key={range}
                variant={selectedRange === range ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  "h-7 px-2.5 text-xs",
                  selectedRange === range && "bg-primary text-primary-foreground"
                )}
                onClick={() => setSelectedRange(range)}
              >
                {range}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4 mt-2">
          <div>
            <span className="text-2xl font-semibold">{formatCurrency(endValue, true)}</span>
            <span className={cn(
              "ml-2 text-sm font-medium",
              isPositive ? "text-success" : "text-destructive"
            )}>
              {isPositive ? '+' : ''}{periodReturn.toFixed(2)}%
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCurrency(value, true)}
                width={60}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                        <p className="text-xs text-muted-foreground mb-1">
                          {new Date(label).toLocaleDateString('en-US', { 
                            month: 'long', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                        <p className="text-sm font-medium">
                          {formatCurrency(payload[0].value as number)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#colorValue)"
              />
              {filteredData[0]?.benchmark && (
                <Line
                  type="monotone"
                  dataKey="benchmark"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
