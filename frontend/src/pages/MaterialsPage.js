import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { schoolAPI } from '../lib/api';
import { FileText, Download, Search, BookOpen, Loader2 } from 'lucide-react';
import { Input } from '../components/ui/input';

export default function MaterialsPage() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    schoolAPI.listMaterials().then(r => { setMaterials(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = materials.filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    return m.title?.toLowerCase().includes(q) || m.program_name?.toLowerCase().includes(q) || m.cohort_name?.toLowerCase().includes(q);
  });

  // Group by program
  const grouped = {};
  filtered.forEach(m => {
    const key = m.program_name || 'Altro';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  });

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div data-testid="materials-page">
      <div className="mb-10">
        <h1 className="text-4xl font-semibold ariadne-heading mb-2">Materiali</h1>
        <p className="text-base text-gray-500">Documenti e risorse dei tuoi percorsi</p>
      </div>

      <div className="relative max-w-sm mb-6">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca materiali..." className="pl-9" data-testid="materials-search" />
      </div>

      {materials.length === 0 ? (
        <Card className="border-gray-100 border-dashed border-2">
          <CardContent className="p-12 text-center">
            <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <h2 className="text-base font-semibold text-gray-600 mb-1">I materiali arriveranno qui</h2>
            <p className="text-sm text-gray-400">Non appena inizierai il tuo percorso, qui troverai tutti i materiali e le risorse per accompagnarti.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([program, mats]) => (
          <div key={program} className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">{program}</h2>
            <div className="space-y-2">
              {mats.map(m => (
                <Card key={m.material_id} className="border-gray-100 hover:border-gray-200 transition-colors" data-testid={`material-${m.material_id}`}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#7B61FF]/8 text-[#7B61FF] flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900">{m.title}</h3>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400">
                        <span>{m.cohort_name}</span>
                        {m.description && <><span>&middot;</span><span className="truncate">{m.description}</span></>}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{m.file_name?.split('.').pop()?.toUpperCase()}</Badge>
                    <a href={`${process.env.REACT_APP_BACKEND_URL}${m.file_path}`} download className="text-[#7B61FF] hover:text-[#6B51EF]">
                      <Download className="w-4 h-4" />
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
