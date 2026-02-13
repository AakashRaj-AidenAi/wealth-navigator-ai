import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Users, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { useSegments, useDeleteSegment } from './useSegments';
import { CreateEditSegment } from './CreateEditSegment';
import type { CampaignSegment } from './types';
import { format } from 'date-fns';

export function SegmentsList() {
  const { data: segments = [], isLoading } = useSegments();
  const deleteSegment = useDeleteSegment();
  const [editingSegment, setEditingSegment] = useState<CampaignSegment | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  if (isCreating || editingSegment) {
    return (
      <CreateEditSegment
        segment={editingSegment}
        onClose={() => { setIsCreating(false); setEditingSegment(null); }}
      />
    );
  }

  const formatFilterSummary = (segment: CampaignSegment) => {
    const parts: string[] = [];
    const f = segment.filter_criteria;
    if (f.aum_min || f.aum_max) parts.push('AUM');
    if (f.risk_profiles?.length) parts.push('Risk');
    if (f.tags?.length) parts.push('Tags');
    if (f.location) parts.push('Location');
    if (f.last_interaction_before || f.last_interaction_after) parts.push('Activity');
    if (f.status?.length) parts.push('Status');
    if (f.client_type?.length) parts.push('Type');
    if (f.lead_stages?.length) parts.push('Lead Stage');
    return parts.length ? parts.join(', ') : 'No filters';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg">Client Segments</CardTitle>
          <CardDescription>Create and manage audience segments for targeted campaigns.</CardDescription>
        </div>
        <Button onClick={() => setIsCreating(true)} className="gap-2">
          <PlusCircle className="h-4 w-4" />
          Create Segment
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Loading segments...</div>
        ) : segments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-muted rounded-lg gap-3">
            <Users className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">No segments created yet</p>
            <Button variant="outline" size="sm" onClick={() => setIsCreating(true)}>
              Create your first segment
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Filters</TableHead>
                <TableHead className="text-center">Clients</TableHead>
                <TableHead className="text-center">Auto-update</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {segments.map((seg) => (
                <TableRow key={seg.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{seg.name}</p>
                      {seg.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{seg.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{formatFilterSummary(seg)}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="gap-1">
                      <Users className="h-3 w-3" />
                      {seg.client_count}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {seg.is_auto_updating ? (
                      <Badge variant="default" className="gap-1">
                        <RefreshCw className="h-3 w-3" />
                        Auto
                      </Badge>
                    ) : (
                      <Badge variant="outline">Static</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(seg.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditingSegment(seg)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteSegment.mutate(seg.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
