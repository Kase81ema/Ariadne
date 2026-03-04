import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import { campaignsAPI, coursesAPI, profilesAPI, rulesAPI, agentsAPI, generateAPI, postsAPI } from '../lib/api';
import { ArrowRight, ArrowLeft, CheckCircle2, Loader2, Zap, FileText } from 'lucide-react';
import { toast } from 'sonner';

const INTENTIONS = [
  { id: 'annuncio', label: 'Annuncio' },
  { id: 'valore', label: 'Valore/Insight' },
  { id: 'storia', label: 'Storia' },
  { id: 'reminder', label: 'Reminder' },
  { id: 'last_call', label: 'Last call' },
];

const STEPS = ['Campagna', 'Profili', 'Agenti', 'Pianifica', 'Genera', 'Revisione'];

export default function WorkflowPage() {
  const [step, setStep] = useState(0);
  const [courses, setCourses] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [rules, setRules] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generatedPosts, setGeneratedPosts] = useState([]);

  // Campaign form
  const [campaignType, setCampaignType] = useState('course_based');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [campaignTitle, setCampaignTitle] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [postsPerProfile, setPostsPerProfile] = useState(3);
  const [selectedProfiles, setSelectedProfiles] = useState([]);
  const [selectedRule, setSelectedRule] = useState('');
  const [createdCampaign, setCreatedCampaign] = useState(null);
  const [planText, setPlanText] = useState('');
  const [planPostIds, setPlanPostIds] = useState([]);

  useEffect(() => {
    coursesAPI.list().then(r => setCourses(r.data)).catch(() => {});
    profilesAPI.list().then(r => setProfiles(r.data)).catch(() => {});
    rulesAPI.list().then(r => setRules(r.data)).catch(() => {});
    agentsAPI.list().then(r => setAgents(r.data)).catch(() => {});
  }, []);

  const toggleProfile = (pid) => {
    setSelectedProfiles(prev => prev.includes(pid) ? prev.filter(p => p !== pid) : [...prev, pid]);
  };

  const toggleAgent = async (agentId) => {
    const agent = agents.find(a => a.agent_id === agentId);
    if (!agent || agent.always_on) return;
    const updated = agents.map(a => a.agent_id === agentId ? { ...a, active: !a.active } : a);
    setAgents(updated);
    await agentsAPI.toggle(agentId, !agent.active).catch(() => {});
  };

  const activeAgentIds = agents.filter(a => a.active).map(a => a.agent_id);

  // Step 3: Create campaign and generate plan
  const handleCreateCampaign = async () => {
    setLoading(true);
    try {
      const data = {
        title: campaignTitle || `Campagna ${new Date().toLocaleDateString('it-IT')}`,
        type: campaignType,
        course_id: campaignType === 'course_based' ? selectedCourse : '',
        profiles: selectedProfiles,
        period_start: periodStart,
        period_end: periodEnd,
        posts_per_profile: postsPerProfile,
        rules_id: selectedRule,
      };
      const res = await campaignsAPI.create(data);
      setCreatedCampaign(res.data);
      // Generate plan
      const planRes = await generateAPI.plan(res.data.campaign_id, activeAgentIds);
      setPlanText(planRes.data.plan_text || 'Piano generato. Controlla il calendario.');
      setPlanPostIds(planRes.data.posts_created || []);
      toast.success('Piano editoriale generato');
      setStep(4);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nella creazione del piano');
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Generate texts
  const handleGenerateTexts = async () => {
    if (!createdCampaign) return;
    setLoading(true);
    try {
      await generateAPI.texts(createdCampaign.campaign_id, planPostIds, activeAgentIds);
      const postsRes = await postsAPI.list({ campaign_id: createdCampaign.campaign_id });
      setGeneratedPosts(postsRes.data);
      toast.success('Testi generati');
      setStep(5);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nella generazione');
    } finally {
      setLoading(false);
    }
  };

  // Step 5: Approve posts
  const handleApproveAll = async () => {
    if (!createdCampaign) return;
    const ids = generatedPosts.map(p => p.post_id);
    await postsAPI.batchApprove(ids);
    toast.success('Tutti i post approvati');
    setGeneratedPosts(prev => prev.map(p => ({ ...p, status: 'approved' })));
  };

  const profMap = Object.fromEntries(profiles.map(p => [p.profile_id, p.name]));

  return (
    <div data-testid="workflow-page">
      <div className="mb-10">
        <h1 className="text-4xl font-semibold ariadne-heading mb-2">Workflow</h1>
        <p className="text-base text-gray-500">Crea campagna, pianifica, genera testi, approva</p>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center gap-1 mb-3">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <button
                onClick={() => i <= step && setStep(i)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
                  i === step ? 'bg-gray-900 text-white' : i < step ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-gray-100 text-gray-400'
                }`}
                data-testid={`workflow-step-${i}`}
              >
                {i < step ? <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" /> : null}
                {s}
              </button>
              {i < STEPS.length - 1 && <ArrowRight className="w-3 h-3 text-gray-300" />}
            </div>
          ))}
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} className="h-1" />
      </div>

      {/* Step 0: Campaign type */}
      {step === 0 && (
        <Card className="border-gray-100">
          <CardContent className="p-8 space-y-6">
            <h2 className="text-xl font-medium ariadne-heading">Tipo di campagna</h2>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setCampaignType('course_based')}
                className={`p-6 rounded-xl border-2 text-left transition-all ${
                  campaignType === 'course_based' ? 'border-[#7B61FF] bg-[#7B61FF]/[0.03]' : 'border-gray-100 hover:border-gray-200'
                }`}
                data-testid="workflow-type-course"
              >
                <Zap className="w-5 h-5 mb-3 text-[#7B61FF]" />
                <h3 className="text-sm font-semibold mb-1">Da corso/evento</h3>
                <p className="text-xs text-gray-400">Promuovi un corso, evento o webinar specifico</p>
              </button>
              <button
                onClick={() => setCampaignType('editorial')}
                className={`p-6 rounded-xl border-2 text-left transition-all ${
                  campaignType === 'editorial' ? 'border-[#7B61FF] bg-[#7B61FF]/[0.03]' : 'border-gray-100 hover:border-gray-200'
                }`}
                data-testid="workflow-type-editorial"
              >
                <FileText className="w-5 h-5 mb-3 text-[#F5A623]" />
                <h3 className="text-sm font-semibold mb-1">Editoriale</h3>
                <p className="text-xs text-gray-400">Insight, valori, testimonianze, riflessioni</p>
              </button>
            </div>
            {campaignType === 'course_based' && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Seleziona corso/evento</Label>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger data-testid="workflow-course-select"><SelectValue placeholder="Scegli..." /></SelectTrigger>
                  <SelectContent>
                    {courses.map(c => <SelectItem key={c.course_id} value={c.course_id}>{c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Titolo campagna</Label>
              <Input value={campaignTitle} onChange={e => setCampaignTitle(e.target.value)} placeholder="Titolo della campagna" data-testid="workflow-title-input" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Periodo inizio</Label>
                <Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} data-testid="workflow-start-input" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Periodo fine</Label>
                <Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} data-testid="workflow-end-input" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Post per profilo</Label>
              <Input type="number" min={1} max={20} value={postsPerProfile} onChange={e => setPostsPerProfile(parseInt(e.target.value) || 1)} className="w-24" data-testid="workflow-posts-input" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Regola di pianificazione</Label>
              <Select value={selectedRule} onValueChange={setSelectedRule}>
                <SelectTrigger data-testid="workflow-rule-select"><SelectValue placeholder="Seleziona regola..." /></SelectTrigger>
                <SelectContent>
                  {rules.map(r => <SelectItem key={r.rule_id} value={r.rule_id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(1)} className="gap-2" data-testid="workflow-next-0">Avanti <ArrowRight className="w-4 h-4" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Select profiles */}
      {step === 1 && (
        <Card className="border-gray-100">
          <CardContent className="p-8 space-y-6">
            <h2 className="text-xl font-medium ariadne-heading">Seleziona profili target</h2>
            <div className="space-y-3">
              {profiles.filter(p => p.active).map(p => (
                <label key={p.profile_id} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedProfiles.includes(p.profile_id) ? 'border-[#7B61FF] bg-[#7B61FF]/[0.03]' : 'border-gray-100 hover:border-gray-200'
                }`} data-testid={`workflow-profile-${p.profile_id}`}>
                  <input type="checkbox" checked={selectedProfiles.includes(p.profile_id)} onChange={() => toggleProfile(p.profile_id)} className="sr-only" />
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedProfiles.includes(p.profile_id) ? 'bg-[#7B61FF]/10 text-[#7B61FF]' : 'bg-gray-100 text-gray-400'}`}>
                    <span className="text-sm font-bold">{p.name?.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.platform}</p>
                  </div>
                  {selectedProfiles.includes(p.profile_id) && <CheckCircle2 className="w-5 h-5 text-[#7B61FF] ml-auto" />}
                </label>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(0)} className="gap-2"><ArrowLeft className="w-4 h-4" /> Indietro</Button>
              <Button onClick={() => setStep(2)} className="gap-2" disabled={selectedProfiles.length === 0} data-testid="workflow-next-1">Avanti <ArrowRight className="w-4 h-4" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select agents */}
      {step === 2 && (
        <Card className="border-gray-100">
          <CardContent className="p-8 space-y-6">
            <h2 className="text-xl font-medium ariadne-heading">Agenti attivi</h2>
            <p className="text-sm text-gray-500">Attiva o disattiva gli agenti per questa generazione</p>
            <div className="space-y-3">
              {agents.map(a => (
                <div key={a.agent_id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100" data-testid={`workflow-agent-${a.agent_id}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-gray-900">{a.name}</h3>
                      {a.always_on && <Badge variant="outline" className="text-[10px] badge-green">Sempre attivo</Badge>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{a.description}</p>
                  </div>
                  <Switch
                    checked={a.active}
                    disabled={a.always_on}
                    onCheckedChange={() => toggleAgent(a.agent_id)}
                    data-testid={`workflow-agent-toggle-${a.agent_id}`}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-2"><ArrowLeft className="w-4 h-4" /> Indietro</Button>
              <Button onClick={handleCreateCampaign} disabled={loading} className="gap-2" data-testid="workflow-generate-plan">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generazione piano...</> : <>Genera piano <ArrowRight className="w-4 h-4" /></>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Plan review (skipped to step 4 after generation) */}

      {/* Step 4: Generate texts */}
      {step === 4 && (
        <Card className="border-gray-100">
          <CardContent className="p-8 space-y-6">
            <h2 className="text-xl font-medium ariadne-heading">Piano editoriale generato</h2>
            <div className="bg-gray-50 rounded-xl p-6">
              <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">{planText}</pre>
            </div>
            <p className="text-sm text-gray-500">{planPostIds.length} post creati nel calendario</p>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)} className="gap-2"><ArrowLeft className="w-4 h-4" /> Indietro</Button>
              <Button onClick={handleGenerateTexts} disabled={loading} className="gap-2" data-testid="workflow-generate-texts">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generazione testi...</> : <>Genera testi <Zap className="w-4 h-4" /></>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Review */}
      {step === 5 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium ariadne-heading">Revisione post ({generatedPosts.length})</h2>
            <Button onClick={handleApproveAll} className="gap-2 bg-[#10B981] hover:bg-[#059669]" data-testid="workflow-approve-all">
              <CheckCircle2 className="w-4 h-4" /> Approva tutti
            </Button>
          </div>
          {generatedPosts.map(p => (
            <Card key={p.post_id} className="border-gray-100" data-testid={`workflow-post-${p.post_id}`}>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className="badge-purple text-[10px]">{profMap[p.profile_id] || p.profile_id}</Badge>
                  <Badge variant="outline" className="badge-blue text-[10px]">{p.platform}</Badge>
                  <Badge variant="outline" className="text-[10px]">{p.intention}</Badge>
                  <span className="text-[11px] text-gray-400 ml-auto">{p.scheduled_date} {p.scheduled_time}</span>
                  <Badge variant="outline" className={`text-[10px] ${p.status === 'approved' ? 'badge-green' : 'badge-orange'}`}>{p.status}</Badge>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{p.content || '[Contenuto non ancora generato]'}</p>
                {p.content_short && (
                  <details className="mt-3">
                    <summary className="text-xs text-gray-400 cursor-pointer">Versione breve</summary>
                    <p className="text-xs text-gray-500 mt-2 whitespace-pre-wrap">{p.content_short}</p>
                  </details>
                )}
                {p.hashtags?.length > 0 && (
                  <div className="flex gap-1.5 mt-3">
                    {p.hashtags.map((h, i) => <Badge key={i} variant="outline" className="text-[10px] badge-blue">#{h}</Badge>)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
