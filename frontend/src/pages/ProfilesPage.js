import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { profilesAPI } from '../lib/api';
import { Plus, Pencil, Trash2, Linkedin, Instagram } from 'lucide-react';
import { toast } from 'sonner';

const PLATFORM_LABELS = {
  linkedin_company: 'LinkedIn Aziendale',
  linkedin_personal: 'LinkedIn Personale',
  instagram: 'Instagram',
};
const PLATFORM_COLORS = {
  linkedin_company: 'badge-blue',
  linkedin_personal: 'badge-purple',
  instagram: 'badge-orange',
};
const PLATFORM_ICONS = {
  linkedin_company: Linkedin,
  linkedin_personal: Linkedin,
  instagram: Instagram,
};

const emptyForm = { name: '', platform: 'linkedin_company', owner: '', active: true, notes: '', priority: 1, style_guide: '' };

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);

  const load = () => profilesAPI.list().then(r => setProfiles(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await profilesAPI.update(editing, form);
        toast.success('Profilo aggiornato');
      } else {
        await profilesAPI.create(form);
        toast.success('Profilo creato');
      }
      setOpen(false);
      setForm(emptyForm);
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore');
    }
  };

  const handleEdit = (p) => {
    setForm({ name: p.name, platform: p.platform, owner: p.owner || '', active: p.active, notes: p.notes || '', priority: p.priority || 1, style_guide: p.style_guide || '' });
    setEditing(p.profile_id);
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare questo profilo?')) return;
    await profilesAPI.delete(id);
    toast.success('Profilo eliminato');
    load();
  };

  const handleToggle = async (p) => {
    await profilesAPI.update(p.profile_id, { ...p, active: !p.active });
    load();
  };

  return (
    <div data-testid="profiles-page">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-semibold ariadne-heading mb-2">Profili Social</h1>
          <p className="text-base text-gray-500">Gestisci i canali di pubblicazione</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setForm(emptyForm); setEditing(null); } }}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="add-profile-btn"><Plus className="w-4 h-4" />Nuovo profilo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="ariadne-heading">{editing ? 'Modifica profilo' : 'Nuovo profilo'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Nome</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome profilo" data-testid="profile-name-input" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Piattaforma</Label>
                <Select value={form.platform} onValueChange={v => setForm(f => ({ ...f, platform: v }))}>
                  <SelectTrigger data-testid="profile-platform-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linkedin_company">LinkedIn Aziendale</SelectItem>
                    <SelectItem value="linkedin_personal">LinkedIn Personale</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.platform === 'linkedin_personal' && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Titolare</Label>
                  <Input value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} placeholder="Nome e cognome" data-testid="profile-owner-input" />
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Note</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Note sul profilo" rows={2} data-testid="profile-notes-input" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Guida di stile</Label>
                <Textarea value={form.style_guide} onChange={e => setForm(f => ({ ...f, style_guide: e.target.value }))} placeholder="Tono, stile, personalita..." rows={3} data-testid="profile-style-input" />
              </div>
              <div className="flex items-center gap-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Priorita</Label>
                <Input type="number" min={1} max={10} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 1 }))} className="w-20" data-testid="profile-priority-input" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
                <Button type="submit" data-testid="profile-save-btn">{editing ? 'Salva' : 'Crea'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {profiles.map(p => {
          const PIcon = PLATFORM_ICONS[p.platform] || Linkedin;
          return (
            <Card key={p.profile_id} className="border-gray-100 hover:border-gray-200 transition-colors" data-testid={`profile-card-${p.profile_id}`}>
              <CardContent className="p-6 flex items-center gap-6">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${p.active ? PLATFORM_COLORS[p.platform] : 'bg-gray-100 text-gray-400'}`}>
                  <PIcon className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-gray-900">{p.name}</h3>
                    <Badge variant="outline" className={`text-[10px] ${PLATFORM_COLORS[p.platform]}`}>{PLATFORM_LABELS[p.platform]}</Badge>
                    {!p.active && <Badge variant="outline" className="text-[10px] text-gray-400">Disattivato</Badge>}
                  </div>
                  {p.notes && <p className="text-xs text-gray-400 truncate">{p.notes}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={p.active} onCheckedChange={() => handleToggle(p)} data-testid={`profile-toggle-${p.profile_id}`} />
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(p)} data-testid={`profile-edit-${p.profile_id}`}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(p.profile_id)} data-testid={`profile-delete-${p.profile_id}`}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {profiles.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">Nessun profilo configurato</p>
          </div>
        )}
      </div>
    </div>
  );
}
