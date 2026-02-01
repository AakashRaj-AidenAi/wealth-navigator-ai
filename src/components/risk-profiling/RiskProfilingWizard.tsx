import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { QuestionStep } from './QuestionStep';
import { ResultStep } from './ResultStep';
import {
  RISK_QUESTIONS,
  ALLOCATION_BY_CATEGORY,
  getCategoryFromScore,
  getCategoryLabel,
  RiskAnswer,
  RiskCategory,
} from './types';
import { ArrowLeft, ArrowRight, Loader2, CheckCircle } from 'lucide-react';

type RiskCategoryEnum = Database['public']['Enums']['risk_category'];

interface RiskProfilingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  onComplete?: () => void;
}

const STEPS = [
  { id: 1, title: 'Financial Capacity', category: 'financial_capacity' },
  { id: 2, title: 'Risk Tolerance', category: 'risk_tolerance' },
  { id: 3, title: 'Goal Requirements', category: 'goal_requirement' },
  { id: 4, title: 'Results & Summary', category: 'results' },
];

export const RiskProfilingWizard = ({
  open,
  onOpenChange,
  clientId,
  clientName,
  onComplete,
}: RiskProfilingWizardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<RiskAnswer[]>([]);
  const [notes, setNotes] = useState('');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Calculate derived values
  const totalScore = answers.reduce((sum, a) => sum + a.selectedScore, 0);
  const category = getCategoryFromScore(totalScore);
  const allocation = ALLOCATION_BY_CATEGORY[category];

  // Get questions for current step
  const getCurrentQuestions = () => {
    const step = STEPS[currentStep - 1];
    if (step.category === 'results') return [];
    return RISK_QUESTIONS.filter((q) => q.category === step.category);
  };

  // Check if current step is complete
  const isStepComplete = () => {
    const questions = getCurrentQuestions();
    if (questions.length === 0) return true;
    return questions.every((q) => answers.some((a) => a.questionId === q.id));
  };

  // Handle answer selection
  const handleAnswer = (
    questionId: string,
    option: string,
    score: number,
    questionText: string,
    category: string
  ) => {
    setAnswers((prev) => {
      const filtered = prev.filter((a) => a.questionId !== questionId);
      return [
        ...filtered,
        {
          questionId,
          category,
          questionText,
          selectedOption: option,
          selectedScore: score,
        },
      ];
    });
  };

  // Progress percentage
  const progress = (currentStep / STEPS.length) * 100;

  // Save the risk profile
  const handleSave = async () => {
    if (!user || !signatureData) {
      toast({
        title: 'Signature Required',
        description: 'Please provide a signature to complete the assessment.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      // Get the current version number
      const { data: existingProfiles } = await supabase
        .from('risk_profiles')
        .select('version')
        .eq('client_id', clientId)
        .order('version', { ascending: false })
        .limit(1);

      const newVersion = existingProfiles && existingProfiles.length > 0 
        ? existingProfiles[0].version + 1 
        : 1;

      // Deactivate previous active profiles
      await supabase
        .from('risk_profiles')
        .update({ is_active: false })
        .eq('client_id', clientId)
        .eq('is_active', true);

      // Create new risk profile
      const { data: profile, error: profileError } = await supabase
        .from('risk_profiles')
        .insert({
          client_id: clientId,
          advisor_id: user.id,
          total_score: totalScore,
          category: category as RiskCategoryEnum,
          equity_pct: allocation.equity,
          debt_pct: allocation.debt,
          gold_pct: allocation.gold,
          alternatives_pct: allocation.alternatives,
          cash_pct: allocation.cash,
          version: newVersion,
          is_active: true,
          signature_data: signatureData,
          signed_at: new Date().toISOString(),
          notes: notes || null,
          ip_address: null,
          user_agent: navigator.userAgent,
        })
        .select()
        .single();

      console.log('Risk profile save result:', { profile, profileError });

      if (profileError) {
        console.error('Profile save error:', profileError);
        throw profileError;
      }

      if (!profile) {
        throw new Error('No profile returned after insert');
      }

      // Save all answers
      const answerInserts = answers.map((answer) => ({
        profile_id: profile.id,
        question_id: answer.questionId,
        question_category: answer.category,
        question_text: answer.questionText,
        selected_option: answer.selectedOption,
        selected_score: answer.selectedScore,
      }));

      const { error: answersError } = await supabase
        .from('risk_answers')
        .insert(answerInserts);

      if (answersError) {
        console.error('Answers save error:', answersError);
        throw answersError;
      }

      console.log('Risk answers saved successfully');

      // Update client's risk_profile field
      await supabase
        .from('clients')
        .update({ risk_profile: category.replace('_', ' ') })
        .eq('id', clientId);

      // Create activity log
      await supabase.from('client_activities').insert({
        client_id: clientId,
        activity_type: 'document',
        title: 'Risk Profile Assessment Completed',
        description: `Risk category: ${getCategoryLabel(category)} (Score: ${totalScore}/60, Version: ${newVersion})`,
        created_by: user.id,
      });

      toast({
        title: 'Risk Profile Saved',
        description: `Assessment completed. Category: ${getCategoryLabel(category)}`,
      });

      onComplete?.();
      onOpenChange(false);
      resetWizard();
    } catch (error: any) {
      console.error('Error saving risk profile:', error);
      const errorMessage = error?.message || error?.details || 'Failed to save risk profile. Please try again.';
      toast({
        title: 'Error Saving Risk Profile',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadReport = async () => {
    setIsGeneratingPdf(true);
    
    // Create a simple HTML report and open in new window for printing
    const reportContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Risk Profile Report - ${clientName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { color: #1a1a1a; border-bottom: 2px solid #f0b429; padding-bottom: 10px; }
          h2 { color: #333; margin-top: 30px; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
          .score-box { background: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
          .score { font-size: 48px; font-weight: bold; color: #f0b429; }
          .category { font-size: 24px; color: #333; margin-top: 10px; }
          .allocation { display: flex; gap: 20px; margin: 20px 0; }
          .allocation-item { flex: 1; text-align: center; padding: 15px; background: #f9f9f9; border-radius: 8px; }
          .allocation-label { font-size: 12px; color: #666; }
          .allocation-value { font-size: 24px; font-weight: bold; color: #333; }
          .answer { padding: 10px; border-left: 3px solid #f0b429; margin: 10px 0; background: #fafafa; }
          .answer-question { font-weight: 500; }
          .answer-response { color: #666; font-size: 14px; margin-top: 5px; }
          .signature-section { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; }
          .footer { margin-top: 40px; font-size: 12px; color: #999; text-align: center; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Risk Profile Assessment Report</h1>
          <p>Date: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <p><strong>Client:</strong> ${clientName}</p>
        
        <div class="score-box">
          <div class="score">${totalScore}/60</div>
          <div class="category">${getCategoryLabel(category)}</div>
        </div>
        
        <h2>Recommended Asset Allocation</h2>
        <div class="allocation">
          <div class="allocation-item">
            <div class="allocation-label">Equity</div>
            <div class="allocation-value">${allocation.equity}%</div>
          </div>
          <div class="allocation-item">
            <div class="allocation-label">Debt</div>
            <div class="allocation-value">${allocation.debt}%</div>
          </div>
          <div class="allocation-item">
            <div class="allocation-label">Gold</div>
            <div class="allocation-value">${allocation.gold}%</div>
          </div>
          <div class="allocation-item">
            <div class="allocation-label">Alternatives</div>
            <div class="allocation-value">${allocation.alternatives}%</div>
          </div>
          <div class="allocation-item">
            <div class="allocation-label">Cash</div>
            <div class="allocation-value">${allocation.cash}%</div>
          </div>
        </div>
        
        <h2>Assessment Responses</h2>
        ${answers.map(a => `
          <div class="answer">
            <div class="answer-question">${a.questionText}</div>
            <div class="answer-response">${a.selectedOption} (${a.selectedScore} points)</div>
          </div>
        `).join('')}
        
        ${notes ? `<h2>Additional Notes</h2><p>${notes}</p>` : ''}
        
        <div class="signature-section">
          <p><strong>Client Acknowledgment:</strong></p>
          ${signatureData ? `<img src="${signatureData}" style="max-width: 300px; border: 1px solid #ddd; border-radius: 4px;" />` : '<p style="color: #999;">No signature provided</p>'}
        </div>
        
        <div class="footer">
          <p>This report was generated automatically. Please consult with your financial advisor before making investment decisions.</p>
        </div>
        
        <script>window.print();</script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(reportContent);
      printWindow.document.close();
    }

    setIsGeneratingPdf(false);
  };

  const resetWizard = () => {
    setCurrentStep(1);
    setAnswers([]);
    setNotes('');
    setSignatureData(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Risk Profile Assessment - {clientName}
          </DialogTitle>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={`flex items-center gap-1 ${
                  currentStep >= step.id ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {currentStep > step.id ? (
                  <CheckCircle className="h-4 w-4" />
                ) : currentStep === step.id ? (
                  <div className="w-4 h-4 rounded-full border-2 border-primary" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                )}
                <span className="hidden sm:inline">{step.title}</span>
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4">
          {currentStep < 4 ? (
            <QuestionStep
              questions={getCurrentQuestions()}
              answers={answers}
              onAnswer={handleAnswer}
            />
          ) : (
            <ResultStep
              score={totalScore}
              category={category}
              allocation={allocation}
              answers={answers}
              notes={notes}
              onNotesChange={setNotes}
              signatureData={signatureData}
              onSignature={setSignatureData}
              onClearSignature={() => setSignatureData(null)}
              onDownloadReport={handleDownloadReport}
              isGeneratingPdf={isGeneratingPdf}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="ghost"
            onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
            disabled={currentStep === 1}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="text-sm text-muted-foreground">
            Step {currentStep} of {STEPS.length}
          </div>

          {currentStep < 4 ? (
            <Button
              onClick={() => setCurrentStep((s) => s + 1)}
              disabled={!isStepComplete()}
              className="gap-2"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={isSaving || !signatureData}
              className="gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Complete Assessment
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
