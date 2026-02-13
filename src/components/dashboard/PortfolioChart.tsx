import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { api, extractItems } from '@/services/api';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/currency';

const COLORS = [
  'hsl(43, 74%, 49%)',
  'hsl(199, 89%, 48%)',
  'hsl(160, 84%, 39%)',
  'hsl(215, 20%, 55%)',
  'hsl(280, 65%, 60%)',
  'hsl(38, 92%, 50%)',
];

interface AllocationData {
  name: string;
  value: number;
}

export const PortfolioChart = () => {
  const [allocation, setAllocation] = useState<AllocationData[]>([]);
  const [totalAUM, setTotalAUM] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const clientsRes = await api.get('/clients');
        const clients = extractItems<any>(clientsRes);

        if (clients.length > 0) {
          const total = clients.reduce((sum, c) => sum + (Number(c.total_assets) || 0), 0);
          setTotalAUM(total);

          // Group by risk profile
          const riskGroups = clients.reduce((acc, client) => {
            const risk = client.risk_profile || 'moderate';
            acc[risk] = (acc[risk] || 0) + (Number(client.total_assets) || 0);
            return acc;
          }, {} as Record<string, number>);

          const allocationData = Object.entries(riskGroups).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value: Math.round((value / total) * 100)
          }));

          setAllocation(allocationData);
        } else {
          // Default empty state
          setAllocation([
            { name: 'No Data', value: 100 }
          ]);
        }
      } catch (err) {
        console.error('Failed to load portfolio data:', err);
        setAllocation([{ name: 'No Data', value: 100 }]);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="glass rounded-xl p-5 h-full">
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-4 w-48 mb-4" />
        <Skeleton className="h-48 w-48 rounded-full mx-auto" />
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-5 h-full">
      <div className="mb-4">
        <h3 className="font-semibold">Risk Profile Distribution</h3>
        <p className="text-sm text-muted-foreground">Client assets by risk tolerance</p>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="relative w-48 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={allocation}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {allocation.map((entry, index) => (
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
          {allocation.map((item, index) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
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
