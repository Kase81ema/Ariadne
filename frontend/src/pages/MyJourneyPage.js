import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { schoolAPI } from '../lib/api';
import { CheckCircle2, Circle, Clock, BookOpen, Award, Briefcase, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';

const TYPE_ICONS = { formazione: BookOpen, credenziale: Award, business: Briefcase };
const TYPE_LABELS = { formazione: 'Formazione', credenziale: 'Credenziale e ore', business: 'Business' };
const STATUS_ICONS = { done: CheckCircle2, in_progress: Clock, todo: Circle };
const STATUS_LABELS = { done: 'Completato', in_progress: 'In corso', todo: 'Da fare' };
const STATUS_COLORS = { done: 'text-[#10B981]', in_progress: 'text-[#F5A623]', todo: 'text-gray-300' };

export default function MyJourneyPage() {
  const [journeyData, setJourneyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('formazione');

  const load = () => {
    schoolAPI.getJourneyProgress().then(r => { setJourneyData(r.data); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const updateStep = async (stepId, data) => {
    try {
      await schoolAPI.updateStepProgress(stepId, data);
      toast.success('Aggiornato');
      load();
    } catch { toast.error('Errore'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  const typeTemplates = {};
  journeyData.forEach(t => { typeTemplates[t.type] = t; });

  const getProgress = (tmpl) => {
    if (!tmpl) return { total: 0, done: 0, pct: 0 };
    const total = tmpl.steps.length;
    const done = tmpl.steps.filter(s => s.status === 'done').length;
    return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  };

  return (
    <div data-testid="my-journey-page">
      <div className="mb-10">
        <h1 className="text-4xl font-semibold ariadne-heading mb-2">Il mio percorso</h1>
        <p className="text-base text-gray-500">Formazione, credenziale e sviluppo professionale</p>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {['formazione', 'credenziale', 'business'].map(type => {
          const tmpl = typeTemplates[type];
          const { total, done, pct } = getProgress(tmpl);
          const Icon = TYPE_ICONS[type];
          return (
            <Card key={type} className={`border-gray-100 cursor-pointer hover:border-gray-200 transition-all ${activeTab === type ? 'ring-1 ring-[#7B61FF]/20' : ''}`} onClick={() => setActiveTab(type)} data-testid={`journey-card-${type}`}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-[#7B61FF]/8 text-[#7B61FF] flex items-center justify-center"><Icon className="w-5 h-5" /></div>
                  <div>
                    <h3 className="text-sm font-semibold">{TYPE_LABELS[type]}</h3>
                    <p className="text-[11px] text-gray-400">{done}/{total} completati</p>
                  </div>
                </div>
                <Progress value={pct} className="h-1.5" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detail tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="formazione" data-testid="tab-formazione">Formazione</TabsTrigger>
          <TabsTrigger value="credenziale" data-testid="tab-credenziale">Credenziale</TabsTrigger>
          <TabsTrigger value="business" data-testid="tab-business">Business</TabsTrigger>
        </TabsList>

        {['formazione', 'credenziale', 'business'].map(type => {
          const tmpl = typeTemplates[type];
          return (
            <TabsContent key={type} value={type}>
              {tmpl ? (
                <div className="space-y-3">
                  {tmpl.steps.sort((a, b) => a.order - b.order).map((step, idx) => {
                    const StatusIcon = STATUS_ICONS[step.status] || Circle;
                    return (
                      <Card key={step.step_id} className="border-gray-100" data-testid={`step-${step.step_id}`}>
                        <CardContent className="p-5">
                          <div className="flex items-start gap-4">
                            <div className="flex flex-col items-center pt-1">
                              <StatusIcon className={`w-5 h-5 ${STATUS_COLORS[step.status]}`} />
                              {idx < tmpl.steps.length - 1 && <div className="w-px h-8 bg-gray-100 mt-1" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-sm font-semibold">{step.title}</h3>
                                <Badge variant="outline" className={`text-[10px] ${step.status === 'done' ? 'badge-green' : step.status === 'in_progress' ? 'badge-orange' : ''}`}>
                                  {STATUS_LABELS[step.status]}
                                </Badge>
                                {step.requires_admin_validation && <Badge variant="outline" className="text-[9px]"><Shield className="w-2.5 h-2.5 mr-0.5" />Validazione admin</Badge>}
                                {step.validated_by && <Badge variant="outline" className="text-[9px] badge-green">Validato</Badge>}
                              </div>
                              <p className="text-xs text-gray-400 mb-3">{step.description}</p>

                              {step.editable_by_user && (
                                <div className="flex items-center gap-3">
                                  {type === 'credenziale' && (
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="number"
                                        min={0}
                                        className="w-20 h-8 text-xs"
                                        placeholder="Ore"
                                        defaultValue={step.value}
                                        onBlur={e => e.target.value !== step.value && updateStep(step.step_id, { value: e.target.value, status: step.status === 'todo' ? 'in_progress' : step.status })}
                                        data-testid={`step-value-${step.step_id}`}
                                      />
                                      <span className="text-xs text-gray-400">ore</span>
                                    </div>
                                  )}
                                  <Select
                                    value={step.status}
                                    onValueChange={v => updateStep(step.step_id, { status: v, value: step.value, notes: step.notes })}
                                  >
                                    <SelectTrigger className="w-32 h-8 text-xs" data-testid={`step-status-${step.step_id}`}><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="todo">Da fare</SelectItem>
                                      <SelectItem value="in_progress">In corso</SelectItem>
                                      {!step.requires_admin_validation && <SelectItem value="done">Completato</SelectItem>}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}

                              {step.notes && <p className="text-[11px] text-gray-400 mt-2 italic">{step.notes}</p>}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="border-gray-100 border-dashed border-2">
                  <CardContent className="p-8 text-center">
                    <p className="text-sm text-gray-400">Nessun percorso configurato per questa sezione.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
