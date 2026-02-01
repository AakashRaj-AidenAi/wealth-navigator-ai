import { Building2, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientType } from '../types';
import { cn } from '@/lib/utils';

interface TypeSelectionStepProps {
  selectedType: ClientType | null;
  onSelectType: (type: ClientType) => void;
}

export const TypeSelectionStep = ({ selectedType, onSelectType }: TypeSelectionStepProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold">Select Client Type</h2>
        <p className="text-muted-foreground mt-2">
          Choose the type of client you're onboarding
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-lg hover:border-primary/50",
            selectedType === 'individual' && "border-primary ring-2 ring-primary/20"
          )}
          onClick={() => onSelectType('individual')}
        >
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10">
              <User className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-xl">Individual</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-center">
              For personal clients including HNI and UHNI individuals.
              Requires PAN, Aadhaar, and personal KYC documents.
            </CardDescription>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-lg hover:border-primary/50",
            selectedType === 'entity' && "border-primary ring-2 ring-primary/20"
          )}
          onClick={() => onSelectType('entity')}
        >
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10">
              <Building2 className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-xl">Entity / Organization</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-center">
              For companies, trusts, and other legal entities.
              Requires CIN, GST, and corporate documents.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
