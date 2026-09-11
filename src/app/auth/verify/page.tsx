"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase-client";
import { sendEmailVerification } from "firebase/auth";
import { useRouter } from "next/navigation";
import { createClientSession } from "@/lib/auth/client-session";
import {
  Mail,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { ControleADoisMark } from "@/components/controle-adois-logo";
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
          await createClientSession(idToken);
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
      } catch {
        alert("Aguarde alguns instantes antes de tentar novamente.");
      } finally {
        setResending(false);
      }
    }
  };

  return (
    <div className="auth-page fixed inset-0 z-50 grid h-screen w-full overflow-hidden bg-[#fbfaf7] font-sans lg:grid-cols-[.92fr_1.08fr]">
      <div className="relative flex h-full flex-col items-center justify-center bg-[#fbfaf7] px-6 py-12 lg:px-16 xl:px-24">
        <div className="w-full max-w-[420px] mx-auto text-center lg:text-left">
          <div className="inline-flex items-center gap-2 text-slate-900 mb-8 justify-center lg:justify-start">
            <div className="rounded-xl bg-[#635bff] p-2 text-white">
              <ControleADoisMark className="h-6 w-6" />
            </div>
            <span className="font-bold text-xl tracking-tight">
              Controle A Dois
            </span>
          </div>

          {status === "checking" ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto lg:mx-0 shadow-sm border border-indigo-100">
                <Mail size={40} strokeWidth={1.5} />
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  Verifique seu e-mail
                </h1>
                <p className="text-slate-500 text-base leading-relaxed">
                  Enviamos um link de confirmação para:
                  <br />
                  <span className="font-bold text-slate-900">
                    {auth.currentUser?.email}
                  </span>
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 flex items-center gap-3 text-sm text-slate-600">
                <Loader2
                  className="animate-spin text-indigo-600 shrink-0"
                  size={18}
                />
                <span>Aguardando confirmação automática...</span>
              </div>

              <div className="pt-4 space-y-4">
                <p className="text-sm text-slate-400">
                  Não recebeu o e-mail? Verifique sua caixa de spam ou clique
                  abaixo.
                </p>
                <Button
                  onClick={resendEmail}
                  disabled={resending}
                  variant="outline"
                  className="w-full h-12 border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-bold"
                >
                  {resending ? (
                    <Loader2 className="animate-spin mr-2" />
                  ) : (
                    <RefreshCw size={16} className="mr-2" />
                  )}
                  Reenviar Link
                </Button>

                <div className="text-center lg:text-left">
                  <Link
                    href="/auth/login"
                    className="text-xs text-slate-400 hover:text-slate-600 hover:underline"
                  >
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
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  E-mail verificado!
                </h1>
                <p className="text-slate-500 text-base">
                  Sua conta foi ativada com segurança. Você será redirecionado
                  para o dashboard em instantes.
                </p>
              </div>

              <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold pointer-events-none">
                <Loader2 className="animate-spin mr-2" /> Entrando...
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="auth-art relative hidden h-full overflow-hidden bg-[#1b1c22] lg:block">
        <div className="relative z-10 h-full flex flex-col justify-end p-16 xl:p-24 text-white max-w-2xl">
          <div className="mb-8">
            <div className="mb-6 inline-flex p-3 bg-white/5 backdrop-blur-md rounded-xl border border-white/10">
              <ShieldCheck className="text-emerald-400" size={32} />
            </div>
            <h2 className="text-4xl font-bold leading-tight mb-4">
              Sua segurança começa <br />
              <span className="text-indigo-400">com um e-mail confirmado.</span>
            </h2>
            <p className="text-lg text-slate-300 leading-relaxed font-light">
              A verificação protege sua conta e garante que somente você possa
              acessar seus espaços financeiros.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 uppercase tracking-widest font-semibold">
            <div className="h-1 w-1 bg-emerald-500 rounded-full"></div>
            Identidade protegida
          </div>
        </div>
      </div>
    </div>
  );
}
