import { useEffect, useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { coursesAPI, mediaAPI, repoAPI } from '../lib/api';
import { FolderOpen, ImagePlus, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function RepositoryPage() {
  const [categories, setCategories] = useState([]);
  const [files, setFiles] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('generale');
  const [courses, setCourses] = useState([]);
  const [repositoryImages, setRepositoryImages] = useState([]);
  const [repoImageForm, setRepoImageForm] = useState({ file: null, title: '', tags: '', courseId: 'all' });
  const [imageFilter, setImageFilter] = useState('all');

  const loadFiles = () => {
    const cat = activeCategory === 'all' ? '' : activeCategory;
    repoAPI.files(cat).then((r) => setFiles(r.data)).catch(() => {});
  };

  const loadRepositoryImages = (courseId = imageFilter) => {
    mediaAPI.listRepositoryImages(courseId === 'all' ? '' : courseId).then((r) => setRepositoryImages(r.data)).catch(() => {});
  };

  useEffect(() => {
    repoAPI.categories().then((r) => setCategories(r.data)).catch(() => {});
    coursesAPI.list().then((r) => setCourses(r.data)).catch(() => {});
  }, []);

  useEffect(() => { loadFiles(); }, [activeCategory]);
  useEffect(() => { loadRepositoryImages(imageFilter); }, [imageFilter]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await repoAPI.upload(file, uploadCategory);
      toast.success('File caricato');
      loadFiles();
    } catch {
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

  const handleRepositoryImageUpload = async () => {
    if (!repoImageForm.file) return toast.error('Seleziona un file immagine');
    try {
      await repoAPI.uploadRepositoryImage(repoImageForm.file, repoImageForm.courseId === 'all' ? '' : repoImageForm.courseId, repoImageForm.tags, repoImageForm.title);
      await mediaAPI.indexRepositoryImages();
      loadRepositoryImages(imageFilter);
      setRepoImageForm({ file: null, title: '', tags: '', courseId: 'all' });
      toast.success('Immagine aggiunta al repository');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nel repository immagini');
    }
  };

  const handleIndexRepositoryImages = async () => {
    try {
      const response = await mediaAPI.indexRepositoryImages();
      loadRepositoryImages(imageFilter);
      toast.success(`Indicizzazione completata: ${response.data.indexed} immagini`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore durante l’indicizzazione');
    }
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
        <p className="text-base text-gray-500">Documenti guida e repository immagini per il motore editoriale Ariadne.</p>
      </div>

      <Tabs defaultValue="docs" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="docs" data-testid="repository-tab-docs">Documenti</TabsTrigger>
          <TabsTrigger value="images" data-testid="repository-tab-images">Repository immagini</TabsTrigger>
        </TabsList>

        <TabsContent value="docs">
          <Card className="border-gray-100 mb-8">
            <CardContent className="p-6">
              <div className="flex items-end gap-4 flex-wrap">
                <div className="flex-1 space-y-2 min-w-[260px]">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Carica documento</Label>
                  <div className="flex gap-3 flex-wrap">
                    <Select value={uploadCategory} onValueChange={setUploadCategory}>
                      <SelectTrigger className="w-[220px]" data-testid="upload-category-select"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="file" onChange={handleUpload} disabled={uploading} className="cursor-pointer flex-1 min-w-[280px]" data-testid="upload-file-input" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2 mb-6">
            <button onClick={() => setActiveCategory('all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeCategory === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`} data-testid="repo-filter-all">Tutti ({files.length})</button>
            {categories.map((category) => (
              <button key={category.id} onClick={() => setActiveCategory(category.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeCategory === category.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`} data-testid={`repo-filter-${category.id}`}>{category.name}</button>
            ))}
          </div>

          <div className="grid gap-3">
            {files.map((file) => (
              <Card key={file.file_id} className="border-gray-100 hover:border-gray-200 transition-colors" data-testid={`repo-file-${file.file_id}`}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center"><FolderOpen className="w-5 h-5 text-gray-400" /></div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">{file.name}</h3>
                    <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                      <Badge variant="outline" className="text-[10px] badge-purple">{file.category}</Badge>
                      <span>{formatSize(file.size || 0)}</span>
                      <span>{file.created_at?.split('T')[0]}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(file.file_id)} data-testid={`repo-delete-${file.file_id}`}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                </CardContent>
              </Card>
            ))}
            {files.length === 0 && <div className="text-center py-16"><FolderOpen className="w-12 h-12 text-gray-200 mx-auto mb-4" /><p className="text-sm text-gray-400">Nessun file nel repository</p></div>}
          </div>
        </TabsContent>

        <TabsContent value="images">
          <Card className="border-gray-100 mb-8" data-testid="repository-images-panel">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-sm font-semibold">Repository immagini</h2>
                  <p className="text-xs text-gray-400">Organizza immagini per corso e rendile disponibili per la libreria interna.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="gap-2" onClick={handleIndexRepositoryImages} data-testid="repository-images-index-button"><RefreshCw className="w-4 h-4" /> Indicizza repository immagini</Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2"><Label>File immagine</Label><Input type="file" accept="image/*" onChange={(e) => setRepoImageForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))} data-testid="repository-images-file-input" /></div>
                <div className="space-y-2"><Label>Titolo</Label><Input value={repoImageForm.title} onChange={(e) => setRepoImageForm((prev) => ({ ...prev, title: e.target.value }))} data-testid="repository-images-title-input" /></div>
                <div className="space-y-2"><Label>Tag</Label><Input value={repoImageForm.tags} onChange={(e) => setRepoImageForm((prev) => ({ ...prev, tags: e.target.value }))} placeholder="trainer, aula, workshop" data-testid="repository-images-tags-input" /></div>
                <div className="space-y-2"><Label>Corso</Label><Select value={repoImageForm.courseId} onValueChange={(value) => setRepoImageForm((prev) => ({ ...prev, courseId: value }))}><SelectTrigger data-testid="repository-images-course-select"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tutti i corsi</SelectItem>{courses.map((course) => <SelectItem key={course.course_id} value={course.course_id}>{course.title}</SelectItem>)}</SelectContent></Select></div>
              </div>

              <div className="flex items-end justify-between gap-4 flex-wrap">
                <div className="space-y-2">
                  <Label>Visualizza</Label>
                  <Select value={imageFilter} onValueChange={setImageFilter}><SelectTrigger className="w-[240px]" data-testid="repository-images-filter-select"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tutti i corsi</SelectItem>{courses.map((course) => <SelectItem key={course.course_id} value={course.course_id}>{course.title}</SelectItem>)}</SelectContent></Select>
                </div>
                <Button className="gap-2" onClick={handleRepositoryImageUpload} data-testid="repository-images-upload-button"><ImagePlus className="w-4 h-4" /> Aggiungi al repository immagini</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {repositoryImages.map((item) => (
                  <Card key={item.id} className="border-gray-100 overflow-hidden" data-testid={`repository-indexed-image-${item.id}`}>
                    <div className="aspect-[16/10] bg-gray-50 overflow-hidden">{item.public_url && <img src={item.public_url} alt={item.filename} className="w-full h-full object-cover" />}</div>
                    <CardContent className="p-4 space-y-2">
                      <h3 className="text-sm font-semibold">{item.filename}</h3>
                      <p className="text-[11px] text-gray-400">{item.tags?.join(', ') || 'Nessun tag'}</p>
                      <Badge variant="outline" className="text-[10px]">{item.course_id || 'tutti i corsi'}</Badge>
                    </CardContent>
                  </Card>
                ))}
                {repositoryImages.length === 0 && <div className="text-sm text-gray-400 py-8" data-testid="repository-images-empty">Nessuna immagine indicizzata</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}