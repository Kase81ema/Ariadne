import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { campaignsAPI, profilesAPI, templatesAPI } from '../lib/api';
import { Plus, Pencil, Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';

const INTENTIONS = ['insight', 'valore', 'call_to_action', 'testimonianza', 'riflessione', 'annuncio'];

export default function EditorialPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'editorial', profiles: [], period_start: '', period_end: '', posts_per_profile: 3, mix_intentions: {} });

  const load = () => {
    campaignsAPI.list().then(r => setCampaigns(r.data.filter(c => c.type === 'editorial'))).catch(() => {});
    profilesAPI.list().then(r => setProfiles(r.data)).catch(() => {});
    templatesAPI.list().then(r => setTemplates(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await campaignsAPI.create(form);
      toast.success('Campagna editoriale creata');
      setOpen(false);
      setForm({ title: '', type: 'editorial', profiles: [], period_start: '', period_end: '', posts_per_profile: 3, mix_intentions: {} });
      load();
    } catch (err) { toast.error(err.response?.data?.detail || 'Errore'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare questa campagna?')) return;
    await campaignsAPI.delete(id); toast.success('Eliminata'); load();
  };

  const toggleProfile = (pid) => {
    setForm(f => ({
      ...f,
      profiles: f.profiles.includes(pid) ? f.profiles.filter(p => p !== pid) : [...f.profiles, pid]
    }));
  };

  return (
    <div data-testid="editorial-page">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-semibold ariadne-heading mb-2">Editoriale</h1>
          <p className="text-base text-gray-500">Campagne editoriali non legate a corsi/eventi</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="add-editorial-btn"><Plus className="w-4 h-4" />Nuova campagna</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="ariadne-heading">Nuova campagna editoriale</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Titolo</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="es. Valori del coaching - Q1 2026" data-testid="editorial-title-input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Data inizio</Label>
                  <Input type="date" value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))} data-testid="editorial-start-input" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Data fine</Label>
                  <Input type="date" value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))} data-testid="editorial-end-input" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Post per profilo</Label>
                <Input type="number" min={1} max={20} value={form.posts_per_profile} onChange={e => setForm(f => ({ ...f, posts_per_profile: parseInt(e.target.value) || 1 }))} className="w-24" data-testid="editorial-posts-input" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Profili target</Label>
                <div className="space-y-2">
                  {profiles.filter(p => p.active).map(p => (
                    <label key={p.profile_id} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.profiles.includes(p.profile_id)} onChange={() => toggleProfile(p.profile_id)} className="rounded" />
                      <span className="text-sm">{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
                <Button type="submit" data-testid="editorial-save-btn">Crea</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates section */}
      {templates.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-medium ariadne-heading mb-3">Template disponibili</h2>
          <div className="flex flex-wrap gap-2">
            {templates.map(t => (
              <Badge key={t.template_id} variant="outline" className="px-3 py-1.5 badge-purple cursor-default" data-testid={`template-${t.template_id}`}>
                {t.name} · {t.platform}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {campaigns.map(c => (
          <Card key={c.campaign_id} className="border-gray-100 hover:border-gray-200 transition-colors" data-testid={`editorial-card-${c.campaign_id}`}>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-900">{c.title}</h3>
                  <Badge variant="outline" className={`text-[10px] ${c.status === 'draft' ? 'badge-blue' : c.status === 'exported' ? 'badge-green' : 'badge-orange'}`}>
                    {c.status}
                  </Badge>
                </div>
                <p className="text-xs text-gray-400">
                  {c.period_start && `${c.period_start} — ${c.period_end}`} · {c.posts_per_profile} post/profilo · {c.profiles?.length || 0} profili
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(c.campaign_id)} data-testid={`editorial-delete-${c.campaign_id}`}>
                <Trash2 className="w-4 h-4 text-red-400" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {campaigns.length === 0 && <div className="text-center py-16 text-gray-400 text-sm">Nessuna campagna editoriale</div>}
      </div>
    </div>
  );
}
