import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { formatCurrencyShort } from '@/lib/currency';
import { Phone, Mail, GripVertical, Star, CheckCircle, Lock } from 'lucide-react';
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
  converted_client_id: string | null;
  created_at: string;
}

type LeadStage = 'new' | 'contacted' | 'meeting' | 'proposal' | 'closed_won' | 'lost';

interface LeadPipelineProps {
  leads: Lead[];
  onStageChange: (leadId: string, newStage: LeadStage) => void;
  onLeadClick: (lead: Lead) => void;
}

const stages: { id: LeadStage; label: string; color: string }[] = [
  { id: 'new', label: 'New', color: 'bg-blue-500' },
  { id: 'contacted', label: 'Contacted', color: 'bg-purple-500' },
  { id: 'meeting', label: 'Meeting', color: 'bg-amber-500' },
  { id: 'proposal', label: 'Proposal', color: 'bg-orange-500' },
  { id: 'closed_won', label: 'Closed/Won', color: 'bg-green-500' },
  { id: 'lost', label: 'Lost', color: 'bg-red-500' }
];

export const LeadPipeline = ({ leads, onStageChange, onLeadClick }: LeadPipelineProps) => {
  const [draggedLead, setDraggedLead] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<LeadStage | null>(null);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLead(leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, stage: LeadStage) => {
    e.preventDefault();
    setDragOverStage(stage);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = (e: React.DragEvent, stage: LeadStage) => {
    e.preventDefault();
    if (draggedLead) {
      onStageChange(draggedLead, stage);
    }
    setDraggedLead(null);
    setDragOverStage(null);
  };

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

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map((stage) => {
        const stageLeads = getLeadsByStage(stage.id);
        const stageValue = getStageValue(stage.id);
        
        return (
          <div
            key={stage.id}
            className={`flex-shrink-0 w-72 rounded-xl transition-all ${
              dragOverStage === stage.id ? 'ring-2 ring-primary bg-primary/5' : ''
            }`}
            onDragOver={(e) => handleDragOver(e, stage.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            <div className="p-3 rounded-t-xl bg-secondary/50 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${stage.color}`} />
                  <span className="font-medium text-sm">{stage.label}</span>
                  <Badge variant="secondary" className="ml-1">
                    {stageLeads.length}
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrencyShort(stageValue)} weighted
              </p>
            </div>

            <div className="p-2 space-y-2 min-h-[400px] bg-secondary/20 rounded-b-xl">
              {stageLeads.map((lead) => {
                const isConverted = lead.stage === 'closed_won' && lead.converted_client_id;
                
                return (
                  <div
                    key={lead.id}
                    draggable={!isConverted}
                    onDragStart={(e) => !isConverted && handleDragStart(e, lead.id)}
                    onClick={() => onLeadClick(lead)}
                    className={`p-3 rounded-lg bg-background border cursor-pointer transition-all hover:shadow-md hover:border-primary/30 ${
                      draggedLead === lead.id ? 'opacity-50' : ''
                    } ${isConverted ? 'border-success/30 bg-success/5' : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      {isConverted ? (
                        <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      ) : (
                        <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5 cursor-grab" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-medium text-sm truncate">{lead.name}</h4>
                          {isConverted ? (
                            <div className="flex items-center gap-1 text-success">
                              <CheckCircle className="h-3 w-3" />
                              <span className="text-xs font-medium">Converted</span>
                            </div>
                          ) : (
                            <div className={`flex items-center gap-1 ${getScoreColor(lead.lead_score || 0)}`}>
                              <Star className="h-3 w-3 fill-current" />
                              <span className="text-xs font-medium">{lead.lead_score}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-1 mt-2 text-xs text-muted-foreground">
                          {lead.email && (
                            <div className="flex items-center gap-1 truncate">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{lead.email}</span>
                            </div>
                          )}
                          {lead.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span>{lead.phone}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <Badge variant="outline" className="text-xs capitalize">
                            {lead.source?.replace('_', ' ')}
                          </Badge>
                          <div className="text-right">
                            <p className="text-sm font-medium">{formatCurrencyShort(lead.expected_value)}</p>
                            <p className="text-xs text-muted-foreground">{lead.probability}% prob</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {stageLeads.length === 0 && (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  Drop leads here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
