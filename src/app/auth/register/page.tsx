"use client";

import { useState, useEffect } from "react";
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import { ensurePersonalWorkspace } from "@/actions/workspace-actions";
import { recordTermsAcceptance } from "@/actions/auth-actions";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TermsModal } from "@/components/terms-modal";
import {
  Loader2, User, Mail, Lock,
  AlertCircle, CheckCircle2, Eye, EyeOff, Building2, ArrowRight
} from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const hasAcceptedTerms = localStorage.getItem("termsAccepted");
    if (!hasAcceptedTerms) {
      setShowTermsModal(true);
    }
  }, []);

  const handleAcceptTerms = async (userAgent: string) => {
    try {
      const result = await recordTermsAcceptance('anonymous', userAgent);

      if (result.success) {
        localStorage.setItem("termsAccepted", "true");
        setShowTermsModal(false);
      } else {
        localStorage.setItem("termsAccepted", "true");
        setShowTermsModal(false);
      }
    } catch (error) {
      localStorage.setItem("termsAccepted", "true");
      setShowTermsModal(false);
    }
  };

  const handleDeclineTerms = () => {
    router.push("/");
  };

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password.length < 6) {
        setError("A senha deve ter no mínimo 6 caracteres.");
        setLoading(false);
        return;
    }

    if (password !== confirmPassword) {
        setError("As senhas não coincidem.");
        setLoading(false);
        return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: name });
      await ensurePersonalWorkspace(await user.getIdToken(), email);
      await sendEmailVerification(user);

      await recordTermsAcceptance("anonymous", navigator.userAgent);

      router.push("/auth/verify"); 

    } catch (err: any) {
        if (err.code === "auth/email-already-in-use") setError("Este e-mail já está cadastrado.");
        else setError("Erro ao criar conta. Verifique seus dados.");
    } finally {
      setLoading(false);
    }
  }

  const passwordsMatch = password.length > 0 && password === confirmPassword;

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
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Crie sua conta</h1>
                <p className="text-slate-500 text-sm">
                    Gestão financeira inteligente para parceiros.
                </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-5">
                
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Nome Completo</label>
                    <div className="relative">
                        <User className="absolute left-3 top-3.5 text-slate-400" size={18} />
                        <Input 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required 
                            placeholder="Seu nome" 
                            className="pl-10 h-12 bg-slate-50 text-slate-900 border-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all rounded-lg"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">E-mail Profissional</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3.5 text-slate-400" size={18} />
                        <Input 
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required 
                            placeholder="exemplo@email.com" 
                            className="pl-10 h-12 bg-slate-50 text-slate-900 border-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all rounded-lg"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Senha</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                            <Input 
                                type={showPassword ? "text" : "password"}
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

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Confirmar</label>
                        <div className="relative">
                            <Lock className={`absolute left-3 top-3.5 ${passwordsMatch && confirmPassword ? 'text-emerald-600' : 'text-slate-400'}`} size={18} />
                            <Input 
                                type={showPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required 
                                placeholder="******" 
                                className={`pl-10 h-12 text-slate-900 bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 transition-all rounded-lg ${passwordsMatch && confirmPassword ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/20' : 'focus:ring-slate-900'}`}
                            />
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-3 border-l-4 border-red-600 animate-in fade-in">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" /> 
                        <span className="font-medium">{error}</span>
                    </div>
                )}

                <Button type="submit" disabled={loading} className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold text-base shadow-xl hover:shadow-2xl transition-all rounded-lg mt-2">
                    {loading ? <Loader2 className="animate-spin" /> : <span className="flex items-center gap-2">Criar Conta <ArrowRight size={18}/></span>}
                </Button>

                <p className="text-center text-sm text-slate-500 pt-2">
                    Já tem uma conta?{" "}
                    <Link href="/auth/login" className="font-bold text-slate-900 hover:underline">
                        Entrar agora
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
                src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=2664&auto=format&fit=crop" 
                alt="Office Meeting" 
                className="w-full h-full object-cover opacity-40 mix-blend-overlay grayscale"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-slate-900/10" />
        </div>

        <div className="relative z-10 h-full flex flex-col justify-end p-16 xl:p-24 text-white max-w-2xl">
            <div className="mb-8">
                <h2 className="text-5xl font-bold leading-tight mb-6">
                    Planejem juntos. <br/>
                    <span className="text-indigo-400">Conquistem juntos.</span>
                </h2>
                <p className="text-lg text-slate-300 leading-relaxed font-light">
                    Reúna receitas, despesas, contas e investimentos em um espaço compartilhado, claro e fácil de acompanhar.
                </p>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-slate-400 font-medium tracking-wider uppercase">
                <div className="h-px w-12 bg-indigo-500"></div>
                Finanças compartilhadas
            </div>
        </div>
      </div>

      <TermsModal
        isOpen={showTermsModal}
        onAccept={handleAcceptTerms}
        onDecline={handleDeclineTerms}
      />
    </div>
  );
}
