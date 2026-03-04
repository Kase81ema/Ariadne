import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { repoAPI } from '../lib/api';
import { Upload, Trash2, FileText, FolderOpen, File } from 'lucide-react';
import { toast } from 'sonner';

export default function RepositoryPage() {
  const [categories, setCategories] = useState([]);
  const [files, setFiles] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('generale');

  const loadFiles = () => {
    const cat = activeCategory === 'all' ? '' : activeCategory;
    repoAPI.files(cat).then(r => setFiles(r.data)).catch(() => {});
  };

  useEffect(() => {
    repoAPI.categories().then(r => setCategories(r.data)).catch(() => {});
  }, []);

  useEffect(() => { loadFiles(); }, [activeCategory]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await repoAPI.upload(file, uploadCategory);
      toast.success('File caricato');
      loadFiles();
    } catch (err) {
      toast.error('Errore nel caricamento');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare questo file?')) return;
    await repoAPI.deleteFile(id);
    toast.success('File eliminato');
    loadFiles();
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div data-testid="repository-page">
      <div className="mb-10">
        <h1 className="text-4xl font-semibold ariadne-heading mb-2">Repository</h1>
        <p className="text-base text-gray-500">Base conoscitiva per gli agenti AI: linee guida, tone of voice, esempi</p>
      </div>

      {/* Upload section */}
      <Card className="border-gray-100 mb-8">
        <CardContent className="p-6">
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Carica documento</Label>
              <div className="flex gap-3">
                <Select value={uploadCategory} onValueChange={setUploadCategory}>
                  <SelectTrigger className="w-[200px]" data-testid="upload-category-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                  <Input
                    type="file"
                    onChange={handleUpload}
                    disabled={uploading}
                    className="cursor-pointer"
                    data-testid="upload-file-input"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeCategory === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
          data-testid="repo-filter-all"
        >
          Tutti ({files.length})
        </button>
        {categories.map(c => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeCategory === c.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            data-testid={`repo-filter-${c.id}`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Files grid */}
      <div className="grid gap-3">
        {files.map(f => (
          <Card key={f.file_id} className="border-gray-100 hover:border-gray-200 transition-colors" data-testid={`repo-file-${f.file_id}`}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                <File className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 truncate">{f.name}</h3>
                <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                  <Badge variant="outline" className="text-[10px] badge-purple">{f.category}</Badge>
                  <span>{formatSize(f.size || 0)}</span>
                  <span>{f.created_at?.split('T')[0]}</span>
                </div>
              </div>
              {f.content_extract && f.content_extract.length > 50 && (
                <details className="max-w-xs">
                  <summary className="text-[11px] text-gray-400 cursor-pointer">Anteprima</summary>
                  <p className="text-[11px] text-gray-500 mt-1 line-clamp-3">{f.content_extract.slice(0, 200)}</p>
                </details>
              )}
              <Button variant="ghost" size="icon" onClick={() => handleDelete(f.file_id)} data-testid={`repo-delete-${f.file_id}`}>
                <Trash2 className="w-4 h-4 text-red-400" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {files.length === 0 && (
          <div className="text-center py-16">
            <FolderOpen className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-sm text-gray-400">Nessun file nel repository</p>
            <p className="text-xs text-gray-300 mt-1">Carica documenti per arricchire la base conoscitiva degli agenti</p>
          </div>
        )}
      </div>
    </div>
  );
}
