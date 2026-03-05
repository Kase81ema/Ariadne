import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Separator } from '../components/ui/separator';
import { adminAPI, schoolAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Users, Ban, Trash2, Search, Loader2, ChevronRight,
  CreditCard, FileText, Plus, X, AlertTriangle, Check
} from 'lucide-react';
import { toast } from 'sonner';

const ROLE_LABELS = { admin: 'Admin', editor: 'Editor', user: 'Utente' };
const ROLE_BADGES = { admin: 'badge-purple', editor: 'badge-blue', user: '' };
const LEVEL_LABELS = { interessato: 'Interessato', studente: 'Studente', alumni: 'Alumni' };
const PAYMENT_STATUS = {
  pending: { label: 'In attesa', badge: 'badge-orange' },
  paid: { label: 'Pagata', badge: 'badge-green' },
  overdue: { label: 'Scaduta', badge: 'badge-red' },
};

function UserDetailsDialog({ userId, open, onClose }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [details, setDetails] = useState({});
  const [saving, setSaving] = useState(false);
  const [newInstallment, setNewInstallment] = useState({ description: '', amount: '', due_date: '' });
  const [addingInstallment, setAddingInstallment] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;
    setLoading(true);
    schoolAPI.adminGetUserDetails(userId).then(r => {
      setData(r.data);
      setDetails(r.data.details || {});
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [open, userId]);

  const handleSaveDetails = async () => {
    setSaving(true);
    try {
      await schoolAPI.adminSaveUserDetails(userId, details);
      toast.success('Dati fatturazione salvati');
    } catch { toast.error('Errore'); }
    finally { setSaving(false); }
  };

  const handleAddInstallment = async () => {
    if (!newInstallment.amount || !newInstallment.due_date) return;
    try {
      const res = await schoolAPI.adminCreateInstallment({ user_id: userId, ...newInstallment, amount: parseFloat(newInstallment.amount) });
      setData(prev => ({ ...prev, installments: [...(prev.installments || []), res.data] }));
      setNewInstallment({ description: '', amount: '', due_date: '' });
      setAddingInstallment(false);
      toast.success('Rata aggiunta');
    } catch { toast.error('Errore'); }
  };

  const handleUpdateInstallment = async (instId, status) => {
    try {
      await schoolAPI.adminUpdateInstallment(instId, { status });
      setData(prev => ({
        ...prev,
        installments: prev.installments.map(i => i.installment_id === instId ? { ...i, status } : i)
      }));
      toast.success('Stato rata aggiornato');
    } catch { toast.error('Errore'); }
  };

  const handleDeleteInstallment = async (instId) => {
    try {
      await schoolAPI.adminDeleteInstallment(instId);
      setData(prev => ({ ...prev, installments: prev.installments.filter(i => i.installment_id !== instId) }));
      toast.success('Rata eliminata');
    } catch { toast.error('Errore'); }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" aria-describedby="user-details-desc">
        <DialogHeader>
          <DialogTitle className="ariadne-heading text-xl">
            {data?.user?.name || 'Dettagli utente'}
          </DialogTitle>
          <p id="user-details-desc" className="text-sm text-gray-500">Dati fatturazione e gestione pagamenti</p>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" /></div>
        ) : (
          <div className="space-y-6">
            {/* User info summary */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-500">
                {data?.user?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div>
                <p className="text-sm font-medium">{data?.user?.name}</p>
                <p className="text-xs text-gray-400">{data?.user?.email}</p>
              </div>
              <Badge variant="outline" className={`ml-auto text-[10px] ${ROLE_BADGES[data?.user?.role]}`}>{ROLE_LABELS[data?.user?.role]}</Badge>
            </div>

            <Separator />

            {/* Billing details */}
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><FileText className="w-4 h-4" /> Dati fatturazione</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'billing_name', label: 'Ragione sociale / Nome' },
                  { key: 'fiscal_code', label: 'Codice fiscale' },
                  { key: 'vat_number', label: 'Partita IVA' },
                  { key: 'sdi_code', label: 'Codice SDI' },
                  { key: 'pec', label: 'PEC' },
                  { key: 'phone', label: 'Telefono' },
                  { key: 'address', label: 'Indirizzo' },
                  { key: 'city', label: 'Citta' },
                  { key: 'zip_code', label: 'CAP' },
                  { key: 'province', label: 'Provincia' },
                ].map(f => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{f.label}</Label>
                    <Input
                      value={details[f.key] || ''}
                      onChange={e => setDetails(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className="h-8 text-xs"
                      placeholder={f.label}
                      data-testid={`detail-${f.key}`}
                    />
                  </div>
                ))}
              </div>
              <Button onClick={handleSaveDetails} disabled={saving} size="sm" className="mt-3 gap-1" data-testid="save-details-btn">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Salva dati
              </Button>
            </div>

            <Separator />

            {/* Payment installments */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2"><CreditCard className="w-4 h-4" /> Rate e pagamenti</h3>
                <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setAddingInstallment(!addingInstallment)} data-testid="add-installment-btn">
                  <Plus className="w-3 h-3" /> Nuova rata
                </Button>
              </div>

              {addingInstallment && (
                <div className="p-3 border border-dashed border-gray-200 rounded-lg mb-3 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <Input value={newInstallment.description} onChange={e => setNewInstallment(p => ({ ...p, description: e.target.value }))} placeholder="Descrizione" className="h-8 text-xs" data-testid="new-inst-desc" />
                    <Input type="number" value={newInstallment.amount} onChange={e => setNewInstallment(p => ({ ...p, amount: e.target.value }))} placeholder="Importo EUR" className="h-8 text-xs" data-testid="new-inst-amount" />
                    <Input type="date" value={newInstallment.due_date} onChange={e => setNewInstallment(p => ({ ...p, due_date: e.target.value }))} className="h-8 text-xs" data-testid="new-inst-date" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddInstallment} className="text-xs h-7" data-testid="confirm-inst-btn">Aggiungi</Button>
                    <Button variant="ghost" size="sm" onClick={() => setAddingInstallment(false)} className="text-xs h-7">Annulla</Button>
                  </div>
                </div>
              )}

              {data?.installments?.length > 0 ? (
                <div className="space-y-2">
                  {data.installments.map(inst => {
                    const isOverdue = inst.status === 'pending' && inst.due_date < today;
                    const displayStatus = isOverdue ? 'overdue' : inst.status;
                    const ps = PAYMENT_STATUS[displayStatus] || PAYMENT_STATUS.pending;
                    return (
                      <div key={inst.installment_id} className={`flex items-center gap-3 p-3 rounded-lg border ${isOverdue ? 'border-red-200 bg-red-50/50' : 'border-gray-100'}`} data-testid={`installment-${inst.installment_id}`}>
                        {isOverdue && <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">{inst.description || 'Rata'}</p>
                          <p className="text-[11px] text-gray-400">Scadenza: {new Date(inst.due_date).toLocaleDateString('it-IT')}</p>
                        </div>
                        <span className="text-sm font-semibold">{Number(inst.amount).toFixed(2)} EUR</span>
                        <Badge variant="outline" className={`text-[10px] ${ps.badge}`}>{ps.label}</Badge>
                        <Select value={inst.status} onValueChange={v => handleUpdateInstallment(inst.installment_id, v)}>
                          <SelectTrigger className="h-7 w-24 text-[10px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">In attesa</SelectItem>
                            <SelectItem value="paid">Pagata</SelectItem>
                          </SelectContent>
                        </Select>
                        <button onClick={() => handleDeleteInstallment(inst.installment_id)} className="text-gray-300 hover:text-red-400">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-4">Nessuna rata configurata</p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function UsersAdminPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState(null);

  const load = () => {
    adminAPI.listUsers().then(r => { setUsers(r.data); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleChangeRole = async (userId, newRole) => {
    try {
      await adminAPI.changeRole(userId, newRole);
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, role: newRole } : u));
      toast.success(`Ruolo aggiornato a ${ROLE_LABELS[newRole]}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore');
    }
  };

  const handleSuspend = async (userId) => {
    try {
      const res = await adminAPI.toggleSuspend(userId);
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, suspended: res.data.suspended } : u));
      toast.success(res.data.suspended ? 'Utente sospeso' : 'Sospensione rimossa');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore');
    }
  };

  const handleRemoveContent = async (userId) => {
    if (!window.confirm('Rimuovere tutti i contenuti di questo utente? (post e commenti)')) return;
    try {
      const res = await adminAPI.removeContent(userId);
      toast.success(`Rimossi ${res.data.posts_removed} post e ${res.data.comments_removed} commenti`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore');
    }
  };

  const filtered = users.filter(u => {
    if (search && !u.name?.toLowerCase().includes(search.toLowerCase()) && !u.email?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterRole !== 'all' && u.role !== filterRole) return false;
    return true;
  });

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div data-testid="users-admin-page">
      <UserDetailsDialog userId={selectedUserId} open={!!selectedUserId} onClose={() => setSelectedUserId(null)} />

      <div className="mb-10">
        <h1 className="text-4xl font-semibold ariadne-heading mb-2">Utenti</h1>
        <p className="text-base text-gray-500">
          Gestisci utenti, ruoli, fatturazione e pagamenti
          <span className="ml-2 text-xs text-gray-400">({users.length} totali)</span>
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca per nome o email..."
            className="pl-9"
            data-testid="users-search"
          />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-40" data-testid="users-filter-role"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i ruoli</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="editor">Editor</SelectItem>
            <SelectItem value="user">Utente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users list */}
      {loading ? (
        <div className="text-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" /></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(u => (
            <Card key={u.user_id} className={`border-gray-100 ${u.suspended ? 'opacity-60' : ''}`} data-testid={`user-card-${u.user_id}`}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 overflow-hidden" style={{ background: `hsl(${(u.name?.charCodeAt(0) || 0) * 7 % 360} 60% 90%)`, color: `hsl(${(u.name?.charCodeAt(0) || 0) * 7 % 360} 60% 35%)` }}>
                  {u.picture ? <img src={u.picture} alt="" className="w-full h-full object-cover" /> : u.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-sm font-semibold text-gray-900">{u.name}</h3>
                    <Badge variant="outline" className={`text-[10px] ${ROLE_BADGES[u.role]}`}>{ROLE_LABELS[u.role]}</Badge>
                    {u.suspended && <Badge variant="outline" className="text-[10px] badge-red">Sospeso</Badge>}
                    {u.community_profile?.level && (
                      <Badge variant="outline" className="text-[10px]">{LEVEL_LABELS[u.community_profile.level] || u.community_profile.level}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="outline" size="sm"
                    className="gap-1 text-xs h-8"
                    onClick={() => setSelectedUserId(u.user_id)}
                    data-testid={`user-details-${u.user_id}`}
                  >
                    <FileText className="w-3 h-3" />
                    Dettagli
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                  {isAdmin && u.user_id !== currentUser.user_id && (
                    <>
                      <Select value={u.role} onValueChange={(v) => handleChangeRole(u.user_id, v)}>
                        <SelectTrigger className="h-8 text-xs w-24" data-testid={`role-select-${u.user_id}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="user">Utente</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost" size="icon" className="w-8 h-8"
                        onClick={() => handleSuspend(u.user_id)}
                        title={u.suspended ? 'Riattiva' : 'Sospendi'}
                        data-testid={`suspend-${u.user_id}`}
                      >
                        <Ban className={`w-4 h-4 ${u.suspended ? 'text-green-500' : 'text-orange-400'}`} />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="w-8 h-8"
                        onClick={() => handleRemoveContent(u.user_id)}
                        title="Rimuovi contenuti"
                        data-testid={`remove-content-${u.user_id}`}
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && <div className="text-center py-16 text-gray-400 text-sm">Nessun utente trovato</div>}
        </div>
      )}
    </div>
  );
}
