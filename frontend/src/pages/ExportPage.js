import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { campaignsAPI, postsAPI, profilesAPI, exportAPI } from '../lib/api';
import { Download, FileText, Copy, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ExportPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [selected, setSelected] = useState('');
  const [posts, setPosts] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [copyText, setCopyText] = useState('');

  useEffect(() => {
    campaignsAPI.list().then(r => setCampaigns(r.data)).catch(() => {});
    profilesAPI.list().then(r => setProfiles(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected) { setPosts([]); return; }
    postsAPI.list({ campaign_id: selected }).then(r => setPosts(r.data)).catch(() => {});
  }, [selected]);

  const profMap = Object.fromEntries(profiles.map(p => [p.profile_id, p.name]));

  const handleExportCSV = () => {
    if (!selected) return;
    const token = localStorage.getItem('ariadne_token');
    const url = `${exportAPI.csvUrl(selected)}${token ? `?token=${token}` : ''}`;
    window.open(url, '_blank');
    toast.success('Export CSV avviato');
  };

  const handleExportJSON = () => {
    if (!selected) return;
    const token = localStorage.getItem('ariadne_token');
    const url = `${exportAPI.jsonUrl(selected)}${token ? `?token=${token}` : ''}`;
    window.open(url, '_blank');
    toast.success('Export JSON avviato');
  };

  const generateCopyPack = () => {
    const sections = {};
    posts.forEach(p => {
      const key = `${profMap[p.profile_id] || 'Sconosciuto'} (${p.platform})`;
      if (!sections[key]) sections[key] = [];
      sections[key].push(p);
    });
    let text = 'ARIADNE EDITORIAL STUDIO - COPY PACK\n';
    text += '='.repeat(50) + '\n\n';
    Object.entries(sections).forEach(([section, sposts]) => {
      text += `\n${'='.repeat(40)}\n  ${section}\n${'='.repeat(40)}\n\n`;
      sposts.sort((a, b) => (a.scheduled_date || '').localeCompare(b.scheduled_date || '')).forEach(p => {
        text += `--- ${p.scheduled_date} ${p.scheduled_time} | ${p.intention} ---\n\n`;
        text += `${p.content}\n\n`;
        if (p.content_short) text += `[VERSIONE BREVE]\n${p.content_short}\n\n`;
        if (p.hashtags?.length) text += `Hashtags: ${p.hashtags.map(h => '#' + h).join(' ')}\n\n`;
      });
    });
    setCopyText(text);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiato negli appunti');
  };

  const approvedCount = posts.filter(p => p.status === 'approved').length;

  return (
    <div data-testid="export-page">
      <div className="mb-10">
        <h1 className="text-4xl font-semibold ariadne-heading mb-2">Esporta</h1>
        <p className="text-base text-gray-500">Esporta per Buffer o copia per incolla rapido</p>
      </div>

      <div className="mb-8">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-[350px]" data-testid="export-campaign-select">
            <SelectValue placeholder="Seleziona campagna..." />
          </SelectTrigger>
          <SelectContent>
            {campaigns.map(c => (
              <SelectItem key={c.campaign_id} value={c.campaign_id}>
                {c.title} ({c.status})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selected && (
        <>
          <div className="flex gap-3 mb-8">
            <Card className="border-gray-100 flex-1">
              <CardContent className="p-5 text-center">
                <p className="text-2xl font-semibold ariadne-heading">{posts.length}</p>
                <p className="text-xs text-gray-400">Post totali</p>
              </CardContent>
            </Card>
            <Card className="border-gray-100 flex-1">
              <CardContent className="p-5 text-center">
                <p className="text-2xl font-semibold ariadne-heading text-[#10B981]">{approvedCount}</p>
                <p className="text-xs text-gray-400">Approvati</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="buffer" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="buffer" data-testid="export-tab-buffer">Export Buffer</TabsTrigger>
              <TabsTrigger value="copypack" data-testid="export-tab-copypack">Copy Pack</TabsTrigger>
            </TabsList>

            <TabsContent value="buffer">
              <Card className="border-gray-100">
                <CardContent className="p-8 space-y-4">
                  <h2 className="text-lg font-medium ariadne-heading">Export per Buffer</h2>
                  <p className="text-sm text-gray-500">Scarica i post in formato CSV o JSON compatibili con Buffer per lo scheduling.</p>
                  <div className="flex gap-3">
                    <Button onClick={handleExportCSV} className="gap-2" data-testid="export-csv-btn">
                      <Download className="w-4 h-4" /> Scarica CSV
                    </Button>
                    <Button variant="outline" onClick={handleExportJSON} className="gap-2" data-testid="export-json-btn">
                      <Download className="w-4 h-4" /> Scarica JSON
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400">
                    Nota: l'integrazione diretta con Buffer API e predisposta ma non ancora attiva. Usa i file esportati per importazione manuale.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="copypack">
              <Card className="border-gray-100">
                <CardContent className="p-8 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-medium ariadne-heading">Copy Pack</h2>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={generateCopyPack} className="gap-2" data-testid="generate-copypack-btn">
                        <FileText className="w-4 h-4" /> Genera Copy Pack
                      </Button>
                      {copyText && (
                        <Button onClick={() => copyToClipboard(copyText)} className="gap-2" data-testid="copy-all-btn">
                          <Copy className="w-4 h-4" /> Copia tutto
                        </Button>
                      )}
                    </div>
                  </div>
                  {copyText ? (
                    <pre className="bg-gray-50 rounded-xl p-6 text-xs text-gray-600 whitespace-pre-wrap font-mono leading-relaxed max-h-[500px] overflow-y-auto" data-testid="copypack-content">
                      {copyText}
                    </pre>
                  ) : (
                    <p className="text-sm text-gray-400 py-8 text-center">Clicca "Genera Copy Pack" per visualizzare i testi</p>
                  )}

                  {/* Individual copy buttons */}
                  {posts.length > 0 && (
                    <div className="space-y-3 pt-4">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Copia individuale</h3>
                      {posts.map(p => (
                        <div key={p.post_id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Badge variant="outline" className="text-[10px] badge-purple">{profMap[p.profile_id]}</Badge>
                              <span className="text-[11px] text-gray-400">{p.scheduled_date}</span>
                            </div>
                            <p className="text-xs text-gray-600 truncate">{p.content?.slice(0, 100)}...</p>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => copyToClipboard(p.content || '')} data-testid={`copy-post-${p.post_id}`}>
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
