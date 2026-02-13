import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Shield,
  CreditCard,
  Calendar,
  MapPin,
  Plus,
  X
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Client {
  id: string;
  client_name: string;
  email: string | null;
  phone: string | null;
  total_assets: number;
  risk_profile: string;
  status: string;
  created_at: string;
  date_of_birth: string | null;
  anniversary_date: string | null;
  kyc_expiry_date: string | null;
  address: string | null;
  pan_number: string | null;
  aadhar_number: string | null;
}

interface ClientTag {
  id: string;
  tag: string;
}

interface ClientOverviewTabProps {
  client: Client;
  tags: ClientTag[];
  onTagsChange: () => void;
}

const tagColors: Record<string, string> = {
  'hni': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  'uhni': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  'prospect': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'active': 'bg-green-500/10 text-green-500 border-green-500/20',
  'dormant': 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  'vip': 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  'nri': 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20'
};

const allTags = ['hni', 'uhni', 'prospect', 'active', 'dormant', 'vip', 'nri'];

export const ClientOverviewTab = ({ client, tags, onTagsChange }: ClientOverviewTabProps) => {
  const { role } = useAuth();
  const { toast } = useToast();
  const [addingTag, setAddingTag] = useState(false);

  const canEdit = role === 'wealth_advisor';
  const existingTags = tags.map(t => t.tag);
  const availableTags = allTags.filter(t => !existingTags.includes(t));

  const handleAddTag = async (tag: string) => {
    setAddingTag(true);
    try {
      await api.post('/client_tags', { client_id: client.id, tag });
      onTagsChange();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to add tag',
        variant: 'destructive'
      });
    }
    setAddingTag(false);
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      await api.delete('/client_tags/' + tagId);
      onTagsChange();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to remove tag',
        variant: 'destructive'
      });
    }
  };

  const isKycExpiringSoon = client.kyc_expiry_date && 
    new Date(client.kyc_expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Personal Information */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">PAN Number</p>
              <p className="font-medium">{client.pan_number || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Aadhar Number</p>
              <p className="font-medium">{client.aadhar_number || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date of Birth</p>
              <p className="font-medium">
                {client.date_of_birth ? new Date(client.date_of_birth).toLocaleDateString() : 'Not provided'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Anniversary</p>
              <p className="font-medium">
                {client.anniversary_date ? new Date(client.anniversary_date).toLocaleDateString() : 'Not provided'}
              </p>
            </div>
          </div>
          {client.address && (
            <div>
              <p className="text-xs text-muted-foreground">Address</p>
              <p className="font-medium flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                {client.address}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KYC & Compliance */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            KYC & Compliance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <div>
              <p className="text-sm font-medium">KYC Expiry Date</p>
              <p className="text-xs text-muted-foreground">
                {client.kyc_expiry_date 
                  ? new Date(client.kyc_expiry_date).toLocaleDateString() 
                  : 'Not set'}
              </p>
            </div>
            {client.kyc_expiry_date && (
              <Badge 
                variant="outline"
                className={cn(
                  isKycExpiringSoon 
                    ? 'bg-destructive/10 text-destructive border-destructive/20' 
                    : 'bg-success/10 text-success border-success/20'
                )}
              >
                {isKycExpiringSoon ? 'Expiring Soon' : 'Valid'}
              </Badge>
            )}
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Client Since</p>
            <p className="text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {new Date(client.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tags */}
      <Card className="glass lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Client Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {tags.map((tag) => (
              <Badge 
                key={tag.id} 
                variant="outline" 
                className={cn('uppercase text-xs gap-1', tagColors[tag.tag])}
              >
                {tag.tag}
                {canEdit && (
                  <button
                    onClick={() => handleRemoveTag(tag.id)}
                    className="ml-1 hover:bg-background/50 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
            {canEdit && availableTags.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-6 gap-1" disabled={addingTag}>
                    <Plus className="h-3 w-3" />
                    Add Tag
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {availableTags.map((tag) => (
                    <DropdownMenuItem key={tag} onClick={() => handleAddTag(tag)}>
                      <span className="uppercase text-xs">{tag}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
