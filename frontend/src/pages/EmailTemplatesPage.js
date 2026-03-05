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
import { inboxAPI } from '../lib/api';
import { Plus, Pencil, Trash2, FileText, Loader2, Copy } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  { id: 'info_corsi', label: 'Info corsi' }, { id: 'iscrizione', label: 'Iscrizione' },
  { id: 'collaborazione', label: 'Collaborazione' }, { id: 'richiesta_call', label: 'Richiesta call' },
  { id: 'altro', label: 'Altro' },
];

const emptyForm = { name: '', category: 'altro', subject_template: '', body_template: '', variables: [], enabled: true };

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [varInput, setVarInput] = useState('');

  const load = () => { inboxAPI.listTemplates().then(r => { setTemplates(r.data); setLoading(false); }).catch(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...form, variables: varInput.split(',').map(v => v.trim()).filter(Boolean) };
    try {
      if (editing) { await inboxAPI.updateTemplate(editing, data); toast.success('Template aggiornato'); }
      else { await inboxAPI.createTemplate(data); toast.success('Template creato'); }
      setOpen(false); setForm(emptyForm); setVarInput(''); setEditing(null); load();
    } catch { toast.error('Errore'); }
  };

  const handleEdit = (t) => {
    setForm({ name: t.name, category: t.category, subject_template: t.subject_template, body_template: t.body_template, variables: t.variables || [], enabled: t.enabled });
    setVarInput((t.variables || []).join(', '));
    setEditing(t.template_id); setOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare?')) return;
    await inboxAPI.deleteTemplate(id); toast.success('Eliminato'); load();
  };

  return (
    <div data-testid="email-templates-page">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-semibold ariadne-heading mb-2">Template email</h1>
          <p className="text-base text-gray-500">Modelli per risposte rapide e generazione bozze</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setForm(emptyForm); setVarInput(''); setEditing(null); } }}>
          <DialogTrigger asChild><Button className="gap-2" data-testid="add-template-btn"><Plus className="w-4 h-4" />Nuovo template</Button></DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle className="ariadne-heading">{editing ? 'Modifica template' : 'Nuovo template'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Nome</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} data-testid="template-name" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Categoria</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Oggetto template</Label>
                <Input value={form.subject_template} onChange={e => setForm(f => ({ ...f, subject_template: e.target.value }))} placeholder="Re: Informazioni su {{corso}}" data-testid="template-subject" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Corpo template</Label>
                <Textarea value={form.body_template} onChange={e => setForm(f => ({ ...f, body_template: e.target.value }))} rows={8} placeholder="Gentile {{nome}},..." data-testid="template-body" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Variabili (separate da virgola)</Label>
                <Input value={varInput} onChange={e => setVarInput(e.target.value)} placeholder="nome, corso, date, link, firma" />
                <p className="text-[10px] text-gray-400">Usa {'{{variabile}}'} nel template per inserire variabili</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.enabled} onCheckedChange={v => setForm(f => ({ ...f, enabled: v }))} />
                <Label className="text-xs">Attivo</Label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
                <Button type="submit" data-testid="template-save-btn">{editing ? 'Salva' : 'Crea'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <div className="text-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" /></div> : (
        <div className="space-y-3">
          {templates.map(t => (
            <Card key={t.template_id} className={`border-gray-100 ${t.enabled ? '' : 'opacity-50'}`} data-testid={`template-card-${t.template_id}`}>
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#F5A623]/8 text-[#F5A623] flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm font-semibold">{t.name}</h3>
                      <Badge variant="outline" className="text-[10px]">{CATEGORIES.find(c => c.id === t.category)?.label}</Badge>
                    </div>
                    <p className="text-[11px] text-gray-400 truncate">Oggetto: {t.subject_template}</p>
                    {t.variables?.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {t.variables.map(v => <Badge key={v} variant="outline" className="text-[9px]">{`{{${v}}}`}</Badge>)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(t)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(t.template_id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 whitespace-pre-wrap line-clamp-3">{t.body_template}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {templates.length === 0 && <div className="text-center py-16 text-gray-400 text-sm">Nessun template. Crea il primo!</div>}
        </div>
      )}
    </div>
  );
}
