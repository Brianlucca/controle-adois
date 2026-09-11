import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  CircleDollarSign,
  Eye,
  Fingerprint,
  Landmark,
  LockKeyhole,
  Menu,
  PieChart,
  Plus,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
import { ControleADoisLogo } from "@/components/controle-adois-logo";

function ProductPreview() {
  const nav = [
    [PieChart, "Dashboard"],
    [ReceiptText, "Transações"],
    [CalendarDays, "Calendário"],
    [WalletCards, "Pagamentos"],
    [TrendingUp, "Relatórios"],
  ] as const;
  return (
    <div className="landing-dashboard mx-auto max-w-[1080px] rounded-[30px] border border-[#dfe1e7] bg-[#f5f6f8] p-3 shadow-[0_45px_100px_-32px_rgba(21,26,46,.3)]">
      <div className="overflow-hidden rounded-[22px] border border-[#e4e7ed] bg-white">
        <div className="flex h-16 items-center justify-between border-b border-[#edf0f3] px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#635bff] text-xs font-black text-white">
              2
            </span>
            <b className="text-sm">Nossa casa</b>
            <span className="hidden rounded-full bg-[#efedff] px-2 py-1 text-[9px] font-bold text-[#635bff] sm:block">
              COMPARTILHADO
            </span>
          </div>
          <Bell size={17} />
        </div>
        <div className="grid min-h-[420px] md:grid-cols-[205px_1fr]">
          <aside className="hidden border-r border-[#edf0f3] p-4 md:block">
            {nav.map(([Icon, label], i) => (
              <div
                key={label}
                className={`mb-1 flex gap-3 rounded-xl px-3 py-3 text-xs font-semibold ${i === 0 ? "bg-[#f0efff] text-[#635bff]" : "text-[#797e89]"}`}
              >
                <Icon size={15} />
                {label}
              </div>
            ))}
          </aside>
          <div className="p-4 sm:p-7">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#9ca1ab]">
                  Saldo disponível
                </p>
                <p className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
                  R$ 8.740,50
                </p>
              </div>
              <button className="flex gap-2 rounded-xl bg-[#171923] px-3 py-2.5 text-xs font-bold text-white">
                <Plus size={14} />
                <span className="hidden sm:block">Nova transação</span>
              </button>
            </div>
            <div className="mt-7 grid grid-cols-3 gap-2">
              {[
                ["Receitas", "R$ 12.850", "+8,4%"],
                ["Despesas", "R$ 4.109", "−2,1%"],
                ["Economia", "R$ 3.420", "+12,7%"],
              ].map(([a, b, c]) => (
                <div
                  key={a}
                  className="rounded-2xl border border-[#eaecf0] p-3 sm:p-4"
                >
                  <div className="flex justify-between text-[8px] text-[#8a8f99] sm:text-[10px]">
                    <span>{a}</span>
                    <span className="text-[#158467]">{c}</span>
                  </div>
                  <p className="mt-2 text-sm font-extrabold sm:text-lg">{b}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-[1.45fr_1fr]">
              <div className="rounded-2xl border border-[#eaecf0] p-5">
                <b className="text-xs">Fluxo mensal</b>
                <div className="mt-6 flex h-32 items-end gap-2 border-b border-[#e9ebef]">
                  {[45, 60, 52, 76, 66, 88, 70, 94, 76, 100, 82, 92].map(
                    (h, i) => (
                      <span
                        key={i}
                        style={{ height: `${h}%` }}
                        className={`flex-1 rounded-t ${i % 2 ? "bg-[#c4c0ff]" : "bg-[#635bff]"}`}
                      />
                    ),
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-[#eaecf0] p-5">
                <b className="text-xs">Por categoria</b>
                {[
                  ["Moradia", "100%"],
                  ["Mercado", "62%"],
                  ["Lazer", "36%"],
                ].map(([a, w]) => (
                  <div className="mt-5" key={a}>
                    <div className="mb-2 text-[9px] text-[#747984]">{a}</div>
                    <div className="h-1.5 rounded-full bg-[#f0f1f4]">
                      <div
                        className="h-full rounded-full bg-[#635bff]"
                        style={{ width: w }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const features = [
  [
    Eye,
    "Uma visão. Duas pessoas.",
    "Receitas, despesas e metas atualizadas no mesmo instante. Cada um sabe onde estão e para onde vão.",
  ],
  [
    Bell,
    "O combinado não vira cobrança.",
    "Lembretes inteligentes mantêm pagamentos e vencimentos no radar dos dois.",
  ],
  [
    ReceiptText,
    "Do recibo ao controle.",
    "Registre movimentações sem complicação e mantenha cada detalhe organizado.",
  ],
  [
    TrendingUp,
    "Planos que saem do papel.",
    "Transformem sonhos em metas claras, acompanhem a evolução e celebrem cada etapa.",
  ],
] as const;

export default function LandingPage() {
  return (
    <div className="landing-page min-h-screen overflow-hidden bg-[#fbfaf7] text-[#16171b]">
      <header className="relative z-50 border-b border-black/[.06] bg-[#fbfaf7]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between px-5">
          <Link href="/">
            <ControleADoisLogo className="landing-logo" />
          </Link>
          <nav className="hidden gap-8 text-sm font-semibold text-[#565963] md:flex">
            <a href="#produto">Produto</a>
            <a href="#como-funciona">Como funciona</a>
            <a href="#seguranca">Segurança</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/auth/login"
              className="hidden px-4 text-sm font-bold sm:block"
            >
              Entrar
            </Link>
            <Link
              href="/auth/register"
              className="flex items-center gap-2 rounded-full bg-[#17181d] px-5 py-2.5 text-sm font-bold text-white"
            >
              Começar grátis <ArrowRight size={15} />
            </Link>
            <Menu className="md:hidden" />
          </div>
        </div>
      </header>
      <main>
        <section className="relative px-5 pb-24 pt-16 sm:pt-24">
          <div className="hero-orb absolute left-1/2 top-[-280px] h-[780px] w-[950px] -translate-x-1/2" />
          <div className="relative mx-auto max-w-[1000px] text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#dcd8fb] bg-white/70 px-3 py-1.5 text-[11px] font-bold text-[#554bd3]">
              <Sparkles size={13} /> Feito para a vida financeira a dois
            </div>
            <h1 className="mt-7 text-[3.25rem] font-black leading-[.93] tracking-[-.065em] sm:text-[5rem] lg:text-[6.3rem]">
              O dinheiro de vocês,{" "}
              <span className="landing-gradient-text">
                finalmente em sintonia.
              </span>
            </h1>
            <p className="mx-auto mt-7 max-w-[650px] text-lg leading-8 text-[#61646d]">
              Planejem, acompanhem e decidam juntos — sem planilhas confusas,
              cobranças ou conversas que ficam para depois.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/auth/register"
                className="rounded-full bg-[#635bff] px-7 py-4 text-sm font-extrabold text-white"
              >
                Criar nosso espaço{" "}
                <ArrowRight className="ml-2 inline" size={17} />
              </Link>
              <a
                href="#produto"
                className="rounded-full border border-[#d9d9de] bg-white px-7 py-4 text-sm font-bold"
              >
                Conhecer o produto
              </a>
            </div>
            <p className="mt-5 text-xs text-[#8b8d94]">
              <Check className="mr-1 inline text-[#21a77d]" size={13} /> Grátis
              para começar · Sem cartão de crédito
            </p>
          </div>
          <div className="relative mx-auto mt-16 max-w-[1180px]">
            <ProductPreview />
          </div>
        </section>
        <section className="border-y border-black/[.06] bg-white px-5 py-14">
          <div className="mx-auto grid max-w-[1180px] grid-cols-2 gap-10 text-center sm:grid-cols-4">
            {[
              ["1 lugar", "para tudo do casal"],
              ["100%", "visível para os dois"],
              ["24/7", "controle em tempo real"],
              ["0 estresse", "com a planilha"],
            ].map(([a, b]) => (
              <div key={a}>
                <p className="text-3xl font-black">{a}</p>
                <p className="mt-1 text-sm text-[#777a82]">{b}</p>
              </div>
            ))}
          </div>
        </section>
        <section id="produto" className="px-5 py-24 sm:py-32">
          <div className="mx-auto max-w-[1180px]">
            <p className="section-kicker">Clareza compartilhada</p>
            <h2 className="mt-4 text-4xl font-black leading-none tracking-[-.05em] sm:text-6xl">
              Menos “quem pagou?”.
              <br />
              <span className="text-[#777983]">Mais “vamos realizar”.</span>
            </h2>
            <div className="mt-14 grid gap-5 md:grid-cols-3">
              {features.map(([Icon, a, b], i) => (
                <article
                  key={a}
                  className={`feature-card ${i === 0 || i === 3 ? "md:col-span-2" : ""} ${i === 1 ? "feature-dark" : ""}`}
                >
                  <span className="feature-icon">
                    <Icon size={20} />
                  </span>
                  <h3>{a}</h3>
                  <p>{b}</p>
                  <div className="feature-visual">
                    <span />
                    <span />
                    <span />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section
          id="como-funciona"
          className="bg-[#17181d] px-5 py-24 text-white sm:py-32"
        >
          <div className="mx-auto grid max-w-[1180px] gap-14 lg:grid-cols-2">
            <div>
              <p className="section-kicker">Simples por princípio</p>
              <h2 className="mt-4 text-4xl font-black leading-none tracking-[-.05em] sm:text-6xl">
                Comecem em minutos. Evoluam juntos.
              </h2>
              <p className="mt-6 leading-7 text-[#a9abb4]">
                A tecnologia fica nos bastidores. Vocês ficam com decisões mais
                tranquilas e objetivos em comum.
              </p>
            </div>
            <div className="space-y-3">
              {[
                [Users, "Criem o espaço de vocês"],
                [WalletCards, "Registrem o que movimenta a casa"],
                [CircleDollarSign, "Decidam com contexto"],
              ].map(([Icon, a], i) => (
                <div className="step-row" key={a as string}>
                  <span>0{i + 1}</span>
                  <Icon className="text-[#aaa5ff]" size={20} />
                  <b>{a as string}</b>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section id="seguranca" className="px-5 py-24 sm:py-32">
          <div className="mx-auto grid max-w-[1180px] gap-14 lg:grid-cols-2 lg:items-center">
            <div className="rounded-[32px] bg-[#ebe9ff] p-8">
              <div className="rounded-[24px] bg-white p-7 shadow-xl">
                <ShieldCheck
                  className="rounded-2xl bg-[#635bff] p-3 text-white"
                  size={50}
                />
                <h3 className="mt-6 text-2xl font-black">
                  O espaço é de vocês.
                </h3>
                {[
                  [LockKeyhole, "Sessões protegidas"],
                  [Fingerprint, "Acesso autenticado"],
                  [Landmark, "Dados separados por espaço"],
                ].map(([Icon, a]) => (
                  <div
                    key={a as string}
                    className="mt-3 flex gap-3 rounded-xl bg-[#f7f7f9] px-4 py-3 text-sm font-semibold"
                  >
                    <Icon size={17} className="text-[#635bff]" />
                    {a as string}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="section-kicker">Segurança sem atalhos</p>
              <h2 className="mt-4 text-4xl font-black leading-none tracking-[-.05em] sm:text-6xl">
                Privado como deve ser.
              </h2>
              <p className="mt-6 text-lg leading-8 text-[#6f727b]">
                Cada espaço financeiro é isolado, cada acesso é autenticado e
                toda ação importante deixa histórico.
              </p>
            </div>
          </div>
        </section>
        <section className="px-5 pb-24">
          <div className="cta-panel mx-auto max-w-[1180px] rounded-[32px] px-6 py-20 text-center text-white">
            <p className="section-kicker">A próxima decisão começa aqui</p>
            <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-black leading-none tracking-[-.05em] sm:text-6xl">
              Dinheiro pode aproximar vocês.
            </h2>
            <p className="mt-5 text-[#bbbcc5]">
              Criem hoje o espaço financeiro da vida que estão construindo.
            </p>
            <Link
              href="/auth/register"
              className="mt-9 inline-flex gap-2 rounded-full bg-white px-7 py-4 text-sm font-extrabold text-[#191a20]"
            >
              Começar agora <ArrowRight size={17} />
            </Link>
          </div>
        </section>
      </main>
      <footer className="border-t border-black/[.07] bg-white px-5 py-10">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <ControleADoisLogo className="landing-logo" />
          <div className="flex gap-6 text-xs font-semibold text-[#777a82]">
            <a href="#produto">Produto</a>
            <a href="#seguranca">Segurança</a>
            <Link href="/auth/login">Entrar</Link>
          </div>
          <p className="text-xs text-[#9a9ca3]">
            © {new Date().getFullYear()} Controle A Dois
          </p>
        </div>
      </footer>
    </div>
  );
}
