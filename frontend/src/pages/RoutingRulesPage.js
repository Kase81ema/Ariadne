import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { inboxAPI, adminAPI } from '../lib/api';
import { Plus, Pencil, Trash2, GitBranch, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  { id: 'info_corsi', label: 'Info corsi' }, { id: 'iscrizione', label: 'Iscrizione' },
  { id: 'collaborazione', label: 'Collaborazione' }, { id: 'richiesta_call', label: 'Richiesta call' },
  { id: 'supporto', label: 'Supporto' }, { id: 'altro', label: 'Altro' },
];
const PRIORITIES = [
  { id: 'alta', label: 'Alta' }, { id: 'media', label: 'Media' }, { id: 'bassa', label: 'Bassa' },
];

const emptyForm = { name: '', enabled: true, conditions: { subject_keywords: [], body_keywords: [], from_contains: '' }, category: 'altro', priority: 5, sla_hours: 48, assignee_user_id: '', queue: '' };

export default function RoutingRulesPage() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [kwInput, setKwInput] = useState({ subject: '', body: '' });

  const load = () => {
    Promise.all([inboxAPI.listRules(), adminAPI.listUsers()])
      .then(([rRes, uRes]) => { setRules(rRes.data); setUsers(uRes.data.filter(u => u.role !== 'user')); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await inboxAPI.updateRule(editing, form); toast.success('Regola aggiornata'); }
      else { await inboxAPI.createRule(form); toast.success('Regola creata'); }
      setOpen(false); setForm(emptyForm); setEditing(null); load();
    } catch { toast.error('Errore'); }
  };

  const handleEdit = (r) => {
    setForm({ name: r.name, enabled: r.enabled, conditions: r.conditions || {}, category: r.category, priority: r.priority, sla_hours: r.sla_hours, assignee_user_id: r.assignee_user_id || '', queue: r.queue || '' });
    setKwInput({ subject: (r.conditions?.subject_keywords || []).join(', '), body: (r.conditions?.body_keywords || []).join(', ') });
    setEditing(r.rule_id); setOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare?')) return;
    await inboxAPI.deleteRule(id); toast.success('Eliminata'); load();
  };

  const handleToggle = async (r) => {
    await inboxAPI.updateRule(r.rule_id, { enabled: !r.enabled });
    setRules(prev => prev.map(x => x.rule_id === r.rule_id ? { ...x, enabled: !x.enabled } : x));
  };

  const updateKw = (field, value) => {
    setKwInput(prev => ({ ...prev, [field]: value }));
    const keywords = value.split(',').map(k => k.trim()).filter(Boolean);
    setForm(f => ({ ...f, conditions: { ...f.conditions, [`${field}_keywords`]: keywords } }));
  };

  return (
    <div data-testid="routing-rules-page">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-semibold ariadne-heading mb-2">Regole smistamento</h1>
          <p className="text-base text-gray-500">Configura l'assegnazione automatica dei messaggi in arrivo</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setForm(emptyForm); setEditing(null); setKwInput({ subject: '', body: '' }); } }}>
          <DialogTrigger asChild><Button className="gap-2" data-testid="add-rule-btn"><Plus className="w-4 h-4" />Nuova regola</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="ariadne-heading">{editing ? 'Modifica regola' : 'Nuova regola'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Nome</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} data-testid="rule-name" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Parole chiave oggetto (separate da virgola)</Label>
                <Input value={kwInput.subject} onChange={e => updateKw('subject', e.target.value)} placeholder="iscrizione, partecipare, corso" data-testid="rule-subject-kw" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Parole chiave testo (separate da virgola)</Label>
                <Input value={kwInput.body} onChange={e => updateKw('body', e.target.value)} placeholder="iscrizione, informazioni" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Da (contiene)</Label>
                <Input value={form.conditions.from_contains || ''} onChange={e => setForm(f => ({ ...f, conditions: { ...f.conditions, from_contains: e.target.value } }))} placeholder="@gmail.com" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Categoria</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">SLA (ore)</Label>
                  <Input type="number" min={1} value={form.sla_hours} onChange={e => setForm(f => ({ ...f, sla_hours: parseInt(e.target.value) || 48 }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Priorita</Label>
                  <Input type="number" min={0} max={100} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Assegna a</Label>
                  <Select value={form.assignee_user_id || '_none'} onValueChange={v => setForm(f => ({ ...f, assignee_user_id: v === '_none' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Nessuno" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Nessuno</SelectItem>
                      {users.map(u => <SelectItem key={u.user_id} value={u.user_id}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Coda</Label>
                <Input value={form.queue} onChange={e => setForm(f => ({ ...f, queue: e.target.value }))} placeholder="iscrizioni, info, collaborazioni" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.enabled} onCheckedChange={v => setForm(f => ({ ...f, enabled: v }))} />
                <Label className="text-xs">Attiva</Label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
                <Button type="submit" data-testid="rule-save-btn">{editing ? 'Salva' : 'Crea'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <div className="text-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" /></div> : (
        <div className="space-y-3">
          {rules.map(r => (
            <Card key={r.rule_id} className={`border-gray-100 ${r.enabled ? '' : 'opacity-50'}`} data-testid={`rule-card-${r.rule_id}`}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${r.enabled ? 'bg-[#7B61FF]/8 text-[#7B61FF]' : 'bg-gray-100 text-gray-400'}`}>
                  <GitBranch className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-sm font-semibold">{r.name}</h3>
                    <Badge variant="outline" className="text-[10px]">{CATEGORIES.find(c => c.id === r.category)?.label}</Badge>
                    <Badge variant="outline" className="text-[10px]">SLA: {r.sla_hours}h</Badge>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Oggetto: {(r.conditions?.subject_keywords || []).join(', ') || '-'} | Testo: {(r.conditions?.body_keywords || []).join(', ') || '-'}
                    {r.queue && ` | Coda: ${r.queue}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Switch checked={r.enabled} onCheckedChange={() => handleToggle(r)} />
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(r)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(r.rule_id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {rules.length === 0 && <div className="text-center py-16 text-gray-400 text-sm">Nessuna regola. Crea la prima!</div>}
        </div>
      )}
    </div>
  );
}
