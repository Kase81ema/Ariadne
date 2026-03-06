import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Progress } from '../components/ui/progress';
import { coursesAPI, mediaAPI, repoAPI } from '../lib/api';
import { toast } from 'sonner';
import { ImagePlus, Sparkles, FolderSync, Wand2, RefreshCw, Crop, CheckCircle2 } from 'lucide-react';

const SOURCE_LABELS = {
  manual_upload: 'Caricata da PC',
  repository: 'Repository immagini',
  ai_generated: 'Generata con AI',
};

const STATUS_COLORS = {
  ready: 'badge-green',
  processing: 'badge-blue',
  failed: 'badge-red',
};

function AssetCard({ asset, selected, onToggle, onProcess }) {
  const previewUrl = asset.variants?.landscape_url || asset.variants?.square_url || asset.public_url;
  return (
    <Card className="border-gray-100 overflow-hidden" data-testid={`media-asset-card-${asset.asset_id}`}>
      <div className="aspect-[16/10] bg-gray-50 overflow-hidden">
        {previewUrl ? (
          <img src={previewUrl} alt={asset.title} className="w-full h-full object-cover" data-testid={`media-asset-image-${asset.asset_id}`} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">Nessuna preview</div>
        )}
      </div>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-2">
          <input type="checkbox" checked={selected} onChange={() => onToggle(asset.asset_id)} data-testid={`media-asset-select-${asset.asset_id}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold truncate" data-testid={`media-asset-title-${asset.asset_id}`}>{asset.title}</h3>
              <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[asset.status] || ''}`} data-testid={`media-asset-status-${asset.asset_id}`}>{asset.status}</Badge>
            </div>
            <p className="text-xs text-gray-500 mt-1 line-clamp-2" data-testid={`media-asset-description-${asset.asset_id}`}>{asset.description || 'Nessuna descrizione'}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-[10px] badge-purple" data-testid={`media-asset-source-${asset.asset_id}`}>{SOURCE_LABELS[asset.source_type] || asset.source_type}</Badge>
          {asset.course_id && <Badge variant="outline" className="text-[10px]" data-testid={`media-asset-course-${asset.asset_id}`}>{asset.course_id}</Badge>}
          <Badge variant="outline" className="text-[10px]" data-testid={`media-asset-usage-${asset.asset_id}`}>{asset.usage_count || 0} usi</Badge>
        </div>
        {asset.tags?.length > 0 && <p className="text-[11px] text-gray-400" data-testid={`media-asset-tags-${asset.asset_id}`}>{asset.tags.join(', ')}</p>}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-2" onClick={() => onProcess([asset.asset_id], false)} data-testid={`media-asset-crop-${asset.asset_id}`}>
            <Crop className="w-3.5 h-3.5" /> Ritaglia
          </Button>
          <Button size="sm" className="gap-2" onClick={() => onProcess([asset.asset_id], true)} data-testid={`media-asset-enhance-${asset.asset_id}`}>
            <Wand2 className="w-3.5 h-3.5" /> Migliora immagine
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ImagesPage() {
  const [assets, setAssets] = useState([]);
  const [courses, setCourses] = useState([]);
  const [repositoryImages, setRepositoryImages] = useState([]);
  const [repoFilterCourse, setRepoFilterCourse] = useState('all');
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [activeJob, setActiveJob] = useState(null);
  const [jobState, setJobState] = useState(null);
  const [pendingReload, setPendingReload] = useState('assets');
  const [batchOverlayBrand, setBatchOverlayBrand] = useState(false);
  const [uploadForm, setUploadForm] = useState({ file: null, title: '', description: '', tags: '', courseId: 'none', autoProcess: true, autoImprove: false, overlayBrand: false });
  const [repoUpload, setRepoUpload] = useState({ file: null, title: '', tags: '', courseId: 'all' });
  const [aiForm, setAiForm] = useState({ prompt: '', style: 'sobrio editoriale', courseId: 'none', tags: '', autoImprove: true, overlayBrand: false });

  const loadAssets = () => mediaAPI.listAssets().then((r) => setAssets(r.data)).catch(() => {});
  const loadCourses = () => coursesAPI.list().then((r) => setCourses(r.data)).catch(() => {});
  const loadRepositoryImages = (courseId = repoFilterCourse) => mediaAPI.listRepositoryImages(courseId === 'all' ? '' : courseId).then((r) => setRepositoryImages(r.data)).catch(() => {});

  useEffect(() => {
    loadAssets();
    loadCourses();
    loadRepositoryImages('all');
  }, []);

  useEffect(() => {
    loadRepositoryImages(repoFilterCourse);
  }, [repoFilterCourse]);

  useEffect(() => {
    if (!activeJob) return undefined;
    const interval = setInterval(async () => {
      try {
        const response = await mediaAPI.getJob(activeJob);
        setJobState(response.data);
        if (response.data.status === 'completed') {
          clearInterval(interval);
          setActiveJob(null);
          toast.success('Operazione immagini completata');
          loadAssets();
          loadRepositoryImages(repoFilterCourse);
        }
        if (response.data.status === 'failed') {
          clearInterval(interval);
          setActiveJob(null);
          toast.error(response.data.error || 'Operazione immagini fallita');
          loadAssets();
        }
      } catch {
        clearInterval(interval);
        setActiveJob(null);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [activeJob, repoFilterCourse, pendingReload]);

  const selectedCount = selectedAssets.length;
  const readyAssets = useMemo(() => assets.filter((asset) => asset.status === 'ready'), [assets]);

  const toggleSelected = (assetId) => {
    setSelectedAssets((prev) => prev.includes(assetId) ? prev.filter((item) => item !== assetId) : [...prev, assetId]);
  };

  const handleProcess = async (assetIds, applyImprove, overlayBrand = false) => {
    try {
      const response = await mediaAPI.processAssets(assetIds, applyImprove, overlayBrand);
      setPendingReload('assets');
      setActiveJob(response.data.job_id);
      setJobState(null);
      toast.success(applyImprove ? 'Miglioramento immagini avviato' : 'Ritaglio immagini avviato');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nella lavorazione immagini');
    }
  };

  const handleUploadAsset = async () => {
    if (!uploadForm.file) return toast.error('Seleziona un file');
    try {
      const response = await mediaAPI.uploadAsset({
        file: uploadForm.file,
        title: uploadForm.title,
        description: uploadForm.description,
        tags: uploadForm.tags,
        courseId: uploadForm.courseId === 'none' ? '' : uploadForm.courseId,
        autoProcess: uploadForm.autoProcess,
        autoImprove: uploadForm.autoImprove,
        overlayBrand: uploadForm.overlayBrand,
      });
      if (response.data.job_id) {
        setPendingReload('assets');
        setActiveJob(response.data.job_id);
      } else {
        loadAssets();
      }
      setUploadForm({ file: null, title: '', description: '', tags: '', courseId: 'none', autoProcess: true, autoImprove: false, overlayBrand: false });
      toast.success('Immagine caricata');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nel caricamento immagine');
    }
  };

  const handleRepositoryUpload = async () => {
    if (!repoUpload.file) return toast.error('Seleziona un file immagine');
    try {
      await repoAPI.uploadRepositoryImage(repoUpload.file, repoUpload.courseId === 'all' ? '' : repoUpload.courseId, repoUpload.tags, repoUpload.title);
      await mediaAPI.indexRepositoryImages();
      loadRepositoryImages(repoFilterCourse);
      setRepoUpload({ file: null, title: '', tags: '', courseId: 'all' });
      toast.success('Immagine aggiunta al repository');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nel repository immagini');
    }
  };

  const handleIndexRepository = async () => {
    try {
      const response = await mediaAPI.indexRepositoryImages();
      loadRepositoryImages(repoFilterCourse);
      toast.success(`Indicizzazione completata: ${response.data.indexed} immagini`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore indicizzazione repository');
    }
  };

  const handleImportRepositoryImage = async (indexId) => {
    try {
      await mediaAPI.importRepositoryImage(indexId);
      loadAssets();
      toast.success('Immagine importata nella libreria');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore importazione immagine');
    }
  };

  const handleGenerateAi = async () => {
    if (!aiForm.prompt.trim()) return toast.error('Inserisci un prompt');
    try {
      const response = await mediaAPI.generateAsset({
        prompt: aiForm.prompt,
        style: aiForm.style,
        course_id: aiForm.courseId === 'none' ? '' : aiForm.courseId,
        tags: aiForm.tags,
        auto_improve: aiForm.autoImprove,
        overlay_brand: aiForm.overlayBrand,
      });
      setPendingReload('assets');
      setActiveJob(response.data.job_id);
      setAiForm({ prompt: '', style: 'sobrio editoriale', courseId: 'none', tags: '', autoImprove: true, overlayBrand: false });
      toast.success('Generazione immagine avviata');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore generazione AI');
    }
  };

  return (
    <div data-testid="images-page">
      <div className="mb-10">
        <h1 className="text-4xl font-semibold ariadne-heading mb-2">Immagini</h1>
        <p className="text-base text-gray-500" data-testid="images-page-description">Libreria immagini interna per Studio: carica, importa da repository, genera con AI e prepara gli asset per Buffer.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="border-gray-100"><CardContent className="p-5"><p className="text-2xl font-semibold ariadne-heading" data-testid="images-assets-count">{assets.length}</p><p className="text-xs text-gray-400">Asset in libreria</p></CardContent></Card>
        <Card className="border-gray-100"><CardContent className="p-5"><p className="text-2xl font-semibold ariadne-heading" data-testid="images-ready-count">{readyAssets.length}</p><p className="text-xs text-gray-400">Pronti per l'uso</p></CardContent></Card>
        <Card className="border-gray-100"><CardContent className="p-5"><p className="text-2xl font-semibold ariadne-heading" data-testid="images-repo-count">{repositoryImages.length}</p><p className="text-xs text-gray-400">Immagini indicizzate da repository</p></CardContent></Card>
      </div>

      {jobState && (
        <Card className="border-gray-100 mb-8" data-testid="images-job-progress">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold" data-testid="images-job-label">{jobState.label || 'Operazione in corso'}</p>
                <p className="text-xs text-gray-400">{jobState.job_type}</p>
              </div>
              <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[jobState.status] || ''}`} data-testid="images-job-status">{jobState.status}</Badge>
            </div>
            <Progress value={jobState.total ? (jobState.current / jobState.total) * 100 : 10} className="h-2" />
          </CardContent>
        </Card>
      )}

      <Card className="border-gray-100 mb-8" data-testid="images-batch-actions">
        <CardContent className="p-5 flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex-1">
            <h2 className="text-sm font-semibold">Azioni guidate sulla libreria</h2>
            <p className="text-xs text-gray-400" data-testid="images-selected-count">{selectedCount} asset selezionati</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="flex items-center gap-2 text-xs text-gray-500"><input type="checkbox" checked={batchOverlayBrand} onChange={(e) => setBatchOverlayBrand(e.target.checked)} data-testid="batch-overlay-checkbox" /> Applica firma Ariadne</label>
            <Button variant="outline" disabled={selectedCount === 0} onClick={() => handleProcess(selectedAssets, false, batchOverlayBrand)} data-testid="batch-crop-button">Ritaglia selezionate</Button>
            <Button disabled={selectedCount === 0} onClick={() => handleProcess(selectedAssets, true, batchOverlayBrand)} data-testid="batch-enhance-button">Migliora immagini selezionate</Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="upload" data-testid="images-tab-upload">Carica da PC</TabsTrigger>
          <TabsTrigger value="repository" data-testid="images-tab-repository">Repository immagini</TabsTrigger>
          <TabsTrigger value="ai" data-testid="images-tab-ai">Genera con AI</TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <Card className="border-gray-100 mb-8" data-testid="upload-images-card">
            <CardContent className="p-6 grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>File immagine</Label><Input type="file" accept="image/*" onChange={(e) => setUploadForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))} data-testid="upload-image-file-input" /></div>
              <div className="space-y-2"><Label>Titolo</Label><Input value={uploadForm.title} onChange={(e) => setUploadForm((prev) => ({ ...prev, title: e.target.value }))} data-testid="upload-image-title-input" /></div>
              <div className="space-y-2 md:col-span-2"><Label>Descrizione</Label><Textarea value={uploadForm.description} onChange={(e) => setUploadForm((prev) => ({ ...prev, description: e.target.value }))} rows={3} data-testid="upload-image-description-input" /></div>
              <div className="space-y-2"><Label>Tag</Label><Input value={uploadForm.tags} onChange={(e) => setUploadForm((prev) => ({ ...prev, tags: e.target.value }))} placeholder="coaching, aula, trainer" data-testid="upload-image-tags-input" /></div>
              <div className="space-y-2"><Label>Corso associato (opzionale)</Label><Select value={uploadForm.courseId} onValueChange={(value) => setUploadForm((prev) => ({ ...prev, courseId: value }))}><SelectTrigger data-testid="upload-image-course-select"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Nessun corso</SelectItem>{courses.map((course) => <SelectItem key={course.course_id} value={course.course_id}>{course.title}</SelectItem>)}</SelectContent></Select></div>
              <div className="flex items-center justify-between rounded-xl border border-gray-100 p-3"><div><p className="text-sm font-medium">Ritaglia automaticamente</p><p className="text-xs text-gray-400">Crea subito le varianti quadrata, verticale e orizzontale</p></div><Switch checked={uploadForm.autoProcess} onCheckedChange={(value) => setUploadForm((prev) => ({ ...prev, autoProcess: value }))} data-testid="upload-image-auto-process-switch" /></div>
              <div className="flex items-center justify-between rounded-xl border border-gray-100 p-3"><div><p className="text-sm font-medium">Migliora immagine</p><p className="text-xs text-gray-400">Compressione e ottimizzazione leggera</p></div><Switch checked={uploadForm.autoImprove} onCheckedChange={(value) => setUploadForm((prev) => ({ ...prev, autoImprove: value }))} data-testid="upload-image-auto-improve-switch" /></div>
              <div className="flex items-center justify-between rounded-xl border border-gray-100 p-3 md:col-span-2"><div><p className="text-sm font-medium">Firma discreta Ariadne</p><p className="text-xs text-gray-400">Applica un piccolo overlay opzionale sulle varianti</p></div><Switch checked={uploadForm.overlayBrand} onCheckedChange={(value) => setUploadForm((prev) => ({ ...prev, overlayBrand: value }))} data-testid="upload-image-overlay-switch" /></div>
              <div className="md:col-span-2 flex justify-end"><Button className="gap-2" onClick={handleUploadAsset} data-testid="upload-image-submit-button"><ImagePlus className="w-4 h-4" /> Carica in libreria</Button></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="repository">
          <Card className="border-gray-100 mb-8" data-testid="repository-images-card">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-sm font-semibold">Repository immagini</h2>
                  <p className="text-xs text-gray-400">Organizza immagini per corso e indicizzale per l'abbinamento automatico.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="gap-2" onClick={handleIndexRepository} data-testid="repository-index-button"><FolderSync className="w-4 h-4" /> Indicizza repository immagini</Button>
                  <Button variant="ghost" className="gap-2" onClick={() => loadRepositoryImages(repoFilterCourse)} data-testid="repository-refresh-button"><RefreshCw className="w-4 h-4" /> Aggiorna</Button>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2"><Label>File immagine</Label><Input type="file" accept="image/*" onChange={(e) => setRepoUpload((prev) => ({ ...prev, file: e.target.files?.[0] || null }))} data-testid="repository-image-file-input" /></div>
                <div className="space-y-2"><Label>Titolo</Label><Input value={repoUpload.title} onChange={(e) => setRepoUpload((prev) => ({ ...prev, title: e.target.value }))} data-testid="repository-image-title-input" /></div>
                <div className="space-y-2"><Label>Tag</Label><Input value={repoUpload.tags} onChange={(e) => setRepoUpload((prev) => ({ ...prev, tags: e.target.value }))} data-testid="repository-image-tags-input" /></div>
                <div className="space-y-2"><Label>Corso</Label><Select value={repoUpload.courseId} onValueChange={(value) => setRepoUpload((prev) => ({ ...prev, courseId: value }))}><SelectTrigger data-testid="repository-image-course-select"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tutti i corsi</SelectItem>{courses.map((course) => <SelectItem key={course.course_id} value={course.course_id}>{course.title}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="flex justify-between gap-3 flex-wrap">
                <div className="space-y-2"><Label>Filtro sorgente</Label><Select value={repoFilterCourse} onValueChange={setRepoFilterCourse}><SelectTrigger className="w-[240px]" data-testid="repository-filter-course-select"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tutti i corsi</SelectItem>{courses.map((course) => <SelectItem key={course.course_id} value={course.course_id}>{course.title}</SelectItem>)}</SelectContent></Select></div>
                <Button className="gap-2 self-end" onClick={handleRepositoryUpload} data-testid="repository-image-upload-button"><ImagePlus className="w-4 h-4" /> Aggiungi al repository immagini</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {repositoryImages.map((item) => (
                  <Card key={item.id} className="border-gray-100 overflow-hidden" data-testid={`repository-image-card-${item.id}`}>
                    <div className="aspect-[16/10] bg-gray-50 overflow-hidden">{item.public_url && <img src={item.public_url} alt={item.filename} className="w-full h-full object-cover" data-testid={`repository-image-preview-${item.id}`} />}</div>
                    <CardContent className="p-4 space-y-2">
                      <h3 className="text-sm font-semibold" data-testid={`repository-image-title-${item.id}`}>{item.filename}</h3>
                      <p className="text-[11px] text-gray-400" data-testid={`repository-image-tags-${item.id}`}>{item.tags?.join(', ') || 'Nessun tag'}</p>
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className="text-[10px]">{item.course_id || 'tutti i corsi'}</Badge>
                        <Button size="sm" onClick={() => handleImportRepositoryImage(item.id)} data-testid={`repository-image-import-${item.id}`}>Importa in libreria</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card className="border-gray-100 mb-8" data-testid="generate-ai-image-card">
            <CardContent className="p-6 grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2"><Label>Prompt base</Label><Textarea value={aiForm.prompt} onChange={(e) => setAiForm((prev) => ({ ...prev, prompt: e.target.value }))} rows={5} placeholder="Es. Aula Ariadne luminosa con trainer e partecipanti in esercitazione di coaching creativo-esperienziale" data-testid="generate-ai-prompt-input" /></div>
              <div className="space-y-2"><Label>Stile</Label><Select value={aiForm.style} onValueChange={(value) => setAiForm((prev) => ({ ...prev, style: value }))}><SelectTrigger data-testid="generate-ai-style-select"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sobrio editoriale">Sobrio</SelectItem><SelectItem value="corporate elegante">Corporate</SelectItem><SelectItem value="umano autentico">Umano</SelectItem><SelectItem value="caldo formativo">Caldo formativo</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Corso associato</Label><Select value={aiForm.courseId} onValueChange={(value) => setAiForm((prev) => ({ ...prev, courseId: value }))}><SelectTrigger data-testid="generate-ai-course-select"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Nessun corso</SelectItem>{courses.map((course) => <SelectItem key={course.course_id} value={course.course_id}>{course.title}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Tag</Label><Input value={aiForm.tags} onChange={(e) => setAiForm((prev) => ({ ...prev, tags: e.target.value }))} placeholder="coaching, team, aula" data-testid="generate-ai-tags-input" /></div>
              <div className="flex items-center justify-between rounded-xl border border-gray-100 p-3"><div><p className="text-sm font-medium">Migliora immagine dopo la generazione</p><p className="text-xs text-gray-400">Applica subito le ottimizzazioni leggere</p></div><Switch checked={aiForm.autoImprove} onCheckedChange={(value) => setAiForm((prev) => ({ ...prev, autoImprove: value }))} data-testid="generate-ai-improve-switch" /></div>
              <div className="flex items-center justify-between rounded-xl border border-gray-100 p-3"><div><p className="text-sm font-medium">Firma discreta Ariadne</p><p className="text-xs text-gray-400">Overlay opzionale sulle varianti finali</p></div><Switch checked={aiForm.overlayBrand} onCheckedChange={(value) => setAiForm((prev) => ({ ...prev, overlayBrand: value }))} data-testid="generate-ai-overlay-switch" /></div>
              <div className="md:col-span-2 flex justify-end"><Button className="gap-2" onClick={handleGenerateAi} data-testid="generate-ai-submit-button"><Sparkles className="w-4 h-4" /> Genera e salva in libreria</Button></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h2 className="text-xl font-medium ariadne-heading">Libreria immagini</h2>
          <p className="text-sm text-gray-500">Asset pronti da abbinare ai post e usare su Buffer.</p>
        </div>
        <Button variant="ghost" className="gap-2" onClick={loadAssets} data-testid="images-refresh-assets-button"><RefreshCw className="w-4 h-4" /> Aggiorna libreria</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {assets.map((asset) => (
          <AssetCard key={asset.asset_id} asset={asset} selected={selectedAssets.includes(asset.asset_id)} onToggle={toggleSelected} onProcess={handleProcess} />
        ))}
      </div>

      {assets.length === 0 && (
        <div className="text-center py-16 text-gray-400" data-testid="images-empty-state">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-sm">Nessuna immagine in libreria</p>
          <p className="text-xs mt-1">Carica, importa o genera la tua prima immagine</p>
        </div>
      )}
    </div>
  );
}