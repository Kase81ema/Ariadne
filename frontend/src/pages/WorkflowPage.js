import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
import { campaignsAPI, coursesAPI, profilesAPI, rulesAPI, agentsAPI, generateAPI, mediaAPI, postsAPI } from '../lib/api';
import { ArrowRight, ArrowLeft, CheckCircle2, Loader2, Zap, FileText, ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';

const INTENTIONS = [
  { id: 'annuncio', label: 'Annuncio' },
  { id: 'valore', label: 'Valore/Insight' },
  { id: 'storia', label: 'Storia' },
  { id: 'reminder', label: 'Reminder' },
  { id: 'last_call', label: 'Last call' },
];

const STEPS = ['Campagna', 'Profili', 'Agenti', 'Pianifica', 'Genera', 'Revisione'];
const PLATFORM_VARIANTS = {
  linkedin_company: 'landscape',
  linkedin_personal: 'landscape',
  instagram: 'portrait',
};

const API_BASE = process.env.REACT_APP_BACKEND_URL;

function PostImageUploader({ postId, currentImage, onImageSet }) {
  const [uploading, setUploading] = useState(false);
  const imgSrc = currentImage ? (currentImage.startsWith('http') ? currentImage : `${API_BASE}${currentImage}`) : null;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const token = localStorage.getItem('ariadne_token');
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_BASE}/api/posts/${postId}/upload-image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (data.image_url) {
        onImageSet(data.image_url);
        toast.success('Immagine caricata');
      }
    } catch {
      toast.error('Errore nel caricamento');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    try {
      const token = localStorage.getItem('ariadne_token');
      await fetch(`${API_BASE}/api/posts/${postId}/upload-image`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      onImageSet('');
      toast.success('Immagine rimossa');
    } catch {
      toast.error('Errore');
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-dashed border-gray-100">
      {imgSrc ? (
        <div className="relative inline-block">
          <img src={imgSrc} alt="" className="rounded-lg max-h-40 object-cover" />
          <button onClick={handleRemove} className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-black/80" data-testid={`remove-post-image-${postId}`}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-200 hover:border-gray-300 text-xs text-gray-400 hover:text-gray-600 cursor-pointer transition-colors" data-testid={`upload-post-image-${postId}`}>
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
          <span>{uploading ? 'Caricamento...' : 'Aggiungi immagine al post'}</span>
          {!uploading && <input type="file" accept="image/*" className="hidden" onChange={handleFile} />}
        </label>
      )}
    </div>
  );
}

export default function WorkflowPage() {
  const location = useLocation();
  const essentialMode = location.state?.essentialMode || false;
  const [step, setStep] = useState(0);
  const [courses, setCourses] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [rules, setRules] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generatedPosts, setGeneratedPosts] = useState([]);
  const [mediaAssets, setMediaAssets] = useState([]);
  const [assignmentsMap, setAssignmentsMap] = useState({});
  const [assignmentJobId, setAssignmentJobId] = useState(null);
  const [assignmentJob, setAssignmentJob] = useState(null);
  const [imageOptions, setImageOptions] = useState({
    sourceScope: 'course_only',
    applyProcess: false,
    applyImprove: false,
    platformPreferences: {
      linkedin_company: 'landscape',
      linkedin_personal: 'landscape',
      instagram: 'portrait',
      default: 'square',
    },
  });

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
    agentsAPI.list().then(r => {
      setAgents(r.data);
      setImageOptions(prev => ({
        ...prev,
        applyProcess: r.data.some(agent => agent.agent_id === 'image_cropper' && agent.active),
        applyImprove: r.data.some(agent => agent.agent_id === 'image_enhancer' && agent.active),
      }));
    }).catch(() => {});
    mediaAPI.listAssets({ status: 'ready' }).then(r => setMediaAssets(r.data)).catch(() => {});
  }, []);

  const loadAssignments = async (campaignId) => {
    if (!campaignId) return;
    try {
      const response = await mediaAPI.listAssignments(campaignId);
      setAssignmentsMap(Object.fromEntries(response.data.map(item => [item.post_id, item])));
    } catch {
      setAssignmentsMap({});
    }
  };

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

  // Step 4: Generate texts via background job with polling
  const [jobId, setJobId] = useState(null);
  const [jobProgress, setJobProgress] = useState({ current: 0, total: 0, label: '' });

  const handleGenerateTexts = async () => {
    if (!createdCampaign) return;
    setLoading(true);
    try {
      const res = await generateAPI.startTextsJob(createdCampaign.campaign_id, planPostIds, activeAgentIds);
      setJobId(res.data.job_id);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nell\'avvio della generazione');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!jobId) return;
    const poll = setInterval(async () => {
      try {
        const res = await generateAPI.getJobStatus(jobId);
        const job = res.data;
        setJobProgress({ current: job.current, total: job.total, label: job.current_label });
        if (job.status === 'completed') {
          clearInterval(poll);
          setJobId(null);
          setLoading(false);
          const postsRes = await postsAPI.list({ campaign_id: createdCampaign.campaign_id });
          setGeneratedPosts(postsRes.data);
          await loadAssignments(createdCampaign.campaign_id);
          toast.success('Testi generati con successo!');
          setStep(5);
        } else if (job.status === 'error') {
          clearInterval(poll);
          setJobId(null);
          setLoading(false);
          toast.error(job.error || 'Errore nella generazione');
        }
      } catch {
        clearInterval(poll);
        setJobId(null);
        setLoading(false);
      }
    }, 2000);
    return () => clearInterval(poll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  useEffect(() => {
    if (!assignmentJobId || !createdCampaign) return;
    const poll = setInterval(async () => {
      try {
        const response = await mediaAPI.getJob(assignmentJobId);
        setAssignmentJob(response.data);
        if (response.data.status === 'completed') {
          clearInterval(poll);
          setAssignmentJobId(null);
          await loadAssignments(createdCampaign.campaign_id);
          const assetsRes = await mediaAPI.listAssets({ status: 'ready' });
          setMediaAssets(assetsRes.data);
          toast.success('Abbinamento immagini completato');
        }
        if (response.data.status === 'failed') {
          clearInterval(poll);
          setAssignmentJobId(null);
          toast.error(response.data.error || 'Errore abbinamento immagini');
        }
      } catch {
        clearInterval(poll);
        setAssignmentJobId(null);
      }
    }, 1500);
    return () => clearInterval(poll);
  }, [assignmentJobId, createdCampaign]);

  // Step 5: Approve posts
  const handleApproveAll = async () => {
    if (!createdCampaign) return;
    const ids = generatedPosts.map(p => p.post_id);
    await postsAPI.batchApprove(ids);
    toast.success('Tutti i post approvati');
    setGeneratedPosts(prev => prev.map(p => ({ ...p, status: 'approved' })));
  };

  const profMap = Object.fromEntries(profiles.map(p => [p.profile_id, p.name]));

  const getAssignmentPreview = (post) => {
    const assignment = assignmentsMap[post.post_id];
    if (!assignment?.asset) return post.image_url || '';
    const variant = assignment.variant || 'original';
    return {
      square: assignment.asset.variants?.square_url,
      portrait: assignment.asset.variants?.portrait_url,
      landscape: assignment.asset.variants?.landscape_url,
      original: assignment.asset.public_url,
    }[variant] || assignment.asset.public_url || post.image_url || '';
  };

  const handleAutoAssignImages = async () => {
    if (!createdCampaign) return;
    try {
      const response = await mediaAPI.autoMatchAssignments({
        campaign_id: createdCampaign.campaign_id,
        source_scope: imageOptions.sourceScope,
        apply_process: imageOptions.applyProcess,
        apply_improve: imageOptions.applyImprove,
        platform_preferences: imageOptions.platformPreferences,
      });
      setAssignmentJobId(response.data.job_id);
      setAssignmentJob(null);
      toast.success('Abbinamento immagini avviato');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore durante l’abbinamento immagini');
    }
  };

  const handleManualAssign = async (postId, mediaAssetId, variant) => {
    try {
      const response = await mediaAPI.upsertAssignment(postId, { media_asset_id: mediaAssetId, variant, auto_assigned: false });
      setAssignmentsMap(prev => ({ ...prev, [postId]: response.data }));
      toast.success('Immagine del post aggiornata');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore aggiornamento immagine');
    }
  };

  const handleRemoveAssignment = async (postId) => {
    try {
      await mediaAPI.removeAssignment(postId);
      setAssignmentsMap(prev => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
      toast.success('Immagine rimossa dal post');
    } catch {
      toast.error('Errore nella rimozione immagine');
    }
  };

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
            {!essentialMode && (
              <>
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
              </>
            )}
            {essentialMode && (
              <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-4 py-2">
                Modalita essenziale: 3 post per profilo, regola predefinita. Modifica in Workflow avanzato.
              </p>
            )}
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
            {jobId && (
              <div className="space-y-3 p-4 rounded-xl bg-[#7B61FF]/[0.04] border border-[#7B61FF]/10" data-testid="generation-progress">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-[#7B61FF]">{jobProgress.label || 'Avvio generazione...'}</span>
                  <span className="text-gray-500 text-xs">{jobProgress.total > 0 ? `${jobProgress.current}/${jobProgress.total}` : '...'}</span>
                </div>
                <Progress value={jobProgress.total > 0 ? (jobProgress.current / jobProgress.total) * 100 : 5} className="h-2" />
                <p className="text-xs text-gray-400">L'AI sta scrivendo i testi. Questo puo richiedere qualche minuto...</p>
              </div>
            )}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)} className="gap-2" disabled={loading}><ArrowLeft className="w-4 h-4" /> Indietro</Button>
              <Button onClick={handleGenerateTexts} disabled={loading} className="gap-2" data-testid="workflow-generate-texts">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generazione in corso...</> : <>Genera testi <Zap className="w-4 h-4" /></>}
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

          <Card className="border-gray-100" data-testid="workflow-auto-assign-card">
            <CardContent className="p-6 space-y-4">
              <div>
                <h3 className="text-sm font-semibold">Abbina immagini automaticamente</h3>
                <p className="text-xs text-gray-400">Scegli la sorgente immagini, applica ritaglio o miglioramento e rivedi il risultato post per post.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Fonte immagini</Label>
                  <Select value={imageOptions.sourceScope} onValueChange={(value) => setImageOptions(prev => ({ ...prev, sourceScope: value }))}>
                    <SelectTrigger data-testid="workflow-image-source-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="course_only">Solo questo corso</SelectItem>
                      <SelectItem value="all_courses">Tutti i corsi</SelectItem>
                      <SelectItem value="library">Libreria immagini</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">LinkedIn aziendale</Label>
                  <Select value={imageOptions.platformPreferences.linkedin_company} onValueChange={(value) => setImageOptions(prev => ({ ...prev, platformPreferences: { ...prev.platformPreferences, linkedin_company: value } }))}>
                    <SelectTrigger data-testid="workflow-image-format-linkedin-company"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="landscape">Orizzontale</SelectItem>
                      <SelectItem value="square">Quadrata</SelectItem>
                      <SelectItem value="portrait">Verticale</SelectItem>
                      <SelectItem value="original">Originale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">LinkedIn personale</Label>
                  <Select value={imageOptions.platformPreferences.linkedin_personal} onValueChange={(value) => setImageOptions(prev => ({ ...prev, platformPreferences: { ...prev.platformPreferences, linkedin_personal: value } }))}>
                    <SelectTrigger data-testid="workflow-image-format-linkedin-personal"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="landscape">Orizzontale</SelectItem>
                      <SelectItem value="square">Quadrata</SelectItem>
                      <SelectItem value="portrait">Verticale</SelectItem>
                      <SelectItem value="original">Originale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Instagram</Label>
                  <Select value={imageOptions.platformPreferences.instagram} onValueChange={(value) => setImageOptions(prev => ({ ...prev, platformPreferences: { ...prev.platformPreferences, instagram: value } }))}>
                    <SelectTrigger data-testid="workflow-image-format-instagram"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portrait">Verticale</SelectItem>
                      <SelectItem value="square">Quadrata</SelectItem>
                      <SelectItem value="landscape">Orizzontale</SelectItem>
                      <SelectItem value="original">Originale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col justify-end gap-2">
                  <label className="flex items-center gap-2 text-xs text-gray-500"><input type="checkbox" checked={imageOptions.applyProcess} onChange={(e) => setImageOptions(prev => ({ ...prev, applyProcess: e.target.checked }))} data-testid="workflow-image-process-checkbox" /> Ritaglia</label>
                  <label className="flex items-center gap-2 text-xs text-gray-500"><input type="checkbox" checked={imageOptions.applyImprove} onChange={(e) => setImageOptions(prev => ({ ...prev, applyImprove: e.target.checked }))} data-testid="workflow-image-improve-checkbox" /> Migliora immagine</label>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                {assignmentJob && (
                  <div className="flex-1 min-w-[240px] rounded-xl bg-gray-50 px-4 py-3" data-testid="workflow-image-job-status">
                    <p className="text-sm font-medium">{assignmentJob.label || 'Abbinamento immagini in corso'}</p>
                    <p className="text-xs text-gray-400">{assignmentJob.current || 0}/{assignmentJob.total || 0}</p>
                  </div>
                )}
                <Button onClick={handleAutoAssignImages} className="gap-2" data-testid="workflow-auto-assign-button">Abbina immagini automaticamente</Button>
              </div>
            </CardContent>
          </Card>

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
                {getAssignmentPreview(p) && (
                  <div className="mt-4 rounded-xl overflow-hidden border border-gray-100" data-testid={`workflow-post-image-preview-${p.post_id}`}>
                    <img src={getAssignmentPreview(p)} alt="Immagine associata" className="w-full max-h-64 object-cover" />
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-3 mt-4">
                  <Select value={assignmentsMap[p.post_id]?.media_asset_id || 'none'} onValueChange={(value) => value === 'none' ? handleRemoveAssignment(p.post_id) : handleManualAssign(p.post_id, value, assignmentsMap[p.post_id]?.variant || PLATFORM_VARIANTS[p.platform] || 'square')}>
                    <SelectTrigger data-testid={`workflow-post-asset-select-${p.post_id}`}><SelectValue placeholder="Scegli immagine dalla libreria" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Post solo testo</SelectItem>
                      {mediaAssets.map(asset => <SelectItem key={asset.asset_id} value={asset.asset_id}>{asset.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={assignmentsMap[p.post_id]?.variant || PLATFORM_VARIANTS[p.platform] || 'square'} onValueChange={(value) => {
                    const currentAssetId = assignmentsMap[p.post_id]?.media_asset_id;
                    if (currentAssetId) handleManualAssign(p.post_id, currentAssetId, value);
                  }}>
                    <SelectTrigger data-testid={`workflow-post-variant-select-${p.post_id}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="square">Quadrata</SelectItem>
                      <SelectItem value="portrait">Verticale</SelectItem>
                      <SelectItem value="landscape">Orizzontale</SelectItem>
                      <SelectItem value="original">Originale</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => handleRemoveAssignment(p.post_id)} data-testid={`workflow-post-remove-assignment-${p.post_id}`}>Rimuovi immagine</Button>
                </div>
                {/* Post image upload */}
                <PostImageUploader postId={p.post_id} currentImage={p.image_url} onImageSet={(url) => {
                  setGeneratedPosts(prev => prev.map(gp => gp.post_id === p.post_id ? {...gp, image_url: url} : gp));
                  if (createdCampaign?.campaign_id) loadAssignments(createdCampaign.campaign_id);
                }} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
