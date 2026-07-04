import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Separator } from '../components/ui/separator';
import { schoolAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Save, User, FileText, Building2 } from 'lucide-react';

const EMPTY_FORM = {
  first_name: '', last_name: '', birth_date: '', birth_place: '',
  fiscal_code: '', phone: '',
  address: '', city: '', zip_code: '', province: '',
  billing_type: 'individual',
  billing_name: '', vat_number: '', sdi_code: '', pec: '',
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    schoolAPI.getUserDetails().then(({ data }) => {
      setForm(prev => ({ ...prev, ...data }));
      setDocuments(data.documents || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const emptyBorder = (field) => !form[field] ? 'border-[#f9af43]/40' : '';

  const handleSave = async () => {
    setSaving(true);
    try {
      await schoolAPI.saveUserDetails(form);
      toast.success('Fatto, tutto salvato');
    } catch {
      toast.error('Qualcosa non ha funzionato. Riprova tra un momento');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  const isCompany = form.billing_type === 'company';

  return (
    <div className="max-w-3xl mx-auto" data-testid="profile-page">
      <Button variant="ghost" size="sm" onClick={() => navigate('/community')} className="gap-1 mb-6 -ml-2" data-testid="profile-back-btn">
        <ArrowLeft className="w-4 h-4" /> Il mio spazio
      </Button>

      <div className="mb-8">
        <h1 className="text-4xl font-semibold ariadne-heading mb-2">Il mio profilo</h1>
        <p className="text-base text-gray-500">I tuoi dati personali e di fatturazione. Potrai modificarli in qualsiasi momento.</p>
      </div>

      {/* Incomplete profile notice */}
      {(!form.first_name || !form.last_name || !form.phone || !form.fiscal_code) && (
        <div className="mb-6 rounded-xl border border-[#f9af43]/30 bg-[#f9af43]/[0.04] p-4" data-testid="profile-incomplete-notice">
          <p className="text-sm text-gray-700">Completa i tuoi dati — ci serviranno se deciderai di iscriverti a un percorso.</p>
        </div>
      )}

      {/* Personal data */}
      <Card className="border-gray-100 mb-6" data-testid="profile-personal-card">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4 text-gray-400" />
            <h2 className="text-base font-semibold">Dati anagrafici</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input className={emptyBorder('first_name')} value={form.first_name} onChange={e => update('first_name', e.target.value)} placeholder="Nome" data-testid="profile-first-name" />
            </div>
            <div className="space-y-2">
              <Label>Cognome</Label>
              <Input className={emptyBorder('last_name')} value={form.last_name} onChange={e => update('last_name', e.target.value)} placeholder="Cognome" data-testid="profile-last-name" />
            </div>
            <div className="space-y-2">
              <Label>Data di nascita</Label>
              <Input type="date" value={form.birth_date} onChange={e => update('birth_date', e.target.value)} data-testid="profile-birth-date" />
            </div>
            <div className="space-y-2">
              <Label>Luogo di nascita</Label>
              <Input value={form.birth_place} onChange={e => update('birth_place', e.target.value)} placeholder="Luogo di nascita" data-testid="profile-birth-place" />
            </div>
            <div className="space-y-2">
              <Label>Codice fiscale</Label>
              <Input value={form.fiscal_code} onChange={e => update('fiscal_code', e.target.value.toUpperCase())} placeholder="RSSMRA80A01H501Z" maxLength={16} data-testid="profile-fiscal-code" />
            </div>
            <div className="space-y-2">
              <Label>Telefono</Label>
              <Input className={emptyBorder('phone')} value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+39 333 1234567" data-testid="profile-phone" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card className="border-gray-100 mb-6" data-testid="profile-address-card">
        <CardContent className="p-6 space-y-5">
          <h2 className="text-base font-semibold">Indirizzo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Via / Piazza</Label>
              <Input value={form.address} onChange={e => update('address', e.target.value)} placeholder="Via Roma 1" data-testid="profile-address" />
            </div>
            <div className="space-y-2">
              <Label>Città</Label>
              <Input value={form.city} onChange={e => update('city', e.target.value)} placeholder="Milano" data-testid="profile-city" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CAP</Label>
                <Input value={form.zip_code} onChange={e => update('zip_code', e.target.value)} placeholder="20100" maxLength={5} data-testid="profile-zip" />
              </div>
              <div className="space-y-2">
                <Label>Provincia</Label>
                <Input value={form.province} onChange={e => update('province', e.target.value.toUpperCase())} placeholder="MI" maxLength={2} data-testid="profile-province" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing */}
      <Card className="border-gray-100 mb-6" data-testid="profile-billing-card">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-gray-400" />
            <h2 className="text-base font-semibold">Dati di fatturazione</h2>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={isCompany}
              onCheckedChange={(checked) => update('billing_type', checked ? 'company' : 'individual')}
              data-testid="profile-billing-toggle"
            />
            <span className="text-sm text-gray-600">{isCompany ? 'Intestata a una società' : 'La fattura è intestata a me'}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isCompany && (
              <div className="space-y-2 md:col-span-2">
                <Label>Ragione sociale</Label>
                <Input value={form.billing_name} onChange={e => update('billing_name', e.target.value)} placeholder="Ariadne Training Srl" data-testid="profile-billing-name" />
              </div>
            )}
            <div className="space-y-2">
              <Label>Partita IVA</Label>
              <Input value={form.vat_number} onChange={e => update('vat_number', e.target.value)} placeholder="IT01234567890" data-testid="profile-vat" />
            </div>
            <div className="space-y-2">
              <Label>Codice SDI</Label>
              <Input value={form.sdi_code} onChange={e => update('sdi_code', e.target.value.toUpperCase())} placeholder="0000000" maxLength={7} data-testid="profile-sdi" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>PEC</Label>
              <Input type="email" value={form.pec} onChange={e => update('pec', e.target.value)} placeholder="fatture@pec.it" data-testid="profile-pec" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents */}
      <Card className="border-gray-100 mb-6" data-testid="profile-documents-card">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-gray-400" />
            <h2 className="text-base font-semibold">I miei documenti caricati</h2>
          </div>
          {documents.length > 0 ? (
            <div className="space-y-2">
              {documents.map((doc, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50">
                  <div>
                    <p className="text-sm font-medium">{doc.file_name || doc.doc_type}</p>
                    <p className="text-xs text-gray-400">{doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString('it-IT') : ''}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => window.open(`${process.env.REACT_APP_BACKEND_URL}${doc.file_path}`, '_blank')} data-testid={`profile-doc-download-${i}`}>
                    Scarica
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">{"I documenti che caricherai durante l'iscrizione appariranno qui."}</p>
          )}
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2 px-8" data-testid="profile-save-btn">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salva profilo
        </Button>
      </div>
    </div>
  );
}
