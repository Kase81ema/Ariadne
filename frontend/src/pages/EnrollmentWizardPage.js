import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import { ScrollArea } from '../components/ui/scroll-area';
import { Switch } from '../components/ui/switch';
import { schoolAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowRight, Check, Loader2, User, MessageSquare,
  CreditCard, FileCheck, Upload, PartyPopper, AlertCircle
} from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Dati anagrafici', icon: User },
  { id: 2, label: 'Motivazione', icon: MessageSquare },
  { id: 3, label: 'Piano di pagamento', icon: CreditCard },
  { id: 4, label: 'Contratto e consensi', icon: FileCheck },
  { id: 5, label: 'Documenti', icon: Upload },
  { id: 6, label: 'Conferma', icon: PartyPopper },
];

const REFERRAL_OPTIONS = [
  { value: 'google', label: 'Ricerca Google' },
  { value: 'social', label: 'Social media' },
  { value: 'friend', label: 'Passaparola' },
  { value: 'event', label: 'Evento / webinar' },
  { value: 'icf', label: 'ICF / associazione coaching' },
  { value: 'other', label: 'Altro' },
];

const IBAN_ARIADNE = 'IT00 X000 0000 0000 0000 0000 000';

function validateCF(cf) {
  if (!cf) return false;
  return /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/i.test(cf.trim());
}

