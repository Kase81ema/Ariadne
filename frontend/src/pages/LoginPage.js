import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const { loginJWT, registerJWT, loginGoogle } = useAuth();
  const navigate = useNavigate();
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ email: '', password: '', name: '' });
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loginJWT(loginData.email, loginData.password);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore di accesso');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await registerJWT(registerData.email, registerData.password, registerData.name);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore di registrazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gray-50" />
        <div className="absolute top-12 left-12 w-24 h-24 rounded-2xl bg-[#7B61FF]/8" />
        <div className="absolute bottom-20 right-16 w-16 h-16 rounded-xl bg-[#F5A623]/10" />
        <div className="absolute top-1/3 right-24 w-12 h-12 rounded-lg bg-[#10B981]/8" />
        <div className="relative z-10 max-w-md">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-xl bg-[#7B61FF] flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold ariadne-heading">Ariadne</h1>
              <p className="text-xs text-gray-400 uppercase tracking-[0.2em] font-medium">Editorial Studio</p>
            </div>
          </div>
          <h2 className="text-4xl sm:text-5xl font-semibold ariadne-heading text-gray-900 mb-6 leading-tight">
            Pianifica, genera, pubblica.
          </h2>
          <p className="text-base text-gray-500 leading-relaxed">
            La console operativa per il calendario editoriale di Ariadne. 
            Coordina tutti i canali social, genera contenuti con AI e esporta per la pubblicazione.
          </p>
        </div>
      </div>

      {/* Right panel - auth forms */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-[#7B61FF] flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl font-semibold ariadne-heading">Ariadne</h1>
              <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em]">Editorial Studio</p>
            </div>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login" data-testid="login-tab">Accedi</TabsTrigger>
              <TabsTrigger value="register" data-testid="register-tab">Registrati</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-xs font-semibold uppercase tracking-wider text-gray-500">Email</Label>
                  <Input
                    id="login-email" type="email" placeholder="nome@ariadne.training"
                    value={loginData.email}
                    onChange={e => setLoginData(d => ({ ...d, email: e.target.value }))}
                    data-testid="login-email-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-xs font-semibold uppercase tracking-wider text-gray-500">Password</Label>
                  <Input
                    id="login-password" type="password" placeholder="La tua password"
                    value={loginData.password}
                    onChange={e => setLoginData(d => ({ ...d, password: e.target.value }))}
                    data-testid="login-password-input"
                  />
                </div>
                <Button type="submit" className="w-full h-11" disabled={loading} data-testid="login-submit-btn">
                  {loading ? 'Accesso...' : 'Accedi'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Nome</Label>
                  <Input
                    placeholder="Il tuo nome"
                    value={registerData.name}
                    onChange={e => setRegisterData(d => ({ ...d, name: e.target.value }))}
                    data-testid="register-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Email</Label>
                  <Input
                    type="email" placeholder="nome@ariadne.training"
                    value={registerData.email}
                    onChange={e => setRegisterData(d => ({ ...d, email: e.target.value }))}
                    data-testid="register-email-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Password</Label>
                  <Input
                    type="password" placeholder="Scegli una password"
                    value={registerData.password}
                    onChange={e => setRegisterData(d => ({ ...d, password: e.target.value }))}
                    data-testid="register-password-input"
                  />
                </div>
                <Button type="submit" className="w-full h-11" disabled={loading} data-testid="register-submit-btn">
                  {loading ? 'Registrazione...' : 'Registrati'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-gray-400">oppure</span></div>
            </div>
            <Button
              variant="outline"
              className="w-full mt-4 h-11 gap-2"
              onClick={loginGoogle}
              data-testid="google-login-btn"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Accedi con Google
            </Button>
          </div>

          <p className="text-center text-xs text-gray-400 mt-8">
            Credenziali demo: admin@ariadne.training / admin123
          </p>
        </div>
      </div>
    </div>
  );
}
