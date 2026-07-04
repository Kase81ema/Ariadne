import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
import { CalendarDays, Copy, CreditCard, Search, Sparkles, Users } from 'lucide-react';

const TIMING_LABELS = {
  upcoming: 'In programma',
  ongoing: 'In corso',
  completed: 'Concluso',
  always_available: 'Continuativo',
};

const STATUS_OPTIONS = [
  { value: 'interested', label: 'Interessato' },
  { value: 'confirmed', label: 'Confermato' },
  { value: 'enrolled', label: 'Iscritto' },
];

const QUICK_TEMPLATES = [2, 3, 5];

const toCurrency = (value) => `€ ${Number(value || 0).toFixed(2)}`;

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

function CourseCard({ course, onOpen }) {
  return (
    <Card className="border-gray-100 hover:border-gray-200 transition-colors h-full" data-testid={`training-course-card-${course.course_id}`}>
      <CardContent className="p-6 h-full flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge variant="outline" className="text-[10px] badge-purple" data-testid={`training-course-category-${course.course_id}`}>{course.category}</Badge>
              <Badge variant="outline" className="text-[10px]" data-testid={`training-course-timing-${course.course_id}`}>{TIMING_LABELS[course.timing_status] || course.planned_label}</Badge>
            </div>
            <h3 className="text-lg font-semibold text-gray-900" data-testid={`training-course-title-${course.course_id}`}>{course.title}</h3>
          </div>
          {course.accreditation && <Badge variant="outline" className="text-[10px] badge-green">{course.accreditation}</Badge>}
        </div>
        <p className="text-sm text-gray-500 flex-1" data-testid={`training-course-description-${course.course_id}`}>{course.description}</p>
        {course.key_points?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {course.key_points.slice(0, 4).map((point) => <Badge key={point} variant="outline" className="text-[10px]">{point}</Badge>)}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-400">
          <div data-testid={`training-course-dates-${course.course_id}`}>
            <p className="font-semibold text-gray-500 mb-1">Calendario</p>
            {course.dates?.length > 0 ? course.dates.map((item) => item.label ? `${item.label}: ${item.date}` : item.date).join(' · ') : course.planned_label}
          </div>
          <div data-testid={`training-course-trainers-${course.course_id}`}>
            <p className="font-semibold text-gray-500 mb-1">Docenti</p>
            {course.trainers?.length > 0 ? course.trainers.join(', ') : 'Team Ariadne'}
          </div>
        </div>
        <Button variant="outline" className="mt-1 w-full" onClick={() => onOpen(course.course_id)} data-testid={`training-course-open-${course.course_id}`}>
          Apri scheda corso
        </Button>
      </CardContent>
    </Card>
  );
}

function InstallmentEditor({
  member,
  plan,
  copiedPlanSource,
  onCountChange,
  onPlanChange,
  onQuickTemplate,
  onCopyPlan,
  onApplyCopiedPlan,
  onOpenUser,
}) {
  const installmentCount = plan?.length || 1;

  return (
    <Card className="border-gray-100" data-testid={`installment-editor-${member.user_id}`}>
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">{member.user_name}</p>
            <p className="text-xs text-gray-400">{member.user_email}</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenUser(member.user_id)} data-testid={`open-user-from-installments-${member.user_id}`}>
              Apri scheda utente
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => onCopyPlan(member.user_id)} data-testid={`copy-plan-${member.user_id}`}>
              <Copy className="w-3.5 h-3.5" /> Usa come modello
            </Button>
            {copiedPlanSource && copiedPlanSource !== member.user_id && (
              <Button size="sm" className="h-8 text-xs" onClick={() => onApplyCopiedPlan(member.user_id)} data-testid={`apply-plan-${member.user_id}`}>
                Applica modello
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="w-40">
            <Select value={String(installmentCount)} onValueChange={(value) => onCountChange(member.user_id, Number(value))}>
              <SelectTrigger data-testid={`installment-count-select-${member.user_id}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((count) => <SelectItem key={count} value={String(count)}>{count} rate</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_TEMPLATES.map((count) => (
              <Button key={count} variant="outline" size="sm" className="h-8 text-xs" onClick={() => onQuickTemplate(member.user_id, count)} data-testid={`quick-template-${count}-${member.user_id}`}>
                Template {count} rate
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {plan.map((installment, index) => (
            <div key={`${member.user_id}-${index}`} className="grid grid-cols-1 lg:grid-cols-[1fr_160px_190px] gap-3" data-testid={`installment-row-${member.user_id}-${index}`}>
              <Input value={installment.description} onChange={(event) => onPlanChange(member.user_id, index, 'description', event.target.value)} placeholder={`Rata ${index + 1}`} data-testid={`installment-description-${member.user_id}-${index}`} />
              <Input type="number" min="0" step="0.01" value={installment.amount} onChange={(event) => onPlanChange(member.user_id, index, 'amount', event.target.value)} placeholder="Importo" data-testid={`installment-amount-${member.user_id}-${index}`} />
              <Input type="date" value={installment.due_date} onChange={(event) => onPlanChange(member.user_id, index, 'due_date', event.target.value)} data-testid={`installment-date-${member.user_id}-${index}`} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TrainingCoursesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isPrivileged = user?.role === 'admin' || user?.role === 'editor';
  const [catalog, setCatalog] = useState([]);
  const [adminCourses, setAdminCourses] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [users, setUsers] = useState([]);
  const [paymentOverview, setPaymentOverview] = useState({ summary: {}, rows: [] });
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [timingFilter, setTimingFilter] = useState('all');
  const [paymentCourseFilter, setPaymentCourseFilter] = useState('all');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedEditionId, setSelectedEditionId] = useState('');
  const [newEdition, setNewEdition] = useState({ name: '', start_date: '', end_date: '' });
  const [newParticipant, setNewParticipant] = useState({ user_id: 'none', participation_status: 'interested' });
  const [installmentDrafts, setInstallmentDrafts] = useState({});
  const [copiedPlan, setCopiedPlan] = useState(null);
  const [copiedPlanSource, setCopiedPlanSource] = useState('');

  const buildDraftsFromMembers = (members) => {
    const nextDrafts = {};
    members.forEach((member) => {
      nextDrafts[member.user_id] = member.installments?.length > 0
        ? member.installments.map((item) => ({ description: item.description || '', amount: item.amount || '', due_date: item.due_date || '' }))
        : [{ description: 'Rata 1', amount: '', due_date: '' }];
    });
    return nextDrafts;
  };

  const loadCatalog = async () => {
    const response = await schoolAPI.listTrainingCourses();
    setCatalog(response.data);
  };

  const loadAdminData = async () => {
    if (!isPrivileged) return;
    const [coursesResponse, cohortsResponse, usersResponse, paymentResponse] = await Promise.all([
      schoolAPI.listTrainingCourses(),
      schoolAPI.listCohorts(),
      adminAPI.listUsers(),
      schoolAPI.adminPaymentOverview(),
    ]);
    setAdminCourses(coursesResponse.data);
    setCohorts(cohortsResponse.data);
    setUsers(usersResponse.data.filter((item) => item.role !== 'admin'));
    setPaymentOverview(paymentResponse.data);
    if (!selectedCourseId && coursesResponse.data.length > 0) {
      setSelectedCourseId(coursesResponse.data[0].course_id);
    }
  };

  useEffect(() => {
    loadCatalog().catch(() => toast.error('Impossibile caricare i corsi di formazione'));
    loadAdminData().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPrivileged]);

  const filteredCatalog = useMemo(() => {
    return catalog.filter((item) => {
      const text = `${item.title} ${item.description} ${item.category} ${(item.tags || []).join(' ')}`.toLowerCase();
      const matchesQuery = !query.trim() || text.includes(query.trim().toLowerCase());
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesTiming = timingFilter === 'all' || item.timing_status === timingFilter;
      return matchesQuery && matchesCategory && matchesTiming;
    });
  }, [catalog, query, categoryFilter, timingFilter]);

  const categories = useMemo(() => ['all', ...Array.from(new Set(catalog.map((item) => item.category).filter(Boolean)))], [catalog]);
  const courseCohorts = useMemo(() => cohorts.filter((cohort) => cohort.course_id === selectedCourseId), [cohorts, selectedCourseId]);
  const selectedEdition = courseCohorts.find((cohort) => cohort.cohort_id === selectedEditionId);
  const availableUsers = useMemo(() => users.filter((item) => !participants.some((member) => member.user_id === item.user_id)), [users, participants]);
  const enrolledParticipants = useMemo(() => participants.filter((member) => member.participation_status === 'enrolled'), [participants]);
  const selectedCourse = useMemo(() => adminCourses.find((course) => course.course_id === selectedCourseId), [adminCourses, selectedCourseId]);

  useEffect(() => {
    if (!isPrivileged) return;
    if (!courseCohorts.some((cohort) => cohort.cohort_id === selectedEditionId)) {
      setSelectedEditionId(courseCohorts[0]?.cohort_id || '');
    }
  }, [courseCohorts, selectedEditionId, isPrivileged]);

  useEffect(() => {
    if (!isPrivileged || !selectedEditionId) {
      setParticipants([]);
      return;
    }
    schoolAPI.listMembers(selectedEditionId).then((response) => {
      setParticipants(response.data);
      setInstallmentDrafts(buildDraftsFromMembers(response.data));
    }).catch(() => setParticipants([]));
  }, [selectedEditionId, isPrivileged]);

  const openCourseDetail = (courseId) => navigate(`/course/${courseId}`);
  const openUserAdmin = (userId) => navigate(`/users-admin?userId=${userId}`);

  const handleCreateEdition = async () => {
    if (!selectedCourseId || !newEdition.name.trim()) return toast.error('Seleziona un corso e inserisci il nome dell’edizione');
    try {
      await schoolAPI.createCohort({ course_id: selectedCourseId, name: newEdition.name, start_date: newEdition.start_date, end_date: newEdition.end_date, active: true });
      setNewEdition({ name: '', start_date: '', end_date: '' });
      await loadAdminData();
      toast.success('Edizione creata');
    } catch {
      toast.error('Impossibile creare l’edizione');
    }
  };

  const handleAddParticipant = async () => {
    if (newParticipant.user_id === 'none' || !selectedEditionId) return toast.error('Seleziona edizione e partecipante');
    try {
      await schoolAPI.addMember(selectedEditionId, newParticipant.user_id, 'student', newParticipant.participation_status);
      const refreshed = await schoolAPI.listMembers(selectedEditionId);
      setParticipants(refreshed.data);
      setInstallmentDrafts(buildDraftsFromMembers(refreshed.data));
      setNewParticipant({ user_id: 'none', participation_status: 'interested' });
      toast.success('Partecipante aggiunto all’edizione');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Impossibile aggiungere il partecipante');
    }
  };

  const handleUpdateStatus = async (userId, participationStatus) => {
    try {
      const response = await schoolAPI.updateMember(selectedEditionId, userId, { participation_status: participationStatus });
      setParticipants((prev) => prev.map((item) => item.user_id === userId ? response.data : item));
      if (participationStatus === 'enrolled') {
        setInstallmentDrafts((prev) => ({
          ...prev,
          [userId]: prev[userId] || [{ description: 'Rata 1', amount: '', due_date: '' }],
        }));
      }
      toast.success('Stato del partecipante aggiornato');
    } catch {
      toast.error('Impossibile aggiornare lo stato');
    }
  };

  const handleRemoveParticipant = async (userId) => {
    try {
      await schoolAPI.removeMember(selectedEditionId, userId);
      setParticipants((prev) => prev.filter((item) => item.user_id !== userId));
      setInstallmentDrafts((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      toast.success('Partecipante rimosso');
    } catch {
      toast.error('Impossibile rimuovere il partecipante');
    }
  };

  const setInstallmentCount = (userId, count) => {
    setInstallmentDrafts((prev) => {
      const current = prev[userId] || [{ description: 'Rata 1', amount: '', due_date: '' }];
      const next = Array.from({ length: count }, (_, index) => current[index] || { description: `Rata ${index + 1}`, amount: '', due_date: '' });
      return { ...prev, [userId]: next };
    });
  };

  const updateInstallmentDraft = (userId, index, field, value) => {
    setInstallmentDrafts((prev) => ({
      ...prev,
      [userId]: (prev[userId] || []).map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
    }));
  };

  const applyQuickTemplate = (userId, count) => {
    const baseDate = selectedEdition?.start_date || new Date().toISOString().split('T')[0];
    const total = parsePrice(selectedCourse?.price) || Number((installmentDrafts[userId] || []).reduce((sum, item) => sum + Number(item.amount || 0), 0));
    const amountPerInstallment = total ? Number((total / count).toFixed(2)) : '';
    const next = Array.from({ length: count }, (_, index) => ({
      description: `Rata ${index + 1}`,
      amount: amountPerInstallment,
      due_date: addMonths(baseDate, index),
    }));
    setInstallmentDrafts((prev) => ({ ...prev, [userId]: next }));
    toast.success(`Template rapido ${count} rate applicato`);
  };

  const handleCopyPlan = (userId) => {
    const currentPlan = installmentDrafts[userId] || [];
    setCopiedPlan(currentPlan.map((item) => ({ ...item })));
    setCopiedPlanSource(userId);
    toast.success('Schema rate copiato come modello');
  };

  const handleApplyCopiedPlan = (userId) => {
    if (!copiedPlan) return;
    setInstallmentDrafts((prev) => ({
      ...prev,
      [userId]: copiedPlan.map((item, index) => ({
        description: item.description || `Rata ${index + 1}`,
        amount: item.amount || '',
        due_date: item.due_date || '',
      })),
    }));
    toast.success('Schema rate duplicato');
  };

  const handleApplyCopiedPlanToAll = () => {
    if (!copiedPlan) return;
    setInstallmentDrafts((prev) => {
      const next = { ...prev };
      enrolledParticipants.forEach((member) => {
        if (member.user_id !== copiedPlanSource) {
          next[member.user_id] = copiedPlan.map((item, index) => ({
            description: item.description || `Rata ${index + 1}`,
            amount: item.amount || '',
            due_date: item.due_date || '',
          }));
        }
      });
      return next;
    });
    toast.success('Schema duplicato su tutti gli iscritti');
  };

  const handleSaveBulkInstallments = async () => {
    const plans = enrolledParticipants.map((member) => ({
      user_id: member.user_id,
      installments: (installmentDrafts[member.user_id] || []).filter((item) => item.due_date || item.amount),
    })).filter((plan) => plan.installments.length > 0);
    if (!selectedCourseId || !selectedEditionId || plans.length === 0) return toast.error('Prepara almeno un piano rate');
    try {
      await schoolAPI.adminBulkCreateInstallments({ course_id: selectedCourseId, cohort_id: selectedEditionId, plans, replace_existing: true });
      const [membersResponse, paymentsResponse] = await Promise.all([schoolAPI.listMembers(selectedEditionId), schoolAPI.adminPaymentOverview()]);
      setParticipants(membersResponse.data);
      setInstallmentDrafts(buildDraftsFromMembers(membersResponse.data));
      setPaymentOverview(paymentsResponse.data);
      toast.success('Piani rate salvati');
    } catch {
      toast.error('Impossibile salvare i piani rate');
    }
  };

  const paymentRows = useMemo(() => paymentOverview.rows?.filter((row) => {
    if (paymentCourseFilter !== 'all' && row.course_id !== paymentCourseFilter) return false;
    return true;
  }) || [], [paymentOverview.rows, paymentCourseFilter]);

  return (
    <div data-testid="training-courses-page">
      <div className="mb-10">
        <h1 className="text-4xl font-semibold ariadne-heading mb-2">Percorsi formativi</h1>
        <p className="text-base text-gray-500" data-testid="training-courses-description">
          Esplora i percorsi formativi Ariadne. Ogni percorso è un'esperienza unica di crescita personale e professionale.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_220px_220px] gap-4 mb-8">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca per corso, tema o docente" data-testid="training-course-search-input" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger data-testid="training-course-category-filter"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            {categories.map((category) => <SelectItem key={category} value={category}>{category === 'all' ? 'Tutte le categorie' : category}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={timingFilter} onValueChange={setTimingFilter}>
          <SelectTrigger data-testid="training-course-timing-filter"><SelectValue placeholder="Periodo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i periodi</SelectItem>
            {Object.entries(TIMING_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {!isPrivileged ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCatalog.map((course) => <CourseCard key={`${course.source}-${course.course_id}`} course={course} onOpen={openCourseDetail} />)}
        </div>
      ) : (
        <Tabs defaultValue="catalogo" className="w-full">
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="catalogo" data-testid="training-tab-catalog">Catalogo</TabsTrigger>
            <TabsTrigger value="operativita" data-testid="training-tab-operations">Operatività corsi</TabsTrigger>
            <TabsTrigger value="pagamenti" data-testid="training-tab-payments">Scadenze pagamenti</TabsTrigger>
          </TabsList>

          <TabsContent value="catalogo">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredCatalog.map((course) => <CourseCard key={`${course.source}-${course.course_id}`} course={course} onOpen={openCourseDetail} />)}
            </div>
          </TabsContent>

          <TabsContent value="operativita">
            <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6">
              <Card className="border-gray-100" data-testid="training-operations-sidebar">
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-2">
                    <Label>Corso</Label>
                    <Select value={selectedCourseId || 'none'} onValueChange={(value) => setSelectedCourseId(value === 'none' ? '' : value)}>
                      <SelectTrigger data-testid="training-admin-course-select"><SelectValue placeholder="Seleziona un corso" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Seleziona un corso</SelectItem>
                        {adminCourses.map((course) => <SelectItem key={course.course_id} value={course.course_id}>{course.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Edizione</Label>
                    <Select value={selectedEditionId || 'none'} onValueChange={(value) => setSelectedEditionId(value === 'none' ? '' : value)}>
                      <SelectTrigger data-testid="training-admin-edition-select"><SelectValue placeholder="Seleziona un’edizione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Seleziona un’edizione</SelectItem>
                        {courseCohorts.map((cohort) => <SelectItem key={cohort.cohort_id} value={cohort.cohort_id}>{cohort.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedCourseId && (
                    <Button variant="outline" className="w-full" onClick={() => openCourseDetail(selectedCourseId)} data-testid="training-open-course-detail-button">
                      Apri scheda corso completa
                    </Button>
                  )}
                  <div className="rounded-xl border border-gray-100 p-4 space-y-3">
                    <p className="text-sm font-semibold text-gray-900">Crea nuova edizione</p>
                    <Input value={newEdition.name} onChange={(event) => setNewEdition((prev) => ({ ...prev, name: event.target.value }))} placeholder="Nome edizione" data-testid="training-create-edition-name" />
                    <Input type="date" value={newEdition.start_date} onChange={(event) => setNewEdition((prev) => ({ ...prev, start_date: event.target.value }))} data-testid="training-create-edition-start" />
                    <Input type="date" value={newEdition.end_date} onChange={(event) => setNewEdition((prev) => ({ ...prev, end_date: event.target.value }))} data-testid="training-create-edition-end" />
                    <Button className="w-full" onClick={handleCreateEdition} data-testid="training-create-edition-button">Crea edizione</Button>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="border-gray-100" data-testid="training-participants-card">
                  <CardContent className="p-5 space-y-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <h2 className="text-xl font-medium ariadne-heading">Partecipanti per edizione</h2>
                        <p className="text-sm text-gray-500">Gestisci in un solo punto interessati, confermati e iscritti dell’edizione selezionata.</p>
                      </div>
                      {selectedEdition && <Badge variant="outline" className="text-[10px] badge-blue">{selectedEdition.name}</Badge>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {STATUS_OPTIONS.map((status) => (
                        <Card key={status.value} className="border-gray-100">
                          <CardContent className="p-4">
                            <p className="text-xs text-gray-400 uppercase tracking-wide">{status.label}</p>
                            <p className="text-2xl font-semibold ariadne-heading" data-testid={`participants-count-${status.value}`}>{participants.filter((member) => member.participation_status === status.value).length}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px_auto] gap-3 items-end">
                      <div className="space-y-2">
                        <Label>Aggiungi persona all’edizione</Label>
                        <Select value={newParticipant.user_id} onValueChange={(value) => setNewParticipant((prev) => ({ ...prev, user_id: value }))}>
                          <SelectTrigger data-testid="training-add-participant-user"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Seleziona persona</SelectItem>
                            {availableUsers.map((person) => <SelectItem key={person.user_id} value={person.user_id}>{person.name} · {person.email}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Stato iniziale</Label>
                        <Select value={newParticipant.participation_status} onValueChange={(value) => setNewParticipant((prev) => ({ ...prev, participation_status: value }))}>
                          <SelectTrigger data-testid="training-add-participant-status"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((status) => <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleAddParticipant} data-testid="training-add-participant-button">Aggiungi</Button>
                    </div>
                    <div className="space-y-3">
                      {participants.map((member) => (
                        <div key={member.user_id} className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_200px_auto_auto] gap-3 items-center rounded-xl border border-gray-100 p-4" data-testid={`training-participant-row-${member.user_id}`}>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{member.user_name}</p>
                            <p className="text-xs text-gray-400">{member.user_email}</p>
                          </div>
                          <Select value={member.participation_status || 'enrolled'} onValueChange={(value) => handleUpdateStatus(member.user_id, value)}>
                            <SelectTrigger data-testid={`training-participant-status-${member.user_id}`}><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((status) => <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Button variant="outline" onClick={() => openUserAdmin(member.user_id)} data-testid={`training-open-user-${member.user_id}`}>Scheda utente</Button>
                          <Button variant="outline" onClick={() => handleRemoveParticipant(member.user_id)} data-testid={`training-remove-participant-${member.user_id}`}>Rimuovi</Button>
                        </div>
                      ))}
                      {participants.length === 0 && <p className="text-sm text-gray-400">Seleziona un’edizione per vedere e gestire i partecipanti.</p>}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-gray-100" data-testid="training-bulk-installments-card">
                  <CardContent className="p-5 space-y-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <h2 className="text-xl font-medium ariadne-heading">Piani rate cumulativi</h2>
                        <p className="text-sm text-gray-500">Imposta le rate persona per persona nello stesso flusso, con template rapidi e duplicazione del modello.</p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {copiedPlan && (
                          <Button variant="outline" className="gap-2" onClick={handleApplyCopiedPlanToAll} data-testid="apply-plan-all-button">
                            <Sparkles className="w-4 h-4" /> Duplica modello su tutti
                          </Button>
                        )}
                        <Button onClick={handleSaveBulkInstallments} data-testid="training-save-bulk-installments-button">Salva piani rate</Button>
                      </div>
                    </div>
                    <ScrollArea className="h-[460px] pr-2">
                      <div className="space-y-4">
                        {enrolledParticipants.map((member) => (
                          <InstallmentEditor
                            key={member.user_id}
                            member={member}
                            plan={installmentDrafts[member.user_id] || [{ description: 'Rata 1', amount: '', due_date: '' }]}
                            copiedPlanSource={copiedPlanSource}
                            onCountChange={setInstallmentCount}
                            onPlanChange={updateInstallmentDraft}
                            onQuickTemplate={applyQuickTemplate}
                            onCopyPlan={handleCopyPlan}
                            onApplyCopiedPlan={handleApplyCopiedPlan}
                            onOpenUser={openUserAdmin}
                          />
                        ))}
                        {enrolledParticipants.length === 0 && <p className="text-sm text-gray-400">Porta almeno un partecipante allo stato “Iscritto” per configurare le rate.</p>}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pagamenti">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              <Card className="border-gray-100"><CardContent className="p-5"><p className="text-xs text-gray-400 uppercase tracking-wide">Rate da incassare</p><p className="text-2xl font-semibold ariadne-heading" data-testid="payment-summary-count">{paymentOverview.summary.pending_count || 0}</p></CardContent></Card>
              <Card className="border-gray-100"><CardContent className="p-5"><p className="text-xs text-gray-400 uppercase tracking-wide">Persone con pagamenti aperti</p><p className="text-2xl font-semibold ariadne-heading">{paymentOverview.summary.people_with_due || 0}</p></CardContent></Card>
              <Card className="border-gray-100"><CardContent className="p-5"><p className="text-xs text-gray-400 uppercase tracking-wide">Totale da incassare</p><p className="text-2xl font-semibold ariadne-heading">{toCurrency(paymentOverview.summary.total_pending_amount)}</p></CardContent></Card>
              <Card className="border-gray-100"><CardContent className="p-5"><p className="text-xs text-gray-400 uppercase tracking-wide">Scaduto</p><p className="text-2xl font-semibold ariadne-heading text-red-600">{toCurrency(paymentOverview.summary.overdue_amount)}</p></CardContent></Card>
            </div>

            <Card className="border-gray-100" data-testid="payment-overview-card">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-xl font-medium ariadne-heading">Vista aggregata scadenze</h2>
                    <p className="text-sm text-gray-500">Controlla in un’unica schermata rate in scadenza, insoluti e persone che devono ancora completare i pagamenti.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-[220px] max-w-full">
                      <Select value={paymentCourseFilter} onValueChange={setPaymentCourseFilter}>
                        <SelectTrigger data-testid="payment-course-filter-select"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tutti i corsi</SelectItem>
                          {adminCourses.map((course) => <SelectItem key={course.course_id} value={course.course_id}>{course.title}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => {
                        if (paymentRows.length === 0) return;
                        const header = 'Nome,Corso,Edizione,Descrizione,Scadenza,Importo,Stato';
                        const rows = paymentRows.map(r => [r.user_name, r.course_title || '', r.edition_name || '', r.description, r.due_date || '', r.amount || 0, r.overdue ? 'Scaduta' : 'In arrivo'].map(v => `"${v}"`).join(','));
                        const csv = [header, ...rows].join('\n');
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `scadenze_pagamenti_${new Date().toISOString().split('T')[0]}.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      data-testid="payment-export-csv-btn"
                    >
                      <CreditCard className="w-3.5 h-3.5" /> Esporta CSV
                    </Button>
                  </div>
                </div>
                <div className="space-y-3">
                  {paymentRows.map((row) => (
                    <div key={row.installment_id} className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_190px_150px_140px_auto] gap-3 rounded-xl border border-gray-100 p-4" data-testid={`payment-overview-row-${row.installment_id}`}>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{row.user_name}</p>
                        <p className="text-xs text-gray-400">{row.course_title || 'Corso di formazione'} · {row.edition_name || 'Edizione non assegnata'}</p>
                        <p className="text-xs text-gray-500 mt-1">{row.description}</p>
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-gray-400" /> {row.due_date || 'Senza scadenza'}</div>
                      <div className="text-sm font-semibold text-gray-900 flex items-center gap-2"><CreditCard className="w-4 h-4 text-gray-400" /> {toCurrency(row.amount)}</div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] ${row.overdue ? 'badge-red' : 'badge-orange'}`}>{row.overdue ? 'Scaduta' : 'In arrivo'}</Badge>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => openUserAdmin(row.user_id)} data-testid={`payment-open-user-${row.installment_id}`}>
                        Scheda utente
                      </Button>
                    </div>
                  ))}
                  {paymentRows.length === 0 && <p className="text-sm text-gray-400">Nessuna rata aperta per il filtro selezionato.</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {filteredCatalog.length === 0 && (
        <div className="text-center py-14 text-gray-400" data-testid="training-courses-empty-state">
          <Users className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-sm">Nessun corso corrisponde ai filtri selezionati.</p>
        </div>
      )}
    </div>
  );
}