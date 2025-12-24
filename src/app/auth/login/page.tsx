"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import { createSession } from "@/actions/auth-actions";
import { recordTermsAcceptance } from "@/actions/auth-actions";
import { TermsModal } from "@/components/terms-modal";
import { Loader2, Mail, Lock, Eye, EyeOff, AlertCircle, Building2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    const hasAcceptedTerms = localStorage.getItem("termsAccepted");
    if (!hasAcceptedTerms) {
      setShowTermsModal(true);
    }
  }, []);

  const handleAcceptTerms = async (userAgent: string) => {
    try {
      await recordTermsAcceptance('anonymous', userAgent).catch(() => {});
      localStorage.setItem("termsAccepted", "true");
      setShowTermsModal(false);
    } catch (error) {
      localStorage.setItem("termsAccepted", "true");
      setShowTermsModal(false);
    }
  };

  const handleDeclineTerms = () => {
    router.push("/");
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      setError("Preencha todos os campos.");
      setLoading(false);
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      if (!userCredential.user.emailVerified) {
        setError("Email não verificado. Verifique sua caixa de entrada.");
        setLoading(false);
        return;
      }
      const idToken = await userCredential.user.getIdToken(true);
      
      const result = await createSession(idToken);

      if (result.success) {
        try {
            await recordTermsAcceptance(userCredential.user.uid, navigator.userAgent);
        } catch (termErr) {
        }

        router.refresh();
        router.push("/dashboard"); 
      } else {
        setError("Erro ao criar sessão segura.");
        setLoading(false);
      }
    } catch (err: any) {

      if (err.code === "auth/invalid-credential") setError("Credenciais inválidas.");
      else if (err.code === "auth/user-not-found") setError("Usuário não encontrado.");
      else if (err.code === "auth/wrong-password") setError("Senha incorreta.");
      else if (err.code === "auth/too-many-requests") setError("Muitas tentativas. Tente mais tarde.");
      else setError("Falha na autenticação. Tente novamente.");
      
      setLoading(false);
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
                    Acesse seu painel financeiro com segurança.
                </p>
            </div>
      
            <form onSubmit={handleSubmit} className="space-y-6">
                
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Email Profissional</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3.5 text-slate-400" size={18} />
                        <Input 
                            type="email" 
                            name="email" 
                            placeholder="seu@email.com" 
                            className="pl-10 h-12  border-slate-200 text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all rounded-lg" 
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Senha</label>
                        <Link href="#" className="text-xs font-medium text-slate-500 hover:text-slate-900 hover:underline transition-colors">
                            Esqueceu a senha?
                        </Link>
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                        <Input 
                            type={showPassword ? "text" : "password"} 
                            name="password" 
                            placeholder="••••••" 
                            className="pl-10 pr-10 h-12 bg-slate-50 text-slate-900 border-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all rounded-lg" 
                        />
                        <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-700 transition-colors"
                        >
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

                <Button type="submit" disabled={loading} className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold text-base shadow-xl hover:shadow-2xl transition-all rounded-lg">
                    {loading ? <Loader2 className="animate-spin" /> : <span className="flex items-center gap-2">Acessar Painel <ArrowRight size={18}/></span>}
                </Button>

                <p className="text-center text-sm text-slate-500 pt-2">
                    Não tem uma conta?{" "}
                    <Link href="/auth/register" className="font-bold text-slate-900 hover:underline">
                        Cadastre-se grátis
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
                src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=2070&auto=format&fit=crop" 
                alt="Office Dashboard" 
                className="w-full h-full object-cover opacity-40 mix-blend-overlay grayscale"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-slate-900/20" />
        </div>

        <div className="relative z-10 h-full flex flex-col justify-end p-16 xl:p-24 text-white max-w-2xl">
            <div className="mb-8">
                <h2 className="text-4xl font-bold leading-tight mb-4">
                    Gerencie suas finanças <br/>
                    <span className="text-indigo-400">com total controle.</span>
                </h2>
                <p className="text-lg text-slate-300 leading-relaxed font-light">
                    Tenha visibilidade completa das entradas e saídas, gerencie múltiplos espaços e tome decisões mais inteligentes.
                </p>
            </div>
            
            <div className="flex gap-8 border-t border-slate-700/50 pt-6">
                 <div>
                    <p className="text-2xl font-bold text-white">Simples</p>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">De usar</p>
                 </div>
                 <div>
                    <p className="text-2xl font-bold text-white">Seguro</p>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Criptografado</p>
                 </div>
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