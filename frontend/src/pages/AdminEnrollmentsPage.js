import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI, schoolAPI } from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import { CalendarDays, CreditCard, Search, Users, Clock, ArrowRight, Download, Copy, Sparkles } from 'lucide-react';

const toCurrency = (v) => `€ ${Number(v || 0).toFixed(2)}`;

const PIPELINE_STATUS = {
  onboarding: { label: 'In fase di iscrizione', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  enrolled: { label: 'Iscritto', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  active: { label: 'Attivo', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  completed: { label: 'Completato', className: 'bg-gray-50 text-gray-600 border-gray-200' },
};

const STATUS_OPTIONS = [
  { value: 'interested', label: 'Interessato' },
  { value: 'confirmed', label: 'Confermato' },
  { value: 'enrolled', label: 'Iscritto' },
];

const QUICK_TEMPLATES = [2, 3, 5];

const parsePrice = (value) => {
  if (!value) return 0;
  const normalized = String(value).replace(/\./g, '').replace(',', '.');
  const match = normalized.match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
};

const addMonths = (dateValue, months) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split('T')[0];
};

function daysSince(dateStr) {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

export default function AdminEnrollmentsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('pipeline');
  const [pipeline, setPipeline] = useState([]);
  const [paymentOverview, setPaymentOverview] = useState({ summary: {}, rows: [] });
  const [adminCourses, setAdminCourses] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedEditionId, setSelectedEditionId] = useState('');
  const [newEdition, setNewEdition] = useState({ name: '', start_date: '', end_date: '' });
  const [newParticipant, setNewParticipant] = useState({ user_id: 'none', participation_status: 'interested' });
  const [installmentDrafts, setInstallmentDrafts] = useState({});
  const [copiedPlan, setCopiedPlan] = useState(null);
  const [copiedPlanSource, setCopiedPlanSource] = useState('');
  const [paymentCourseFilter, setPaymentCourseFilter] = useState('all');
  const [pipelineFilter, setPipelineFilter] = useState('all');

  const buildDraftsFromMembers = (members) => {
    const d = {};
    members.forEach(m => {
      d[m.user_id] = m.installments?.length > 0
        ? m.installments.map(i => ({ description: i.description || '', amount: i.amount || '', due_date: i.due_date || '' }))
        : [{ description: 'Rata 1', amount: '', due_date: '' }];
    });
    return d;
  };

  const loadData = async () => {
    const [coursesR, cohortsR, usersR, paymentR, pipelineR] = await Promise.all([
      schoolAPI.listTrainingCourses().catch(() => ({ data: [] })),
      schoolAPI.listCohorts().catch(() => ({ data: [] })),
      adminAPI.listUsers().catch(() => ({ data: [] })),
      schoolAPI.adminPaymentOverview().catch(() => ({ data: { summary: {}, rows: [] } })),
      schoolAPI.adminEnrollmentPipeline().catch(() => ({ data: [] })),
    ]);
    setAdminCourses(coursesR.data);
    setCohorts(cohortsR.data);
    setUsers(usersR.data.filter(u => u.role !== 'admin'));
    setPaymentOverview(paymentR.data);
    setPipeline(pipelineR.data || []);
    if (!selectedCourseId && coursesR.data.length > 0) setSelectedCourseId(coursesR.data[0].course_id);
  };

  useEffect(() => { loadData().catch(() => {}); }, []);

  const courseCohorts = useMemo(() => cohorts.filter(c => c.course_id === selectedCourseId), [cohorts, selectedCourseId]);
  const selectedEdition = courseCohorts.find(c => c.cohort_id === selectedEditionId);
  const selectedCourse = useMemo(() => adminCourses.find(c => c.course_id === selectedCourseId), [adminCourses, selectedCourseId]);
  const availableUsers = useMemo(() => users.filter(u => !participants.some(m => m.user_id === u.user_id)), [users, participants]);
  const enrolledParticipants = useMemo(() => participants.filter(m => m.participation_status === 'enrolled'), [participants]);

  useEffect(() => {
    if (!courseCohorts.some(c => c.cohort_id === selectedEditionId)) setSelectedEditionId(courseCohorts[0]?.cohort_id || '');
  }, [courseCohorts, selectedEditionId]);

  useEffect(() => {
    if (!selectedEditionId) { setParticipants([]); return; }
    schoolAPI.listMembers(selectedEditionId).then(r => {
      setParticipants(r.data);
      setInstallmentDrafts(buildDraftsFromMembers(r.data));
    }).catch(() => setParticipants([]));
  }, [selectedEditionId]);

  const openUserAdmin = (userId) => navigate(`/users-admin?userId=${userId}`);

  const handleCreateEdition = async () => {
    if (!selectedCourseId || !newEdition.name.trim()) return toast.error('Seleziona un corso e inserisci il nome');
    try {
      await schoolAPI.createCohort({ course_id: selectedCourseId, name: newEdition.name, start_date: newEdition.start_date, end_date: newEdition.end_date, active: true });
      setNewEdition({ name: '', start_date: '', end_date: '' });
      await loadData();
      toast.success('Edizione creata');
    } catch { toast.error('Impossibile creare l\'edizione'); }
  };

  const handleAddParticipant = async () => {
    if (newParticipant.user_id === 'none' || !selectedEditionId) return toast.error('Seleziona edizione e partecipante');
    try {
      await schoolAPI.addMember(selectedEditionId, newParticipant.user_id, 'student', newParticipant.participation_status);
      const r = await schoolAPI.listMembers(selectedEditionId);
      setParticipants(r.data);
      setInstallmentDrafts(buildDraftsFromMembers(r.data));
      setNewParticipant({ user_id: 'none', participation_status: 'interested' });
      toast.success('Partecipante aggiunto');
    } catch (e) { toast.error(e.response?.data?.detail || 'Errore'); }
  };

  const handleUpdateStatus = async (userId, status) => {
    try {
      const r = await schoolAPI.updateMember(selectedEditionId, userId, { participation_status: status });
      setParticipants(prev => prev.map(p => p.user_id === userId ? r.data : p));
      toast.success('Stato aggiornato');
    } catch { toast.error('Errore aggiornamento'); }
  };

  const handleRemoveParticipant = async (userId) => {
    try {
      await schoolAPI.removeMember(selectedEditionId, userId);
      setParticipants(prev => prev.filter(p => p.user_id !== userId));
      toast.success('Partecipante rimosso');
    } catch { toast.error('Errore rimozione'); }
  };

  const setInstallmentCount = (userId, count) => {
    setInstallmentDrafts(prev => {
      const cur = prev[userId] || [{ description: 'Rata 1', amount: '', due_date: '' }];
      return { ...prev, [userId]: Array.from({ length: count }, (_, i) => cur[i] || { description: `Rata ${i + 1}`, amount: '', due_date: '' }) };
    });
  };

  const updateInstallmentDraft = (userId, index, field, value) => {
    setInstallmentDrafts(prev => ({
      ...prev, [userId]: (prev[userId] || []).map((item, i) => i === index ? { ...item, [field]: value } : item),
    }));
  };

  const applyQuickTemplate = (userId, count) => {
    const baseDate = selectedEdition?.start_date || new Date().toISOString().split('T')[0];
    const total = parsePrice(selectedCourse?.price) || (installmentDrafts[userId] || []).reduce((s, i) => s + Number(i.amount || 0), 0);
    const amt = total ? Number((total / count).toFixed(2)) : '';
    setInstallmentDrafts(prev => ({
      ...prev, [userId]: Array.from({ length: count }, (_, i) => ({ description: `Rata ${i + 1}`, amount: amt, due_date: addMonths(baseDate, i) })),
    }));
  };

  const handleSaveBulkInstallments = async () => {
    const plans = enrolledParticipants.map(m => ({
      user_id: m.user_id, installments: (installmentDrafts[m.user_id] || []).filter(i => i.due_date || i.amount),
    })).filter(p => p.installments.length > 0);
    if (!selectedCourseId || !selectedEditionId || plans.length === 0) return toast.error('Prepara almeno un piano rate');
    try {
      await schoolAPI.adminBulkCreateInstallments({ course_id: selectedCourseId, cohort_id: selectedEditionId, plans, replace_existing: true });
      const [mR, pR] = await Promise.all([schoolAPI.listMembers(selectedEditionId), schoolAPI.adminPaymentOverview()]);
      setParticipants(mR.data); setInstallmentDrafts(buildDraftsFromMembers(mR.data)); setPaymentOverview(pR.data);
      toast.success('Piani rate salvati');
    } catch { toast.error('Errore salvataggio'); }
  };

  const paymentRows = useMemo(() => (paymentOverview.rows || []).filter(r => paymentCourseFilter === 'all' || r.course_id === paymentCourseFilter), [paymentOverview.rows, paymentCourseFilter]);
  const filteredPipeline = useMemo(() => pipeline.filter(e => pipelineFilter === 'all' || e.status === pipelineFilter), [pipeline, pipelineFilter]);

  const exportCSV = () => {
    if (paymentRows.length === 0) return;
    const header = 'Nome,Corso,Edizione,Descrizione,Scadenza,Importo,Stato';
    const rows = paymentRows.map(r => [r.user_name, r.course_title || '', r.edition_name || '', r.description, r.due_date || '', r.amount || 0, r.overdue ? 'Scaduta' : 'In arrivo'].map(v => `"${v}"`).join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `scadenze_pagamenti_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div data-testid="admin-enrollments-page">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold ariadne-heading mb-2">Iscrizioni e pagamenti</h1>
        <p className="text-base text-gray-500">Gestisci pipeline di iscrizione, operatività corsi e scadenze pagamenti.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="pipeline" data-testid="admin-tab-pipeline">Pipeline onboarding</TabsTrigger>
          <TabsTrigger value="operativita" data-testid="admin-tab-operations">Operatività corsi</TabsTrigger>
          <TabsTrigger value="pagamenti" data-testid="admin-tab-payments">Scadenze pagamenti</TabsTrigger>
        </TabsList>

        {/* PIPELINE TAB */}
        <TabsContent value="pipeline">
          <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
            <p className="text-sm text-gray-500">Chi ha iniziato il wizard di iscrizione, a quale step è fermo e da quando.</p>
            <Select value={pipelineFilter} onValueChange={setPipelineFilter}>
              <SelectTrigger className="w-[200px]" data-testid="pipeline-status-filter"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                {Object.entries(PIPELINE_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            {filteredPipeline.map(enr => {
              const st = PIPELINE_STATUS[enr.status] || PIPELINE_STATUS.onboarding;
              const days = daysSince(enr.updated_at);
              return (
                <Card key={enr.enrollment_id} className="border-gray-100" data-testid={`pipeline-row-${enr.enrollment_id}`}>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_160px_100px_120px_auto] gap-3 items-center">
                      <div>
                        <p className="text-sm font-semibold">{enr.user_name}</p>
                        <p className="text-xs text-gray-400">{enr.user_email}</p>
                      </div>
                      <p className="text-sm text-gray-600">{enr.course_title || '—'}</p>
                      <Badge variant="outline" className={`text-[10px] ${st.className}`}>{st.label}</Badge>
                      {enr.status === 'onboarding' ? (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Clock className="w-3.5 h-3.5" /> Step {enr.current_step}/6 · {days}g fa
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">{days > 0 ? `${days}g fa` : 'Oggi'}</span>
                      )}
                      <Button variant="outline" size="sm" onClick={() => openUserAdmin(enr.user_id)} data-testid={`pipeline-open-user-${enr.enrollment_id}`}>Scheda utente</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filteredPipeline.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Nessuna iscrizione in pipeline per il filtro selezionato.</p>}
          </div>
        </TabsContent>

        {/* OPERATIONS TAB (moved from TrainingCoursesPage) */}
        <TabsContent value="operativita">
          <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6">
            <Card className="border-gray-100" data-testid="admin-operations-sidebar">
              <CardContent className="p-5 space-y-4">
                <div className="space-y-2">
                  <Label>Corso</Label>
                  <Select value={selectedCourseId || 'none'} onValueChange={v => setSelectedCourseId(v === 'none' ? '' : v)}>
                    <SelectTrigger data-testid="admin-course-select"><SelectValue placeholder="Seleziona un corso" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Seleziona un corso</SelectItem>
                      {adminCourses.map(c => <SelectItem key={c.course_id} value={c.course_id}>{c.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Edizione</Label>
                  <Select value={selectedEditionId || 'none'} onValueChange={v => setSelectedEditionId(v === 'none' ? '' : v)}>
                    <SelectTrigger data-testid="admin-edition-select"><SelectValue placeholder="Seleziona edizione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Seleziona edizione</SelectItem>
                      {courseCohorts.map(c => <SelectItem key={c.cohort_id} value={c.cohort_id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-xl border border-gray-100 p-4 space-y-3">
                  <p className="text-sm font-semibold">Crea nuova edizione</p>
                  <Input value={newEdition.name} onChange={e => setNewEdition(p => ({ ...p, name: e.target.value }))} placeholder="Nome edizione" data-testid="admin-create-edition-name" />
                  <Input type="date" value={newEdition.start_date} onChange={e => setNewEdition(p => ({ ...p, start_date: e.target.value }))} data-testid="admin-create-edition-start" />
                  <Input type="date" value={newEdition.end_date} onChange={e => setNewEdition(p => ({ ...p, end_date: e.target.value }))} data-testid="admin-create-edition-end" />
                  <Button className="w-full" onClick={handleCreateEdition} data-testid="admin-create-edition-btn">Crea edizione</Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              {/* Participants */}
              <Card className="border-gray-100" data-testid="admin-participants-card">
                <CardContent className="p-5 space-y-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h2 className="text-xl font-medium ariadne-heading">Partecipanti per edizione</h2>
                      <p className="text-sm text-gray-500">Gestisci interessati, confermati e iscritti.</p>
                    </div>
                    {selectedEdition && <Badge variant="outline" className="text-[10px]">{selectedEdition.name}</Badge>}
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {STATUS_OPTIONS.map(s => (
                      <Card key={s.value} className="border-gray-100"><CardContent className="p-4">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">{s.label}</p>
                        <p className="text-2xl font-semibold ariadne-heading">{participants.filter(m => m.participation_status === s.value).length}</p>
                      </CardContent></Card>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px_auto] gap-3 items-end">
                    <div className="space-y-2">
                      <Label>Aggiungi persona</Label>
                      <Select value={newParticipant.user_id} onValueChange={v => setNewParticipant(p => ({ ...p, user_id: v }))}>
                        <SelectTrigger data-testid="admin-add-participant-user"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Seleziona persona</SelectItem>
                          {availableUsers.map(u => <SelectItem key={u.user_id} value={u.user_id}>{u.name} · {u.email}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Stato iniziale</Label>
                      <Select value={newParticipant.participation_status} onValueChange={v => setNewParticipant(p => ({ ...p, participation_status: v }))}>
                        <SelectTrigger data-testid="admin-add-participant-status"><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAddParticipant} data-testid="admin-add-participant-btn">Aggiungi</Button>
                  </div>
                  <div className="space-y-3">
                    {participants.map(m => (
                      <div key={m.user_id} className="grid grid-cols-1 lg:grid-cols-[1fr_200px_auto_auto] gap-3 items-center rounded-xl border border-gray-100 p-4">
                        <div><p className="text-sm font-semibold">{m.user_name}</p><p className="text-xs text-gray-400">{m.user_email}</p></div>
                        <Select value={m.participation_status || 'enrolled'} onValueChange={v => handleUpdateStatus(m.user_id, v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                        </Select>
                        <Button variant="outline" onClick={() => openUserAdmin(m.user_id)}>Scheda utente</Button>
                        <Button variant="outline" onClick={() => handleRemoveParticipant(m.user_id)}>Rimuovi</Button>
                      </div>
                    ))}
                    {participants.length === 0 && <p className="text-sm text-gray-400">Seleziona un'edizione per vedere i partecipanti.</p>}
                  </div>
                </CardContent>
              </Card>

              {/* Bulk installments */}
              <Card className="border-gray-100" data-testid="admin-bulk-installments-card">
                <CardContent className="p-5 space-y-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h2 className="text-xl font-medium ariadne-heading">Piani rate cumulativi</h2>
                      <p className="text-sm text-gray-500">Imposta le rate persona per persona.</p>
                    </div>
                    <Button onClick={handleSaveBulkInstallments} data-testid="admin-save-bulk-btn">Salva piani rate</Button>
                  </div>
                  <ScrollArea className="h-[400px] pr-2">
                    <div className="space-y-4">
                      {enrolledParticipants.map(m => {
                        const plan = installmentDrafts[m.user_id] || [{ description: 'Rata 1', amount: '', due_date: '' }];
                        return (
                          <Card key={m.user_id} className="border-gray-100">
                            <CardContent className="p-4 space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div><p className="text-sm font-semibold">{m.user_name}</p><p className="text-xs text-gray-400">{m.user_email}</p></div>
                                <div className="flex gap-2">
                                  {QUICK_TEMPLATES.map(c => (
                                    <Button key={c} variant="outline" size="sm" className="h-7 text-xs" onClick={() => applyQuickTemplate(m.user_id, c)}>
                                      {c} rate
                                    </Button>
                                  ))}
                                </div>
                              </div>
                              <div className="space-y-2">
                                {plan.map((inst, i) => (
                                  <div key={i} className="grid grid-cols-1 lg:grid-cols-[1fr_140px_160px] gap-2">
                                    <Input value={inst.description} onChange={e => updateInstallmentDraft(m.user_id, i, 'description', e.target.value)} placeholder={`Rata ${i + 1}`} />
                                    <Input type="number" min="0" step="0.01" value={inst.amount} onChange={e => updateInstallmentDraft(m.user_id, i, 'amount', e.target.value)} placeholder="Importo" />
                                    <Input type="date" value={inst.due_date} onChange={e => updateInstallmentDraft(m.user_id, i, 'due_date', e.target.value)} />
                                  </div>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <Select value={String(plan.length)} onValueChange={v => setInstallmentCount(m.user_id, Number(v))}>
                                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                                  <SelectContent>{[1, 2, 3, 4, 5].map(c => <SelectItem key={c} value={String(c)}>{c} rate</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                      {enrolledParticipants.length === 0 && <p className="text-sm text-gray-400">Porta almeno un partecipante allo stato "Iscritto" per configurare le rate.</p>}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* PAYMENTS TAB */}
        <TabsContent value="pagamenti">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <Card className="border-gray-100"><CardContent className="p-5"><p className="text-xs text-gray-400 uppercase tracking-wide">Rate da incassare</p><p className="text-2xl font-semibold ariadne-heading" data-testid="admin-payment-count">{paymentOverview.summary.pending_count || 0}</p></CardContent></Card>
            <Card className="border-gray-100"><CardContent className="p-5"><p className="text-xs text-gray-400 uppercase tracking-wide">Persone con pagamenti aperti</p><p className="text-2xl font-semibold ariadne-heading">{paymentOverview.summary.people_with_due || 0}</p></CardContent></Card>
            <Card className="border-gray-100"><CardContent className="p-5"><p className="text-xs text-gray-400 uppercase tracking-wide">Totale da incassare</p><p className="text-2xl font-semibold ariadne-heading">{toCurrency(paymentOverview.summary.total_pending_amount)}</p></CardContent></Card>
            <Card className="border-gray-100"><CardContent className="p-5"><p className="text-xs text-gray-400 uppercase tracking-wide">Scaduto</p><p className="text-2xl font-semibold ariadne-heading text-red-600">{toCurrency(paymentOverview.summary.overdue_amount)}</p></CardContent></Card>
          </div>
          <Card className="border-gray-100" data-testid="admin-payment-overview-card">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h2 className="text-xl font-medium ariadne-heading">Vista aggregata scadenze</h2>
                <div className="flex items-center gap-3">
                  <Select value={paymentCourseFilter} onValueChange={setPaymentCourseFilter}>
                    <SelectTrigger className="w-[200px]" data-testid="admin-payment-course-filter"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti i corsi</SelectItem>
                      {adminCourses.map(c => <SelectItem key={c.course_id} value={c.course_id}>{c.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={exportCSV} data-testid="admin-export-csv-btn">
                    <Download className="w-3.5 h-3.5" /> Esporta CSV
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                {paymentRows.map(r => (
                  <div key={r.installment_id} className="grid grid-cols-1 lg:grid-cols-[1fr_160px_120px_100px_auto] gap-3 rounded-xl border border-gray-100 p-4">
                    <div>
                      <p className="text-sm font-semibold">{r.user_name}</p>
                      <p className="text-xs text-gray-400">{r.course_title || 'Corso'} · {r.edition_name || '—'}</p>
                      <p className="text-xs text-gray-500 mt-1">{r.description}</p>
                    </div>
                    <div className="text-sm text-gray-500 flex items-center gap-1.5"><CalendarDays className="w-4 h-4 text-gray-400" /> {r.due_date || '—'}</div>
                    <p className="text-sm font-semibold">{toCurrency(r.amount)}</p>
                    <Badge variant="outline" className={`text-[10px] ${r.overdue ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{r.overdue ? 'Scaduta' : 'In arrivo'}</Badge>
                    <Button variant="outline" size="sm" onClick={() => openUserAdmin(r.user_id)}>Scheda utente</Button>
                  </div>
                ))}
                {paymentRows.length === 0 && <p className="text-sm text-gray-400">Nessuna rata aperta.</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
