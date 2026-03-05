import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { communityAPI } from '../lib/api';
import { Plus, Pencil, Trash2, Megaphone, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const AUDIENCES = [
  { id: 'all', label: 'Tutti' },
  { id: 'interessato', label: 'Interessati' },
  { id: 'studente', label: 'Studenti' },
  { id: 'alumni', label: 'Alumni' },
];

const emptyForm = { title: '', body: '', link: '', cta_text: 'Scopri', audience: 'all', enabled: true, priority: 0 };

export default function BannersAdminPage() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);

  const load = () => {
    communityAPI.listAllBanners().then(r => { setBanners(r.data); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await communityAPI.updateBanner(editing, form);
        toast.success('Banner aggiornato');
      } else {
        await communityAPI.createBanner(form);
        toast.success('Banner creato');
      }
      setOpen(false);
      setForm(emptyForm);
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore');
    }
  };

  const handleEdit = (b) => {
    setForm({
      title: b.title, body: b.body, link: b.link || '',
      cta_text: b.cta_text || 'Scopri', audience: b.audience || 'all',
      enabled: b.enabled, priority: b.priority || 0,
    });
    setEditing(b.banner_id);
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare questo banner?')) return;
    await communityAPI.deleteBanner(id);
    toast.success('Banner eliminato');
    load();
  };

  const handleToggle = async (b) => {
    await communityAPI.updateBanner(b.banner_id, { enabled: !b.enabled });
    setBanners(prev => prev.map(x => x.banner_id === b.banner_id ? { ...x, enabled: !x.enabled } : x));
  };

  return (
    <div data-testid="banners-admin-page">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-semibold ariadne-heading mb-2">Banner consigli</h1>
          <p className="text-base text-gray-500">Gestisci i suggerimenti visibili nella community dashboard</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setForm(emptyForm); setEditing(null); } }}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="add-banner-btn"><Plus className="w-4 h-4" />Nuovo banner</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="ariadne-heading">{editing ? 'Modifica banner' : 'Nuovo banner'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Titolo</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Titolo" data-testid="banner-title-input" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Testo</Label>
                <Textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={3} data-testid="banner-body-input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Link</Label>
                  <Input value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} placeholder="/feed o URL" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Testo CTA</Label>
                  <Input value={form.cta_text} onChange={e => setForm(f => ({ ...f, cta_text: e.target.value }))} placeholder="Scopri" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Audience</Label>
                  <Select value={form.audience} onValueChange={v => setForm(f => ({ ...f, audience: v }))}>
                    <SelectTrigger data-testid="banner-audience-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AUDIENCES.map(a => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Priorita</Label>
                  <Input type="number" min={0} max={100} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.enabled} onCheckedChange={v => setForm(f => ({ ...f, enabled: v }))} />
                <Label className="text-xs text-gray-600">Attivo</Label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
                <Button type="submit" data-testid="banner-save-btn">{editing ? 'Salva' : 'Crea'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Banners list */}
      {loading ? (
        <div className="text-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" /></div>
      ) : (
        <div className="space-y-3">
          {banners.map(b => (
            <Card key={b.banner_id} className={`border-gray-100 transition-all ${b.enabled ? '' : 'opacity-50'}`} data-testid={`banner-card-${b.banner_id}`}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${b.enabled ? 'bg-[#F5A623]/8 text-[#F5A623]' : 'bg-gray-100 text-gray-400'}`}>
                  <Megaphone className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-sm font-semibold text-gray-900">{b.title}</h3>
                    <Badge variant="outline" className="text-[10px]">{AUDIENCES.find(a => a.id === b.audience)?.label || b.audience}</Badge>
                    <Badge variant="outline" className={`text-[10px] ${b.enabled ? 'badge-green' : 'badge-red'}`}>
                      {b.enabled ? 'Attivo' : 'Disattivato'}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400 truncate">{b.body}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Switch checked={b.enabled} onCheckedChange={() => handleToggle(b)} data-testid={`banner-toggle-${b.banner_id}`} />
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(b)} data-testid={`banner-edit-${b.banner_id}`}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(b.banner_id)} data-testid={`banner-delete-${b.banner_id}`}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {banners.length === 0 && <div className="text-center py-16 text-gray-400 text-sm">Nessun banner. Crea il primo!</div>}
        </div>
      )}
    </div>
  );
}
