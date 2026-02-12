import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Mic,
  Upload,
  FileAudio,
  Loader2,
  CheckCircle,
  AlertTriangle,
  ListTodo,
  ArrowRight,
  Save,
  Brain,
  Trash2,
} from 'lucide-react';
import { useMockTranscription } from '@/hooks/useVoiceTranscription';
import { useMeetingSummary } from '@/hooks/useMeetingSummary';

interface VoiceNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string;
  clientName?: string;
}

const ACCEPTED_AUDIO = '.mp3,.wav,.m4a,.ogg,.webm,.aac,.flac';

export const VoiceNoteModal = ({
  open,
  onOpenChange,
  clientId,
  clientName,
}: VoiceNoteModalProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const {
    transcribing,
    transcript,
    structuredResult,
    transcribeFile,
    extractStructure,
    saveTranscription,
    reset: resetTranscription,
  } = useMockTranscription();
  const { saveSummary, createTasksFromSummary, saveToTimeline } = useMeetingSummary();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 20 * 1024 * 1024) {
        return; // 20MB limit
      }
      setFile(selected);
    }
  };

  const handleTranscribe = async () => {
    if (!file) return;
    const text = await transcribeFile(file);
    extractStructure(text);
  };

  const handleCreateTasks = async () => {
    if (!structuredResult || !clientId) return;
    await createTasksFromSummary(clientId, clientName, structuredResult);
  };

  const handleSaveAll = async () => {
    if (!clientId || !transcript || !structuredResult) return;
    // Save transcription record
    if (file) {
      await saveTranscription(clientId, file, transcript, structuredResult);
    }
    // Save as meeting summary
    await saveSummary(clientId, transcript, structuredResult);
    // Save to timeline
    await saveToTimeline(clientId, structuredResult);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setFile(null);
      resetTranscription();
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
    onOpenChange(isOpen);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            Voice-to-Structured Notes
          </DialogTitle>
          <DialogDescription>
            Upload a voice recording to automatically transcribe and extract structured notes
            {clientName && ` for ${clientName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Upload Area */}
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_AUDIO}
              onChange={handleFileSelect}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileAudio className="h-8 w-8 text-primary" />
                <div className="text-left">
                  <p className="font-medium text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    resetTranscription();
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium">Click to upload voice recording</p>
                <p className="text-xs text-muted-foreground mt-1">
                  MP3, WAV, M4A, OGG, WebM, AAC, FLAC (max 20MB)
                </p>
              </>
            )}
          </div>

          {/* Transcribe Button */}
          {file && !transcript && (
            <Button onClick={handleTranscribe} disabled={transcribing} className="w-full">
              {transcribing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Brain className="h-4 w-4 mr-2" />
              )}
              {transcribing ? 'Transcribing...' : 'Transcribe & Analyze'}
            </Button>
          )}

          {/* Transcript */}
          {transcript && (
            <div className="space-y-4">
              <div className="p-3 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileAudio className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Raw Transcript</span>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{transcript}</p>
              </div>

              {/* Structured Results */}
              {structuredResult && (
                <div className="space-y-3 p-4 bg-secondary/30 rounded-lg">
                  {/* Topics / Discussion Points */}
                  {structuredResult.key_discussion_points.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-chart-3" />
                        <span className="font-medium text-sm">Topics Discussed</span>
                        <Badge variant="outline" className="text-xs">
                          {structuredResult.key_discussion_points.length}
                        </Badge>
                      </div>
                      <ul className="space-y-1">
                        {structuredResult.key_discussion_points.map((p, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-chart-3 mt-0.5">•</span>
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Decisions */}
                  {structuredResult.decisions_made.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span className="font-medium text-sm">Decisions</span>
                        <Badge variant="outline" className="text-xs">
                          {structuredResult.decisions_made.length}
                        </Badge>
                      </div>
                      <ul className="space-y-1">
                        {structuredResult.decisions_made.map((d, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-success mt-0.5">✓</span>
                            {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Risks */}
                  {structuredResult.risks_discussed.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                        <span className="font-medium text-sm">Risks</span>
                      </div>
                      <ul className="space-y-1">
                        {structuredResult.risks_discussed.map((r, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-warning mt-0.5">⚠</span>
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Follow-up Actions */}
                  {structuredResult.action_items.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <ArrowRight className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">Follow-up Actions</span>
                        <Badge variant="outline" className="text-xs">
                          {structuredResult.action_items.length}
                        </Badge>
                      </div>
                      <ul className="space-y-1">
                        {structuredResult.action_items.map((a, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-primary mt-0.5">□</span>
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {structuredResult && clientId && (
            <>
              <Button variant="outline" onClick={handleSaveAll}>
                <Save className="h-4 w-4 mr-2" />
                Save to Client
              </Button>
              <Button onClick={handleCreateTasks} disabled={!structuredResult.action_items?.length}>
                <ListTodo className="h-4 w-4 mr-2" />
                Create {structuredResult.action_items?.length || 0} Tasks
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
