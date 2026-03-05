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
import { schoolAPI, adminAPI } from '../lib/api';
import { Plus, Pencil, Trash2, Users, Upload, GraduationCap, BookOpen, Loader2, X, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function CohortsAdminPage() {
  const [tab, setTab] = useState('programs');
  const [programs, setPrograms] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

  // Program form
  const [progForm, setProgForm] = useState({ name: '', description: '', active: true });
  const [progEditing, setProgEditing] = useState(null);
  const [progOpen, setProgOpen] = useState(false);

  // Cohort form
  const [cohForm, setCohForm] = useState({ program_id: '', name: '', start_date: '', end_date: '', active: true });
  const [cohEditing, setCohEditing] = useState(null);
  const [cohOpen, setCohOpen] = useState(false);

  // Members dialog
  const [membersOpen, setMembersOpen] = useState(null);
  const [members, setMembers] = useState([]);
  const [addUserId, setAddUserId] = useState('');

  // Materials
  const [matsOpen, setMatsOpen] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [pRes, cRes, uRes] = await Promise.all([schoolAPI.listPrograms(), schoolAPI.listCohorts(), adminAPI.listUsers()]);
      setPrograms(pRes.data); setCohorts(cRes.data); setUsers(uRes.data);
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  // Program CRUD
  const saveProgram = async (e) => {
    e.preventDefault();
    if (progEditing) await schoolAPI.updateProgram(progEditing, progForm);
    else await schoolAPI.createProgram(progForm);
    toast.success(progEditing ? 'Aggiornato' : 'Creato');
    setProgOpen(false); setProgForm({ name: '', description: '', active: true }); setProgEditing(null); load();
  };
  const editProgram = (p) => { setProgForm({ name: p.name, description: p.description, active: p.active }); setProgEditing(p.program_id); setProgOpen(true); };
  const deleteProgram = async (id) => { if (!window.confirm('Eliminare?')) return; await schoolAPI.deleteProgram(id); toast.success('Eliminato'); load(); };

  // Cohort CRUD
  const saveCohort = async (e) => {
    e.preventDefault();
    if (cohEditing) await schoolAPI.updateCohort(cohEditing, cohForm);
    else await schoolAPI.createCohort(cohForm);
    toast.success(cohEditing ? 'Aggiornato' : 'Creata');
    setCohOpen(false); setCohForm({ program_id: '', name: '', start_date: '', end_date: '', active: true }); setCohEditing(null); load();
  };
  const editCohort = (c) => { setCohForm({ program_id: c.program_id, name: c.name, start_date: c.start_date, end_date: c.end_date, active: c.active }); setCohEditing(c.cohort_id); setCohOpen(true); };
  const deleteCohort = async (id) => { if (!window.confirm('Eliminare?')) return; await schoolAPI.deleteCohort(id); toast.success('Eliminata'); load(); };

  // Members
  const openMembers = async (cohortId) => {
    setMembersOpen(cohortId);
    const res = await schoolAPI.listMembers(cohortId);
    setMembers(res.data);
  };
  const addMember = async () => {
    if (!addUserId) return;
    try {
      await schoolAPI.addMember(membersOpen, addUserId);
      toast.success('Aggiunto'); setAddUserId('');
      openMembers(membersOpen);
    } catch (err) { toast.error(err.response?.data?.detail || 'Errore'); }
  };
  const removeMember = async (userId) => {
    await schoolAPI.removeMember(membersOpen, userId);
    toast.success('Rimosso'); openMembers(membersOpen);
  };

  // Materials upload
  const openMats = async (cohortId) => {
    setMatsOpen(cohortId);
    const res = await schoolAPI.listMaterials();
    setMaterials(res.data.filter(m => m.cohort_id === cohortId));
  };
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await schoolAPI.uploadMaterial(file, matsOpen, file.name, '');
      toast.success('Caricato');
      openMats(matsOpen);
    } catch { toast.error('Errore upload'); } finally { setUploading(false); }
  };
  const deleteMaterial = async (id) => {
    await schoolAPI.deleteMaterial(id); toast.success('Eliminato'); openMats(matsOpen);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div data-testid="cohorts-admin-page">
      <div className="mb-10">
        <h1 className="text-4xl font-semibold ariadne-heading mb-2">Edizioni e materiali</h1>
        <p className="text-base text-gray-500">Gestisci percorsi, edizioni, partecipanti e materiali</p>
      </div>

      <div className="flex gap-2 mb-6">
        <Button variant={tab === 'programs' ? 'default' : 'outline'} size="sm" onClick={() => setTab('programs')} data-testid="tab-programs">Percorsi</Button>
        <Button variant={tab === 'cohorts' ? 'default' : 'outline'} size="sm" onClick={() => setTab('cohorts')} data-testid="tab-cohorts">Edizioni</Button>
      </div>

      {tab === 'programs' && (
        <div>
          <div className="flex justify-end mb-4">
            <Dialog open={progOpen} onOpenChange={(o) => { setProgOpen(o); if (!o) { setProgForm({ name: '', description: '', active: true }); setProgEditing(null); } }}>
              <DialogTrigger asChild><Button size="sm" className="gap-1" data-testid="add-program-btn"><Plus className="w-4 h-4" />Nuovo percorso</Button></DialogTrigger>
              <DialogContent><DialogHeader><DialogTitle className="ariadne-heading">{progEditing ? 'Modifica' : 'Nuovo'} percorso</DialogTitle></DialogHeader>
                <form onSubmit={saveProgram} className="space-y-4 mt-4">
                  <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Nome</Label><Input value={progForm.name} onChange={e => setProgForm(f => ({ ...f, name: e.target.value }))} data-testid="program-name" /></div>
                  <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Descrizione</Label><Textarea value={progForm.description} onChange={e => setProgForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
                  <div className="flex items-center gap-2"><Switch checked={progForm.active} onCheckedChange={v => setProgForm(f => ({ ...f, active: v }))} /><Label className="text-xs">Attivo</Label></div>
                  <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setProgOpen(false)}>Annulla</Button><Button type="submit" data-testid="program-save-btn">Salva</Button></div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-3">
            {programs.map(p => (
              <Card key={p.program_id} className={`border-gray-100 ${p.active ? '' : 'opacity-50'}`} data-testid={`program-${p.program_id}`}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#7B61FF]/8 text-[#7B61FF] flex items-center justify-center flex-shrink-0"><GraduationCap className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold">{p.name}</h3>
                    <p className="text-[11px] text-gray-400 truncate">{p.description}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => editProgram(p)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteProgram(p.program_id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                </CardContent>
              </Card>
            ))}
            {programs.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">Nessun percorso. Crea il primo!</div>}
          </div>
        </div>
      )}

      {tab === 'cohorts' && (
        <div>
          <div className="flex justify-end mb-4">
            <Dialog open={cohOpen} onOpenChange={(o) => { setCohOpen(o); if (!o) { setCohForm({ program_id: '', name: '', start_date: '', end_date: '', active: true }); setCohEditing(null); } }}>
              <DialogTrigger asChild><Button size="sm" className="gap-1" data-testid="add-cohort-btn"><Plus className="w-4 h-4" />Nuova edizione</Button></DialogTrigger>
              <DialogContent><DialogHeader><DialogTitle className="ariadne-heading">{cohEditing ? 'Modifica' : 'Nuova'} edizione</DialogTitle></DialogHeader>
                <form onSubmit={saveCohort} className="space-y-4 mt-4">
                  <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Percorso</Label>
                    <Select value={cohForm.program_id} onValueChange={v => setCohForm(f => ({ ...f, program_id: v }))}>
                      <SelectTrigger data-testid="cohort-program"><SelectValue placeholder="Seleziona" /></SelectTrigger>
                      <SelectContent>{programs.map(p => <SelectItem key={p.program_id} value={p.program_id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Nome edizione</Label><Input value={cohForm.name} onChange={e => setCohForm(f => ({ ...f, name: e.target.value }))} data-testid="cohort-name" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Data inizio</Label><Input type="date" value={cohForm.start_date} onChange={e => setCohForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                    <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Data fine</Label><Input type="date" value={cohForm.end_date} onChange={e => setCohForm(f => ({ ...f, end_date: e.target.value }))} /></div>
                  </div>
                  <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setCohOpen(false)}>Annulla</Button><Button type="submit" data-testid="cohort-save-btn">Salva</Button></div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-3">
            {cohorts.map(c => (
              <Card key={c.cohort_id} className="border-gray-100" data-testid={`cohort-${c.cohort_id}`}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#10B981]/8 text-[#10B981] flex items-center justify-center flex-shrink-0"><BookOpen className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm font-semibold">{c.name}</h3>
                      <Badge variant="outline" className="text-[10px]">{c.program_name}</Badge>
                    </div>
                    <p className="text-[11px] text-gray-400">{c.start_date} - {c.end_date} | {c.member_count} partecipanti | {c.material_count} materiali</p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => openMembers(c.cohort_id)} data-testid={`members-${c.cohort_id}`}><Users className="w-3 h-3" />Membri</Button>
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => openMats(c.cohort_id)} data-testid={`mats-${c.cohort_id}`}><FileText className="w-3 h-3" />Materiali</Button>
                  <Button variant="ghost" size="icon" onClick={() => editCohort(c)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteCohort(c.cohort_id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                </CardContent>
              </Card>
            ))}
            {cohorts.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">Nessuna edizione. Crea la prima!</div>}
          </div>
        </div>
      )}

      {/* Members dialog */}
      <Dialog open={!!membersOpen} onOpenChange={(o) => { if (!o) setMembersOpen(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="ariadne-heading">Membri edizione</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-4">
            <div className="flex gap-2">
              <Select value={addUserId} onValueChange={setAddUserId}>
                <SelectTrigger className="flex-1" data-testid="add-member-select"><SelectValue placeholder="Seleziona utente" /></SelectTrigger>
                <SelectContent>{users.filter(u => !members.find(m => m.user_id === u.user_id)).map(u => <SelectItem key={u.user_id} value={u.user_id}>{u.name} ({u.email})</SelectItem>)}</SelectContent>
              </Select>
              <Button size="sm" onClick={addMember} disabled={!addUserId} data-testid="add-member-btn">Aggiungi</Button>
            </div>
            {members.map(m => (
              <div key={m.user_id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <span className="text-sm flex-1">{m.user_name} <span className="text-xs text-gray-400">({m.user_email})</span></span>
                <Badge variant="outline" className="text-[9px]">{m.role_in_cohort}</Badge>
                <button onClick={() => removeMember(m.user_id)} className="text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            {members.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Nessun membro</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Materials dialog */}
      <Dialog open={!!matsOpen} onOpenChange={(o) => { if (!o) setMatsOpen(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="ariadne-heading">Materiali</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-4">
            <div className="flex items-center gap-2">
              <label className="flex-1">
                <input type="file" className="hidden" onChange={handleUpload} />
                <Button variant="outline" size="sm" className="gap-1 w-full" onClick={(e) => e.currentTarget.parentElement.querySelector('input').click()} disabled={uploading} data-testid="upload-material-btn">
                  {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}Carica file
                </Button>
              </label>
            </div>
            {materials.map(m => (
              <div key={m.material_id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.title}</p>
                  <p className="text-[10px] text-gray-400">{m.file_name} - {Math.round((m.file_size || 0) / 1024)}KB</p>
                </div>
                <button onClick={() => deleteMaterial(m.material_id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            {materials.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Nessun materiale</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
