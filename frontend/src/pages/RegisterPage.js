import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { authAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_c9938035-3f55-4e0f-8c59-2b9d43e1859c/artifacts/s66ghk0u_Intentio%20logo%20%28800%20x%20300%20px%29.png';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [orgName, setOrgName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authAPI.register({ org_name: orgName, name, email, password });
      await login(res.data.token, res.data.user, res.data.org, res.data.workspace);
      toast.success('Organization created! Welcome to Intentio.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1629] flex items-center justify-center p-4" data-testid="register-page">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <img src={LOGO_URL} alt="Intentio" className="h-10 mx-auto brightness-0 invert opacity-90 mb-3" />
          <p className="text-white/40 text-sm">Start your free workspace</p>
        </div>
        <Card className="border-0 shadow-2xl shadow-black/20">
          <CardContent className="p-8">
            <h1 className="text-xl font-semibold mb-6">Create your organization</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-500">Organization name</Label>
                <Input value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="Your company or agency name" required data-testid="register-org" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-500">Your name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" required data-testid="register-name" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-500">Email</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required data-testid="register-email" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-500">Password</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" minLength={6} required data-testid="register-password" />
              </div>
              <Button type="submit" className="w-full h-11 bg-[#2C3792] hover:bg-[#232E7A]" disabled={loading} data-testid="register-submit">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create organization'}
              </Button>
            </form>
            <p className="text-center text-xs text-gray-400 mt-4">Free plan: 1 workspace, 3 social profiles, 5 campaigns</p>
            <p className="text-center text-sm text-gray-400 mt-3">
              Already have an account? <Link to="/login" className="text-[#2C3792] font-medium hover:underline" data-testid="goto-login">Sign in</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
