import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { AllocationSuggestion } from './types';

interface AllocationPieChartProps {
  allocation: AllocationSuggestion;
  size?: number;
}

const COLORS = {
  equity: 'hsl(43, 74%, 49%)',      // Gold/Amber
  debt: 'hsl(199, 89%, 48%)',       // Blue
  gold: 'hsl(45, 100%, 50%)',       // Yellow/Gold
  alternatives: 'hsl(280, 65%, 60%)', // Purple
  cash: 'hsl(160, 84%, 39%)',       // Green
};

const LABELS = {
  equity: 'Equity',
  debt: 'Debt',
  gold: 'Gold',
  alternatives: 'Alternatives',
  cash: 'Cash',
};

export const AllocationPieChart = ({ allocation, size = 200 }: AllocationPieChartProps) => {
  const data = Object.entries(allocation)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => ({
      name: LABELS[key as keyof typeof LABELS],
      value,
      color: COLORS[key as keyof typeof COLORS],
    }));

  return (
    <div style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={size * 0.25}
            outerRadius={size * 0.4}
            paddingAngle={2}
            dataKey="value"
            label={({ name, value }) => `${name}: ${value}%`}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                    <p className="text-sm font-medium">{payload[0].name}</p>
                    <p className="text-sm text-muted-foreground">{payload[0].value}%</p>
                  </div>
                );
              }
              return null;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const AllocationBreakdown = ({ allocation }: { allocation: AllocationSuggestion }) => {
  return (
    <div className="space-y-3">
      {Object.entries(allocation).map(([key, value]) => (
        <div key={key} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-sm"
              style={{ backgroundColor: COLORS[key as keyof typeof COLORS] }}
            />
            <span className="text-sm">{LABELS[key as keyof typeof LABELS]}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${value}%`,
                  backgroundColor: COLORS[key as keyof typeof COLORS],
                }}
              />
            </div>
            <span className="text-sm font-medium w-12 text-right">{value}%</span>
          </div>
        </div>
      ))}
    </div>
  );
};
