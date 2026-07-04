import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { schoolAPI } from '../lib/api';
import { toast } from 'sonner';
import { CreditCard, GraduationCap, ArrowRight, Loader2, CalendarDays, FileText } from 'lucide-react';

const STATUS_MAP = {
  onboarding: { label: 'In fase di iscrizione', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  enrolled: { label: 'Iscritto/a', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  active: { label: 'Attivo/a', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  completed: { label: 'Completato', className: 'bg-gray-50 text-gray-600 border-gray-200' },
};

const PAYMENT_STATUS = {
  paid: { label: 'Pagata', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending: { label: 'In scadenza', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  overdue: { label: 'Scaduta', className: 'bg-red-50 text-red-700 border-red-200' },
};

function isOverdue(inst) {
  if (inst.status === 'paid') return false;
  try {
    return new Date(inst.due_date) < new Date();
  } catch { return false; }
}

export default function MyEnrollmentsPage() {
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      schoolAPI.getMyEnrollments().catch(() => ({ data: [] })),
      schoolAPI.getMyPayments().catch(() => ({ data: [] })),
    ]).then(([enrRes, payRes]) => {
      setEnrollments(enrRes.data || []);
      setPayments(payRes.data || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  // Merge payments with enrollments
  const enrichedEnrollments = enrollments.map(enr => ({
    ...enr,
    installments: enr.installments?.length > 0 ? enr.installments : payments.filter(p => p.course_id === enr.course_id),
  }));

  // If no enrollments but there are payments, show them grouped by course
  const standalonePayments = payments.filter(p => !enrollments.some(e => e.course_id === p.course_id));
  const groupedStandalone = standalonePayments.reduce((acc, p) => {
    const key = p.course_id || 'generic';
    if (!acc[key]) acc[key] = { course_id: key, course_title: p.course_title || 'Percorso formativo', installments: [] };
    acc[key].installments.push(p);
    return acc;
  }, {});

  const hasContent = enrichedEnrollments.length > 0 || Object.keys(groupedStandalone).length > 0;

  return (
    <div data-testid="my-enrollments-page">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold ariadne-heading mb-2">Le mie iscrizioni</h1>
        <p className="text-base text-gray-500">I tuoi percorsi formativi e lo stato dei pagamenti.</p>
      </div>

      {!hasContent ? (
        <Card className="border-gray-100" data-testid="enrollments-empty-state">
          <CardContent className="p-12 text-center">
            <GraduationCap className="w-10 h-10 mx-auto mb-4 text-gray-200" />
            <p className="text-sm text-gray-500 mb-4">Non hai ancora iscrizioni attive. Esplora i percorsi formativi per iniziare.</p>
            <Button variant="outline" className="gap-2" onClick={() => navigate('/training-courses')} data-testid="enrollments-explore-btn">
              Esplora i percorsi <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {enrichedEnrollments.map(enr => {
            const status = STATUS_MAP[enr.status] || STATUS_MAP.onboarding;
            return (
              <Card key={enr.enrollment_id} className="border-gray-100" data-testid={`enrollment-card-${enr.enrollment_id}`}>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <h2 className="text-lg font-semibold">{enr.course_title || 'Percorso formativo'}</h2>
                      {enr.edition_name && <p className="text-xs text-gray-400 mt-1">Edizione: {enr.edition_name}</p>}
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${status.className}`}>{status.label}</Badge>
                  </div>

                  {enr.status === 'onboarding' && enr.current_step < 6 && (
                    <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                      <p className="text-sm text-amber-800 mb-2">La tua iscrizione è ancora in corso. Puoi riprendere da dove hai lasciato.</p>
                      <Button size="sm" className="gap-2" onClick={() => navigate(`/enroll/${enr.course_id}`)} data-testid={`enrollment-resume-${enr.enrollment_id}`}>
                        Riprendi iscrizione <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}

                  {enr.installments?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-gray-400" /> Piano rate
                      </h3>
                      <div className="space-y-2">
                        {enr.installments.map((inst, i) => {
                          const overdue = isOverdue(inst);
                          const payStatus = inst.status === 'paid' ? PAYMENT_STATUS.paid : (overdue ? PAYMENT_STATUS.overdue : PAYMENT_STATUS.pending);
                          return (
                            <div key={inst.installment_id || i} className="grid grid-cols-1 sm:grid-cols-[1fr_120px_120px_100px] gap-3 items-center p-3 rounded-xl border border-gray-100 bg-gray-50/50" data-testid={`enrollment-installment-${i}`}>
                              <p className="text-sm text-gray-700">{inst.description || `Rata ${i + 1}`}</p>
                              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                <CalendarDays className="w-3.5 h-3.5" />
                                {inst.due_date ? new Date(inst.due_date).toLocaleDateString('it-IT') : '—'}
                              </div>
                              <p className="text-sm font-semibold">€ {Number(inst.amount || 0).toFixed(2)}</p>
                              <Badge variant="outline" className={`text-[10px] ${payStatus.className}`}>{payStatus.label}</Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {enr.documents?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" /> Documenti
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {enr.documents.map((doc, i) => (
                          <Button key={i} variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => window.open(`${process.env.REACT_APP_BACKEND_URL}${doc.file_path}`, '_blank')}>
                            <FileText className="w-3.5 h-3.5" /> {doc.file_name || doc.doc_type}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {Object.values(groupedStandalone).map(group => (
            <Card key={group.course_id} className="border-gray-100" data-testid={`standalone-payment-${group.course_id}`}>
              <CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-semibold">{group.course_title}</h2>
                <div className="space-y-2">
                  {group.installments.map((inst, i) => {
                    const overdue = isOverdue(inst);
                    const payStatus = inst.status === 'paid' ? PAYMENT_STATUS.paid : (overdue ? PAYMENT_STATUS.overdue : PAYMENT_STATUS.pending);
                    return (
                      <div key={inst.installment_id || i} className="grid grid-cols-1 sm:grid-cols-[1fr_120px_120px_100px] gap-3 items-center p-3 rounded-xl border border-gray-100 bg-gray-50/50">
                        <p className="text-sm text-gray-700">{inst.description || `Rata ${i + 1}`}</p>
                        <div className="flex items-center gap-1.5 text-sm text-gray-500">
                          <CalendarDays className="w-3.5 h-3.5" />
                          {inst.due_date ? new Date(inst.due_date).toLocaleDateString('it-IT') : '—'}
                        </div>
                        <p className="text-sm font-semibold">€ {Number(inst.amount || 0).toFixed(2)}</p>
                        <Badge variant="outline" className={`text-[10px] ${payStatus.className}`}>{payStatus.label}</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
