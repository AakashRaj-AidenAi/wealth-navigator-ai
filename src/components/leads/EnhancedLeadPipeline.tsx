import { useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrencyShort } from '@/lib/currency';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  Phone, Mail, GripVertical, Star, CheckCircle, Lock, 
  AlertCircle, Calendar, MoreVertical, Clock, TrendingUp
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Database } from '@/integrations/supabase/types';

type Lead = Database['public']['Tables']['leads']['Row'];
type LeadStage = Database['public']['Enums']['lead_stage'];

interface EnhancedLeadPipelineProps {
  leads: Lead[];
  onStageChange: (leadId: string, newStage: LeadStage) => void;
  onLeadClick: (lead: Lead) => void;
  onQuickAction: (lead: Lead, action: string) => void;
}

const stages: { id: LeadStage; label: string; color: string; bgColor: string }[] = [
  { id: 'new', label: 'New', color: 'bg-blue-500', bgColor: 'bg-blue-500/10' },
  { id: 'contacted', label: 'Contacted', color: 'bg-cyan-500', bgColor: 'bg-cyan-500/10' },
  { id: 'meeting', label: 'Meeting', color: 'bg-amber-500', bgColor: 'bg-amber-500/10' },
  { id: 'proposal', label: 'Proposal', color: 'bg-purple-500', bgColor: 'bg-purple-500/10' },
  { id: 'closed_won', label: 'Won', color: 'bg-success', bgColor: 'bg-success/10' },
  { id: 'lost', label: 'Lost', color: 'bg-destructive', bgColor: 'bg-destructive/10' }
];