function Stepper({ currentStep, steps }) {
  return (
    <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2" data-testid="enrollment-stepper">
      {steps.map((step, i) => {
        const isActive = step.id === currentStep;
        const isDone = step.id < currentStep;
        const StepIcon = step.icon;
        return (
          <div key={step.id} className="flex items-center gap-1 flex-shrink-0">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium transition-colors ${
              isActive ? 'bg-gray-900 text-white' : isDone ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'
            }`} data-testid={`step-indicator-${step.id}`}>
              {isDone ? <Check className="w-3.5 h-3.5" /> : <StepIcon className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {i < steps.length - 1 && <div className="w-4 h-px bg-gray-200 flex-shrink-0" />}
          </div>
        );
      })}
    </div>
  );
}

export default function EnrollmentWizardPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Step 1 - Personal data
  const [personal, setPersonal] = useState({
    first_name: '', last_name: '', birth_date: '', birth_place: '',
    fiscal_code: '', phone: '', address: '', city: '', zip_code: '', province: '',
    billing_type: 'individual', billing_name: '', vat_number: '', sdi_code: '', pec: '',
  });

  // Step 2 - Motivation
  const [motivation, setMotivation] = useState('');
  const [background, setBackground] = useState('');
  const [referralSource, setReferralSource] = useState('');
  const [referralDetail, setReferralDetail] = useState('');

  // Step 3 - Payment plan
  const [paymentPlan, setPaymentPlan] = useState([]);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  // Step 4 - Contract
  const [consents, setConsents] = useState({
    contract: false, clauses: false, early_exec: false, privacy: false, images: false,
  });
  const [signatureText, setSignatureText] = useState('');

  // Step 5 - Documents
  const [idFile, setIdFile] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploadingId, setUploadingId] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState([]);

  useEffect(() => {
    const init = async () => {
      try {
        const [courseRes, detailsRes] = await Promise.all([
          schoolAPI.getTrainingCourseDetail(courseId),
          schoolAPI.getUserDetails(),
        ]);
        setCourse(courseRes.data);
        const d = detailsRes.data || {};
        setPersonal(prev => ({ ...prev, ...d }));

        // Create or resume enrollment
        const enrRes = await schoolAPI.createEnrollment({ course_id: courseId });
        const enr = enrRes.data;
        setEnrollment(enr);
        if (enr.current_step > 1) setStep(enr.current_step);
        if (enr.motivation) setMotivation(enr.motivation);
        if (enr.background) setBackground(enr.background);
        if (enr.referral_source) setReferralSource(enr.referral_source);
        if (enr.referral_detail) setReferralDetail(enr.referral_detail);
        if (enr.payment_plan?.length > 0) setPaymentPlan(enr.payment_plan);
        if (enr.consents) setConsents(prev => ({ ...prev, ...enr.consents }));
        if (enr.signature_text) setSignatureText(enr.signature_text);
        if (enr.documents?.length > 0) setUploadedDocs(enr.documents);
      } catch {
        toast.error('Qualcosa non ha funzionato. Riprova tra un momento');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [courseId]);

  // Auto-calculate payment plan when course loads and no plan exists
  useEffect(() => {
    if (course && paymentPlan.length === 0) {
      const price = parseFloat(String(course.price || '0').replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
      if (price > 0) {
        const today = new Date();
        setPaymentPlan([
          { description: 'Acconto (30%)', amount: Math.round(price * 0.30 * 100) / 100, due_date: today.toISOString().split('T')[0] },
          { description: 'Seconda rata (35%)', amount: Math.round(price * 0.35 * 100) / 100, due_date: new Date(today.getTime() + 90 * 86400000).toISOString().split('T')[0] },
          { description: 'Saldo (35%)', amount: Math.round(price * 0.35 * 100) / 100, due_date: new Date(today.getTime() + 180 * 86400000).toISOString().split('T')[0] },
        ]);
      }
    }
  }, [course, paymentPlan.length]);

  const saveDraft = useCallback(async (nextStep) => {
    if (!enrollment) return;
    setSaving(true);
    try {
      await schoolAPI.saveUserDetails(personal);
      await schoolAPI.updateEnrollment(enrollment.enrollment_id, {
        current_step: nextStep,
        motivation, background, referral_source: referralSource, referral_detail: referralDetail,
        payment_plan: paymentPlan,
      });
    } catch { /* silent save */ }
    finally { setSaving(false); }
  }, [enrollment, personal, motivation, background, referralSource, referralDetail, paymentPlan]);

  const goNext = async () => {
    const next = Math.min(step + 1, 6);
    await saveDraft(next);
    setStep(next);
    window.scrollTo(0, 0);
  };

  const goBack = () => {
    setStep(prev => Math.max(prev - 1, 1));
    window.scrollTo(0, 0);
  };

  const handleUploadId = async () => {
    if (!idFile || !enrollment) return;
    setUploadingId(true);
    try {
      const res = await schoolAPI.uploadEnrollmentDocument(enrollment.enrollment_id, idFile, 'identity');
      setUploadedDocs(prev => [...prev, res.data.document]);
      setIdFile(null);
      toast.success('Documento caricato');
    } catch { toast.error('Errore nel caricamento'); }
    finally { setUploadingId(false); }
  };

  const handleUploadReceipt = async () => {
    if (!receiptFile || !enrollment) return;
    setUploadingReceipt(true);
    try {
      const res = await schoolAPI.uploadEnrollmentDocument(enrollment.enrollment_id, receiptFile, 'receipt');
      setUploadedDocs(prev => [...prev, res.data.document]);
      setReceiptFile(null);
      toast.success('Ricevuta caricata');
    } catch { toast.error('Errore nel caricamento'); }
    finally { setUploadingReceipt(false); }
  };

  const handleConfirm = async () => {
    if (!enrollment) return;
    setSaving(true);
    try {
      await schoolAPI.saveEnrollmentContract(enrollment.enrollment_id, { consents, signature_text: signatureText });
      await schoolAPI.confirmEnrollment(enrollment.enrollment_id);
      setStep(6);
      toast.success('Ci siamo quasi — conferma e partiamo');
    } catch {
      toast.error('Qualcosa non ha funzionato. Riprova tra un momento');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  if (!course) return <div className="text-center py-16"><p className="text-gray-400">Corso non trovato</p></div>;

  const updatePersonal = (field, value) => setPersonal(prev => ({ ...prev, [field]: value }));
  const courseTitle = course.title || 'Percorso formativo';
  const fullName = `${personal.first_name} ${personal.last_name}`.trim();

  // Validation helpers
  const step1Valid = personal.first_name && personal.last_name && personal.fiscal_code && validateCF(personal.fiscal_code);
  const step2Valid = motivation.trim().length > 10;
  const step3Valid = paymentPlan.length > 0 && paymentConfirmed;
  const step4Valid = consents.contract && consents.clauses && consents.privacy && signatureText.trim().toLowerCase() === fullName.toLowerCase();
  const hasIdDoc = uploadedDocs.some(d => d.doc_type === 'identity');

  return (
    <div className="max-w-3xl mx-auto" data-testid="enrollment-wizard-page">
      <Button variant="ghost" size="sm" onClick={() => navigate(`/course/${courseId}`)} className="gap-1 mb-4 -ml-2" data-testid="wizard-back-btn">
        <ArrowLeft className="w-4 h-4" /> Torna alla scheda corso
      </Button>

      <div className="mb-6">
        <Badge variant="outline" className="text-[10px] mb-2">{courseTitle}</Badge>
        <h1 className="text-4xl font-semibold ariadne-heading mb-1">Iscrizione</h1>
        <p className="text-sm text-gray-500">Compila i dati con calma. Puoi sempre riprendere da dove hai lasciato.</p>
      </div>

      <Stepper currentStep={step} steps={STEPS} />

      {/* STEP 1: Personal data */}
      {step === 1 && (
        <Card className="border-gray-100" data-testid="wizard-step-1">
          <CardContent className="p-6 space-y-5">
            <h2 className="text-lg font-semibold">Dati anagrafici</h2>
            <p className="text-sm text-gray-500">Inserisci i tuoi dati personali. Serviranno per il contratto e la fatturazione.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={personal.first_name} onChange={e => updatePersonal('first_name', e.target.value)} data-testid="wizard-first-name" />
              </div>
              <div className="space-y-2">
                <Label>Cognome *</Label>
                <Input value={personal.last_name} onChange={e => updatePersonal('last_name', e.target.value)} data-testid="wizard-last-name" />
              </div>
              <div className="space-y-2">
                <Label>Data di nascita</Label>
                <Input type="date" value={personal.birth_date} onChange={e => updatePersonal('birth_date', e.target.value)} data-testid="wizard-birth-date" />
              </div>
              <div className="space-y-2">
                <Label>Luogo di nascita</Label>
                <Input value={personal.birth_place} onChange={e => updatePersonal('birth_place', e.target.value)} data-testid="wizard-birth-place" />
              </div>
              <div className="space-y-2">
                <Label>Codice fiscale *</Label>
                <Input value={personal.fiscal_code} onChange={e => updatePersonal('fiscal_code', e.target.value.toUpperCase())} maxLength={16} data-testid="wizard-fiscal-code" />
                {personal.fiscal_code && !validateCF(personal.fiscal_code) && (
                  <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Formato non valido</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Telefono</Label>
                <Input value={personal.phone} onChange={e => updatePersonal('phone', e.target.value)} data-testid="wizard-phone" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Indirizzo</Label>
                <Input value={personal.address} onChange={e => updatePersonal('address', e.target.value)} data-testid="wizard-address" />
              </div>
              <div className="space-y-2">
                <Label>Città</Label>
                <Input value={personal.city} onChange={e => updatePersonal('city', e.target.value)} data-testid="wizard-city" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CAP</Label>
                  <Input value={personal.zip_code} onChange={e => updatePersonal('zip_code', e.target.value)} maxLength={5} data-testid="wizard-zip" />
                </div>
                <div className="space-y-2">
                  <Label>Provincia</Label>
                  <Input value={personal.province} onChange={e => updatePersonal('province', e.target.value.toUpperCase())} maxLength={2} data-testid="wizard-province" />
                </div>
              </div>
            </div>
            <Separator />
            <h3 className="text-sm font-semibold">Fatturazione</h3>
            <div className="flex items-center gap-3">
              <Switch checked={personal.billing_type === 'company'} onCheckedChange={v => updatePersonal('billing_type', v ? 'company' : 'individual')} data-testid="wizard-billing-toggle" />
              <span className="text-sm text-gray-600">{personal.billing_type === 'company' ? 'Intestata a una società' : 'La fattura è intestata a me'}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {personal.billing_type === 'company' && (
                <div className="space-y-2 md:col-span-2">
                  <Label>Ragione sociale</Label>
                  <Input value={personal.billing_name} onChange={e => updatePersonal('billing_name', e.target.value)} data-testid="wizard-billing-name" />
                </div>
              )}
              <div className="space-y-2">
                <Label>PEC</Label>
                <Input value={personal.pec} onChange={e => updatePersonal('pec', e.target.value)} data-testid="wizard-pec" />
              </div>
              <div className="space-y-2">
                <Label>Codice SDI</Label>
                <Input value={personal.sdi_code} onChange={e => updatePersonal('sdi_code', e.target.value.toUpperCase())} maxLength={7} data-testid="wizard-sdi" />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button disabled={!step1Valid} onClick={goNext} className="gap-2" data-testid="wizard-next-1">
                Avanti <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: Motivation */}
      {step === 2 && (
        <Card className="border-gray-100" data-testid="wizard-step-2">
          <CardContent className="p-6 space-y-5">
            <h2 className="text-lg font-semibold">Motivazione e background</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              Prima di procedere, ci piacerebbe conoscerti un po'. Le risposte che scriverai qui le leggeremo davvero — non è un modulo, è un primo scambio.
            </p>
            <div className="space-y-2">
              <Label>Cosa ti porta ad Ariadne? *</Label>
              <Textarea value={motivation} onChange={e => setMotivation(e.target.value)} placeholder="Racconta cosa ti ha spinto a interessarti a questo percorso..." rows={4} data-testid="wizard-motivation" />
            </div>
            <div className="space-y-2">
              <Label>Il tuo background formativo (facoltativo)</Label>
              <Textarea value={background} onChange={e => setBackground(e.target.value)} placeholder="Esperienze, studi, percorsi precedenti..." rows={3} data-testid="wizard-background" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Come ci hai conosciuti?</Label>
                <Select value={referralSource} onValueChange={setReferralSource}>
                  <SelectTrigger data-testid="wizard-referral-source"><SelectValue placeholder="Seleziona" /></SelectTrigger>
                  <SelectContent>
                    {REFERRAL_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Referral / dettagli (facoltativo)</Label>
                <Input value={referralDetail} onChange={e => setReferralDetail(e.target.value)} placeholder="Nome di chi ti ha suggerito..." data-testid="wizard-referral-detail" />
              </div>
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={goBack} className="gap-2" data-testid="wizard-back-2"><ArrowLeft className="w-4 h-4" /> Indietro</Button>
              <Button disabled={!step2Valid} onClick={goNext} className="gap-2" data-testid="wizard-next-2">Avanti <ArrowRight className="w-4 h-4" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: Payment */}
      {step === 3 && (
        <Card className="border-gray-100" data-testid="wizard-step-3">
          <CardContent className="p-6 space-y-5">
            <h2 className="text-lg font-semibold">Piano di pagamento</h2>
            <p className="text-sm text-gray-500">Il pagamento avviene tramite bonifico bancario. Ecco il piano rate calcolato per te.</p>
            <div className="space-y-3">
              {paymentPlan.map((item, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_120px_140px] gap-3 items-center p-4 rounded-xl border border-gray-100 bg-gray-50/50" data-testid={`wizard-payment-row-${i}`}>
                  <p className="text-sm font-medium text-gray-700">{item.description}</p>
                  <p className="text-sm font-semibold">€ {Number(item.amount || 0).toFixed(2)}</p>
                  <p className="text-sm text-gray-500">{item.due_date ? new Date(item.due_date).toLocaleDateString('it-IT') : '—'}</p>
                </div>
              ))}
              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/80">
                <p className="text-sm font-semibold mb-1">Totale: € {paymentPlan.reduce((s, i) => s + Number(i.amount || 0), 0).toFixed(2)}</p>
              </div>
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-2">
              <h3 className="text-sm font-semibold text-blue-800">Coordinate bancarie Ariadne</h3>
              <p className="text-sm text-blue-700 font-mono">{IBAN_ARIADNE}</p>
              <p className="text-xs text-blue-600">Causale: Iscrizione {courseTitle} — {fullName}</p>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox checked={paymentConfirmed} onCheckedChange={setPaymentConfirmed} id="payment-confirm" data-testid="wizard-payment-confirm" />
              <label htmlFor="payment-confirm" className="text-sm text-gray-600 cursor-pointer">Ho preso visione del piano rate e delle coordinate per il bonifico</label>
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={goBack} className="gap-2" data-testid="wizard-back-3"><ArrowLeft className="w-4 h-4" /> Indietro</Button>
              <Button disabled={!step3Valid} onClick={goNext} className="gap-2" data-testid="wizard-next-3">Avanti <ArrowRight className="w-4 h-4" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 4: Contract */}
      {step === 4 && (
        <Card className="border-gray-100" data-testid="wizard-step-4">
          <CardContent className="p-6 space-y-5">
            <h2 className="text-lg font-semibold">Contratto e consensi</h2>
            <p className="text-sm text-gray-500">Leggi attentamente il contratto e conferma i consensi richiesti.</p>
            <ScrollArea className="h-[280px] rounded-xl border border-gray-100 p-4 bg-gray-50/50">
              <div className="prose prose-sm max-w-none text-gray-600">
                <h3>Contratto di iscrizione al percorso "{courseTitle}"</h3>
                <p><strong>Contraente:</strong> {fullName}, C.F. {personal.fiscal_code || '___'}</p>
                <p><strong>Indirizzo:</strong> {personal.address || '___'}, {personal.city || '___'} ({personal.province || '___'}) {personal.zip_code || '___'}</p>
                <p>Il presente contratto regola i termini della partecipazione al percorso formativo "{courseTitle}" organizzato da Ariadne Training.</p>
                <p><strong>Art. 1 — Oggetto.</strong> Ariadne Training si impegna a erogare il percorso formativo sopra indicato secondo il programma, il calendario e le modalità comunicati al corsista.</p>
                <p><strong>Art. 2 — Durata e sede.</strong> Il percorso si svolgerà secondo il calendario pubblicato sulla piattaforma e potrà prevedere sessioni in presenza e/o online.</p>
                <p><strong>Art. 3 — Corrispettivo.</strong> Il corsista si impegna a corrispondere il prezzo concordato secondo il piano rate accettato nello step precedente.</p>
                <p><strong>Art. 4 — Recesso.</strong> Il corsista ha diritto di recedere entro 14 giorni dalla firma del presente contratto, secondo quanto previsto dal D.Lgs. 206/2005 (Codice del Consumo).</p>
                <p><strong>Art. 5-19.</strong> [Clausole complete del contratto Ariadne Training relative a proprietà intellettuale, riservatezza, responsabilità, trattamento dati, foro competente, ecc.]</p>
              </div>
            </ScrollArea>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Checkbox checked={consents.contract} onCheckedChange={v => setConsents(p => ({ ...p, contract: v }))} id="c-contract" data-testid="wizard-consent-contract" />
                <label htmlFor="c-contract" className="text-sm text-gray-600 cursor-pointer">Accetto il contratto (artt. 1-19) *</label>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox checked={consents.clauses} onCheckedChange={v => setConsents(p => ({ ...p, clauses: v }))} id="c-clauses" data-testid="wizard-consent-clauses" />
                <label htmlFor="c-clauses" className="text-sm text-gray-600 cursor-pointer">Approvo le clausole vessatorie (art. 1341 c.c.) *</label>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox checked={consents.early_exec} onCheckedChange={v => setConsents(p => ({ ...p, early_exec: v }))} id="c-early" data-testid="wizard-consent-early" />
                <label htmlFor="c-early" className="text-sm text-gray-600 cursor-pointer">Richiedo l'esecuzione anticipata del servizio (facoltativo)</label>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox checked={consents.privacy} onCheckedChange={v => setConsents(p => ({ ...p, privacy: v }))} id="c-privacy" data-testid="wizard-consent-privacy" />
                <label htmlFor="c-privacy" className="text-sm text-gray-600 cursor-pointer">Ho letto l'informativa privacy *</label>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox checked={consents.images} onCheckedChange={v => setConsents(p => ({ ...p, images: v }))} id="c-images" data-testid="wizard-consent-images" />
                <label htmlFor="c-images" className="text-sm text-gray-600 cursor-pointer">Consenso all'utilizzo di immagini/video (facoltativo)</label>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Firma: riscrivi il tuo nome e cognome per firmare *</Label>
              <Input value={signatureText} onChange={e => setSignatureText(e.target.value)} placeholder={fullName || 'Nome Cognome'} data-testid="wizard-signature" />
              {signatureText && signatureText.trim().toLowerCase() !== fullName.toLowerCase() && (
                <p className="text-xs text-amber-600">La firma deve corrispondere a: {fullName}</p>
              )}
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={goBack} className="gap-2" data-testid="wizard-back-4"><ArrowLeft className="w-4 h-4" /> Indietro</Button>
              <Button disabled={!step4Valid} onClick={goNext} className="gap-2" data-testid="wizard-next-4">Avanti <ArrowRight className="w-4 h-4" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 5: Documents */}
      {step === 5 && (
        <Card className="border-gray-100" data-testid="wizard-step-5">
          <CardContent className="p-6 space-y-5">
            <h2 className="text-lg font-semibold">Upload documenti</h2>
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-100 p-4 space-y-3">
                <Label>Documento d'identità (JPG, PNG o PDF) {!hasIdDoc && '*'}</Label>
                <div className="flex items-center gap-3">
                  <Input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={e => setIdFile(e.target.files?.[0])} data-testid="wizard-id-file" />
                  <Button size="sm" disabled={!idFile || uploadingId} onClick={handleUploadId} data-testid="wizard-upload-id">
                    {uploadingId ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Carica'}
                  </Button>
                </div>
                {hasIdDoc && <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">Caricato</Badge>}
              </div>
              <div className="rounded-xl border border-gray-100 p-4 space-y-3">
                <Label>Ricevuta bonifico (facoltativa)</Label>
                <p className="text-xs text-gray-400">Non hai ancora fatto il bonifico? Puoi caricare la ricevuta anche più tardi.</p>
                <div className="flex items-center gap-3">
                  <Input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={e => setReceiptFile(e.target.files?.[0])} data-testid="wizard-receipt-file" />
                  <Button size="sm" disabled={!receiptFile || uploadingReceipt} onClick={handleUploadReceipt} data-testid="wizard-upload-receipt">
                    {uploadingReceipt ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Carica'}
                  </Button>
                </div>
                {uploadedDocs.some(d => d.doc_type === 'receipt') && <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">Caricata</Badge>}
              </div>
            </div>
            {uploadedDocs.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Documenti caricati</p>
                {uploadedDocs.map((doc, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    {doc.file_name || doc.doc_type}
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={goBack} className="gap-2" data-testid="wizard-back-5"><ArrowLeft className="w-4 h-4" /> Indietro</Button>
              <Button disabled={!hasIdDoc} onClick={handleConfirm} className="gap-2" data-testid="wizard-confirm-btn">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Confermo l'iscrizione
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 6: Confirmation */}
      {step === 6 && (
        <Card className="border-gray-100" data-testid="wizard-step-6">
          <CardContent className="p-10 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
              <PartyPopper className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-semibold ariadne-heading">Benvenuto/a nel percorso!</h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
              La tua iscrizione a <strong>{courseTitle}</strong> è stata registrata. Riceverai una conferma via email con tutti i dettagli.
            </p>
            <div className="flex items-center justify-center gap-3 pt-4">
              <Button onClick={() => navigate('/my-enrollments')} className="gap-2" data-testid="wizard-goto-enrollments">
                Le mie iscrizioni <ArrowRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={() => navigate('/community')} data-testid="wizard-goto-home">
                Torna alla home
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
