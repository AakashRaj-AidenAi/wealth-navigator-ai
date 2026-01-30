import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface PerformanceData {
  month: string;
  orders: number;
  clients: number;
}

export const PerformanceChart = () => {
  const [data, setData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Get orders grouped by month for the last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: orders } = await supabase
        .from('orders')
        .select('created_at')
        .gte('created_at', sixMonthsAgo.toISOString());

      const { data: clients } = await supabase
        .from('clients')
        .select('created_at')
        .gte('created_at', sixMonthsAgo.toISOString());

      // Generate last 6 months
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        months.push({
          month: date.toLocaleString('default', { month: 'short' }),
          year: date.getFullYear(),
          monthNum: date.getMonth()
        });
      }

      const performanceData = months.map(m => {
        const monthOrders = orders?.filter(o => {
          const d = new Date(o.created_at);
          return d.getMonth() === m.monthNum && d.getFullYear() === m.year;
        }).length || 0;

        const monthClients = clients?.filter(c => {
          const d = new Date(c.created_at);
          return d.getMonth() === m.monthNum && d.getFullYear() === m.year;
        }).length || 0;

        return {
          month: m.month,
          orders: monthOrders,
          clients: monthClients
        };
      });

      setData(performanceData);
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="glass rounded-xl p-5 h-full">
        <Skeleton className="h-6 w-40 mb-2" />
        <Skeleton className="h-4 w-32 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-5 h-full">
      <div className="mb-4">
        <h3 className="font-semibold">Activity Trends</h3>
        <p className="text-sm text-muted-foreground">Orders & clients over 6 months</p>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(43, 74%, 49%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(43, 74%, 49%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="clientsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" vertical={false} />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 12 }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-popover border border-border rounded-lg px-4 py-3 shadow-lg">
                      <p className="text-sm font-medium mb-2">{label}</p>
                      {payload.map((entry: any) => (
                        <div key={entry.name} className="flex items-center gap-2 text-sm">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-muted-foreground">{entry.name}:</span>
                          <span className="font-medium">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '20px' }}
              formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
            />
            <Area
              type="monotone"
              dataKey="orders"
              name="Orders"
              stroke="hsl(43, 74%, 49%)"
              strokeWidth={2}
              fill="url(#ordersGradient)"
            />
            <Area
              type="monotone"
              dataKey="clients"
              name="New Clients"
              stroke="hsl(199, 89%, 48%)"
              strokeWidth={2}
              fill="url(#clientsGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
