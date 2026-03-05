import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { inboxAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Mail, Import, Filter, Clock, AlertTriangle, User, Archive,
  Sparkles, Send, Check, ChevronRight, Loader2, Plus, Eye
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_LABELS = { nuovo: 'Nuovo', in_lavorazione: 'In lavorazione', in_attesa: 'In attesa', in_approvazione: 'In approvazione', inviato: 'Inviato', archiviato: 'Archiviato' };
const STATUS_COLORS = { nuovo: 'badge-blue', in_lavorazione: 'badge-orange', in_attesa: '', in_approvazione: 'badge-purple', inviato: 'badge-green', archiviato: '' };
const CAT_LABELS = { info_corsi: 'Info corsi', iscrizione: 'Iscrizione', collaborazione: 'Collaborazione', richiesta_call: 'Call', supporto: 'Supporto', altro: 'Altro' };

function ImportDialog({ onImported }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ subject: '', from_email: '', from_name: '', body_text: '' });
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!form.subject || !form.body_text) return;
    setSaving(true);
    try {
      await inboxAPI.importThread(form);
      toast.success('Thread importato');
      setOpen(false);
      setForm({ subject: '', from_email: '', from_name: '', body_text: '' });
      onImported();
    } catch { toast.error('Errore importazione'); } finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="gap-2" data-testid="import-thread-btn"><Import className="w-4 h-4" />Importa thread</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="ariadne-heading">Importa thread email</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Oggetto *</Label>
            <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} data-testid="import-subject" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Email mittente</Label>
              <Input value={form.from_email} onChange={e => setForm(f => ({ ...f, from_email: e.target.value }))} data-testid="import-from-email" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Nome mittente</Label>
              <Input value={form.from_name} onChange={e => setForm(f => ({ ...f, from_name: e.target.value }))} data-testid="import-from-name" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Testo email *</Label>
            <Textarea value={form.body_text} onChange={e => setForm(f => ({ ...f, body_text: e.target.value }))} rows={6} data-testid="import-body" />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
            <Button onClick={submit} disabled={saving || !form.subject || !form.body_text} data-testid="import-submit-btn">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Importa'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ThreadDetail({ thread, onClose, onRefresh }) {
  const { user } = useAuth();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editDraft, setEditDraft] = useState(false);
  const [draftForm, setDraftForm] = useState({ subject: '', body: '' });
  const [templates, setTemplates] = useState([]);
  const [selTemplate, setSelTemplate] = useState('');
  const [users, setUsers] = useState([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      inboxAPI.getThread(thread.thread_id),
      inboxAPI.listTemplates(),
    ]).then(([tRes, tmplRes]) => {
      setDetail(tRes.data);
      setTemplates(tmplRes.data);
      if (tRes.data.draft) setDraftForm({ subject: tRes.data.draft.subject, body: tRes.data.draft.body });
      setLoading(false);
    }).catch(() => setLoading(false));
    import('../lib/api').then(m => m.adminAPI.listUsers()).then(r => setUsers(r.data)).catch(() => {});
  }, [thread.thread_id]);

  const generateDraft = async () => {
    setGenerating(true);
    try {
      const res = await inboxAPI.generateDraft(thread.thread_id, selTemplate);
      setDraftForm({ subject: res.data.subject, body: res.data.body });
      setDetail(prev => ({ ...prev, draft: res.data }));
      toast.success('Bozza generata');
    } catch { toast.error('Errore generazione'); } finally { setGenerating(false); }
  };

  const saveDraft = async () => {
    await inboxAPI.updateDraft(thread.thread_id, draftForm);
    toast.success('Bozza salvata');
  };

  const submitForApproval = async () => {
    await inboxAPI.submitDraft(thread.thread_id);
    toast.success('Inviata in approvazione');
    onRefresh();
  };

  const approveDraft = async () => {
    await inboxAPI.approveDraft(thread.thread_id);
    toast.success('Approvata e segnata come inviata');
    onRefresh();
  };

  const archiveThread = async () => {
    await inboxAPI.archiveThread(thread.thread_id);
    toast.success('Archiviato');
    onRefresh();
    onClose();
  };

  const assignThread = async (userId) => {
    await inboxAPI.assignThread(thread.thread_id, userId);
    toast.success('Assegnato');
    onRefresh();
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></div>;

  const d = detail;
  return (
    <div className="space-y-4" data-testid="thread-detail">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold ariadne-heading">{d.thread.subject}</h2>
          <p className="text-xs text-gray-400">Da: {d.thread.from_name} &lt;{d.thread.from_email}&gt;</p>
        </div>
        <div className="flex gap-2">
          <Badge className={STATUS_COLORS[d.thread.status]}>{STATUS_LABELS[d.thread.status]}</Badge>
          <Badge variant="outline">{CAT_LABELS[d.thread.category] || d.thread.category}</Badge>
        </div>
      </div>

      {/* Assign */}
      <div className="flex items-center gap-3">
        <Label className="text-xs text-gray-500">Assegna a:</Label>
        <Select value={d.thread.assigned_to || '_unassigned'} onValueChange={(v) => assignThread(v === '_unassigned' ? '' : v)}>
          <SelectTrigger className="w-48 h-8 text-xs" data-testid="assign-select"><SelectValue placeholder="Non assegnato" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_unassigned">Non assegnato</SelectItem>
            {users.filter(u => u.role !== 'user').map(u => <SelectItem key={u.user_id} value={u.user_id}>{u.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Messages */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Conversazione</p>
        {d.messages.map(m => (
          <Card key={m.message_id} className={`border-gray-100 ${m.direction === 'outbound' ? 'bg-[#7B61FF]/[0.02] border-[#7B61FF]/10' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-[9px]">{m.direction === 'outbound' ? 'Ariadne' : 'Ricevuto'}</Badge>
                <span className="text-[10px] text-gray-400">{new Date(m.received_at).toLocaleString('it-IT')}</span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{m.body_text}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Draft section */}
      {d.thread.status !== 'archiviato' && d.thread.status !== 'inviato' && (
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Bozza risposta</p>
            <div className="flex gap-2">
              <Select value={selTemplate || '_none'} onValueChange={v => setSelTemplate(v === '_none' ? '' : v)}>
                <SelectTrigger className="w-48 h-8 text-xs"><SelectValue placeholder="Template (opzionale)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Nessun template</SelectItem>
                  {templates.map(t => <SelectItem key={t.template_id} value={t.template_id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={generateDraft} disabled={generating} className="gap-1.5 text-xs" data-testid="generate-draft-btn">
                {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Genera bozza AI
              </Button>
            </div>
          </div>

          {(d.draft || draftForm.body) && (
            <div className="space-y-3">
              <Input value={draftForm.subject} onChange={e => setDraftForm(f => ({ ...f, subject: e.target.value }))} placeholder="Oggetto" className="text-sm" data-testid="draft-subject" />
              <Textarea value={draftForm.body} onChange={e => setDraftForm(f => ({ ...f, body: e.target.value }))} rows={8} className="text-sm" data-testid="draft-body" />
              {d.draft?.ai_notes && d.draft.ai_notes !== 'Nessuna' && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg text-xs text-amber-700">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div><p className="font-medium mb-0.5">Note di attenzione</p><p>{d.draft.ai_notes}</p></div>
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={saveDraft} className="gap-1 text-xs"><Check className="w-3 h-3" />Salva bozza</Button>
                {user.role !== 'admin' && <Button size="sm" onClick={submitForApproval} className="gap-1 text-xs" data-testid="submit-approval-btn"><Send className="w-3 h-3" />Invia in approvazione</Button>}
                {user.role === 'admin' && <Button size="sm" onClick={approveDraft} className="gap-1 text-xs bg-green-600 hover:bg-green-700" data-testid="approve-send-btn"><Check className="w-3 h-3" />Approva e invia</Button>}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end pt-4 border-t">
        <Button variant="outline" size="sm" onClick={archiveThread} className="gap-1 text-xs" data-testid="archive-btn"><Archive className="w-3 h-3" />Archivia</Button>
      </div>
    </div>
  );
}

export default function InboxPage() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('all');
  const [selected, setSelected] = useState(null);

  const load = (v) => {
    setLoading(true);
    inboxAPI.listThreads(v || view).then(r => { setThreads(r.data); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [view]);

  const switchView = (v) => { setView(v); load(v); };

  return (
    <div data-testid="inbox-page">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-semibold ariadne-heading mb-2">Inbox</h1>
          <p className="text-base text-gray-500">Gestione richieste in ingresso</p>
        </div>
        <ImportDialog onImported={() => load()} />
      </div>

      {selected ? (
        <div>
          <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="mb-4 text-xs">&larr; Torna alla lista</Button>
          <ThreadDetail thread={selected} onClose={() => setSelected(null)} onRefresh={() => { load(); }} />
        </div>
      ) : (
        <>
          <Tabs value={view} onValueChange={switchView} className="mb-6">
            <TabsList>
              <TabsTrigger value="all" data-testid="view-all">Tutti</TabsTrigger>
              <TabsTrigger value="mine" data-testid="view-mine">I miei</TabsTrigger>
              <TabsTrigger value="unassigned" data-testid="view-unassigned">Non assegnati</TabsTrigger>
              <TabsTrigger value="approval" data-testid="view-approval">In approvazione</TabsTrigger>
            </TabsList>
          </Tabs>

          {loading ? (
            <div className="text-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" /></div>
          ) : threads.length > 0 ? (
            <div className="space-y-2">
              {threads.map(t => (
                <Card
                  key={t.thread_id}
                  className={`border-gray-100 hover:border-gray-200 cursor-pointer transition-all ${t.sla_overdue ? 'border-l-2 border-l-red-400' : ''}`}
                  onClick={() => setSelected(t)}
                  data-testid={`thread-${t.thread_id}`}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${t.status === 'nuovo' ? 'bg-blue-50 text-blue-500' : 'bg-gray-50 text-gray-400'}`}>
                      <Mail className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className={`text-sm font-medium truncate ${t.status === 'nuovo' ? 'text-gray-900 font-semibold' : 'text-gray-700'}`}>{t.subject}</h3>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400">
                        <span>{t.from_name || t.from_email}</span>
                        <span>&middot;</span>
                        <span>{new Date(t.last_message_at).toLocaleDateString('it-IT')}</span>
                        {t.assignee_name && <><span>&middot;</span><span className="flex items-center gap-0.5"><User className="w-3 h-3" />{t.assignee_name}</span></>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className="text-[10px]">{CAT_LABELS[t.category] || t.category}</Badge>
                      <Badge className={`text-[10px] ${STATUS_COLORS[t.status]}`}>{STATUS_LABELS[t.status]}</Badge>
                      {t.sla_overdue && <Badge className="text-[10px] badge-red">Scaduto</Badge>}
                      {!t.sla_overdue && t.sla_hours_left < 8 && t.status !== 'inviato' && t.status !== 'archiviato' && (
                        <Badge variant="outline" className="text-[10px] badge-orange">
                          <Clock className="w-2.5 h-2.5 mr-0.5" />{Math.round(t.sla_hours_left)}h
                        </Badge>
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400 text-sm">
              {view === 'all' ? 'Nessun thread. Importa il primo!' : 'Nessun thread in questa vista.'}
            </div>
          )}
        </>
      )}
    </div>
  );
}
