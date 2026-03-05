import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Progress } from '../components/ui/progress';
import { Separator } from '../components/ui/separator';
import { setupAPI, agentsAPI, rulesAPI } from '../lib/api';
import {
  CheckCircle2, AlertCircle, ArrowRight, Users, Settings2,
  FolderOpen, Bot, PlayCircle, Loader2, Sparkles, Eye, EyeOff
} from 'lucide-react';
import { toast } from 'sonner';

const CHECKLIST = [
  { key: 'profiles', label: 'Profili social', description: 'Almeno un profilo attivo', icon: Users, link: '/profiles' },
  { key: 'rules', label: 'Regole di pianificazione', description: 'Almeno una regola configurata', icon: Settings2, link: '/rules' },
  { key: 'agents', label: 'Agenti AI', description: 'Almeno 3 agenti attivi', icon: Bot, link: '/agents' },
  { key: 'repository', label: 'Repository', description: 'Documenti guida caricati (opzionale)', icon: FolderOpen, link: '/repository', optional: true },
];

function checkItemStatus(key, readiness) {
  if (!readiness) return 'loading';
  if (key === 'profiles') return readiness.profiles_active_count > 0 ? 'ok' : 'missing';
  if (key === 'rules') return readiness.rules_count > 0 ? 'ok' : 'missing';
  if (key === 'agents') return readiness.agents_active_count >= 3 ? 'ok' : (readiness.agents_active_count > 0 ? 'warn' : 'missing');
  if (key === 'repository') return readiness.repository_total > 0 ? 'ok' : 'warn';
  return 'loading';
}

function StatusIcon({ status }) {
  if (status === 'ok') return <CheckCircle2 className="w-5 h-5 text-[#10B981]" />;
  if (status === 'warn') return <AlertCircle className="w-5 h-5 text-[#F5A623]" />;
  if (status === 'missing') return <AlertCircle className="w-5 h-5 text-[#EF4444]" />;
  return <div className="w-5 h-5 rounded-full bg-gray-200 animate-pulse" />;
}

function statusLabel(status) {
  if (status === 'ok') return 'Pronto';
  if (status === 'warn') return 'Attenzione';
  if (status === 'missing') return 'Mancante';
  return '...';
}

