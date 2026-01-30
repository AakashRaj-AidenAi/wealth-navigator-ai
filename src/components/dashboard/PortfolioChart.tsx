import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { assetAllocation, formatCurrency } from '@/data/mockData';

const COLORS = [
  'hsl(43, 74%, 49%)',
  'hsl(199, 89%, 48%)',
  'hsl(160, 84%, 39%)',
  'hsl(215, 20%, 55%)',
  'hsl(280, 65%, 60%)',
  'hsl(38, 92%, 50%)',
];

export const PortfolioChart = () => {
  const totalAUM = 547000000;

  return (
    <div className="glass rounded-xl p-5 h-full">
      <div className="mb-4">
        <h3 className="font-semibold">Asset Allocation</h3>
        <p className="text-sm text-muted-foreground">Firm-wide portfolio breakdown</p>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="relative w-48 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={assetAllocation}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {assetAllocation.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs text-muted-foreground">Total AUM</span>
            <span className="text-lg font-semibold">{formatCurrency(totalAUM, true)}</span>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          {assetAllocation.map((item, index) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: COLORS[index] }}
                />
                <span className="text-sm text-muted-foreground">{item.name}</span>
              </div>
              <span className="text-sm font-medium tabular-nums">{item.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
