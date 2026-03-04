import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { postsAPI, profilesAPI, campaignsAPI } from '../lib/api';
import { CheckCircle2, RefreshCw, MessageSquare, History, Pencil, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_LABELS = { draft: 'Bozza', generated: 'Generato', review: 'In revisione', approved: 'Approvato', exported: 'Esportato' };
const STATUS_COLORS = { draft: 'badge-blue', generated: 'badge-purple', review: 'badge-orange', approved: 'badge-green', exported: 'badge-green' };

export default function ApprovalsPage() {
  const [posts, setPosts] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCampaign, setFilterCampaign] = useState('all');
  const [selectedPost, setSelectedPost] = useState(null);
  const [versions, setVersions] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editing, setEditing] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showVersions, setShowVersions] = useState(false);

  const load = () => {
    const params = {};
    if (filterStatus !== 'all') params.status = filterStatus;
    if (filterCampaign !== 'all') params.campaign_id = filterCampaign;
    postsAPI.list(params).then(r => setPosts(r.data)).catch(() => {});
  };

  useEffect(() => {
    profilesAPI.list().then(r => setProfiles(r.data)).catch(() => {});
    campaignsAPI.list().then(r => setCampaigns(r.data)).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [filterStatus, filterCampaign]);

  const profMap = Object.fromEntries(profiles.map(p => [p.profile_id, p.name]));

  const handleApprove = async (id) => {
    await postsAPI.approve(id);
    toast.success('Post approvato');
    load();
  };

  const handleBatchApprove = async () => {
    const ids = posts.filter(p => p.status !== 'approved' && p.status !== 'exported').map(p => p.post_id);
    if (ids.length === 0) return;
    await postsAPI.batchApprove(ids);
    toast.success(`${ids.length} post approvati`);
    load();
  };

  const openDetail = async (post) => {
    setSelectedPost(post);
    setEditContent(post.content);
    setEditing(false);
    postsAPI.versions(post.post_id).then(r => setVersions(r.data)).catch(() => {});
    postsAPI.getComments(post.post_id).then(r => setComments(r.data)).catch(() => {});
  };

  const handleSaveEdit = async () => {
    if (!selectedPost) return;
    await postsAPI.update(selectedPost.post_id, { content: editContent });
    toast.success('Post aggiornato');
    setEditing(false);
    load();
    setSelectedPost(prev => ({ ...prev, content: editContent }));
  };

  const handleRegenerate = async () => {
    if (!selectedPost) return;
    setRegenerating(true);
    try {
      const res = await postsAPI.regenerate(selectedPost.post_id, []);
      setSelectedPost(res.data);
      setEditContent(res.data.content);
      toast.success('Post rigenerato');
      load();
    } catch (err) {
      toast.error('Errore rigenerazione');
    } finally {
      setRegenerating(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedPost) return;
    const res = await postsAPI.addComment(selectedPost.post_id, newComment);
    setComments(res.data);
    setNewComment('');
  };

  return (
    <div data-testid="approvals-page">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-semibold ariadne-heading mb-2">Approvazioni</h1>
          <p className="text-base text-gray-500">Rivedi, modifica e approva i post</p>
        </div>
        <Button onClick={handleBatchApprove} className="gap-2 bg-[#10B981] hover:bg-[#059669]" data-testid="batch-approve-btn">
          <CheckCircle2 className="w-4 h-4" /> Approva tutti
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]" data-testid="filter-status-select"><SelectValue placeholder="Stato" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCampaign} onValueChange={setFilterCampaign}>
          <SelectTrigger className="w-[220px]" data-testid="filter-campaign-select"><SelectValue placeholder="Campagna" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le campagne</SelectItem>
            {campaigns.map(c => <SelectItem key={c.campaign_id} value={c.campaign_id}>{c.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Posts list */}
      <div className="space-y-3">
        {posts.map(p => (
          <Card key={p.post_id} className="border-gray-100 hover:border-gray-200 transition-colors cursor-pointer" onClick={() => openDetail(p)} data-testid={`approval-post-${p.post_id}`}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[p.status]}`}>{STATUS_LABELS[p.status]}</Badge>
                <Badge variant="outline" className="badge-purple text-[10px]">{profMap[p.profile_id] || 'N/D'}</Badge>
                <Badge variant="outline" className="text-[10px]">{p.platform}</Badge>
                <Badge variant="outline" className="text-[10px]">{p.intention}</Badge>
                <span className="text-[11px] text-gray-400 ml-auto">{p.scheduled_date} {p.scheduled_time}</span>
                <span className="text-[11px] text-gray-400">v{p.version || 1}</span>
              </div>
              <p className="text-sm text-gray-700 line-clamp-2">{p.content || '[Nessun contenuto]'}</p>
            </CardContent>
          </Card>
        ))}
        {posts.length === 0 && <div className="text-center py-16 text-gray-400 text-sm">Nessun post trovato</div>}
      </div>

      {/* Post detail dialog */}
      <Dialog open={!!selectedPost} onOpenChange={(o) => { if (!o) setSelectedPost(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedPost && (
            <>
              <DialogHeader>
                <DialogTitle className="ariadne-heading flex items-center gap-2">
                  Dettaglio post
                  <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[selectedPost.status]}`}>{STATUS_LABELS[selectedPost.status]}</Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>{profMap[selectedPost.profile_id]}</span>
                  <span>{selectedPost.platform}</span>
                  <span>{selectedPost.scheduled_date} {selectedPost.scheduled_time}</span>
                  <span>v{selectedPost.version || 1}</span>
                </div>

                {editing ? (
                  <div className="space-y-3">
                    <Textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={8} data-testid="post-edit-textarea" />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveEdit} data-testid="post-save-edit-btn">Salva</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Annulla</Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-5">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedPost.content || '[Nessun contenuto]'}</p>
                  </div>
                )}

                {selectedPost.content_short && (
                  <details>
                    <summary className="text-xs text-gray-400 cursor-pointer">Versione breve</summary>
                    <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded-lg p-4 whitespace-pre-wrap">{selectedPost.content_short}</p>
                  </details>
                )}

                {selectedPost.hashtags?.length > 0 && (
                  <div className="flex gap-1.5">
                    {selectedPost.hashtags.map((h, i) => <Badge key={i} variant="outline" className="text-[10px] badge-blue">#{h}</Badge>)}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="gap-1.5" data-testid="post-edit-btn">
                    <Pencil className="w-3.5 h-3.5" /> Modifica
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleRegenerate} disabled={regenerating} className="gap-1.5" data-testid="post-regenerate-btn">
                    {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Rigenera
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowVersions(!showVersions)} className="gap-1.5" data-testid="post-versions-btn">
                    <History className="w-3.5 h-3.5" /> Versioni ({versions.length})
                  </Button>
                  {selectedPost.status !== 'approved' && (
                    <Button size="sm" className="gap-1.5 bg-[#10B981] hover:bg-[#059669] ml-auto" onClick={() => handleApprove(selectedPost.post_id)} data-testid="post-approve-btn">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approva
                    </Button>
                  )}
                </div>

                {/* Versions */}
                {showVersions && versions.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Cronologia versioni</h4>
                    {versions.map(v => (
                      <div key={v.version_id} className="bg-gray-50 rounded-lg p-3">
                        <p className="text-[11px] text-gray-400 mb-1">v{v.version} - {v.timestamp}</p>
                        <p className="text-xs text-gray-600 line-clamp-3">{v.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Comments */}
                <div className="pt-2 space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Commenti</h4>
                  {comments.map(c => (
                    <div key={c.comment_id} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-[11px] text-gray-400 mb-1">{c.user_name} - {c.timestamp}</p>
                      <p className="text-xs text-gray-600">{c.text}</p>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Textarea value={newComment} onChange={e => setNewComment(e.target.value)} rows={2} placeholder="Aggiungi un commento..." className="flex-1" data-testid="post-comment-input" />
                    <Button size="sm" onClick={handleAddComment} data-testid="post-comment-btn"><MessageSquare className="w-4 h-4" /></Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
