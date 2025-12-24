"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase-client";
import { sendEmailVerification } from "firebase/auth";
import { useRouter } from "next/navigation";
import { createSession } from "@/actions/auth-actions";
import { Mail, CheckCircle2, Loader2, RefreshCw, Building2, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [status, setStatus] = useState("checking");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (auth.currentUser) {
        await auth.currentUser.reload(); 
        if (auth.currentUser.emailVerified) {
          clearInterval(interval);
          setStatus("verified");
          const idToken = await auth.currentUser.getIdToken();
          await createSession(idToken);
          setTimeout(() => router.push("/dashboard"), 2000);
        }
      }
    }, 3000); 
    return () => clearInterval(interval);
  }, [router]);

  const resendEmail = async () => {
    if (auth.currentUser) {
        setResending(true);
        try {
            await sendEmailVerification(auth.currentUser);
            alert("Link reenviado para sua caixa de entrada.");
        } catch (error) {
            alert("Aguarde alguns instantes antes de tentar novamente.");
        } finally {
            setResending(false);
        }
    }
  };

  return (
    <div className="fixed inset-0 z-50 w-full h-screen grid lg:grid-cols-2 bg-white overflow-hidden font-sans">
      
      <div className="relative h-full flex flex-col justify-center items-center bg-white px-6 py-12 lg:px-16 xl:px-24">
        
        <div className="w-full max-w-[420px] mx-auto text-center lg:text-left">
            
            <div className="inline-flex items-center gap-2 text-slate-900 mb-8 justify-center lg:justify-start">
                <div className="p-2 bg-slate-900 rounded-lg text-white">
                    <Building2 size={24} />
                </div>
                <span className="font-bold text-xl tracking-tight">Controle A Dois</span>
            </div>

            {status === "checking" ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto lg:mx-0 shadow-sm border border-indigo-100">
                        <Mail size={40} strokeWidth={1.5} />
                    </div>
                    
                    <div className="space-y-2">
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Verifique seu e-mail</h1>
                        <p className="text-slate-500 text-base leading-relaxed">
                            Enviamos um link de confirmação para:<br/>
                            <span className="font-bold text-slate-900">{auth.currentUser?.email}</span>
                        </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 flex items-center gap-3 text-sm text-slate-600">
                        <Loader2 className="animate-spin text-indigo-600 shrink-0" size={18}/>
                        <span>Aguardando confirmação automática...</span>
                    </div>

                    <div className="pt-4 space-y-4">
                        <p className="text-sm text-slate-400">
                            Não recebeu o e-mail? Verifique sua caixa de spam ou clique abaixo.
                        </p>
                        <Button 
                            onClick={resendEmail} 
                            disabled={resending}
                            variant="outline"
                            className="w-full h-12 border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-bold"
                        >
                            {resending ? <Loader2 className="animate-spin mr-2"/> : <RefreshCw size={16} className="mr-2"/>}
                            Reenviar Link
                        </Button>
                        
                        <div className="text-center lg:text-left">
                             <Link href="/auth/login" className="text-xs text-slate-400 hover:text-slate-600 hover:underline">
                                Voltar para Login
                             </Link>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto lg:mx-0 shadow-sm border border-emerald-100">
                        <CheckCircle2 size={40} strokeWidth={1.5} />
                    </div>
                    
                    <div className="space-y-2">
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">E-mail verificado!</h1>
                        <p className="text-slate-500 text-base">
                            Sua conta foi ativada com segurança. Você será redirecionado para o dashboard em instantes.
                        </p>
                    </div>

                    <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold pointer-events-none">
                        <Loader2 className="animate-spin mr-2"/> Entrando...
                    </Button>
                </div>
            )}
        </div>
      </div>

      <div className="hidden lg:block relative h-full bg-slate-900">
        <div className="absolute inset-0">
            <img 
                src="https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=1470&auto=format&fit=crop" 
                alt="Secure Digital Environment" 
                className="w-full h-full object-cover opacity-30 mix-blend-overlay grayscale"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-slate-900/40" />
        </div>

        <div className="relative z-10 h-full flex flex-col justify-end p-16 xl:p-24 text-white max-w-2xl">
            <div className="mb-8">
                <div className="mb-6 inline-flex p-3 bg-white/5 backdrop-blur-md rounded-xl border border-white/10">
                    <ShieldCheck className="text-emerald-400" size={32} />
                </div>
                <h2 className="text-4xl font-bold leading-tight mb-4">
                    Lorem ipsum dolor sit amet <br/>
                    <span className="text-indigo-400">consectetur adipiscing elit.</span>
                </h2>
                <p className="text-lg text-slate-300 leading-relaxed font-light">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                </p>
            </div>
            
            <div className="flex items-center gap-3 text-xs text-slate-500 uppercase tracking-widest font-semibold">
                <div className="h-1 w-1 bg-emerald-500 rounded-full"></div>
                Lorem ipsum dolor sit amet
            </div>
        </div>
      </div>

    </div>
  );
}