export const EnhancedLeadPipeline = ({ 
  leads, 
  onStageChange, 
  onLeadClick,
  onQuickAction 
}: EnhancedLeadPipelineProps) => {
  const [draggedLead, setDraggedLead] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<LeadStage | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, leadId: string, lead: Lead) => {
    // Don't allow dragging converted leads
    if (lead.stage === 'closed_won' && lead.converted_client_id) {
      e.preventDefault();
      return;
    }
    
    e.stopPropagation();
    setDraggedLead(leadId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', leadId);
    
    // Set a drag image (optional but helps with visual feedback)
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, 20, 20);
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedLead(null);
    setDragOverStage(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, stage: LeadStage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stage);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverStage(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, stage: LeadStage) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain') || draggedLead;
    
    if (leadId) {
      const lead = leads.find(l => l.id === leadId);
      // Prevent dropping converted leads
      if (lead?.stage === 'closed_won' && lead?.converted_client_id) {
        setDraggedLead(null);
        setDragOverStage(null);
        return;
      }
      // Prevent moving from closed stages back
      if (lead?.stage === 'closed_won' || lead?.stage === 'lost') {
        if (stage !== lead?.stage) {
          setDraggedLead(null);
          setDragOverStage(null);
          return;
        }
      }
      onStageChange(leadId, stage);
    }
    setDraggedLead(null);
    setDragOverStage(null);
  }, [draggedLead, leads, onStageChange]);

  const getLeadsByStage = (stage: LeadStage) => 
    leads.filter(lead => lead.stage === stage);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 50) return 'text-amber-500';
    return 'text-muted-foreground';
  };

  const getStageValue = (stage: LeadStage) => {
    const stageLeads = getLeadsByStage(stage);
    return stageLeads.reduce((sum, l) => sum + ((l.expected_value || 0) * (l.probability || 0) / 100), 0);
  };

  const getLeadUrgency = (lead: Lead) => {
    if (!lead.last_activity_at) return 'high';
    const daysSinceActivity = differenceInDays(new Date(), new Date(lead.last_activity_at));
    if (daysSinceActivity > 7) return 'high';
    if (daysSinceActivity > 3) return 'medium';
    return 'low';
  };

  const hasOverdueFollowUp = (lead: Lead) => {
    if (!lead.next_follow_up) return false;
    return new Date(lead.next_follow_up) < new Date();
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 min-h-[500px]">
      {stages.map((stage) => {
        const stageLeads = getLeadsByStage(stage.id);
        const stageValue = getStageValue(stage.id);
        const isDragOver = dragOverStage === stage.id;
        
        return (
          <div
            key={stage.id}
            className={cn(
              'flex-shrink-0 w-72 rounded-xl transition-all duration-200',
              isDragOver && 'ring-2 ring-primary scale-[1.02]'
            )}
            // Keep handlers here for broad compatibility
            onDragOver={(e) => handleDragOver(e, stage.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            {/* Column Header */}
            <div className={cn('p-3 rounded-t-xl border-b', stage.bgColor)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn('h-3 w-3 rounded-full', stage.color)} />
                  <span className="font-semibold text-sm">{stage.label}</span>
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {stageLeads.length}
                  </Badge>
                </div>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <span className="font-medium text-foreground">{formatCurrencyShort(stageValue)}</span>
                weighted value
              </p>
            </div>

            {/* Cards Container (the real drop zone) */}
            <div
              className={cn(
                'p-2 space-y-2 min-h-[400px] rounded-b-xl transition-colors',
                isDragOver ? 'bg-primary/5' : 'bg-secondary/20'
              )}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              {stageLeads.map((lead) => {
                const isConverted = lead.stage === 'closed_won' && lead.converted_client_id;
                const isLost = lead.stage === 'lost';
                const urgency = getLeadUrgency(lead);
                const overdueFollowUp = hasOverdueFollowUp(lead);
                const isDragging = draggedLead === lead.id;

                return (
                    <div
                      key={lead.id}
                      draggable={!isConverted && !isLost}
                      onDragStart={(e) => handleDragStart(e, lead.id, lead)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onLeadClick(lead)}
                      className={cn(
                        'p-3 rounded-lg bg-background border transition-all duration-200',
                        !isConverted && !isLost && 'cursor-grab active:cursor-grabbing',
                        isConverted && 'cursor-pointer',
                        'hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5',
                        isDragging && 'opacity-50 scale-95 cursor-grabbing',
                        isConverted && 'border-success/30 bg-success/5',
                        isLost && 'border-destructive/30 bg-destructive/5 opacity-75',
                        urgency === 'high' && !isConverted && !isLost && 'border-l-4 border-l-amber-500',
                        overdueFollowUp && 'ring-1 ring-destructive/50'
                      )}
                    >
                      {/* Card Header */}
                      <div className="flex items-start gap-2">
                        {isConverted ? (
                          <Lock className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                        ) : (
                          <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-medium text-sm truncate">{lead.name}</h4>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onQuickAction(lead, 'call')}>
                                <Phone className="h-4 w-4 mr-2" />
                                Log Call
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onQuickAction(lead, 'email')}>
                                <Mail className="h-4 w-4 mr-2" />
                                Send Email
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onQuickAction(lead, 'meeting')}>
                                <Calendar className="h-4 w-4 mr-2" />
                                Schedule Meeting
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {!isConverted && !isLost && (
                                <>
                                  <DropdownMenuItem 
                                    onClick={() => onStageChange(lead.id, 'closed_won')}
                                    className="text-success"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Convert to Client
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => onQuickAction(lead, 'lost')}
                                    className="text-destructive"
                                  >
                                    <AlertCircle className="h-4 w-4 mr-2" />
                                    Mark as Lost
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        {/* Status Badges */}
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {isConverted && (
                            <Badge className="bg-success/20 text-success text-xs px-1.5 py-0">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Converted
                            </Badge>
                          )}
                          {overdueFollowUp && (
                            <Badge variant="destructive" className="text-xs px-1.5 py-0">
                              <Clock className="h-3 w-3 mr-1" />
                              Overdue
                            </Badge>
                          )}
                          {urgency === 'high' && !isConverted && !isLost && !overdueFollowUp && (
                            <Badge variant="outline" className="text-warning border-warning/50 text-xs px-1.5 py-0">
                              Needs Attention
                            </Badge>
                          )}
                        </div>
                        
                        {/* Contact Info */}
                        <div className="flex flex-col gap-0.5 mt-2 text-xs text-muted-foreground">
                          {lead.email && (
                            <div className="flex items-center gap-1 truncate">
                              <Mail className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{lead.email}</span>
                            </div>
                          )}
                          {lead.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 flex-shrink-0" />
                              <span>{lead.phone}</span>
                            </div>
                          )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-3 pt-2 border-t">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs capitalize px-1.5">
                              {lead.source?.replace('_', ' ')}
                            </Badge>
                            <div className={cn('flex items-center gap-0.5', getScoreColor(lead.lead_score || 0))}>
                              <Star className="h-3 w-3 fill-current" />
                              <span className="text-xs font-medium">{lead.lead_score}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">{formatCurrencyShort(lead.expected_value)}</p>
                            <p className="text-[10px] text-muted-foreground">{lead.probability}% prob</p>
                          </div>
                        </div>

                        {/* Last Activity */}
                        <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {lead.last_activity_at 
                            ? formatDistanceToNow(new Date(lead.last_activity_at), { addSuffix: true })
                            : 'No activity yet'
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {stageLeads.length === 0 && (
                <div className={cn(
                  'flex flex-col items-center justify-center h-32 rounded-lg border-2 border-dashed transition-colors',
                  isDragOver ? 'border-primary bg-primary/5' : 'border-muted'
                )}>
                  <p className="text-sm text-muted-foreground">
                    {isDragOver ? 'Drop here' : 'No leads'}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
