import { RiskCategory, AllocationSuggestion, getCategoryLabel, getCategoryColor, RiskAnswer } from './types';
import { RiskMeter } from './RiskMeter';
import { AllocationPieChart, AllocationBreakdown } from './AllocationPieChart';
import { SignatureCapture } from './SignatureCapture';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FileDown, Info, CheckCircle } from 'lucide-react';

interface ResultStepProps {
  score: number;
  category: RiskCategory;
  allocation: AllocationSuggestion;
  answers: RiskAnswer[];
  notes: string;
  onNotesChange: (notes: string) => void;
  signatureData: string | null;
  onSignature: (data: string) => void;
  onClearSignature: () => void;
  onDownloadReport: () => void;
  isGeneratingPdf?: boolean;
}

export const ResultStep = ({
  score,
  category,
  allocation,
  answers,
  notes,
  onNotesChange,
  signatureData,
  onSignature,
  onClearSignature,
  onDownloadReport,
  isGeneratingPdf = false,
}: ResultStepProps) => {
  // Group answers by category
  const groupedAnswers = answers.reduce((acc, answer) => {
    if (!acc[answer.category]) {
      acc[answer.category] = [];
    }
    acc[answer.category].push(answer);
    return acc;
  }, {} as Record<string, RiskAnswer[]>);

  const categoryLabels: Record<string, string> = {
    financial_capacity: 'Financial Capacity',
    risk_tolerance: 'Risk Tolerance',
    goal_requirement: 'Goal & Return Requirements',
  };

  const categoryDescriptions: Record<RiskCategory, string> = {
    very_conservative:
      'You prefer stability and capital protection over growth. Your portfolio should focus on low-risk instruments like fixed deposits, government bonds, and conservative debt funds.',
    conservative:
      'You prefer minimal risk while accepting modest returns. A mix of fixed income with limited equity exposure is suitable for your profile.',
    moderate:
      'You are comfortable with balanced risk-reward trade-offs. A diversified portfolio across equity, debt, and other assets suits you well.',
    aggressive:
      'You can tolerate significant fluctuations for higher returns. Equity-heavy portfolios with growth-oriented strategies are suitable.',
    very_aggressive:
      'You seek maximum growth and can handle high volatility. High equity allocation with potential alternative investments aligns with your goals.',
  };

  return (
    <div className="space-y-6">
      {/* Risk Assessment Summary */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="h-4 w-4" />
              Risk Assessment Result
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-6">
            <RiskMeter score={score} maxScore={60} category={category} size="lg" />
            <p className="text-sm text-muted-foreground mt-4 text-center max-w-sm">
              {categoryDescriptions[category]}
            </p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Suggested Asset Allocation</CardTitle>
          </CardHeader>
          <CardContent className="py-6">
            <div className="flex items-center gap-6">
              <AllocationPieChart allocation={allocation} size={180} />
              <div className="flex-1">
                <AllocationBreakdown allocation={allocation} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Answer Summary */}
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Response Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(groupedAnswers).map(([category, categoryAnswers]) => (
              <div key={category}>
                <h4 className="font-medium text-sm text-muted-foreground mb-3">
                  {categoryLabels[category]}
                </h4>
                <div className="space-y-2">
                  {categoryAnswers.map((answer) => (
                    <div
                      key={answer.questionId}
                      className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30"
                    >
                      <CheckCircle className="h-4 w-4 text-success mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{answer.questionText}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="font-medium">{answer.selectedOption}</span>
                          <span className="ml-2">({answer.selectedScore} points)</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notes & Signature */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Add any additional notes or observations..."
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={5}
            />
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Client Acknowledgment</CardTitle>
          </CardHeader>
          <CardContent>
            <SignatureCapture
              onSignature={onSignature}
              onClear={onClearSignature}
            />
          </CardContent>
        </Card>
      </div>

      {/* Download Report */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          size="lg"
          onClick={onDownloadReport}
          disabled={isGeneratingPdf}
          className="gap-2"
        >
          <FileDown className="h-4 w-4" />
          {isGeneratingPdf ? 'Generating PDF...' : 'Download Risk Profile Report'}
        </Button>
      </div>
    </div>
  );
};
