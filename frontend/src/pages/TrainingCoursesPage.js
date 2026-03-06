import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { adminAPI, coursesAPI, schoolAPI } from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import { CalendarDays, CreditCard, Search, Users } from 'lucide-react';

const TIMING_LABELS = {
  upcoming: 'Upcoming',
  ongoing: 'In corso',
  completed: 'Completed',
  always_available: 'Continuo',
};

const STATUS_OPTIONS = [
  { value: 'interested', label: 'Interested' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'enrolled', label: 'Enrolled' },
];

const toCurrency = (value) => `€ ${Number(value || 0).toFixed(2)}`;

function CourseCard({ course }) {
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
            <p className="font-semibold text-gray-500 mb-1">Schedule</p>
            {course.dates?.length > 0 ? course.dates.map((item) => item.label ? `${item.label}: ${item.date}` : item.date).join(' · ') : course.planned_label}
          </div>
          <div data-testid={`training-course-trainers-${course.course_id}`}>
            <p className="font-semibold text-gray-500 mb-1">Faculty</p>
            {course.trainers?.length > 0 ? course.trainers.join(', ') : 'Ariadne Faculty'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InstallmentEditor({ member, plan, onCountChange, onPlanChange }) {
  const installmentCount = plan?.length || 1;
  return (
    <Card className="border-gray-100" data-testid={`installment-editor-${member.user_id}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">{member.user_name}</p>
            <p className="text-xs text-gray-400">{member.user_email}</p>
          </div>
          <div className="w-40">
            <Select value={String(installmentCount)} onValueChange={(value) => onCountChange(member.user_id, Number(value))}>
              <SelectTrigger data-testid={`installment-count-select-${member.user_id}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((count) => <SelectItem key={count} value={String(count)}>{count} installment{count > 1 ? 's' : ''}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-3">
          {plan.map((installment, index) => (
            <div key={`${member.user_id}-${index}`} className="grid grid-cols-1 lg:grid-cols-[1fr_140px_180px] gap-3" data-testid={`installment-row-${member.user_id}-${index}`}>
              <Input value={installment.description} onChange={(event) => onPlanChange(member.user_id, index, 'description', event.target.value)} placeholder={`Installment ${index + 1}`} data-testid={`installment-description-${member.user_id}-${index}`} />
              <Input type="number" min="0" step="0.01" value={installment.amount} onChange={(event) => onPlanChange(member.user_id, index, 'amount', event.target.value)} placeholder="Amount" data-testid={`installment-amount-${member.user_id}-${index}`} />
              <Input type="date" value={installment.due_date} onChange={(event) => onPlanChange(member.user_id, index, 'due_date', event.target.value)} data-testid={`installment-date-${member.user_id}-${index}`} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TrainingCoursesPage() {
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

  const buildDraftsFromMembers = (members) => {
    const nextDrafts = {};
    members.forEach((member) => {
      nextDrafts[member.user_id] = member.installments?.length > 0
        ? member.installments.map((item) => ({ description: item.description || '', amount: item.amount || '', due_date: item.due_date || '' }))
        : [{ description: 'Installment 1', amount: '', due_date: '' }];
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
      coursesAPI.list(),
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
    loadCatalog().catch(() => toast.error('Unable to load training courses'));
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

  const handleCreateEdition = async () => {
    if (!selectedCourseId || !newEdition.name.trim()) return toast.error('Select a course and edition name');
    try {
      await schoolAPI.createCohort({ course_id: selectedCourseId, name: newEdition.name, start_date: newEdition.start_date, end_date: newEdition.end_date, active: true });
      setNewEdition({ name: '', start_date: '', end_date: '' });
      await loadAdminData();
      toast.success('Edition created');
    } catch {
      toast.error('Unable to create edition');
    }
  };

  const handleAddParticipant = async () => {
    if (newParticipant.user_id === 'none' || !selectedEditionId) return toast.error('Select an edition and a person');
    try {
      await schoolAPI.addMember(selectedEditionId, newParticipant.user_id, 'student', newParticipant.participation_status);
      const refreshed = await schoolAPI.listMembers(selectedEditionId);
      setParticipants(refreshed.data);
      setInstallmentDrafts(buildDraftsFromMembers(refreshed.data));
      setNewParticipant({ user_id: 'none', participation_status: 'interested' });
      toast.success('Participant added to edition');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Unable to add participant');
    }
  };

  const handleUpdateStatus = async (userId, participationStatus) => {
    try {
      const response = await schoolAPI.updateMember(selectedEditionId, userId, { participation_status: participationStatus });
      setParticipants((prev) => prev.map((item) => item.user_id === userId ? response.data : item));
      toast.success('Participation status updated');
    } catch {
      toast.error('Unable to update participant');
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
      toast.success('Participant removed');
    } catch {
      toast.error('Unable to remove participant');
    }
  };

  const setInstallmentCount = (userId, count) => {
    setInstallmentDrafts((prev) => {
      const current = prev[userId] || [{ description: 'Installment 1', amount: '', due_date: '' }];
      const next = Array.from({ length: count }, (_, index) => current[index] || { description: `Installment ${index + 1}`, amount: '', due_date: '' });
      return { ...prev, [userId]: next };
    });
  };

  const updateInstallmentDraft = (userId, index, field, value) => {
    setInstallmentDrafts((prev) => ({
      ...prev,
      [userId]: (prev[userId] || []).map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
    }));
  };

  const handleSaveBulkInstallments = async () => {
    const plans = enrolledParticipants.map((member) => ({
      user_id: member.user_id,
      installments: (installmentDrafts[member.user_id] || []).filter((item) => item.due_date || item.amount),
    })).filter((plan) => plan.installments.length > 0);
    if (!selectedCourseId || !selectedEditionId || plans.length === 0) return toast.error('Prepare at least one installment plan');
    try {
      await schoolAPI.adminBulkCreateInstallments({ course_id: selectedCourseId, cohort_id: selectedEditionId, plans, replace_existing: true });
      const [membersResponse, paymentsResponse] = await Promise.all([schoolAPI.listMembers(selectedEditionId), schoolAPI.adminPaymentOverview()]);
      setParticipants(membersResponse.data);
      setInstallmentDrafts(buildDraftsFromMembers(membersResponse.data));
      setPaymentOverview(paymentsResponse.data);
      toast.success('Bulk installment plans saved');
    } catch {
      toast.error('Unable to save installment plans');
    }
  };

  const paymentRows = useMemo(() => paymentOverview.rows?.filter((row) => {
    if (paymentCourseFilter !== 'all' && row.course_id !== paymentCourseFilter) return false;
    return true;
  }) || [], [paymentOverview.rows, paymentCourseFilter]);

  return (
    <div data-testid="training-courses-page">
      <div className="mb-10">
        <h1 className="text-4xl font-semibold ariadne-heading mb-2">Training Courses</h1>
        <p className="text-base text-gray-500" data-testid="training-courses-description">
          Explore the Ariadne training offer. Admin users also manage editions, participation statuses, and payment plans from here.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_220px_220px] gap-4 mb-8">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by course, faculty, topic" data-testid="training-course-search-input" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger data-testid="training-course-category-filter"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            {categories.map((category) => <SelectItem key={category} value={category}>{category === 'all' ? 'All categories' : category}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={timingFilter} onValueChange={setTimingFilter}>
          <SelectTrigger data-testid="training-course-timing-filter"><SelectValue placeholder="Timing" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All timing</SelectItem>
            {Object.entries(TIMING_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {!isPrivileged ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCatalog.map((course) => <CourseCard key={`${course.source}-${course.course_id}`} course={course} />)}
        </div>
      ) : (
        <Tabs defaultValue="catalog" className="w-full">
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="catalog" data-testid="training-tab-catalog">Catalog</TabsTrigger>
            <TabsTrigger value="operations" data-testid="training-tab-operations">Course Operations</TabsTrigger>
            <TabsTrigger value="payments" data-testid="training-tab-payments">Payment Schedule</TabsTrigger>
          </TabsList>

          <TabsContent value="catalog">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredCatalog.map((course) => <CourseCard key={`${course.source}-${course.course_id}`} course={course} />)}
            </div>
          </TabsContent>

          <TabsContent value="operations">
            <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
              <Card className="border-gray-100" data-testid="training-operations-sidebar">
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-2">
                    <Label>Course</Label>
                    <Select value={selectedCourseId || 'none'} onValueChange={(value) => setSelectedCourseId(value === 'none' ? '' : value)}>
                      <SelectTrigger data-testid="training-admin-course-select"><SelectValue placeholder="Select course" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select course</SelectItem>
                        {adminCourses.map((course) => <SelectItem key={course.course_id} value={course.course_id}>{course.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Edition</Label>
                    <Select value={selectedEditionId || 'none'} onValueChange={(value) => setSelectedEditionId(value === 'none' ? '' : value)}>
                      <SelectTrigger data-testid="training-admin-edition-select"><SelectValue placeholder="Select edition" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select edition</SelectItem>
                        {courseCohorts.map((cohort) => <SelectItem key={cohort.cohort_id} value={cohort.cohort_id}>{cohort.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="rounded-xl border border-gray-100 p-4 space-y-3">
                    <p className="text-sm font-semibold text-gray-900">Create edition</p>
                    <Input value={newEdition.name} onChange={(event) => setNewEdition((prev) => ({ ...prev, name: event.target.value }))} placeholder="Edition name" data-testid="training-create-edition-name" />
                    <Input type="date" value={newEdition.start_date} onChange={(event) => setNewEdition((prev) => ({ ...prev, start_date: event.target.value }))} data-testid="training-create-edition-start" />
                    <Input type="date" value={newEdition.end_date} onChange={(event) => setNewEdition((prev) => ({ ...prev, end_date: event.target.value }))} data-testid="training-create-edition-end" />
                    <Button className="w-full" onClick={handleCreateEdition} data-testid="training-create-edition-button">Create edition</Button>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="border-gray-100" data-testid="training-participants-card">
                  <CardContent className="p-5 space-y-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <h2 className="text-xl font-medium ariadne-heading">Participation by edition</h2>
                        <p className="text-sm text-gray-500">Track interested, confirmed, and enrolled people for the selected edition.</p>
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
                        <Label>Add person to edition</Label>
                        <Select value={newParticipant.user_id} onValueChange={(value) => setNewParticipant((prev) => ({ ...prev, user_id: value }))}>
                          <SelectTrigger data-testid="training-add-participant-user"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Select person</SelectItem>
                            {availableUsers.map((person) => <SelectItem key={person.user_id} value={person.user_id}>{person.name} · {person.email}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={newParticipant.participation_status} onValueChange={(value) => setNewParticipant((prev) => ({ ...prev, participation_status: value }))}>
                          <SelectTrigger data-testid="training-add-participant-status"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((status) => <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleAddParticipant} data-testid="training-add-participant-button">Add participant</Button>
                    </div>
                    <div className="space-y-3">
                      {participants.map((member) => (
                        <div key={member.user_id} className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_180px_auto_auto] gap-3 items-center rounded-xl border border-gray-100 p-4" data-testid={`training-participant-row-${member.user_id}`}>
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
                          <Badge variant="outline" className="text-[10px] justify-center">{member.installments?.length || 0} installments</Badge>
                          <Button variant="outline" onClick={() => handleRemoveParticipant(member.user_id)} data-testid={`training-remove-participant-${member.user_id}`}>Remove</Button>
                        </div>
                      ))}
                      {participants.length === 0 && <p className="text-sm text-gray-400">Select an edition to manage participants.</p>}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-gray-100" data-testid="training-bulk-installments-card">
                  <CardContent className="p-5 space-y-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <h2 className="text-xl font-medium ariadne-heading">Bulk installment setup</h2>
                        <p className="text-sm text-gray-500">Set installment plans participant by participant without opening each profile one by one.</p>
                      </div>
                      <Button onClick={handleSaveBulkInstallments} data-testid="training-save-bulk-installments-button">Save bulk plans</Button>
                    </div>
                    <ScrollArea className="h-[420px] pr-2">
                      <div className="space-y-4">
                        {enrolledParticipants.map((member) => (
                          <InstallmentEditor
                            key={member.user_id}
                            member={member}
                            plan={installmentDrafts[member.user_id] || [{ description: 'Installment 1', amount: '', due_date: '' }]}
                            onCountChange={setInstallmentCount}
                            onPlanChange={updateInstallmentDraft}
                          />
                        ))}
                        {enrolledParticipants.length === 0 && <p className="text-sm text-gray-400">Enroll participants in the selected edition to configure payment plans.</p>}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="payments">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              <Card className="border-gray-100"><CardContent className="p-5"><p className="text-xs text-gray-400 uppercase tracking-wide">Outstanding payments</p><p className="text-2xl font-semibold ariadne-heading" data-testid="payment-summary-count">{paymentOverview.summary.pending_count || 0}</p></CardContent></Card>
              <Card className="border-gray-100"><CardContent className="p-5"><p className="text-xs text-gray-400 uppercase tracking-wide">People still due</p><p className="text-2xl font-semibold ariadne-heading">{paymentOverview.summary.people_with_due || 0}</p></CardContent></Card>
              <Card className="border-gray-100"><CardContent className="p-5"><p className="text-xs text-gray-400 uppercase tracking-wide">Total receivables</p><p className="text-2xl font-semibold ariadne-heading">{toCurrency(paymentOverview.summary.total_pending_amount)}</p></CardContent></Card>
              <Card className="border-gray-100"><CardContent className="p-5"><p className="text-xs text-gray-400 uppercase tracking-wide">Overdue</p><p className="text-2xl font-semibold ariadne-heading">{toCurrency(paymentOverview.summary.overdue_amount)}</p></CardContent></Card>
            </div>

            <Card className="border-gray-100" data-testid="payment-overview-card">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-xl font-medium ariadne-heading">Aggregated payment schedule</h2>
                    <p className="text-sm text-gray-500">Monitor upcoming deadlines, outstanding installments, and receivables across courses and editions.</p>
                  </div>
                  <div className="w-[240px] max-w-full">
                    <Select value={paymentCourseFilter} onValueChange={setPaymentCourseFilter}>
                      <SelectTrigger data-testid="payment-course-filter-select"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All courses</SelectItem>
                        {adminCourses.map((course) => <SelectItem key={course.course_id} value={course.course_id}>{course.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-3">
                  {paymentRows.map((row) => (
                    <div key={row.installment_id} className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_180px_140px_120px] gap-3 rounded-xl border border-gray-100 p-4" data-testid={`payment-overview-row-${row.installment_id}`}>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{row.user_name}</p>
                        <p className="text-xs text-gray-400">{row.course_title || 'Training course'} · {row.edition_name || 'Edition not set'}</p>
                        <p className="text-xs text-gray-500 mt-1">{row.description}</p>
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-gray-400" /> {row.due_date || 'No due date'}</div>
                      <div className="text-sm font-semibold text-gray-900 flex items-center gap-2"><CreditCard className="w-4 h-4 text-gray-400" /> {toCurrency(row.amount)}</div>
                      <div className="flex items-center justify-start lg:justify-end gap-2">
                        <Badge variant="outline" className={`text-[10px] ${row.overdue ? 'badge-red' : 'badge-orange'}`}>{row.overdue ? 'Overdue' : 'Upcoming'}</Badge>
                      </div>
                    </div>
                  ))}
                  {paymentRows.length === 0 && <p className="text-sm text-gray-400">No outstanding payments for the current selection.</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {filteredCatalog.length === 0 && (
        <div className="text-center py-14 text-gray-400" data-testid="training-courses-empty-state">
          <Users className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-sm">No training courses match the current filters.</p>
        </div>
      )}
    </div>
  );
}