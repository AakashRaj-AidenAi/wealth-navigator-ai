import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api, extractItems } from '@/services/api';

export interface PromptSuggestion {
  text: string;
  icon: string;
  category: string;
}

export const usePromptSuggestions = () => {
  const { user, role } = useAuth();
  const [suggestions, setSuggestions] = useState<PromptSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSuggestionsWithStats = async () => {
      if (!user || !role) {
        setLoading(false);
        return;
      }

      // Try graph-powered suggestions first
      try {
        const graphRes = await api.get<{ suggestions: PromptSuggestion[] }>('/chat/suggestions');
        if (graphRes.suggestions && graphRes.suggestions.length >= 3) {
          setSuggestions(graphRes.suggestions.slice(0, 6));
          setLoading(false);
          return;
        }
      } catch {
        // Fall through to static role-based suggestions
      }

      let overdueTasks = 0;
      let activeAlerts = 0;

      // Fire-and-forget stats fetch - don't block on failures
      try {
        const [tasksRes, alertsRes] = await Promise.all([
          api.get('/tasks', { status: 'overdue' }).catch(() => ({ items: [] })),
          api.get('/compliance/alerts', { is_resolved: false }).catch(() => ({ items: [] })),
        ]);

        overdueTasks = extractItems(tasksRes).length;
        activeAlerts = extractItems(alertsRes).length;
      } catch {
        // Ignore errors - we'll use defaults
      }

      // Generate role-based suggestions
      const baseSuggestions: PromptSuggestion[] = [];

      if (role === 'wealth_advisor') {
        // Add contextual suggestions based on stats first
        if (overdueTasks > 0) {
          baseSuggestions.push({
            text: `Review ${overdueTasks} overdue task${overdueTasks > 1 ? 's' : ''}`,
            icon: '⏰',
            category: 'Tasks',
          });
        }

        if (activeAlerts > 0) {
          baseSuggestions.push({
            text: `Check ${activeAlerts} active alert${activeAlerts > 1 ? 's' : ''}`,
            icon: '⚠️',
            category: 'Alerts',
          });
        }

        // Base suggestions for wealth advisors
        baseSuggestions.push(
          { text: 'Analyze top client portfolios', icon: '📊', category: 'Portfolio' },
          { text: 'Prepare talking points for client meetings', icon: '📅', category: 'Planning' },
          { text: 'What are the latest market insights?', icon: '📈', category: 'Markets' },
          { text: 'Show me high-priority leads', icon: '🎯', category: 'Leads' },
          { text: 'Tax-loss harvesting opportunities', icon: '💰', category: 'Tax' },
          { text: 'Clients needing portfolio rebalancing', icon: '⚖️', category: 'Portfolio' }
        );
      } else if (role === 'compliance_officer') {
        // Add contextual alert first
        if (activeAlerts > 0) {
          baseSuggestions.push({
            text: `Review ${activeAlerts} unresolved alert${activeAlerts > 1 ? 's' : ''}`,
            icon: '⚠️',
            category: 'Alerts',
          });
        }

        // Base suggestions for compliance officers
        baseSuggestions.push(
          { text: 'Show regulatory alerts for review', icon: '🔍', category: 'Compliance' },
          { text: 'Generate audit trail report', icon: '📋', category: 'Audit' },
          { text: 'Check recent risk flag escalations', icon: '🚨', category: 'Risk' },
          { text: 'Review communication logs', icon: '📝', category: 'Monitoring' },
          { text: 'Suitability check across portfolios', icon: '✅', category: 'Compliance' }
        );
      } else if (role === 'client') {
        baseSuggestions.push(
          { text: 'How is my portfolio performing?', icon: '💼', category: 'Portfolio' },
          { text: 'Am I on track to meet my goals?', icon: '🎯', category: 'Goals' },
          { text: 'What\'s happening in the markets?', icon: '📊', category: 'Markets' },
          { text: 'Schedule a meeting with my advisor', icon: '📅', category: 'Planning' },
          { text: 'Show my account summary', icon: '📈', category: 'Account' },
          { text: 'Review my investment strategy', icon: '💡', category: 'Strategy' }
        );
      }

      // Limit to 6 suggestions max for clean UI
      setSuggestions(baseSuggestions.slice(0, 6));
      setLoading(false);
    };

    fetchSuggestionsWithStats();
  }, [user, role]);

  return { suggestions, loading };
};
