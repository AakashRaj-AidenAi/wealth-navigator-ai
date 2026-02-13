import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, Activity } from 'lucide-react';
import { api } from '@/services/api';

interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
  currency: string;
}

const STORAGE_KEY = 'wealthos-ticker-collapsed';

const fallbackQuotes: MarketQuote[] = [
  { symbol: 'SENSEX', name: 'BSE Sensex', price: 77245.30, change: 312.45, change_percent: 0.41, currency: 'INR' },
  { symbol: 'NIFTY', name: 'Nifty 50', price: 23432.15, change: 98.70, change_percent: 0.42, currency: 'INR' },
  { symbol: 'BANKNIFTY', name: 'Bank Nifty', price: 49876.50, change: -123.40, change_percent: -0.25, currency: 'INR' },
  { symbol: 'GOLD', name: 'Gold', price: 2648.30, change: 15.20, change_percent: 0.58, currency: 'USD' },
  { symbol: 'USD/INR', name: 'USD/INR', price: 83.42, change: -0.08, change_percent: -0.10, currency: 'INR' },
];

export const MarketTicker = () => {
  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  const { data: quotes } = useQuery<MarketQuote[]>({
    queryKey: ['market-quotes'],
    queryFn: async () => {
      try {
        const res = await api.get<{ quotes: MarketQuote[] }>('/market/quotes');
        return res.quotes;
      } catch {
        return fallbackQuotes;
      }
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
    initialData: fallbackQuotes,
  });

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="w-full flex items-center justify-center gap-1.5 py-1 floating-bar text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Activity className="h-3 w-3" />
        Show Markets
        <ChevronDown className="h-3 w-3" />
      </button>
    );
  }

  const displayQuotes = quotes ?? fallbackQuotes;

  return (
    <div className="floating-bar px-2 py-1.5">
      <div className="flex items-center justify-between gap-2">
        {/* Live indicator */}
        <div className="flex items-center gap-1.5 px-2 flex-shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Live</span>
        </div>

        {/* Market quotes — evenly distributed */}
        <div className="flex-1 flex items-center justify-around">
          {displayQuotes.map((q, i) => (
            <div key={q.symbol} className="flex items-center gap-2">
              {i > 0 && (
                <div className="h-4 w-px bg-border/40 -ml-1" />
              )}
              <div className="flex items-center gap-1.5 px-2">
                <span className="text-xs font-semibold text-foreground">{q.symbol}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {q.currency === 'INR' ? '\u20B9' : '$'}
                  {q.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span
                  className={cn(
                    'flex items-center gap-0.5 text-xs font-medium tabular-nums',
                    q.change >= 0 ? 'text-emerald-500' : 'text-red-500'
                  )}
                >
                  {q.change >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {q.change >= 0 ? '+' : ''}{q.change_percent.toFixed(2)}%
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(true)}
          className="px-2 py-1 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 rounded-lg hover:bg-muted/50"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
