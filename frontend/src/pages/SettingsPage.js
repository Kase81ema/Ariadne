import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useAuth } from '../contexts/AuthContext';
import { orgAPI, workspacesAPI, teamAPI } from '../lib/api';
import { Building2, Users, Layers, Plus, Pencil, Trash2, Shield, UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const PLAN_LABELS = { free: 'Free', starter: 'Starter', professional: 'Professional', agency: 'Agency', enterprise: 'Enterprise' };
const PLAN_COLORS = { free: 'bg-gray-100 text-gray-600', starter: 'bg-blue-50 text-blue-700', professional: 'bg-purple-50 text-purple-700', agency: 'bg-amber-50 text-amber-700', enterprise: 'bg-emerald-50 text-emerald-700' };

export default function SettingsPage() {
  const { org, user, loadUser } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [team, setTeam] = useState([]);
  const [orgData, setOrgData] = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showNewWs, setShowNewWs] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [newWsName, setNewWsName] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const [orgRes, wsRes, teamRes] = await Promise.all([orgAPI.get(), workspacesAPI.list(), teamAPI.list()]);
    setOrgData(orgRes.data);
    setWorkspaces(wsRes.data);
    setTeam(teamRes.data);
  };
  useEffect(() => { load(); }, []);

  const handleInvite = async () => {
    setLoading(true);
    try {
      const res = await teamAPI.invite({ email: inviteEmail, name: inviteName, role: inviteRole });
      toast.success(`User invited! Temporary password: ${res.data.temp_password}`);
      setShowInvite(false);
      setInviteEmail(''); setInviteName('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to invite');
    } finally { setLoading(false); }
  };

  const handleNewWorkspace = async () => {
    setLoading(true);
    try {
      await workspacesAPI.create({ name: newWsName });
      toast.success('Workspace created');
      setShowNewWs(false); setNewWsName('');
      load(); loadUser();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create workspace');
    } finally { setLoading(false); }
  };

  const plan = orgData?.plan || 'free';

  return (
    <div data-testid="settings-page">
      <h1 className="text-3xl font-semibold text-gray-900 mb-1">Settings</h1>
      <p className="text-sm text-gray-500 mb-8">Manage your organization, workspaces, and team.</p>

      {/* Org info */}
      <Card className="border-gray-100 mb-6" data-testid="org-card">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-[#2C3792]/8 flex items-center justify-center"><Building2 className="w-6 h-6 text-[#2C3792]" /></div>
            <div>
              <h2 className="text-lg font-semibold">{orgData?.name || org?.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={`text-xs ${PLAN_COLORS[plan]}`}>{PLAN_LABELS[plan]} Plan</Badge>
                <span className="text-xs text-gray-400">{orgData?.workspace_count || 0} workspaces · {orgData?.user_count || 0} users</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workspaces */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Layers className="w-5 h-5 text-[#2C3792]" /> Workspaces</h2>
        <Button size="sm" onClick={() => setShowNewWs(true)} className="gap-1 bg-[#2C3792] hover:bg-[#232E7A]" data-testid="new-workspace-btn"><Plus className="w-3.5 h-3.5" /> New Workspace</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
        {workspaces.map(ws => (
          <Card key={ws.workspace_id} className="border-gray-100" data-testid={`workspace-${ws.workspace_id}`}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#2C3792]/6 flex items-center justify-center"><Layers className="w-4 h-4 text-[#2C3792]" /></div>
              <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{ws.name}</p><p className="text-xs text-gray-400">{ws.description || 'No description'}</p></div>
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">{ws.status}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Team */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Users className="w-5 h-5 text-[#2C3792]" /> Team</h2>
        <Button size="sm" onClick={() => setShowInvite(true)} className="gap-1 bg-[#2C3792] hover:bg-[#232E7A]" data-testid="invite-user-btn"><UserPlus className="w-3.5 h-3.5" /> Invite User</Button>
      </div>
      <div className="space-y-2">
        {team.map(m => (
          <Card key={m.user_id} className="border-gray-100" data-testid={`team-${m.user_id}`}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">{m.name?.charAt(0)?.toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{m.name}</p>
                <p className="text-xs text-gray-400">{m.email}</p>
              </div>
              <Badge variant="outline" className="text-[10px]">{m.role?.replace('_', ' ')}</Badge>
              {m.suspended && <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700">Suspended</Badge>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Invite dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Invite Team Member</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2"><Label className="text-xs">Name</Label><Input value={inviteName} onChange={e => setInviteName(e.target.value)} data-testid="invite-name" /></div>
            <div className="space-y-2"><Label className="text-xs">Email</Label><Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} data-testid="invite-email" /></div>
            <div className="space-y-2">
              <Label className="text-xs">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger data-testid="invite-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="org_admin">Admin</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleInvite} disabled={!inviteEmail || !inviteName || loading} className="w-full bg-[#2C3792] hover:bg-[#232E7A]" data-testid="invite-submit">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Invite'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New workspace dialog */}
      <Dialog open={showNewWs} onOpenChange={setShowNewWs}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Workspace</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2"><Label className="text-xs">Workspace Name</Label><Input value={newWsName} onChange={e => setNewWsName(e.target.value)} placeholder="e.g. Client ABC" data-testid="new-ws-name" /></div>
            <Button onClick={handleNewWorkspace} disabled={!newWsName.trim() || loading} className="w-full bg-[#2C3792] hover:bg-[#232E7A]" data-testid="create-ws-submit">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Workspace'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
