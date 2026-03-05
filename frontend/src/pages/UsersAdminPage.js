import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { adminAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Users, Shield, ShieldCheck, UserCircle, Ban, Trash2,
  Search, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const ROLE_LABELS = { admin: 'Admin', editor: 'Editor', user: 'Utente' };
const ROLE_BADGES = { admin: 'badge-purple', editor: 'badge-blue', user: '' };
const LEVEL_LABELS = { interessato: 'Interessato', studente: 'Studente', alumni: 'Alumni' };

export default function UsersAdminPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');

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
      <div className="mb-10">
        <h1 className="text-4xl font-semibold ariadne-heading mb-2">Utenti</h1>
        <p className="text-base text-gray-500">
          Gestisci utenti, ruoli e moderazione
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
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-500 flex-shrink-0">
                  {u.name?.charAt(0)?.toUpperCase() || '?'}
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
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
                    <span>{u.post_count || 0} post</span>
                    {u.community_profile?.objective && <span>Obiettivo: {u.community_profile.objective}</span>}
                  </div>
                </div>
                {/* Actions - only admin can change roles */}
                {isAdmin && u.user_id !== currentUser.user_id && (
                  <div className="flex items-center gap-2 flex-shrink-0">
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
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && <div className="text-center py-16 text-gray-400 text-sm">Nessun utente trovato</div>}
        </div>
      )}
    </div>
  );
}
