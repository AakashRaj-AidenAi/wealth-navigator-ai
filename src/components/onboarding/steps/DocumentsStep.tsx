import { useState, useRef } from 'react';
import { Upload, X, FileText, Image, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClientType } from '../types';

interface DocumentsStepProps {
  clientType: ClientType;
  documents: File[];
  onDocumentsChange: (documents: File[]) => void;
}

const INDIVIDUAL_DOCUMENTS = [
  { id: 'pan', label: 'PAN Card', required: true },
  { id: 'aadhar', label: 'Aadhaar Card', required: true },
  { id: 'photo', label: 'Passport Photo', required: true },
  { id: 'address_proof', label: 'Address Proof', required: false },
  { id: 'bank_statement', label: 'Bank Statement', required: false },
];

const ENTITY_DOCUMENTS = [
  { id: 'pan', label: 'PAN Card (Company)', required: true },
  { id: 'certificate_of_incorporation', label: 'Certificate of Incorporation', required: true },
  { id: 'gst_certificate', label: 'GST Certificate', required: false },
  { id: 'board_resolution', label: 'Board Resolution', required: true },
  { id: 'moa_aoa', label: 'MOA & AOA', required: false },
  { id: 'authorized_signatory_kyc', label: 'Authorized Signatory KYC', required: true },
];

export const DocumentsStep = ({
  clientType,
  documents,
  onDocumentsChange,
}: DocumentsStepProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const requiredDocs = clientType === 'individual' ? INDIVIDUAL_DOCUMENTS : ENTITY_DOCUMENTS;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      onDocumentsChange([...documents, ...newFiles]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      onDocumentsChange([...documents, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    const updated = documents.filter((_, i) => i !== index);
    onDocumentsChange(updated);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="h-5 w-5 text-blue-500" />;
    if (file.type === 'application/pdf') return <FileText className="h-5 w-5 text-red-500" />;
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold">Upload Documents</h2>
        <p className="text-muted-foreground mt-2">
          Upload the required KYC and compliance documents
        </p>
      </div>

      {/* Required Documents List */}
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <h3 className="text-sm font-medium mb-4">Required Documents</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {requiredDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-2 text-sm p-2 rounded-md bg-muted/50"
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>{doc.label}</span>
                {doc.required && (
                  <Badge variant="secondary" className="text-xs ml-auto">
                    Required
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upload Area */}
      <div
        className={`
          max-w-2xl mx-auto border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-4">
          <div className="p-4 rounded-full bg-primary/10">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="text-lg font-medium">Drag and drop files here</p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse from your computer
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            Select Files
          </Button>
          <p className="text-xs text-muted-foreground">
            Supported formats: PDF, JPG, PNG, DOC, DOCX (Max 10MB each)
          </p>
        </div>
      </div>

      {/* Uploaded Files List */}
      {documents.length > 0 && (
        <div className="max-w-2xl mx-auto space-y-3">
          <h3 className="text-sm font-medium">Uploaded Files ({documents.length})</h3>
          <div className="space-y-2">
            {documents.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getFileIcon(file)}
                  <div>
                    <p className="text-sm font-medium truncate max-w-[200px] sm:max-w-[300px]">
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
