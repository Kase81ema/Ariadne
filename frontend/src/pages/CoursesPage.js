import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { coursesAPI } from '../lib/api';
import { Plus, Copy, Pencil, Trash2, GraduationCap, Calendar as CalIcon, X } from 'lucide-react';
import { toast } from 'sonner';

const TYPE_LABELS = { course_multi: 'Corso multi-data', event_single: 'Evento singolo', webinar: 'Webinar', workshop: 'Workshop' };
const TYPE_COLORS = { course_multi: 'badge-purple', event_single: 'badge-blue', webinar: 'badge-orange', workshop: 'badge-green' };

const emptyForm = { title: '', type: 'course_multi', description: '', dates: [], trainers: [], price: '', location: '', accreditation: '', link: '', tags: [] };

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [newTrainer, setNewTrainer] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newDate, setNewDate] = useState({ date: '', end_date: '', label: '' });

  const load = () => coursesAPI.list().then(r => setCourses(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await coursesAPI.update(editing, form); toast.success('Corso aggiornato'); }
      else { await coursesAPI.create(form); toast.success('Corso creato'); }
      setOpen(false); setForm(emptyForm); setEditing(null); load();
    } catch (err) { toast.error(err.response?.data?.detail || 'Errore'); }
  };

  const handleEdit = (c) => {
    setForm({ title: c.title, type: c.type, description: c.description || '', dates: c.dates || [], trainers: c.trainers || [], price: c.price || '', location: c.location || '', accreditation: c.accreditation || '', link: c.link || '', tags: c.tags || [] });
    setEditing(c.course_id); setOpen(true);
  };

  const handleClone = async (id) => {
    await coursesAPI.clone(id);
    toast.success('Corso duplicato');
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare questo corso/evento?')) return;
    await coursesAPI.delete(id); toast.success('Eliminato'); load();
  };

  const addDate = () => {
    if (!newDate.date) return;
    setForm(f => ({ ...f, dates: [...f.dates, { ...newDate }] }));
    setNewDate({ date: '', end_date: '', label: '' });
  };

  const removeDate = (i) => setForm(f => ({ ...f, dates: f.dates.filter((_, idx) => idx !== i) }));

  const addTrainer = () => {
    if (!newTrainer.trim()) return;
    setForm(f => ({ ...f, trainers: [...f.trainers, newTrainer.trim()] }));
    setNewTrainer('');
  };

  const addTag = () => {
    if (!newTag.trim()) return;
    setForm(f => ({ ...f, tags: [...f.tags, newTag.trim()] }));
    setNewTag('');
  };

  const filtered = courses.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div data-testid="courses-page">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-semibold ariadne-heading mb-2">Corsi ed Eventi</h1>
          <p className="text-base text-gray-500">Gestisci corsi, eventi e webinar</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setForm(emptyForm); setEditing(null); } }}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="add-course-btn"><Plus className="w-4 h-4" />Nuovo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="ariadne-heading">{editing ? 'Modifica' : 'Nuovo corso/evento'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Titolo</Label>
                  <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Titolo" data-testid="course-title-input" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Tipo</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger data-testid="course-type-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Descrizione</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} data-testid="course-desc-input" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Prezzo</Label>
                  <Input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="es. 1.200 EUR" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Luogo</Label>
                  <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="es. Milano / Online" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Accreditamento</Label>
                  <Input value={form.accreditation} onChange={e => setForm(f => ({ ...f, accreditation: e.target.value }))} placeholder="es. ICF Level 1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Link</Label>
                <Input value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} placeholder="https://..." />
              </div>
              {/* Dates */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Date</Label>
                <div className="space-y-2">
                  {form.dates.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm bg-gray-50 rounded-lg px-3 py-2">
                      <CalIcon className="w-3.5 h-3.5 text-gray-400" />
                      <span>{d.label && `${d.label}: `}{d.date}{d.end_date && d.end_date !== d.date ? ` - ${d.end_date}` : ''}</span>
                      <button type="button" onClick={() => removeDate(i)} className="ml-auto"><X className="w-3.5 h-3.5 text-gray-400 hover:text-red-400" /></button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input type="date" value={newDate.date} onChange={e => setNewDate(d => ({ ...d, date: e.target.value }))} className="flex-1" />
                  <Input type="date" value={newDate.end_date} onChange={e => setNewDate(d => ({ ...d, end_date: e.target.value }))} className="flex-1" placeholder="Fine" />
                  <Input value={newDate.label} onChange={e => setNewDate(d => ({ ...d, label: e.target.value }))} placeholder="Label" className="flex-1" />
                  <Button type="button" variant="outline" size="sm" onClick={addDate}>+</Button>
                </div>
              </div>
              {/* Trainers */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Trainer</Label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {form.trainers.map((t, i) => (
                    <Badge key={i} variant="outline" className="gap-1 badge-purple">
                      {t} <button type="button" onClick={() => setForm(f => ({ ...f, trainers: f.trainers.filter((_, idx) => idx !== i) }))}><X className="w-3 h-3" /></button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={newTrainer} onChange={e => setNewTrainer(e.target.value)} placeholder="Nome trainer" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTrainer())} />
                  <Button type="button" variant="outline" size="sm" onClick={addTrainer}>+</Button>
                </div>
              </div>
              {/* Tags */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Tag</Label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {form.tags.map((t, i) => (
                    <Badge key={i} variant="outline" className="gap-1 text-[10px]">
                      {t} <button type="button" onClick={() => setForm(f => ({ ...f, tags: f.tags.filter((_, idx) => idx !== i) }))}><X className="w-3 h-3" /></button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Nuovo tag" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} />
                  <Button type="button" variant="outline" size="sm" onClick={addTag}>+</Button>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
                <Button type="submit" data-testid="course-save-btn">{editing ? 'Salva' : 'Crea'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6">
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca per titolo..." className="max-w-sm" data-testid="course-search-input" />
      </div>

      <div className="grid gap-4">
        {filtered.map(c => (
          <Card key={c.course_id} className="border-gray-100 hover:border-gray-200 transition-colors" data-testid={`course-card-${c.course_id}`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <GraduationCap className="w-4 h-4 text-gray-400" />
                    <h3 className="text-sm font-semibold text-gray-900">{c.title}</h3>
                    <Badge variant="outline" className={`text-[10px] ${TYPE_COLORS[c.type]}`}>{TYPE_LABELS[c.type]}</Badge>
                  </div>
                  {c.description && <p className="text-xs text-gray-500 mb-2 line-clamp-2">{c.description}</p>}
                  <div className="flex flex-wrap gap-2 items-center text-[11px] text-gray-400">
                    {c.dates?.length > 0 && <span>{c.dates.length} {c.dates.length === 1 ? 'data' : 'date'}</span>}
                    {c.trainers?.length > 0 && <span>Trainer: {c.trainers.join(', ')}</span>}
                    {c.accreditation && <Badge variant="outline" className="text-[10px] badge-green">{c.accreditation}</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <Button variant="ghost" size="icon" onClick={() => handleClone(c.course_id)} title="Duplica" data-testid={`course-clone-${c.course_id}`}><Copy className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(c)} data-testid={`course-edit-${c.course_id}`}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(c.course_id)} data-testid={`course-delete-${c.course_id}`}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <div className="text-center py-16 text-gray-400 text-sm">Nessun corso trovato</div>}
      </div>
    </div>
  );
}
