import { RiskQuestion, RiskAnswer } from './types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface QuestionStepProps {
  questions: RiskQuestion[];
  answers: RiskAnswer[];
  onAnswer: (questionId: string, option: string, score: number, questionText: string, category: string) => void;
}

export const QuestionStep = ({ questions, answers, onAnswer }: QuestionStepProps) => {
  const getSelectedAnswer = (questionId: string) => {
    return answers.find((a) => a.questionId === questionId);
  };

  return (
    <div className="space-y-8">
      {questions.map((question, index) => {
        const selected = getSelectedAnswer(question.id);
        
        return (
          <div key={question.id} className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-medium shrink-0">
                {index + 1}
              </span>
              <h3 className="text-base font-medium pt-1">{question.question}</h3>
            </div>
            
            <RadioGroup
              value={selected?.selectedOption || ''}
              onValueChange={(value) => {
                const option = question.options.find((o) => o.label === value);
                if (option) {
                  onAnswer(question.id, option.label, option.score, question.question, question.category);
                }
              }}
              className="grid gap-3 pl-11"
            >
              {question.options.map((option) => {
                const isSelected = selected?.selectedOption === option.label;
                
                return (
                  <Label
                    key={option.label}
                    htmlFor={`${question.id}-${option.score}`}
                    className={cn(
                      'flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all',
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:border-primary/50 hover:bg-secondary/50'
                    )}
                  >
                    <RadioGroupItem
                      value={option.label}
                      id={`${question.id}-${option.score}`}
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        'flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all shrink-0',
                        isSelected
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground/30'
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <span className="text-sm">{option.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground px-2 py-0.5 rounded bg-secondary">
                      {option.score} pts
                    </span>
                  </Label>
                );
              })}
            </RadioGroup>
          </div>
        );
      })}
    </div>
  );
};
