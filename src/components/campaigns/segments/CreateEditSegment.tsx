import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Users, Eye, Save } from 'lucide-react';
import { useCreateSegment, useUpdateSegment, usePreviewSegmentClients } from './useSegments';
import {
  RISK_PROFILE_OPTIONS,
  TAG_OPTIONS,
  CLIENT_STATUS_OPTIONS,
  CLIENT_TYPE_OPTIONS,
  LEAD_STAGE_OPTIONS,
  type CampaignSegment,
  type SegmentFilterCriteria,
} from './types';

interface Props {
  segment: CampaignSegment | null;
  onClose: () => void;
}

const formatLabel = (s: string) =>
  s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const formatCurrency = (v: number) => {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
  return `₹${v.toLocaleString('en-IN')}`;
};

export function CreateEditSegment({ segment, onClose }: Props) {
  const createSegment = useCreateSegment();
  const updateSegment = useUpdateSegment();

  const [name, setName] = useState(segment?.name ?? '');
  const [description, setDescription] = useState(segment?.description ?? '');
  const [isAutoUpdating, setIsAutoUpdating] = useState(segment?.is_auto_updating ?? false);
  const [filters, setFilters] = useState<SegmentFilterCriteria>(segment?.filter_criteria ?? {});
  const [showPreview, setShowPreview] = useState(false);

  const { data: previewClients = [], isLoading: isPreviewLoading } = usePreviewSegmentClients(
    showPreview ? filters : ({} as SegmentFilterCriteria)
  );

  const clientCount = showPreview ? previewClients.length : (segment?.client_count ?? 0);

  const toggleArrayFilter = (
    key: 'risk_profiles' | 'tags' | 'status' | 'client_type' | 'lead_stages',
    value: string
  ) => {
    setFilters((prev) => {
      const current = prev[key] ?? [];
      return {
        ...prev,
        [key]: current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value],
      };
    });
    setShowPreview(false);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      filter_criteria: filters,
      is_auto_updating: isAutoUpdating,
      client_count: clientCount,
    };
    if (segment) {
      await updateSegment.mutateAsync({ id: segment.id, ...payload });
    } else {
      await createSegment.mutateAsync(payload);
    }
    onClose();
  };

  const isSaving = createSegment.isPending || updateSegment.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold">{segment ? 'Edit Segment' : 'Create Segment'}</h2>
          <p className="text-sm text-muted-foreground">Define filters to build your audience segment</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Filters */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Segment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. High-value conservative clients" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description..." rows={2} />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={isAutoUpdating} onCheckedChange={setIsAutoUpdating} />
                <div>
                  <Label>Auto-updating segment</Label>
                  <p className="text-xs text-muted-foreground">Automatically refresh client list when data changes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filter criteria */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filter Criteria</CardTitle>
              <CardDescription>Set conditions to filter your client base</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* AUM Range */}
              <div className="space-y-2">
                <Label>AUM / Portfolio Value Range</Label>
                <div className="flex gap-3">
                  <Input
                    type="number"
                    placeholder="Min (₹)"
                    value={filters.aum_min ?? ''}
                    onChange={(e) => {
                      setFilters((p) => ({ ...p, aum_min: e.target.value ? Number(e.target.value) : undefined }));
                      setShowPreview(false);
                    }}
                  />
                  <span className="flex items-center text-muted-foreground">to</span>
                  <Input
                    type="number"
                    placeholder="Max (₹)"
                    value={filters.aum_max ?? ''}
                    onChange={(e) => {
                      setFilters((p) => ({ ...p, aum_max: e.target.value ? Number(e.target.value) : undefined }));
                      setShowPreview(false);
                    }}
                  />
                </div>
              </div>

              <Separator />

              {/* Risk Profile */}
              <div className="space-y-2">
                <Label>Risk Profile</Label>
                <div className="flex flex-wrap gap-2">
                  {RISK_PROFILE_OPTIONS.map((rp) => (
                    <Badge
                      key={rp}
                      variant={filters.risk_profiles?.includes(rp) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayFilter('risk_profiles', rp)}
                    >
                      {formatLabel(rp)}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Tags */}
              <div className="space-y-2">
                <Label>Client Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {TAG_OPTIONS.map((tag) => (
                    <Badge
                      key={tag}
                      variant={filters.tags?.includes(tag) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayFilter('tags', tag)}
                    >
                      {tag.toUpperCase()}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Client Type */}
              <div className="space-y-2">
                <Label>Client Type</Label>
                <div className="flex flex-wrap gap-2">
                  {CLIENT_TYPE_OPTIONS.map((ct) => (
                    <Badge
                      key={ct}
                      variant={filters.client_type?.includes(ct) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayFilter('client_type', ct)}
                    >
                      {formatLabel(ct)}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex flex-wrap gap-2">
                  {CLIENT_STATUS_OPTIONS.map((s) => (
                    <Badge
                      key={s}
                      variant={filters.status?.includes(s) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayFilter('status', s)}
                    >
                      {formatLabel(s)}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Location */}
              <div className="space-y-2">
                <Label>Location (Address contains)</Label>
                <Input
                  placeholder="e.g. Mumbai, Delhi..."
                  value={filters.location ?? ''}
                  onChange={(e) => {
                    setFilters((p) => ({ ...p, location: e.target.value || undefined }));
                    setShowPreview(false);
                  }}
                />
              </div>

              <Separator />

              {/* Last Interaction */}
              <div className="space-y-2">
                <Label>Last Interaction Date Range</Label>
                <div className="flex gap-3">
                  <Input
                    type="date"
                    value={filters.last_interaction_after ?? ''}
                    onChange={(e) => {
                      setFilters((p) => ({ ...p, last_interaction_after: e.target.value || undefined }));
                      setShowPreview(false);
                    }}
                  />
                  <span className="flex items-center text-muted-foreground">to</span>
                  <Input
                    type="date"
                    value={filters.last_interaction_before ?? ''}
                    onChange={(e) => {
                      setFilters((p) => ({ ...p, last_interaction_before: e.target.value || undefined }));
                      setShowPreview(false);
                    }}
                  />
                </div>
              </div>

              <Separator />

              {/* Lead Stage */}
              <div className="space-y-2">
                <Label>Lead Stage (for leads-based segments)</Label>
                <div className="flex flex-wrap gap-2">
                  {LEAD_STAGE_OPTIONS.map((ls) => (
                    <Badge
                      key={ls}
                      variant={filters.lead_stages?.includes(ls) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayFilter('lead_stages', ls)}
                    >
                      {formatLabel(ls)}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Preview & Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Segment Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-4">
                <p className="text-3xl font-bold">{showPreview ? previewClients.length : '—'}</p>
                <p className="text-sm text-muted-foreground">clients match filters</p>
              </div>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setShowPreview(true)}
                disabled={isPreviewLoading}
              >
                <Eye className="h-4 w-4" />
                {isPreviewLoading ? 'Loading...' : 'Preview Clients'}
              </Button>
              <Separator />
              <Button
                className="w-full gap-2"
                onClick={handleSave}
                disabled={!name.trim() || isSaving}
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : segment ? 'Update Segment' : 'Save Segment'}
              </Button>
            </CardContent>
          </Card>

          {/* Preview Table */}
          {showPreview && previewClients.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Matching Clients</CardTitle>
                <CardDescription>Showing up to 100 clients</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>AUM</TableHead>
                        <TableHead>Risk</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewClients.map((client) => (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium text-sm">{client.client_name}</TableCell>
                          <TableCell className="text-sm">
                            {client.total_assets ? formatCurrency(client.total_assets) : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {client.risk_profile ? formatLabel(client.risk_profile) : '—'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
