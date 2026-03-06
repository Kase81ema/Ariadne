import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Separator } from '../components/ui/separator';
import { agentsAPI } from '../lib/api';
import { Bot, Zap, Shield, BookOpen, PenTool, Hash, FileOutput, Search, CheckCircle2, Sparkles, Crop, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

const AGENT_ICONS = {
  planner: Zap, writer_linkedin_company: PenTool, writer_linkedin_personal: PenTool,
  writer_instagram: PenTool, image_cropper: Crop, image_enhancer: Wand2, deep_research: Search, compliance_icf: Shield,
  quality_reviewer: CheckCircle2, grammar_editor: BookOpen, hashtag_curator: Hash,
  formatter_export: FileOutput,
};

const PRESETS = [
  { id: 'veloce', label: 'Veloce', description: 'Planner + Writer + Revisore qualita', color: 'badge-blue' },
  { id: 'standard', label: 'Standard', description: 'Veloce + Compliance ICF', color: 'badge-purple' },
  { id: 'alta_qualita', label: 'Alta qualita', description: 'Standard + Deep Research + Grammatica + Hashtag', color: 'badge-green' },
];

export default function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [applying, setApplying] = useState(false);

  const load = () => agentsAPI.list().then(r => setAgents(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleToggle = async (agentId) => {
    const agent = agents.find(a => a.agent_id === agentId);
    if (!agent || agent.always_on) return;
    const newActive = !agent.active;
    setAgents(prev => prev.map(a => a.agent_id === agentId ? { ...a, active: newActive } : a));
    await agentsAPI.toggle(agentId, newActive).catch(() => {});
  };

  const handlePreset = async (presetId) => {
    setApplying(true);
    try {
      const res = await agentsAPI.applyPreset(presetId);
      setAgents(res.data);
      toast.success(`Preset "${presetId}" applicato`);
    } catch {
      toast.error('Errore nell\'applicazione del preset');
    } finally {
      setApplying(false);
    }
  };

  const activeCount = agents.filter(a => a.active).length;
  const totalCount = agents.length;

  return (
    <div data-testid="agents-page">
      <div className="mb-10">
        <h1 className="text-4xl font-semibold ariadne-heading mb-2">Agenti</h1>
        <p className="text-base text-gray-500">
          Configura gli agenti AI per la generazione dei contenuti
          <span className="ml-2 text-xs text-gray-400">({activeCount}/{totalCount} attivi)</span>
        </p>
      </div>

      {/* Presets section */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">Preset rapidi</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => handlePreset(p.id)}
              disabled={applying}
              className="p-4 rounded-xl border-2 border-gray-100 hover:border-gray-200 text-left transition-all group"
              data-testid={`preset-${p.id}`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className="w-4 h-4 text-gray-400 group-hover:text-[#7B61FF] transition-colors" />
                <span className="text-sm font-semibold text-gray-900">{p.label}</span>
              </div>
              <p className="text-xs text-gray-400">{p.description}</p>
            </button>
          ))}
        </div>
      </div>

      <Separator className="mb-8" />

      {/* Agents list */}
      <div className="space-y-3">
        {agents.map(a => {
          const Icon = AGENT_ICONS[a.agent_id] || Bot;
          return (
            <Card key={a.agent_id} className={`border-gray-100 transition-all ${a.active ? 'bg-white' : 'bg-gray-50/50'}`} data-testid={`agent-card-${a.agent_id}`}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${a.active ? 'bg-[#7B61FF]/8 text-[#7B61FF]' : 'bg-gray-100 text-gray-400'}`}>
                  <Icon className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className={`text-sm font-semibold ${a.active ? 'text-gray-900' : 'text-gray-400'}`}>{a.name}</h3>
                    {a.always_on && <Badge variant="outline" className="text-[10px] badge-green">Sempre attivo</Badge>}
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{a.description}</p>
                </div>
                <Switch
                  checked={a.active}
                  disabled={a.always_on}
                  onCheckedChange={() => handleToggle(a.agent_id)}
                  data-testid={`agent-toggle-${a.agent_id}`}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
