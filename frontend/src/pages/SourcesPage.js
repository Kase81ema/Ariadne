import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { sourcesAPI } from '../lib/api';
import { BookOpen, Plus, Pencil, Trash2, Calendar, Link2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SourcesPage() {
  const [sources, setSources] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', type: 'course', description: '', link: '', dates: [], trainers: [], tags: [] });

  const load = () => { sourcesAPI.list().then(r => setSources(r.data)).catch(() => {}); };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    try {
      if (editing) { await sourcesAPI.update(editing, form); toast.success('Source updated'); }
      else { await sourcesAPI.create(form); toast.success('Source created'); }
      setShowDialog(false); setEditing(null); setForm({ title: '', type: 'course', description: '', link: '', dates: [], trainers: [], tags: [] });
      load();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const handleEdit = (s) => { setEditing(s.source_id); setForm({ title: s.title || '', type: s.type || 'course', description: s.description || '', link: s.link || '', dates: s.dates || [], trainers: s.trainers || [], tags: s.tags || [] }); setShowDialog(true); };
  const handleDelete = async (id) => { if (!window.confirm('Delete this source?')) return; await sourcesAPI.delete(id); toast.success('Deleted'); load(); };

  const TYPE_LABELS = { course: 'Course', event: 'Event', program: 'Program', topic: 'Topic' };

  return (
    <div data-testid="sources-page">
      <div className="flex items-center justify-between mb-8">
        <div><h1 className="text-3xl font-semibold text-gray-900 mb-1">Content Sources</h1><p className="text-sm text-gray-500">Courses, events, programs and topics that drive your content.</p></div>
        <Button onClick={() => { setEditing(null); setForm({ title: '', type: 'course', description: '', link: '', dates: [], trainers: [], tags: [] }); setShowDialog(true); }} className="gap-2 bg-[#2C3792] hover:bg-[#232E7A]" data-testid="new-source-btn"><Plus className="w-4 h-4" /> New Source</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sources.map(s => (
          <Card key={s.source_id} className="border-gray-100" data-testid={`source-${s.source_id}`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2"><h3 className="text-sm font-semibold">{s.title}</h3><Badge variant="outline" className="text-[10px]">{TYPE_LABELS[s.type] || s.type}</Badge></div>
                  {s.description && <p className="text-xs text-gray-500 line-clamp-2 mb-2">{s.description}</p>}
                  {s.link && <a href={s.link} target="_blank" rel="noopener noreferrer" className="text-xs text-[#2C3792] flex items-center gap-1 hover:underline"><Link2 className="w-3 h-3" />{s.link}</a>}
                </div>
                <div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => handleEdit(s)}><Pencil className="w-3.5 h-3.5" /></Button><Button variant="ghost" size="icon" onClick={() => handleDelete(s.source_id)}><Trash2 className="w-3.5 h-3.5 text-red-400" /></Button></div>
              </div>
            </CardContent>
          </Card>
        ))}
        {sources.length === 0 && <div className="col-span-2 text-center py-12"><BookOpen className="w-8 h-8 text-gray-200 mx-auto mb-3" /><p className="text-sm text-gray-400">No content sources yet. Add courses, events, or topics to fuel your campaigns.</p></div>}
      </div>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Source' : 'New Content Source'}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2"><Label className="text-xs">Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} data-testid="source-title" /></div>
            <div className="space-y-2"><Label className="text-xs">Type</Label><Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}><SelectTrigger data-testid="source-type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="course">Course</SelectItem><SelectItem value="event">Event</SelectItem><SelectItem value="program">Program</SelectItem><SelectItem value="topic">Topic</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label className="text-xs">Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} data-testid="source-desc" /></div>
            <div className="space-y-2"><Label className="text-xs">Link</Label><Input value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} data-testid="source-link" /></div>
            <Button onClick={handleSave} disabled={!form.title.trim()} className="w-full bg-[#2C3792] hover:bg-[#232E7A]" data-testid="source-save">{editing ? 'Update' : 'Create'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
