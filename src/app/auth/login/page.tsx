"use client";

import { useState } from "react";
import { signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import { useRouter } from "next/navigation";
import { createClientSession } from "@/lib/auth/client-session";
import { ensurePersonalWorkspace } from "@/actions/workspace-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Lock, Mail, AlertCircle, ArrowRight, Building2, Eye, EyeOff, X, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const idToken = await user.getIdToken();

      const result = await createClientSession(idToken);

      if (!result.success) {
        await signOut(auth);
        setError(result.error || "Erro ao iniciar sessão.");
        setLoading(false);
        return;
      }

      const workspace = await ensurePersonalWorkspace(idToken, user.email || email);
      if (workspace.error) {
        await signOut(auth);
        setError("Não foi possível carregar seu workspace. Tente novamente.");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh(); 
    } catch (err: any) {
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setError("E-mail ou senha incorretos.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Muitas tentativas. Tente novamente mais tarde.");
      } else {
        setError("Ocorreu um erro ao entrar.");
      }
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setForgotLoading(true);
    setForgotMessage(null);

    if (!forgotEmail) {
        setForgotMessage({ type: 'error', text: "Digite seu e-mail." });
        setForgotLoading(false);
        return;
    }

    try {
        await sendPasswordResetEmail(auth, forgotEmail);
        setForgotMessage({ type: 'success', text: "Se o e-mail estiver cadastrado, você receberá um link de recuperação." });
        setForgotEmail("");
    } catch (err: any) {
        if (err.code === "auth/user-not-found") {
            setForgotMessage({ type: 'success', text: "Se o e-mail estiver cadastrado, você receberá um link de recuperação." });
            setForgotEmail("");
        } else if (err.code === "auth/invalid-email") {
            setForgotMessage({ type: 'error', text: "Formato de e-mail inválido." });
        } else {
            setForgotMessage({ type: 'error', text: "Erro ao processar solicitação. Tente novamente." });
        }
    } finally {
        setForgotLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 w-full h-screen grid lg:grid-cols-2 bg-white overflow-hidden font-sans">
      
      <div className="relative h-full flex flex-col justify-center items-center bg-white px-6 py-12 lg:px-16 xl:px-24 overflow-y-auto">
        
        <div className="w-full max-w-[400px] mx-auto space-y-8">
            
            <div className="space-y-2 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 text-slate-900 mb-2 justify-center lg:justify-start">
                    <div className="p-2 bg-slate-900 rounded-lg text-white">
                        <Building2 size={24} />
                    </div>
                    <span className="font-bold text-xl tracking-tight">Controle A Dois</span>
                </div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Bem-vindo de volta</h1>
                <p className="text-slate-500 text-sm">
                    Entre para gerenciar suas finanças.
                </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
                
                <div className="space-y-1.5">
                    <label htmlFor="login-email" className="text-xs font-bold text-slate-700 uppercase tracking-wide">E-mail</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3.5 text-slate-400" size={18} />
                        <Input 
                            type="email"
                            id="login-email"
                            name="email"
                            autoComplete="username"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required 
                            placeholder="exemplo@email.com" 
                            className="pl-10 h-12 bg-slate-50 text-slate-900 border-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all rounded-lg"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                        <label htmlFor="login-password" className="text-xs font-bold text-slate-700 uppercase tracking-wide">Senha</label>
                        <button 
                            type="button"
                            onClick={() => {
                                setShowForgotModal(true);
                                setForgotMessage(null);
                                setForgotEmail("");
                            }}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                            Esqueceu a senha?
                        </button>
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                        <Input 
                            type={showPassword ? "text" : "password"}
                            id="login-password"
                            name="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required 
                            placeholder="******" 
                            className="pl-10 pr-10 h-12 text-slate-900 bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-transparent rounded-lg"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-700">
                            {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-3 border-l-4 border-red-600 animate-in fade-in">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" /> 
                        <span className="font-medium">{error}</span>
                    </div>
                )}

                <Button type="submit" disabled={loading} className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold text-base shadow-xl hover:shadow-2xl transition-all rounded-lg mt-2">
                    {loading ? <Loader2 className="animate-spin" /> : <span className="flex items-center gap-2">Entrar <ArrowRight size={18}/></span>}
                </Button>

                <p className="text-center text-sm text-slate-500 pt-2">
                    Não tem uma conta?{" "}
                    <Link href="/auth/register" className="font-bold text-slate-900 hover:underline">
                        Cadastre-se
                    </Link>
                </p>
            </form>
        </div>
        
        <div className="mt-8 lg:hidden text-center text-xs text-slate-400">
            &copy; 2025 Controle A Dois.
        </div>
      </div>

      <div className="hidden lg:block relative h-full bg-slate-900">
        <div className="absolute inset-0">
            <img 
                src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=2664&auto=format&fit=crop" 
                alt="Finance" 
                className="w-full h-full object-cover opacity-40 mix-blend-overlay grayscale"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-slate-900/10" />
        </div>

        <div className="relative z-10 h-full flex flex-col justify-end p-16 xl:p-24 text-white max-w-2xl">
            <div className="mb-8">
                <h2 className="text-5xl font-bold leading-tight mb-6">
                    Assuma o controle <br/>
                    <span className="text-indigo-400">do seu futuro.</span>
                </h2>
                <p className="text-lg text-slate-300 leading-relaxed font-light">
                    Visualize seus gastos, planeje investimentos e alcance a liberdade financeira com inteligência.
                </p>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-slate-400 font-medium tracking-wider uppercase">
                <div className="h-px w-12 bg-indigo-500"></div>
                Plataforma Segura
            </div>
        </div>
      </div>

      {showForgotModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 relative">
                <button 
                    onClick={() => setShowForgotModal(false)}
                    className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="mb-6">
                    <div className="h-12 w-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
                        <Lock size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Redefinir Senha</h3>
                    <p className="text-slate-500 text-sm mt-1">
                        Digite seu e-mail e nós enviaremos um link de recuperação se a conta existir.
                    </p>
                </div>

                <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-1.5">
                        <label htmlFor="forgot-email" className="text-xs font-bold text-slate-700 uppercase tracking-wide">Seu E-mail</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3.5 text-slate-400" size={18} />
                            <Input 
                                type="email"
                                id="forgot-email"
                                name="email"
                                autoComplete="email"
                                value={forgotEmail}
                                onChange={(e) => setForgotEmail(e.target.value)}
                                required 
                                placeholder="exemplo@email.com" 
                                className="pl-10 h-12 bg-slate-50 text-slate-900 border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all rounded-lg"
                            />
                        </div>
                    </div>

                    {forgotMessage && (
                        <div className={`p-4 rounded-lg flex items-start gap-3 border-l-4 text-sm ${
                            forgotMessage.type === 'success' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-500' 
                            : 'bg-red-50 text-red-700 border-red-600'
                        }`}>
                            {forgotMessage.type === 'success' ? <CheckCircle2 size={18} className="shrink-0 mt-0.5"/> : <AlertCircle size={18} className="shrink-0 mt-0.5"/>}
                            <span className="font-medium">{forgotMessage.text}</span>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => setShowForgotModal(false)}
                            className="h-11 flex-1 border-slate-200 bg-white text-slate-900 hover:bg-slate-100 hover:text-slate-900"
                        >
                            Cancelar
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={forgotLoading || (forgotMessage?.type === 'success')} 
                            className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                        >
                            {forgotLoading ? <Loader2 className="animate-spin" /> : "Enviar Link"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}
