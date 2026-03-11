import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { adminAPI } from '../lib/api';
import { Building2, Users, Layers, BarChart3, Shield } from 'lucide-react';
import { toast } from 'sonner';

const PLAN_LABELS = { free: 'Free', starter: 'Starter', professional: 'Professional', agency: 'Agency', enterprise: 'Enterprise' };
const PLAN_COLORS = { free: 'bg-gray-100 text-gray-600', starter: 'bg-blue-50 text-blue-700', professional: 'bg-purple-50 text-purple-700', agency: 'bg-amber-50 text-amber-700', enterprise: 'bg-emerald-50 text-emerald-700' };

export default function AdminPage() {
  const [stats, setStats] = useState({});
  const [orgs, setOrgs] = useState([]);

  const load = async () => {
    const [statsRes, orgsRes] = await Promise.all([adminAPI.stats(), adminAPI.organizations()]);
    setStats(statsRes.data);
    setOrgs(orgsRes.data);
  };
  useEffect(() => { load(); }, []);

  const updateOrgPlan = async (orgId, plan) => {
    await adminAPI.updateOrg(orgId, { plan });
    toast.success('Plan updated');
    load();
  };

  const updateOrgStatus = async (orgId, status) => {
    await adminAPI.updateOrg(orgId, { license_status: status });
    toast.success('License status updated');
    load();
  };

  return (
    <div data-testid="admin-page">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="w-6 h-6 text-[#A42593]" />
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Intentio Admin</h1>
          <p className="text-sm text-gray-500">Platform overview and license management</p>
        </div>
      </div>

      {/* Platform stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Organizations', value: stats.total_organizations || 0, icon: Building2, color: '#2C3792' },
          { label: 'Active', value: stats.active_organizations || 0, icon: Building2, color: '#10B981' },
          { label: 'Users', value: stats.total_users || 0, icon: Users, color: '#6B3FA0' },
          { label: 'Workspaces', value: stats.total_workspaces || 0, icon: Layers, color: '#F59E0B' },
          { label: 'Campaigns', value: stats.total_campaigns || 0, icon: BarChart3, color: '#A42593' },
        ].map(s => (
          <Card key={s.label} className="border-gray-100" data-testid={`admin-stat-${s.label.toLowerCase()}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${s.color}10`, color: s.color }}><s.icon className="w-4 h-4" /></div>
              </div>
              <p className="text-2xl font-semibold">{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Plan distribution */}
      <Card className="border-gray-100 mb-8" data-testid="admin-plan-distribution">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">Plan Distribution</h2>
          <div className="grid grid-cols-5 gap-3">
            {Object.entries(PLAN_LABELS).map(([key, label]) => (
              <div key={key} className="text-center p-4 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-2xl font-semibold">{stats.plans?.[key] || 0}</p>
                <Badge variant="outline" className={`text-[10px] mt-1 ${PLAN_COLORS[key]}`}>{label}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Organizations table */}
      <h2 className="text-lg font-semibold mb-4">Organizations</h2>
      <div className="space-y-2">
        {orgs.map(o => (
          <Card key={o.org_id} className="border-gray-100" data-testid={`admin-org-${o.org_id}`}>
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#2C3792]/6 flex items-center justify-center"><Building2 className="w-5 h-5 text-[#2C3792]" /></div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold truncate">{o.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                    <span>{o.workspace_count} ws</span>
                    <span>{o.user_count} users</span>
                    <span>{o.campaign_count} campaigns</span>
                  </div>
                </div>
                <Select value={o.plan} onValueChange={v => updateOrgPlan(o.org_id, v)}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLAN_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={o.license_status || 'active'} onValueChange={v => updateOrgStatus(o.org_id, v)}>
                  <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
