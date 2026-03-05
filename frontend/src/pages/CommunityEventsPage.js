import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { communityAPI } from '../lib/api';
import { Calendar, MapPin, ExternalLink, Users, Loader2 } from 'lucide-react';

const TYPE_LABELS = { course_multi: 'Corso multi-data', event_single: 'Evento singolo', webinar: 'Webinar', workshop: 'Workshop' };
const TYPE_COLORS = { course_multi: 'badge-purple', event_single: 'badge-blue', webinar: 'badge-orange', workshop: 'badge-green' };

export default function CommunityEventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    communityAPI.listEvents().then(r => { setEvents(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div data-testid="community-events-page">
      <div className="mb-10">
        <h1 className="text-4xl font-semibold ariadne-heading mb-2">Eventi e annunci</h1>
        <p className="text-base text-gray-500">Prossimi appuntamenti e novita Ariadne</p>
      </div>

      {events.length > 0 ? (
        <div className="space-y-4">
          {events.map(e => (
            <Card key={e.course_id} className="border-gray-100 hover:border-gray-200 transition-colors" data-testid={`event-card-${e.course_id}`}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-[#7B61FF]/8 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold text-[#7B61FF] leading-none">
                      {e.next_date ? new Date(e.next_date).getDate() : '?'}
                    </span>
                    <span className="text-[10px] text-[#7B61FF]/70 uppercase">
                      {e.next_date ? new Date(e.next_date).toLocaleDateString('it-IT', { month: 'short' }) : ''}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="text-base font-semibold text-gray-900">{e.title}</h3>
                      <Badge variant="outline" className={`text-[10px] ${TYPE_COLORS[e.type]}`}>{TYPE_LABELS[e.type] || e.type}</Badge>
                    </div>
                    {e.description && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{e.description}</p>}
                    <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                      {e.dates?.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {e.dates.map(d => d.label ? `${d.label}: ${d.date}` : d.date).join(' | ')}
                        </span>
                      )}
                      {e.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {e.location}</span>}
                      {e.trainers?.length > 0 && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {e.trainers.join(', ')}</span>}
                    </div>
                    {e.accreditation && <Badge variant="outline" className="text-[10px] badge-green mt-2">{e.accreditation}</Badge>}
                    {e.link && (
                      <a href={e.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-[#7B61FF] hover:underline mt-2">
                        Scopri di piu <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400 text-sm">Nessun evento in programma</div>
      )}
    </div>
  );
}
