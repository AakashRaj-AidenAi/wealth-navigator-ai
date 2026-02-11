import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Copy, FileText, TrendingUp, Calculator, Newspaper, Gift, PartyPopper } from 'lucide-react';
import { useGenerateContent } from './useCampaignAI';
import { toast } from 'sonner';

const CONTENT_TYPES = [
  { value: 'market_update', label: 'Market Update', icon: <TrendingUp className="h-4 w-4" /> },
  { value: 'portfolio_summary', label: 'Portfolio Summary', icon: <FileText className="h-4 w-4" /> },
  { value: 'tax_tips', label: 'Tax Tips', icon: <Calculator className="h-4 w-4" /> },
  { value: 'newsletter', label: 'Newsletter', icon: <Newspaper className="h-4 w-4" /> },
  { value: 'birthday_wish', label: 'Birthday Wish', icon: <Gift className="h-4 w-4" /> },
  { value: 'festival_greeting', label: 'Festival Greeting', icon: <PartyPopper className="h-4 w-4" /> },
];

const TONES = ['professional', 'friendly', 'formal', 'casual'];

export function AIContentGenerator({ onInsertContent }: { onInsertContent?: (content: string) => void }) {
  const [contentType, setContentType] = useState('market_update');
  const [tone, setTone] = useState('professional');
  const [generatedContent, setGeneratedContent] = useState('');
  const generateContent = useGenerateContent();

  const handleGenerate = async () => {
    const result = await generateContent.mutateAsync({ content_type: contentType, tone });
    if (result?.content) {
      setGeneratedContent(result.content);
      if (result.source === 'ai') toast.success('AI content generated');
      else toast.info('Template content loaded');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
    toast.success('Copied to clipboard');
  };

  const handleUse = () => {
    onInsertContent?.(generatedContent);
    toast.success('Content inserted into campaign');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2"><Sparkles className="h-5 w-5" /> AI Content Generator</CardTitle>
        <CardDescription>Generate campaign content powered by AI</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Content Type</Label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONTENT_TYPES.map(ct => (
                  <SelectItem key={ct.value} value={ct.value}>
                    <div className="flex items-center gap-2">{ct.icon} {ct.label}</div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tone</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TONES.map(t => (
                  <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleGenerate} disabled={generateContent.isPending} className="gap-2">
          {generateContent.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {generateContent.isPending ? 'Generating...' : 'Generate Content'}
        </Button>

        {generatedContent && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">Generated Content</Badge>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1 text-xs"><Copy className="h-3 w-3" /> Copy</Button>
                {onInsertContent && (
                  <Button variant="outline" size="sm" onClick={handleUse} className="gap-1 text-xs">Use in Campaign</Button>
                )}
              </div>
            </div>
            <Textarea value={generatedContent} onChange={e => setGeneratedContent(e.target.value)} rows={10} className="font-mono text-sm" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
