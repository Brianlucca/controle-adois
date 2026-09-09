import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, BellRing, Bot, Building2, CalendarDays, Check, CheckCircle2, Lock, PieChart, ReceiptText, ShieldCheck, TrendingDown, TrendingUp, Users, Wallet } from "lucide-react";

const benefits = ["Saldo e projeção em tempo real", "Contas, metas e investimentos", "Espaços pessoais ou compartilhados"];

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#080b12] text-slate-50 selection:bg-indigo-500/30">
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="absolute left-[-12rem] top-[-14rem] h-[34rem] w-[34rem] rounded-full bg-indigo-600/15 blur-[130px]" />
        <div className="absolute right-[-14rem] top-[22rem] h-[34rem] w-[34rem] rounded-full bg-cyan-500/10 blur-[140px]" />
        <div className="absolute inset-0 opacity-[0.025] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />
      </div>

      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.07] bg-[#080b12]/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 font-extrabold tracking-tight text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-400/20 bg-gradient-to-br from-indigo-500/25 to-cyan-400/10 shadow-lg shadow-indigo-950/40"><Building2 size={18} className="text-indigo-200" /></span>
            <span>Controle <span className="text-indigo-300">A Dois</span></span>
          </Link>
          <nav aria-label="Navegação principal" className="flex items-center gap-2 sm:gap-3">
            <Link href="/auth/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/5 hover:text-white sm:px-4">Entrar</Link>
            <Link href="/auth/register" className="inline-flex h-10 items-center rounded-lg bg-white px-4 text-sm font-extrabold text-slate-950 transition-transform hover:-translate-y-0.5 hover:bg-indigo-50 sm:px-5">Criar conta</Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid min-h-[92vh] max-w-7xl items-center gap-14 px-4 pb-20 pt-28 sm:px-6 sm:pt-36 lg:grid-cols-[.92fr_1.08fr] lg:gap-16 lg:px-8 lg:pb-28">
          <div className="max-w-2xl text-center lg:text-left">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/[0.08] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-indigo-200"><ShieldCheck size={14} /> Finanças organizadas em conjunto</div>
            <h1 className="text-balance text-4xl font-black leading-[1.08] tracking-[-0.045em] text-white sm:text-6xl lg:text-[4.4rem]">
              Clareza para cuidar do dinheiro
              <span className="block bg-gradient-to-r from-indigo-300 via-violet-300 to-cyan-300 bg-clip-text text-transparent">sem complicação.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-slate-400 sm:text-lg sm:leading-8 lg:mx-0">Reúna receitas, despesas, vencimentos e objetivos em um painel feito para decisões mais tranquilas — sozinho ou com quem divide a vida com você.</p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start">
              <Link href="/auth/register" className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-7 py-3.5 text-sm font-extrabold text-white shadow-xl shadow-indigo-950/50 transition-all hover:-translate-y-0.5 hover:brightness-110">Começar gratuitamente <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" /></Link>
              <Link href="/auth/login" className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-7 py-3.5 text-sm font-bold text-slate-200 transition-colors hover:bg-white/[0.08] hover:text-white">Acessar meu painel</Link>
            </div>
            <div className="mt-8 flex flex-col items-center gap-2.5 text-xs text-slate-400 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-5 lg:justify-start">
              {benefits.map((benefit) => <span key={benefit} className="flex items-center gap-1.5"><Check size={14} className="text-emerald-400" /> {benefit}</span>)}
            </div>
          </div>
          <DashboardPreview />
        </section>

        <section id="recursos" className="border-y border-white/[0.07] bg-white/[0.015] py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-indigo-300">Tudo conectado</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">Um painel que mostra o que importa.</h2>
              <p className="mt-4 leading-7 text-slate-400">Menos planilhas espalhadas. Mais contexto para entender hoje e planejar o próximo mês.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <FeatureCard className="lg:col-span-2" icon={<PieChart size={21} />} title="Visão financeira completa" description="Acompanhe saldo disponível, entradas, saídas e projeções no mesmo lugar.">
                <div className="mt-7 grid grid-cols-3 gap-2"><MiniMetric label="Receitas" value="R$ 8.420" tone="emerald" /><MiniMetric label="Despesas" value="R$ 5.180" tone="rose" /><MiniMetric label="Disponível" value="R$ 3.240" tone="indigo" /></div>
              </FeatureCard>
              <FeatureCard icon={<BellRing size={21} />} title="Lembretes que ajudam" description="Receba alertas de contas atrasadas e próximas do vencimento.">
                <div className="mt-7 rounded-xl border border-amber-400/15 bg-amber-400/[0.07] p-3"><p className="text-xs font-bold text-amber-200">Internet vence amanhã</p><p className="mt-1 text-[11px] text-slate-500">Você ainda pode se organizar.</p></div>
              </FeatureCard>
              <FeatureCard icon={<Users size={21} />} title="Feito para compartilhar" description="Crie espaços separados e convide quem participa das decisões." />
              <FeatureCard icon={<Bot size={21} />} title="Assistente financeiro" description="Pergunte sobre seus gastos e registre movimentações usando linguagem natural." />
              <FeatureCard icon={<Lock size={21} />} title="Privacidade por espaço" description="Acesso autenticado e dados organizados por workspace para cada contexto." />
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-indigo-400/20 bg-gradient-to-br from-indigo-500/15 via-[#111626] to-cyan-400/[0.08] p-7 text-center shadow-2xl shadow-black/30 sm:p-14">
            <div aria-hidden className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-400/20 blur-[90px]" />
            <div className="relative"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] text-indigo-200"><Wallet size={22} /></div><h2 className="mt-6 text-3xl font-black tracking-tight text-white sm:text-5xl">Seu dinheiro merece um plano claro.</h2><p className="mx-auto mt-4 max-w-xl leading-7 text-slate-400">Crie seu espaço financeiro, registre as primeiras movimentações e comece a decidir com mais segurança.</p><Link href="/auth/register" className="group mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-7 text-sm font-extrabold text-slate-950 transition-transform hover:-translate-y-0.5">Criar meu espaço <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" /></Link></div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/[0.07] bg-[#070a10]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-6 py-8 text-center sm:flex-row sm:text-left lg:px-8"><div className="flex items-center gap-2.5 font-bold text-slate-300"><Building2 size={17} className="text-indigo-300" /> Controle A Dois</div><p className="text-xs text-slate-600">© {new Date().getFullYear()} Controle financeiro simples e compartilhado.</p><a href="https://brianlucca.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-slate-500 transition-colors hover:text-indigo-300">Desenvolvido por Brian Lucca</a></div>
      </footer>
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-2xl lg:mx-0">
      <div aria-hidden className="absolute inset-10 rounded-full bg-indigo-500/20 blur-[90px]" />
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b0f18]/95 p-2 shadow-[0_35px_100px_rgba(0,0,0,.55)] ring-1 ring-white/[0.04] sm:rounded-3xl sm:p-3">
        <div className="flex items-center gap-1.5 border-b border-white/[0.07] px-3 py-2.5"><span className="h-2 w-2 rounded-full bg-rose-400/70" /><span className="h-2 w-2 rounded-full bg-amber-400/70" /><span className="h-2 w-2 rounded-full bg-emerald-400/70" /><span className="ml-2 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600">Visão geral</span></div>
        <div className="grid gap-2 p-2.5 sm:grid-cols-[.78fr_1.22fr] sm:gap-3 sm:p-3">
          <div className="space-y-2.5">
            <div className="rounded-xl border border-white/[0.07] bg-gradient-to-br from-indigo-500/15 to-transparent p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Saldo disponível</p><p className="mt-2 text-2xl font-black tracking-tight text-white">R$ 3.240,00</p><p className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-emerald-300"><TrendingUp size={12} /> +12% neste ciclo</p></div>
            <div className="grid grid-cols-2 gap-2"><PreviewStat icon={<TrendingUp size={13} />} label="Entradas" value="8.420" tone="emerald" /><PreviewStat icon={<TrendingDown size={13} />} label="Saídas" value="5.180" tone="rose" /></div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"><div className="flex items-center justify-between"><p className="text-[10px] font-bold text-slate-300">Orçamento mensal</p><p className="text-[9px] text-indigo-300">64%</p></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full w-[64%] rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400" /></div></div>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5 sm:p-4">
            <div className="flex items-center justify-between"><div><p className="text-xs font-extrabold text-white">Fluxo do ciclo</p><p className="mt-0.5 text-[9px] text-slate-600">Entradas e saídas acumuladas</p></div><span className="rounded-md bg-indigo-400/10 px-2 py-1 text-[9px] font-bold text-indigo-300">SET</span></div>
            <div className="mt-5 flex h-28 items-end gap-2 sm:h-36">{[38, 56, 43, 72, 60, 82, 68, 92].map((height, index) => <div key={height + index} className="flex h-full flex-1 items-end"><div className="w-full rounded-t-sm bg-gradient-to-t from-indigo-600/30 to-indigo-400/80" style={{ height: `${height}%` }} /></div>)}</div>
            <div className="mt-4 space-y-2.5 border-t border-white/[0.06] pt-3"><PreviewTransaction icon={<ReceiptText size={13} />} title="Mercado" date="Hoje" value="− R$ 286,40" /><PreviewTransaction icon={<CalendarDays size={13} />} title="Assinatura" date="Amanhã" value="− R$ 49,90" /></div>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-5 -left-2 hidden items-center gap-2 rounded-xl border border-emerald-400/15 bg-[#111827]/95 px-3 py-2.5 shadow-xl backdrop-blur sm:flex"><CheckCircle2 size={15} className="text-emerald-400" /><div><p className="text-[10px] font-bold text-slate-200">Tudo atualizado</p><p className="text-[9px] text-slate-500">Sincronizado agora</p></div></div>
    </div>
  );
}

