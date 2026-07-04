import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { schoolAPI } from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Search, Users } from 'lucide-react';

const TIMING_LABELS = {
  upcoming: 'In programma',
  ongoing: 'In corso',
  completed: 'Concluso',
  always_available: 'Continuativo',
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

export default function TrainingCoursesPage() {
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState([]);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [timingFilter, setTimingFilter] = useState('all');

  useEffect(() => {
    schoolAPI.listTrainingCourses().then(r => setCatalog(r.data)).catch(() => toast.error('Impossibile caricare i corsi di formazione'));
  }, []);

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
          <Input className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cerca per corso, tema o docente" data-testid="training-course-search-input" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger data-testid="training-course-category-filter"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            {categories.map((c) => <SelectItem key={c} value={c}>{c === 'all' ? 'Tutte le categorie' : c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={timingFilter} onValueChange={setTimingFilter}>
          <SelectTrigger data-testid="training-course-timing-filter"><SelectValue placeholder="Periodo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i periodi</SelectItem>
            {Object.entries(TIMING_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredCatalog.map((course) => <CourseCard key={`${course.source}-${course.course_id}`} course={course} onOpen={(id) => navigate(`/course/${id}`)} />)}
      </div>

      {filteredCatalog.length === 0 && (
        <div className="text-center py-14 text-gray-400" data-testid="training-courses-empty-state">
          <Users className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-sm">Nessun corso corrisponde ai filtri selezionati.</p>
        </div>
      )}
    </div>
  );
}
