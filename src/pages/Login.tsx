import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import logoElectrocreditos from '@/assets/logo-electrocreditos.png';
import logoFinansuenos from '@/assets/logo-finansuenos.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, signIn } = useAuth();
  const { toast } = useToast();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: 'Error de autenticación',
        description: 'Credenciales incorrectas. Por favor verifica tus datos.',
        variant: 'destructive',
      });
    } else {
      navigate('/dashboard');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{ background: 'var(--gradient-hero)' }}
      >
        {/* Decorative circles */}
        <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-secondary/20 blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-brand-cyan/10 blur-3xl" />
        
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12 text-white">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-6 mb-8">
              <img
                src={logoElectrocreditos}
                alt="Electrocréditos del Cauca"
                className="h-16 bg-white rounded-lg p-2"
              />
              <div className="w-px h-16 bg-white/30" />
              <img
                src={logoFinansuenos}
                alt="FinanSueños"
                className="h-14 bg-white rounded-lg p-2"
              />
            </div>
            
            <h1 className="text-4xl font-bold mb-4">
              Sistema E-COM
            </h1>
            <p className="text-xl text-white/80 mb-2">
              Organización Comercial
            </p>
            <p className="text-lg text-secondary font-semibold">
              Caminemos Juntos
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-12 grid grid-cols-3 gap-8 text-center"
          >
            <div>
              <p className="text-3xl font-bold">100%</p>
              <p className="text-sm text-white/70">Digital</p>
            </div>
            <div>
              <p className="text-3xl font-bold">24/7</p>
              <p className="text-sm text-white/70">Disponible</p>
            </div>
            <div>
              <p className="text-3xl font-bold">GPS</p>
              <p className="text-sm text-white/70">Integrado</p>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Right Panel - Login Form */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="flex-1 flex items-center justify-center p-8 bg-background"
      >
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center gap-4 mb-8">
            <img
              src={logoFinansuenos}
              alt="FinanSueños"
              className="h-16"
            />
            <h1 className="text-2xl font-bold text-gradient">Sistema E-COM</h1>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-bold text-foreground">
              Iniciar sesión
            </h2>
            <p className="mt-2 text-muted-foreground">
              Ingresa tus credenciales para acceder al sistema
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@electrocreditos.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 btn-brand"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-5 w-5" />
                  Iniciar sesión
                </>
              )}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              ¿Problemas para ingresar?{' '}
              <a href="#" className="text-primary hover:underline font-medium">
                Contacta al administrador
              </a>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
