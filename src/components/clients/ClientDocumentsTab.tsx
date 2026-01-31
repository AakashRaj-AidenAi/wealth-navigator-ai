import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, FileText, Download, Trash2, Upload, Loader2, File, FileCheck, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface Document {
  id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  expiry_date: string | null;
  notes: string | null;
  created_at: string;
}

interface ClientDocumentsTabProps {
  clientId: string;
}

const documentTypeLabels: Record<string, string> = {
  kyc: 'KYC Document',
  agreement: 'Agreement',
  statement: 'Statement',
  id_proof: 'ID Proof',
  address_proof: 'Address Proof',
  other: 'Other'
};

const documentTypeColors: Record<string, string> = {
  kyc: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  agreement: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  statement: 'bg-green-500/10 text-green-500 border-green-500/20',
  id_proof: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  address_proof: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  other: 'bg-gray-500/10 text-gray-500 border-gray-500/20'
};

export const ClientDocumentsTab = ({ clientId }: ClientDocumentsTabProps) => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<Document | null>(null);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    document_type: '',
    expiry_date: '',
    notes: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const canEdit = role === 'wealth_advisor';

  const fetchDocuments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('client_documents')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (data) setDocuments(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchDocuments();
  }, [clientId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({ title: 'Error', description: 'File size must be less than 10MB', variant: 'destructive' });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !form.document_type || !user) {
      toast({ title: 'Error', description: 'Please select a file and document type', variant: 'destructive' });
      return;
    }

    setUploading(true);

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const filePath = `${clientId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('client_documents').insert({
        client_id: clientId,
        uploaded_by: user.id,
        document_type: form.document_type as any,
        file_name: selectedFile.name,
        file_path: filePath,
        file_size: selectedFile.size,
        mime_type: selectedFile.type,
        expiry_date: form.expiry_date || null,
        notes: form.notes || null
      });

      if (dbError) throw dbError;

      toast({ title: 'Success', description: 'Document uploaded' });
      setModalOpen(false);
      setForm({ document_type: '', expiry_date: '', notes: '' });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchDocuments();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }

    setUploading(false);
  };

  const handleDownload = async (doc: Document) => {
    const { data, error } = await supabase.storage
      .from('client-documents')
      .download(doc.file_path);

    if (error) {
      toast({ title: 'Error', description: 'Failed to download file', variant: 'destructive' });
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.file_name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    if (!docToDelete) return;

    // Delete from storage
    await supabase.storage.from('client-documents').remove([docToDelete.file_path]);

    // Delete from database
    const { error } = await supabase.from('client_documents').delete().eq('id', docToDelete.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Document removed' });
      fetchDocuments();
    }
    setDeleteDialogOpen(false);
    setDocToDelete(null);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false;
    return new Date(date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Documents</h3>
        {canEdit && (
          <Button onClick={() => setModalOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        )}
      </div>

      {documents.length === 0 ? (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No documents uploaded</p>
            {canEdit && (
              <Button className="mt-4" variant="outline" onClick={() => setModalOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload First Document
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <Card key={doc.id} className="glass">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center">
                      <File className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{doc.file_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={cn('text-xs', documentTypeColors[doc.document_type])}>
                          {documentTypeLabels[doc.document_type]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{formatFileSize(doc.file_size)}</span>
                        {doc.expiry_date && (
                          <span className={cn('text-xs flex items-center gap-1', isExpiringSoon(doc.expiry_date) ? 'text-destructive' : 'text-muted-foreground')}>
                            {isExpiringSoon(doc.expiry_date) && <AlertTriangle className="h-3 w-3" />}
                            Expires: {new Date(doc.expiry_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleDownload(doc)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    {canEdit && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-destructive"
                        onClick={() => { setDocToDelete(doc); setDeleteDialogOpen(true); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {doc.notes && (
                  <p className="text-sm text-muted-foreground mt-2 pl-16">{doc.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Document Type *</Label>
              <Select value={form.document_type} onValueChange={(v) => setForm({ ...form, document_type: v })}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="kyc">KYC Document</SelectItem>
                  <SelectItem value="agreement">Agreement</SelectItem>
                  <SelectItem value="statement">Statement</SelectItem>
                  <SelectItem value="id_proof">ID Proof</SelectItem>
                  <SelectItem value="address_proof">Address Proof</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>File *</Label>
              <Input 
                ref={fileInputRef}
                type="file" 
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
              <p className="text-xs text-muted-foreground">Max file size: 10MB. Allowed: PDF, DOC, DOCX, JPG, PNG</p>
            </div>
            <div className="space-y-2">
              <Label>Expiry Date (if applicable)</Label>
              <Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Add notes about this document..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleUpload} disabled={uploading || !selectedFile}>
              {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the document. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
