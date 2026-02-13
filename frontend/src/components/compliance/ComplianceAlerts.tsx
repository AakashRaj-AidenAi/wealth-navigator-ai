import { useState, useEffect } from 'react';
import { api, extractItems } from '@/services/api';
import { AlertTriangle, FileX, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format, isPast, addDays } from 'date-fns';

interface ComplianceAlert {
  id: string;
  type: 'kyc_expired' | 'kyc_expiring' | 'missing_document' | 'unsigned_consent';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  clientId: string;
  clientName: string;
  dueDate?: string;
}

export const ComplianceAlerts = () => {
  const { role } = useAuth();
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComplianceAlerts();
  }, []);

  const fetchComplianceAlerts = async () => {
    setLoading(true);
    const generatedAlerts: ComplianceAlert[] = [];

    // Fetch clients with KYC expiry dates
    const clients = extractItems(await api.get('/clients', { has_kyc_expiry: true }));

    if (clients.length > 0) {
      const today = new Date();
      const thirtyDaysFromNow = addDays(today, 30);

      clients.forEach(client => {
        const expiryDate = new Date(client.kyc_expiry_date);
        
        if (isPast(expiryDate)) {
          generatedAlerts.push({
            id: `kyc-expired-${client.id}`,
            type: 'kyc_expired',
            severity: 'high',
            title: 'KYC Documents Expired',
            description: `KYC expired on ${format(expiryDate, 'MMM d, yyyy')}`,
            clientId: client.id,
            clientName: client.client_name,
            dueDate: client.kyc_expiry_date
          });
        } else if (expiryDate <= thirtyDaysFromNow) {
          generatedAlerts.push({
            id: `kyc-expiring-${client.id}`,
            type: 'kyc_expiring',
            severity: 'medium',
            title: 'KYC Expiring Soon',
            description: `KYC expires on ${format(expiryDate, 'MMM d, yyyy')}`,
            clientId: client.id,
            clientName: client.client_name,
            dueDate: client.kyc_expiry_date
          });
        }
      });
    }

    // Fetch clients missing critical documents
    const allClients = extractItems(await api.get('/clients'));

    const documents = extractItems(await api.get('/client_documents'));

    if (allClients.length > 0 && documents) {
      const requiredDocTypes = ['kyc', 'id_proof', 'address_proof'];
      const clientDocMap = new Map<string, Set<string>>();
      
      documents.forEach(doc => {
        if (!clientDocMap.has(doc.client_id)) {
          clientDocMap.set(doc.client_id, new Set());
        }
        clientDocMap.get(doc.client_id)!.add(doc.document_type);
      });

      allClients.forEach(client => {
        const clientDocs = clientDocMap.get(client.id) || new Set();
        const missingDocs = requiredDocTypes.filter(type => !clientDocs.has(type));
        
        if (missingDocs.length > 0) {
          generatedAlerts.push({
            id: `missing-docs-${client.id}`,
            type: 'missing_document',
            severity: missingDocs.includes('kyc') ? 'high' : 'medium',
            title: 'Missing Documents',
            description: `Missing: ${missingDocs.join(', ')}`,
            clientId: client.id,
            clientName: client.client_name
          });
        }
      });
    }

    // Fetch unsigned consents
    const pendingConsents = extractItems(await api.get('/client_consents', { status: 'pending' }));

    if (pendingConsents.length > 0) {
      pendingConsents.forEach(consent => {
        generatedAlerts.push({
          id: `unsigned-consent-${consent.id}`,
          type: 'unsigned_consent',
          severity: 'medium',
          title: 'Unsigned Consent Form',
          description: `${consent.consent_type.replace(/_/g, ' ')} pending since ${format(new Date(consent.created_at), 'MMM d, yyyy')}`,
          clientId: consent.client_id,
          clientName: (consent.clients as any)?.client_name || 'Unknown'
        });
      });
    }

    // Sort by severity
    generatedAlerts.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    setAlerts(generatedAlerts);
    setLoading(false);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'medium':
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'kyc_expired':
      case 'kyc_expiring':
        return <Clock className="h-4 w-4" />;
      case 'missing_document':
        return <FileX className="h-4 w-4" />;
      case 'unsigned_consent':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="glass rounded-xl p-6">
        <h2 className="font-semibold mb-4">Compliance Alerts</h2>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-secondary/30 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const highAlerts = alerts.filter(a => a.severity === 'high');
  const mediumAlerts = alerts.filter(a => a.severity === 'medium');

  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Compliance Alerts</h2>
        <div className="flex items-center gap-2 text-sm">
          <span className="flex items-center gap-1 text-destructive">
            <XCircle className="h-4 w-4" /> {highAlerts.length} Critical
          </span>
          <span className="flex items-center gap-1 text-warning">
            <AlertTriangle className="h-4 w-4" /> {mediumAlerts.length} Warning
          </span>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-success mb-3" />
          <p className="text-lg font-medium">All Clear!</p>
          <p className="text-sm text-muted-foreground">No compliance issues detected</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {alerts.map(alert => (
            <div
              key={alert.id}
              className={`flex items-center justify-between p-4 rounded-lg transition-colors cursor-pointer ${
                alert.severity === 'high' 
                  ? 'bg-destructive/10 hover:bg-destructive/20 border border-destructive/20' 
                  : 'bg-warning/10 hover:bg-warning/20 border border-warning/20'
              }`}
            >
              <div className="flex items-center gap-4">
                {getSeverityIcon(alert.severity)}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{alert.title}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary">
                      {alert.clientName}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{alert.description}</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Resolve
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
