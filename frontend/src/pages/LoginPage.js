import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../components/ui/collapsible';
import { ChevronRight, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

function AriadneLogoLogin() {
  const [hasLogo, setHasLogo] = useState(true);
  if (!hasLogo) return null;
  return (
    <img
      src="/ariadne-logo.png"
      alt="Ariadne"
      className="ariadne-logo-login"
      onError={() => setHasLogo(false)}
      data-testid="login-logo"
    />
  );
}

export default function LoginPage() {
  const { loginJWT, registerJWT, loginGoogle } = useAuth();
  const navigate = useNavigate();
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerExtra, setRegisterExtra] = useState({ name: '', password: '' });
  const [showExtra, setShowExtra] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loginJWT(loginData.email, loginData.password);
      navigate('/community');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore di accesso');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!registerEmail) return;
    setLoading(true);
    try {
      const res = await registerJWT(
        registerEmail,
        registerExtra.password || null,
        registerExtra.name || null
      );
      if (res.generated_password) {
        toast.success(`Registrazione completata! La tua password temporanea: ${res.generated_password}`, { duration: 12000 });
      } else {
        toast.success('Registrazione completata!');
      }
      navigate('/community');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore di registrazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex" data-testid="login-page">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gray-50" />
        <div className="absolute top-12 left-12 w-24 h-24 rounded-2xl bg-[#7B61FF]/8" />
        <div className="absolute bottom-20 right-16 w-16 h-16 rounded-xl bg-[#F5A623]/10" />
        <div className="absolute top-1/3 right-24 w-12 h-12 rounded-lg bg-[#10B981]/8" />
        <div className="relative z-10 max-w-md">
          <div className="flex items-center gap-3 mb-12">
            <AriadneLogoLogin />
            <div>
              <h1 className="text-2xl font-semibold ariadne-heading" data-testid="login-brand-title">Ariadne</h1>
              <p className="text-xs text-gray-400 uppercase tracking-[0.2em] font-medium">Il tuo spazio Ariadne</p>
            </div>
          </div>
          <h2 className="text-4xl sm:text-5xl font-semibold ariadne-heading text-gray-900 mb-6 leading-tight">
            Cresci, impara, connettiti.
          </h2>
          <p className="text-base text-gray-500 leading-relaxed">
            La piattaforma della community Ariadne Training.
            Segui il tuo percorso formativo, resta in contatto con la community e scopri le prossime opportunita.
          </p>
        </div>
      </div>

      {/* Right panel - auth forms */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <AriadneLogoLogin />
            <div>
              <h1 className="text-xl font-semibold ariadne-heading">Ariadne</h1>
              <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em]">Il tuo spazio Ariadne</p>
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
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Email *</Label>
                  <Input
                    type="email" placeholder="nome@ariadne.training" required
                    value={registerEmail}
                    onChange={e => setRegisterEmail(e.target.value)}
                    data-testid="register-email-input"
                  />
                  <p className="text-[11px] text-gray-400">L'unico campo obbligatorio per iniziare</p>
                </div>

                {/* Expandable optional section */}
                <Collapsible open={showExtra} onOpenChange={setShowExtra}>
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer w-full" data-testid="register-extra-toggle">
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${showExtra ? 'rotate-90' : ''}`} />
                    <span>Completa il profilo (opzionale)</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-4 pt-3 pb-1">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Nome</Label>
                        <Input
                          placeholder="Il tuo nome"
                          value={registerExtra.name}
                          onChange={e => setRegisterExtra(d => ({ ...d, name: e.target.value }))}
                          data-testid="register-name-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Password</Label>
                        <div className="relative">
                          <Input
                            type={showPwd ? 'text' : 'password'} placeholder="Scegli una password"
                            value={registerExtra.password}
                            onChange={e => setRegisterExtra(d => ({ ...d, password: e.target.value }))}
                            data-testid="register-password-input"
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={() => setShowPwd(!showPwd)}
                            tabIndex={-1}
                          >
                            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-[11px] text-gray-400">Se non scegli una password, ne verra generata una automaticamente</p>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <Button type="submit" className="w-full h-11" disabled={loading || !registerEmail} data-testid="register-submit-btn">
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