export default function StartCampaignPage() {
  const navigate = useNavigate();
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [essentialMode, setEssentialMode] = useState(false);
  const [applyingPreset, setApplyingPreset] = useState(false);
  const [creatingRule, setCreatingRule] = useState(false);

  const fetchReadiness = () => {
    setLoading(true);
    setupAPI.readiness()
      .then(r => { setReadiness(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchReadiness(); }, []);

  const allRequired = CHECKLIST.filter(c => !c.optional).every(c => checkItemStatus(c.key, readiness) === 'ok');

  const handleApplyAgentPreset = async () => {
    setApplyingPreset(true);
    try {
      await agentsAPI.applyPreset('standard');
      toast.success('Preset agenti "standard" attivato');
      fetchReadiness();
    } catch {
      toast.error('Errore');
    } finally {
      setApplyingPreset(false);
    }
  };

  const handleCreateBaseRule = async () => {
    setCreatingRule(true);
    try {
      await rulesAPI.create({
        name: 'Regola base',
        days: ['mon', 'tue', 'wed', 'thu', 'fri'],
        time_slots: ['09:00', '17:00'],
        max_per_day: 2,
        min_gap_hours: 4,
        coordinate_partners: true,
      });
      toast.success('Regola base creata');
      fetchReadiness();
    } catch {
      toast.error('Errore');
    } finally {
      setCreatingRule(false);
    }
  };

  const handleProceed = () => {
    navigate('/workflow', { state: { essentialMode } });
  };

  const passedCount = CHECKLIST.filter(c => checkItemStatus(c.key, readiness) === 'ok').length;
  const progressPct = (passedCount / CHECKLIST.length) * 100;

  return (
    <div data-testid="start-campaign-page">
      <div className="mb-10">
        <h1 className="text-4xl font-semibold ariadne-heading mb-2">Avvia campagna</h1>
        <p className="text-base text-gray-500">Verifica il setup prima di creare una nuova campagna</p>
      </div>

      {/* Global readiness indicator */}
      <Card className={`border-2 mb-8 ${readiness?.ready ? 'border-[#10B981]/30 bg-[#10B981]/[0.02]' : 'border-gray-100'}`}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${readiness?.ready ? 'bg-[#10B981]/10' : 'bg-gray-100'}`}>
              {readiness?.ready
                ? <CheckCircle2 className="w-6 h-6 text-[#10B981]" />
                : <AlertCircle className="w-6 h-6 text-gray-400" />
              }
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold ariadne-heading" data-testid="readiness-title">
                {loading ? 'Verifica in corso...' : readiness?.ready ? 'Pronto a generare' : 'Setup incompleto'}
              </h2>
              <p className="text-sm text-gray-500">
                {loading ? '' : readiness?.ready
                  ? 'Tutti i prerequisiti sono soddisfatti. Puoi avviare la campagna.'
                  : `${readiness?.missing?.length || 0} elementi richiedono attenzione`
                }
              </p>
            </div>
            {/* Essential mode toggle */}
            <div className="flex items-center gap-2 ml-auto">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-500">
                {essentialMode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                Essenziale
              </label>
              <Switch
                checked={essentialMode}
                onCheckedChange={setEssentialMode}
                data-testid="essential-mode-toggle"
              />
            </div>
          </div>
          <Progress value={progressPct} className="h-1.5" />
          <p className="text-[11px] text-gray-400 mt-2">{passedCount}/{CHECKLIST.length} requisiti soddisfatti</p>
        </CardContent>
      </Card>

      {/* Checklist */}
      <div className="space-y-3 mb-8">
        {CHECKLIST.map(item => {
          const status = checkItemStatus(item.key, readiness);
          const Icon = item.icon;
          return (
            <Card key={item.key} className="border-gray-100" data-testid={`check-${item.key}`}>
              <CardContent className="p-5 flex items-center gap-4">
                <StatusIcon status={status} />
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  status === 'ok' ? 'bg-[#10B981]/8 text-[#10B981]' : 'bg-gray-100 text-gray-400'
                }`}>
                  <Icon className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">{item.label}</h3>
                    {item.optional && <Badge variant="outline" className="text-[10px] text-gray-400">Opzionale</Badge>}
                    <Badge variant="outline" className={`text-[10px] ${
                      status === 'ok' ? 'badge-green' : status === 'warn' ? 'badge-orange' : 'badge-red'
                    }`}>
                      {statusLabel(status)}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                  {/* Contextual info */}
                  {item.key === 'profiles' && readiness && (
                    <p className="text-[11px] text-gray-400 mt-1">{readiness.profiles_active_count} profili attivi</p>
                  )}
                  {item.key === 'rules' && readiness && (
                    <p className="text-[11px] text-gray-400 mt-1">{readiness.rules_count} regole configurate</p>
                  )}
                  {item.key === 'agents' && readiness && (
                    <p className="text-[11px] text-gray-400 mt-1">{readiness.agents_active_count} agenti attivi</p>
                  )}
                  {item.key === 'repository' && readiness && (
                    <p className="text-[11px] text-gray-400 mt-1">{readiness.repository_total} documenti caricati</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Quick action buttons */}
                  {item.key === 'rules' && status === 'missing' && (
                    <Button
                      size="sm" variant="outline"
                      onClick={handleCreateBaseRule}
                      disabled={creatingRule}
                      className="text-xs gap-1.5"
                      data-testid="quick-create-rule"
                    >
                      {creatingRule ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      Crea regola base
                    </Button>
                  )}
                  {item.key === 'agents' && status !== 'ok' && (
                    <Button
                      size="sm" variant="outline"
                      onClick={handleApplyAgentPreset}
                      disabled={applyingPreset}
                      className="text-xs gap-1.5"
                      data-testid="quick-preset-agents"
                    >
                      {applyingPreset ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      Attiva preset standard
                    </Button>
                  )}
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => navigate(item.link)}
                    className="text-xs gap-1.5"
                    data-testid={`goto-${item.key}`}
                  >
                    Vai a <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Essential mode description */}
      {essentialMode && (
        <Card className="border-gray-100 mb-8 bg-gray-50/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-[#7B61FF]" />
              <h3 className="text-sm font-semibold text-gray-900">Modalita essenziale attiva</h3>
            </div>
            <p className="text-xs text-gray-500">
              Nel workflow vedrai solo i campi indispensabili: tipo campagna, titolo, periodo e profili. 
              Le impostazioni avanzate (mix intenzioni, regola specifica) useranno i valori predefiniti.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Action button */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate('/dashboard')} className="gap-2" data-testid="back-to-dashboard">
          Torna alla dashboard
        </Button>
        <Button
          onClick={handleProceed}
          disabled={!allRequired}
          className="gap-2 h-12 px-8 text-base"
          data-testid="proceed-to-workflow"
        >
          <PlayCircle className="w-5 h-5" />
          {allRequired ? 'Avvia workflow' : 'Completa il setup prima'}
        </Button>
      </div>
    </div>
  );
}
