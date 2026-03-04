import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Checkbox } from '../components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { rulesAPI } from '../lib/api';
import { Plus, Pencil, Trash2, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

const DAYS = [
  { id: 'mon', label: 'Lunedi' }, { id: 'tue', label: 'Martedi' }, { id: 'wed', label: 'Mercoledi' },
  { id: 'thu', label: 'Giovedi' }, { id: 'fri', label: 'Venerdi' }, { id: 'sat', label: 'Sabato' }, { id: 'sun', label: 'Domenica' },
];

const emptyForm = { name: '', days: ['mon', 'tue', 'wed', 'thu', 'fri'], time_slots: ['09:00'], max_per_day: 2, min_gap_hours: 4, coordinate_partners: true };

export default function RulesPage() {
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [newSlot, setNewSlot] = useState('');

  const load = () => rulesAPI.list().then(r => setRules(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await rulesAPI.update(editing, form); toast.success('Regola aggiornata'); }
      else { await rulesAPI.create(form); toast.success('Regola creata'); }
      setOpen(false); setForm(emptyForm); setEditing(null); load();
    } catch (err) { toast.error('Errore'); }
  };

  const handleEdit = (r) => {
    setForm({ name: r.name, days: r.days || [], time_slots: r.time_slots || [], max_per_day: r.max_per_day || 2, min_gap_hours: r.min_gap_hours || 4, coordinate_partners: r.coordinate_partners ?? true });
    setEditing(r.rule_id); setOpen(true);
  };

  const toggleDay = (day) => {
    setForm(f => ({ ...f, days: f.days.includes(day) ? f.days.filter(d => d !== day) : [...f.days, day] }));
  };

  const addSlot = () => {
    if (!newSlot) return;
    setForm(f => ({ ...f, time_slots: [...f.time_slots, newSlot].sort() }));
    setNewSlot('');
  };

  const removeSlot = (i) => setForm(f => ({ ...f, time_slots: f.time_slots.filter((_, idx) => idx !== i) }));

  return (
    <div data-testid="rules-page">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-semibold ariadne-heading mb-2">Regole di Pianificazione</h1>
          <p className="text-base text-gray-500">Configura giorni, orari, frequenza e coordinamento</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setForm(emptyForm); setEditing(null); } }}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="add-rule-btn"><Plus className="w-4 h-4" />Nuova regola</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="ariadne-heading">{editing ? 'Modifica regola' : 'Nuova regola'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5 mt-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Nome regola</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="es. Standard LinkedIn" data-testid="rule-name-input" />
              </div>
              <div className="space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Giorni attivi</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(d => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleDay(d.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        form.days.includes(d.id) ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                      data-testid={`rule-day-${d.id}`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Fasce orarie</Label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {form.time_slots.map((s, i) => (
                    <Badge key={i} variant="outline" className="gap-1 badge-blue">
                      {s}
                      <button type="button" onClick={() => removeSlot(i)} className="ml-1 hover:text-red-500">x</button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input type="time" value={newSlot} onChange={e => setNewSlot(e.target.value)} className="w-32" />
                  <Button type="button" variant="outline" size="sm" onClick={addSlot}>Aggiungi</Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Max post/giorno</Label>
                  <Input type="number" min={1} max={10} value={form.max_per_day} onChange={e => setForm(f => ({ ...f, max_per_day: parseInt(e.target.value) || 1 }))} data-testid="rule-max-input" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Gap minimo (ore)</Label>
                  <Input type="number" min={1} max={48} value={form.min_gap_hours} onChange={e => setForm(f => ({ ...f, min_gap_hours: parseInt(e.target.value) || 1 }))} data-testid="rule-gap-input" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.coordinate_partners} onCheckedChange={v => setForm(f => ({ ...f, coordinate_partners: v }))} data-testid="rule-coordinate-switch" />
                <Label className="text-sm text-gray-700">Coordina pubblicazioni tra soci</Label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
                <Button type="submit" data-testid="rule-save-btn">{editing ? 'Salva' : 'Crea'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {rules.map(r => (
          <Card key={r.rule_id} className="border-gray-100 hover:border-gray-200 transition-colors" data-testid={`rule-card-${r.rule_id}`}>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Settings2 className="w-4 h-4 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-900">{r.name}</h3>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {r.days?.map(d => <Badge key={d} variant="outline" className="text-[10px]">{d}</Badge>)}
                </div>
                <div className="flex flex-wrap gap-3 text-[11px] text-gray-400">
                  <span>Orari: {r.time_slots?.join(', ')}</span>
                  <span>Max {r.max_per_day}/giorno</span>
                  <span>Gap {r.min_gap_hours}h</span>
                  {r.coordinate_partners && <Badge variant="outline" className="text-[10px] badge-purple">Coordinamento soci</Badge>}
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(r)} data-testid={`rule-edit-${r.rule_id}`}><Pencil className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => { rulesAPI.delete(r.rule_id); load(); }} data-testid={`rule-delete-${r.rule_id}`}><Trash2 className="w-4 h-4 text-red-400" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
