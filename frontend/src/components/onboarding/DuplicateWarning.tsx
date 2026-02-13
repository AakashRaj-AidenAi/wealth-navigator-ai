import { AlertTriangle, XCircle, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DuplicateMatch } from './types';
import { useNavigate } from 'react-router-dom';

interface DuplicateWarningProps {
  duplicates: DuplicateMatch[];
  hasHardBlock: boolean;
  onDismiss?: () => void;
}

export const DuplicateWarning = ({ duplicates, hasHardBlock, onDismiss }: DuplicateWarningProps) => {
  const navigate = useNavigate();

  if (duplicates.length === 0) return null;

  const hardBlocks = duplicates.filter(d => d.is_hard_block);
  const softWarnings = duplicates.filter(d => !d.is_hard_block);

  return (
    <div className="space-y-4">
      {hardBlocks.length > 0 && (
        <Alert variant="destructive">
          <XCircle className="h-5 w-5" />
          <AlertTitle className="flex items-center gap-2">
            Duplicate Record Found
            <Badge variant="destructive">Hard Block</Badge>
          </AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-3">
              A client with the same unique identifier already exists. You cannot create a duplicate record.
            </p>
            <div className="space-y-2">
              {hardBlocks.map((dup) => (
                <div
                  key={dup.client_id}
                  className="flex items-center justify-between bg-destructive/10 p-3 rounded-md"
                >
                  <div>
                    <p className="font-medium">{dup.client_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {dup.match_type} • {dup.email || dup.phone || 'No contact info'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/clients/${dup.client_id}`)}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View Profile
                  </Button>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {softWarnings.length > 0 && (
        <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <AlertTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            Possible Duplicates Found
            <Badge variant="secondary" className="bg-amber-100 text-amber-800">
              {softWarnings.length} match{softWarnings.length > 1 ? 'es' : ''}
            </Badge>
          </AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-3 text-amber-700 dark:text-amber-300">
              We found similar records. Please verify this is not a duplicate before proceeding.
            </p>
            <div className="space-y-2">
              {softWarnings.map((dup) => (
                <div
                  key={dup.client_id}
                  className="flex items-center justify-between bg-amber-100/50 dark:bg-amber-900/20 p-3 rounded-md"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-amber-900 dark:text-amber-100">
                        {dup.client_name}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {Math.round(dup.confidence_score)}% match
                      </Badge>
                    </div>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      {dup.match_type} • {dup.email || dup.phone || 'No contact info'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/clients/${dup.client_id}`)}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </div>
              ))}
            </div>
            {onDismiss && !hasHardBlock && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 text-amber-700 hover:text-amber-900"
                onClick={onDismiss}
              >
                I've verified this is not a duplicate
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
