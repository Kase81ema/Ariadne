import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { schoolAPI } from '../lib/api';
import { CheckCircle2, Circle, Clock, BookOpen, Briefcase, Loader2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  not_started: { label: 'Non iniziato', icon: Circle, color: 'text-gray-300', badge: '' },
  in_progress: { label: 'In corso', icon: Clock, color: 'text-[#F5A623]', badge: 'badge-orange' },
  completed: { label: 'Completato', icon: CheckCircle2, color: 'text-[#10B981]', badge: 'badge-green' },
};

function CourseCard({ course, onStatusChange }) {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS_CONFIG[course.user_status] || STATUS_CONFIG.not_started;
  const StatusIcon = status.icon;

  const cycleStatus = () => {
    const order = ['not_started', 'in_progress', 'completed'];
    const idx = order.indexOf(course.user_status);
    const next = order[(idx + 1) % order.length];
    onStatusChange(course.course_id, next);
  };

  return (
    <Card className="border-gray-100 hover:border-gray-200 transition-all" data-testid={`course-${course.course_id}`}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <button onClick={cycleStatus} className={`mt-0.5 flex-shrink-0 ${status.color} hover:scale-110 transition-transform`} title={`Stato: ${status.label}. Clicca per cambiare.`} data-testid={`course-status-${course.course_id}`}>
            <StatusIcon className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold">{course.title}</h3>
              <Badge variant="outline" className={`text-[10px] ${status.badge}`}>{status.label}</Badge>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">{course.description}</p>
            {course.key_points?.length > 0 && (
              <>
                <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-[11px] text-[#7B61FF] mt-2 hover:underline" data-testid={`course-expand-${course.course_id}`}>
                  <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  {expanded ? 'Nascondi dettagli' : 'Vedi dettagli'}
                </button>
                {expanded && (
                  <ul className="mt-2 space-y-1">
                    {course.key_points.map((kp, i) => (
                      <li key={i} className="text-xs text-gray-500 flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-[#7B61FF] flex-shrink-0" />
                        {kp}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MyJourneyPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ariadne');

  useEffect(() => {
    schoolAPI.getCatalog().then(r => { setCourses(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleStatusChange = async (courseId, newStatus) => {
    try {
      await schoolAPI.updateCourseProgress(courseId, newStatus);
      setCourses(prev => prev.map(c => c.course_id === courseId ? { ...c, user_status: newStatus } : c));
      toast.success(`Stato aggiornato: ${STATUS_CONFIG[newStatus].label}`);
    } catch {
      toast.error('Errore nell\'aggiornamento');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  const ariadneCourses = courses.filter(c => c.category === 'ariadne');
  const businessCourses = courses.filter(c => c.category === 'business');

  const getStats = (list) => {
    const total = list.length;
    const completed = list.filter(c => c.user_status === 'completed').length;
    const inProgress = list.filter(c => c.user_status === 'in_progress').length;
    return { total, completed, inProgress, pct: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const ariadneStats = getStats(ariadneCourses);
  const businessStats = getStats(businessCourses);

  return (
    <div data-testid="my-journey-page">
      <div className="mb-10">
        <h1 className="text-4xl font-semibold ariadne-heading mb-2">Il mio percorso</h1>
        <p className="text-base text-gray-500">Catalogo corsi e stato di completamento</p>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card className={`border-gray-100 cursor-pointer hover:border-gray-200 transition-all ${activeTab === 'ariadne' ? 'ring-1 ring-[#7B61FF]/20' : ''}`} onClick={() => setActiveTab('ariadne')} data-testid="journey-card-ariadne">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#7B61FF]/8 text-[#7B61FF] flex items-center justify-center"><BookOpen className="w-5 h-5" /></div>
              <div>
                <h3 className="text-sm font-semibold">Corsi Ariadne</h3>
                <p className="text-[11px] text-gray-400">{ariadneStats.completed}/{ariadneStats.total} completati{ariadneStats.inProgress > 0 && ` | ${ariadneStats.inProgress} in corso`}</p>
              </div>
            </div>
            <Progress value={ariadneStats.pct} className="h-1.5" />
          </CardContent>
        </Card>
        <Card className={`border-gray-100 cursor-pointer hover:border-gray-200 transition-all ${activeTab === 'business' ? 'ring-1 ring-[#7B61FF]/20' : ''}`} onClick={() => setActiveTab('business')} data-testid="journey-card-business">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#F5A623]/8 text-[#F5A623] flex items-center justify-center"><Briefcase className="w-5 h-5" /></div>
              <div>
                <h3 className="text-sm font-semibold">Corsi business</h3>
                <p className="text-[11px] text-gray-400">{businessStats.completed}/{businessStats.total} completati{businessStats.inProgress > 0 && ` | ${businessStats.inProgress} in corso`}</p>
              </div>
            </div>
            <Progress value={businessStats.pct} className="h-1.5" />
          </CardContent>
        </Card>
      </div>

      {/* Course lists */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="ariadne" data-testid="tab-ariadne">Corsi Ariadne</TabsTrigger>
          <TabsTrigger value="business" data-testid="tab-business">Corsi business</TabsTrigger>
        </TabsList>

        <TabsContent value="ariadne">
          <div className="space-y-3">
            {ariadneCourses.length > 0 ? ariadneCourses.map(c => (
              <CourseCard key={c.course_id} course={c} onStatusChange={handleStatusChange} />
            )) : (
              <p className="text-sm text-gray-400 text-center py-8">Nessun corso Ariadne disponibile</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="business">
          <div className="space-y-3">
            {businessCourses.length > 0 ? businessCourses.map(c => (
              <CourseCard key={c.course_id} course={c} onStatusChange={handleStatusChange} />
            )) : (
              <p className="text-sm text-gray-400 text-center py-8">Nessun corso business disponibile</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
