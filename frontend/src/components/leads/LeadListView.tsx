import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrencyShort } from '@/lib/currency';
import { formatDistanceToNow } from 'date-fns';
import { Star, ArrowUpDown, Mail, Phone } from 'lucide-react';
interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  expected_value: number | null;
  stage: LeadStage;
  source: string | null;
  lead_score: number | null;
  probability: number | null;
  notes: string | null;
  converted_client_id: string | null;
  last_activity_at: string | null;
  created_at: string;
}

type LeadStage = 'new' | 'contacted' | 'meeting' | 'proposal' | 'closed_won' | 'lost';

interface LeadListViewProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
}

const stageColors: Record<LeadStage, string> = {
  new: 'bg-blue-500',
  contacted: 'bg-purple-500',
  meeting: 'bg-amber-500',
  proposal: 'bg-orange-500',
  closed_won: 'bg-green-500',
  lost: 'bg-red-500'
};

const stageLabels: Record<LeadStage, string> = {
  new: 'New',
  contacted: 'Contacted',
  meeting: 'Meeting',
  proposal: 'Proposal',
  closed_won: 'Closed/Won',
  lost: 'Lost'
};

export const LeadListView = ({ leads, onLeadClick }: LeadListViewProps) => {
  const [sortBy, setSortBy] = useState<'name' | 'value' | 'score' | 'date'>('date');
  const [filterStage, setFilterStage] = useState<LeadStage | 'all'>('all');

  const filteredLeads = leads.filter(lead => 
    filterStage === 'all' || lead.stage === filterStage
  );

  const sortedLeads = [...filteredLeads].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'value':
        return (b.expected_value || 0) - (a.expected_value || 0);
      case 'score':
        return (b.lead_score || 0) - (a.lead_score || 0);
      case 'date':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 50) return 'text-amber-500';
    return 'text-muted-foreground';
  };

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>All Leads</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filterStage} onValueChange={(v) => setFilterStage(v as LeadStage | 'all')}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {Object.entries(stageLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-[150px]">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date Added</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="value">Value</SelectItem>
                <SelectItem value="score">Lead Score</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="text-center">Score</TableHead>
              <TableHead>Last Activity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedLeads.map((lead) => (
              <TableRow 
                key={lead.id} 
                className="cursor-pointer hover:bg-secondary/50"
                onClick={() => onLeadClick(lead)}
              >
                <TableCell>
                  <div className="font-medium">{lead.name}</div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    {lead.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span className="truncate max-w-[150px]">{lead.email}</span>
                      </div>
                    )}
                    {lead.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span>{lead.phone}</span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {lead.source?.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${stageColors[lead.stage]}`} />
                    <span className="capitalize">{stageLabels[lead.stage]}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div>
                    <p className="font-medium">{formatCurrencyShort(lead.expected_value)}</p>
                    <p className="text-xs text-muted-foreground">{lead.probability}% prob</p>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className={`flex items-center justify-center gap-1 ${getScoreColor(lead.lead_score || 0)}`}>
                    <Star className="h-4 w-4 fill-current" />
                    <span className="font-medium">{lead.lead_score}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {lead.last_activity_at 
                    ? formatDistanceToNow(new Date(lead.last_activity_at), { addSuffix: true })
                    : 'Never'
                  }
                </TableCell>
              </TableRow>
            ))}
            {sortedLeads.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No leads found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
