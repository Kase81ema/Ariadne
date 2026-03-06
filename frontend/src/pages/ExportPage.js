import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { campaignsAPI, postsAPI, profilesAPI, exportAPI, bufferAPI, mediaAPI } from '../lib/api';
import { Download, FileText, Copy, CheckCircle2, Send, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export default function ExportPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [selected, setSelected] = useState('');
  const [posts, setPosts] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [copyText, setCopyText] = useState('');
  const [assignments, setAssignments] = useState({});
  const [publishJobId, setPublishJobId] = useState(null);
  const [publishJob, setPublishJob] = useState(null);

  useEffect(() => {
    campaignsAPI.list().then(r => setCampaigns(r.data)).catch(() => {});
    profilesAPI.list().then(r => setProfiles(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected) { setPosts([]); return; }
    postsAPI.list({ campaign_id: selected }).then(r => setPosts(r.data)).catch(() => {});
    mediaAPI.listAssignments(selected).then(r => setAssignments(Object.fromEntries(r.data.map(item => [item.post_id, item])))).catch(() => setAssignments({}));
  }, [selected]);

  useEffect(() => {
    if (!publishJobId || !selected) return undefined;
    const interval = setInterval(async () => {
      try {
        const response = await mediaAPI.getJob(publishJobId);
        setPublishJob(response.data);
        if (response.data.status === 'completed') {
          clearInterval(interval);
          setPublishJobId(null);
          postsAPI.list({ campaign_id: selected }).then(r => setPosts(r.data)).catch(() => {});
          toast.success('Pubblicazione Buffer completata');
        }
        if (response.data.status === 'failed') {
          clearInterval(interval);
          setPublishJobId(null);
          toast.error(response.data.error || 'Errore pubblicazione Buffer');
        }
      } catch {
        clearInterval(interval);
        setPublishJobId(null);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [publishJobId, selected]);

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
  const mappedProfilesCount = profiles.filter(p => p.buffer_profile_id).length;

  const handlePublishToBuffer = async () => {
    if (!selected) return;
    try {
      const response = await bufferAPI.publishCampaign(selected);
      setPublishJobId(response.data.job_id);
      setPublishJob(null);
      toast.success('Pubblicazione su Buffer avviata');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore avvio pubblicazione Buffer');
    }
  };

  const getAssignedImageUrl = (postId, fallback = '') => {
    const assignment = assignments[postId];
    if (!assignment?.asset) return fallback;
    const variant = assignment.variant || 'original';
    return {
      square: assignment.asset.variants?.square_url,
      portrait: assignment.asset.variants?.portrait_url,
      landscape: assignment.asset.variants?.landscape_url,
      original: assignment.asset.public_url,
    }[variant] || assignment.asset.public_url || fallback;
  };

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
                  <p className="text-sm text-gray-500">Scarica i post in formato CSV o JSON oppure pubblica i post approvati su Buffer con gli asset interni.</p>
                  <div className="flex gap-3">
                    <Button onClick={handleExportCSV} className="gap-2" data-testid="export-csv-btn">
                      <Download className="w-4 h-4" /> Scarica CSV
                    </Button>
                    <Button variant="outline" onClick={handleExportJSON} className="gap-2" data-testid="export-json-btn">
                      <Download className="w-4 h-4" /> Scarica JSON
                    </Button>
                    <Button onClick={handlePublishToBuffer} className="gap-2" disabled={approvedCount === 0} data-testid="publish-buffer-btn">
                      <Send className="w-4 h-4" /> Pubblica approvati su Buffer
                    </Button>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-4 space-y-1">
                    <p className="text-xs text-gray-500" data-testid="buffer-mapped-profiles-info">Profili interni con canale Buffer associato: {mappedProfilesCount}/{profiles.length}</p>
                    <p className="text-xs text-gray-400">Se un post fallisce, nella lista qui sotto vedrai l’errore Buffer in chiaro.</p>
                  </div>
                  {publishJob && (
                    <div className="rounded-xl border border-gray-100 p-4" data-testid="buffer-publish-job-status">
                      <p className="text-sm font-medium">{publishJob.label || 'Pubblicazione in corso'}</p>
                      <p className="text-xs text-gray-400">{publishJob.current || 0}/{publishJob.total || 0}</p>
                    </div>
                  )}
                  <div className="space-y-3 pt-2">
                    {posts.map(post => (
                      <div key={post.post_id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100" data-testid={`buffer-post-row-${post.post_id}`}>
                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                          {getAssignedImageUrl(post.post_id, post.image_url) ? <img src={getAssignedImageUrl(post.post_id, post.image_url)} alt="Anteprima" className="w-full h-full object-cover" data-testid={`buffer-post-image-${post.post_id}`} /> : <ImageIcon className="w-5 h-5 text-gray-300" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge variant="outline" className="text-[10px] badge-purple">{profMap[post.profile_id] || post.profile_id}</Badge>
                            <Badge variant="outline" className="text-[10px]">{post.platform}</Badge>
                            <Badge variant="outline" className={`text-[10px] ${post.buffer_status === 'published' ? 'badge-green' : post.buffer_status === 'failed' ? 'badge-red' : 'badge-blue'}`} data-testid={`buffer-post-status-${post.post_id}`}>{post.buffer_status || 'non inviato'}</Badge>
                          </div>
                          <p className="text-xs text-gray-600 truncate">{post.content?.slice(0, 120)}</p>
                          {post.buffer_error && <p className="text-[11px] text-red-500 mt-1" data-testid={`buffer-post-error-${post.post_id}`}>{post.buffer_error}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
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