function PreviewStat({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: "emerald" | "rose" }) {
  const color = tone === "emerald" ? "text-emerald-300 bg-emerald-400/10" : "text-rose-300 bg-rose-400/10";
  return <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"><span className={`inline-flex rounded-md p-1 ${color}`}>{icon}</span><p className="mt-2 text-[9px] text-slate-500">{label}</p><p className="mt-0.5 text-xs font-extrabold text-white">R$ {value}</p></div>;
}

function PreviewTransaction({ icon, title, date, value }: { icon: ReactNode; title: string; date: string; value: string }) {
  return <div className="flex items-center gap-2"><span className="rounded-md bg-white/[0.05] p-1.5 text-slate-400">{icon}</span><div className="min-w-0 flex-1"><p className="text-[10px] font-bold text-slate-300">{title}</p><p className="text-[9px] text-slate-600">{date}</p></div><p className="text-[10px] font-bold text-rose-300">{value}</p></div>;
}

function FeatureCard({ icon, title, description, children, className = "" }: { icon: ReactNode; title: string; description: string; children?: ReactNode; className?: string }) {
  return <article className={`group rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.045] to-white/[0.015] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-indigo-400/25 hover:bg-white/[0.055] sm:p-7 ${className}`}><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-400/15 bg-indigo-400/[0.09] text-indigo-300 transition-transform duration-300 group-hover:scale-105">{icon}</div><h3 className="mt-5 text-lg font-extrabold text-white">{title}</h3><p className="mt-2 max-w-lg text-sm leading-6 text-slate-400">{description}</p>{children}</article>;
}

function MiniMetric({ label, value, tone }: { label: string; value: string; tone: "emerald" | "rose" | "indigo" }) {
  const colors = { emerald: "text-emerald-300", rose: "text-rose-300", indigo: "text-indigo-300" };
  return <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-600">{label}</p><p className={`mt-1 text-xs font-extrabold sm:text-sm ${colors[tone]}`}>{value}</p></div>;
}
