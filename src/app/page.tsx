import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Wallet,
  Building2,
  Lock,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 flex flex-col selection:bg-indigo-500/30">
      <div
        className="fixed inset-0 opacity-[0.02] pointer-events-none z-0"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      ></div>

      <header className="fixed top-0 w-full border-b border-white/10 bg-slate-900/80 backdrop-blur-md z-50 transition-all">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 font-bold text-xl tracking-tight text-white">
            <div className="bg-white/10 p-2 rounded-lg">
              <Building2 size={20} className="text-white" />
            </div>
            Controle A Dois
          </div>

          <div className="flex items-center gap-6">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/auth/register"
              className="hidden sm:inline-flex text-sm font-bold bg-white text-slate-900 px-5 py-2.5 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Abrir Conta
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 relative z-10 pt-32">
        <section className="py-20 px-6 text-center relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/20 blur-[120px] rounded-full -z-10"></div>

          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-widest mb-6">
              <ShieldCheck size={14} /> Lorem Ipsum
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-8 leading-tight">
              Lorem ipsum dolor <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                sit amet consectetur.
              </span>
            </h1>

            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
              enim ad minim veniam, quis nostrud exercitation.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/auth/register"
                className="group relative inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-900/20 hover:-translate-y-1 overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Começar Agora{" "}
                  <ArrowRight
                    size={18}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </span>
              </Link>
              <Link
                href="/auth/login"
                className="px-8 py-4 text-base font-medium text-slate-400 hover:text-white transition-colors"
              >
                Já tenho conta
              </Link>
            </div>
          </div>
        </section>

        <section className="py-24 border-t border-white/5 bg-slate-900/50 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid md:grid-cols-3 gap-8">
              <Feature
                icon={<Lock className="w-6 h-6 text-emerald-400" />}
                title="Lorem Ipsum"
                desc="Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit."
              />
              <Feature
                icon={<Wallet className="w-6 h-6 text-indigo-400" />}
                title="Dolor Sit Amet"
                desc="Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra."
              />
              <Feature
                icon={<CheckCircle2 className="w-6 h-6 text-cyan-400" />}
                title="Consectetur Elit"
                desc="Fusce egestas elit eget lorem. Suspendisse nisl elit, rhoncus eget, elementum ac, condimentum eget, diam."
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="py-10 text-center border-t border-white/10 bg-slate-900 relative z-10">
        <div className="flex items-center justify-center gap-2 mb-4 text-white font-bold opacity-50">
          <Building2 size={20} /> Controle A Dois
        </div>
        <p className="text-slate-500 text-sm">
          © {new Date().getFullYear()} | Lorem ipsum dolor sit amet.
        </p>
      </footer>
    </div>
  );
}

function Feature({ icon, title, desc }: any) {
  return (
    <div className="bg-white/5 p-8 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all hover:bg-white/[0.07] group">
      <div className="mb-6 bg-white/5 w-14 h-14 rounded-xl flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-white mb-3 group-hover:text-indigo-300 transition-colors">
        {title}
      </h3>
      <p className="text-slate-400 leading-relaxed text-sm">{desc}</p>
    </div>
  );
}