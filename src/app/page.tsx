import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Briefcase,
  CalendarDays,
  Check,
  CircleDollarSign,
  CreditCard,
  Eye,
  Fingerprint,
  Landmark,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  PieChart,
  Plus,
  ReceiptText,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  WalletCards,
} from "lucide-react";
import {
  ControleADoisLogo,
  ControleADoisMark,
} from "@/components/controle-adois-logo";

function ProductPreview() {
  const nav = [
    [LayoutDashboard, "Visão geral"],
    [Wallet, "Transações"],
    [CreditCard, "Contas & Pix"],
    [CalendarDays, "Calendário"],
    [PieChart, "Relatórios"],
  ] as const;
  return (
    <div className="landing-dashboard mx-auto max-w-[1080px] rounded-[30px] border border-[#dfe1e7] bg-[#f5f6f8] p-3 shadow-[0_45px_100px_-32px_rgba(21,26,46,.3)]">
      <div className="overflow-hidden rounded-[22px] border border-[#e4e7ed] bg-[#f7f6f3]">
        <div className="grid min-h-[520px] md:grid-cols-[218px_1fr]">
          <aside className="hidden border-r border-[#ebe9e8] bg-[#fbfaf7] md:block">
            <div className="flex h-16 items-center gap-3 border-b border-[#ebe9e8] px-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#635bff]">
                <ControleADoisMark className="h-5 w-5" />
              </span>
              <b className="text-sm tracking-tight">Controle A Dois</b>
            </div>
            <div className="m-3 flex items-center gap-2 rounded-xl border border-[#e5e3e4] bg-white p-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f0efff] text-[10px] font-black text-[#635bff]">
                WN
              </span>
              <span className="min-w-0">
                <small className="block text-[7px] font-bold uppercase tracking-wider text-[#9a9ca3]">
                  Espaço atual
                </small>
                <b className="block truncate text-[10px]">Workspace Novo</b>
              </span>
            </div>
            <p className="mb-2 mt-5 px-6 text-[7px] font-bold uppercase tracking-[.16em] text-[#aaa9ae]">
              Principal
            </p>
            {nav.map(([Icon, label], i) => (
              <div
                key={label}
                className={`mx-3 mb-1 flex gap-3 rounded-xl px-3 py-2.5 text-[11px] font-semibold ${i === 0 ? "bg-[#eeecff] text-[#5e56dc]" : "text-[#70737b]"}`}
              >
                <Icon size={15} />
                {label}
              </div>
            ))}
            <p className="mb-2 mt-5 px-6 text-[7px] font-bold uppercase tracking-[.16em] text-[#aaa9ae]">
              Conta
            </p>
            <div className="mx-3 mb-1 flex gap-3 rounded-xl px-3 py-2.5 text-[11px] font-semibold text-[#70737b]">
              <Briefcase size={15} /> Espaços e pessoas
            </div>
            <div className="mx-3 mb-1 flex gap-3 rounded-xl px-3 py-2.5 text-[11px] font-semibold text-[#70737b]">
              <Settings size={15} /> Configurações
            </div>
          </aside>
          <div className="min-w-0">
            <div className="flex h-16 items-center justify-between border-b border-[#ebe9e8] bg-[#fbfaf7]/90 px-4 sm:px-6">
              <b className="text-xs">Visão Geral</b>
              <div className="flex items-center gap-3">
                <span className="hidden text-right sm:block">
                  <b className="block text-[9px] leading-none">Conta de demonstração</b>
                  <small className="mt-1 block text-[7px] text-[#8a8d96]">
                    controle@adois.app
                  </small>
                </span>
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#ebe9ff] text-[9px] font-bold text-[#5d55dd] ring-1 ring-[#dad6ff]">
                  CA
                </span>
              </div>
            </div>
            <div className="p-4 sm:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[8px] font-bold uppercase tracking-[.16em] text-[#635bff]">
                  Visão geral
                </p>
                <p className="mt-1 text-lg font-black tracking-[-.04em] sm:text-xl">
                  Olá, vamos organizar o mês?
                </p>
                <p className="mt-1 hidden text-[9px] text-[#777a83] sm:block">
                  O essencial do espaço Workspace Novo.
                </p>
              </div>
              <button className="flex shrink-0 gap-2 rounded-xl bg-[#635bff] px-3 py-2.5 text-[10px] font-bold text-white">
                <Plus size={14} />
                <span className="hidden sm:block">Nova transação</span>
              </button>
            </div>

            <div className="mt-4 grid gap-3 rounded-2xl border border-[#dedbe9] bg-gradient-to-br from-[#f1efff] to-[#fbfaff] p-4 sm:grid-cols-[1fr_190px] sm:items-end">
              <div>
                <p className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[.13em] text-[#7771dd]">
                  <Wallet size={12} /> Saldo disponível hoje
                </p>
                <p className="mt-2 text-2xl font-black tracking-[-.05em] sm:text-3xl">
                  R$ 8.740,50
                </p>
                <div className="mt-3 h-1.5 max-w-[270px] overflow-hidden rounded-full bg-[#e8e7ed]">
                  <div className="h-full w-[42%] rounded-full bg-[#635bff]" />
                </div>
                <p className="mt-1.5 text-[8px] text-[#8b8d95]">
                  42% do limite mensal utilizado
                </p>
              </div>
              <div className="rounded-xl border border-[#e7e5ee] bg-white/80 p-3">
                <p className="text-[8px] font-semibold text-[#81838c]">
                  Saldo previsto
                </p>
                <p className="mt-1 text-base font-extrabold">R$ 9.250,00</p>
                <p className="mt-1 text-[7px] leading-3 text-[#92949b]">
                  Considera valores a receber e a pagar.
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                {
                  icon: ArrowUpRight,
                  label: "Receitas no período",
                  value: "R$ 12.850",
                  color: "#168267",
                  background: "#eaf8f3",
                },
                {
                  icon: ArrowDownRight,
                  label: "Despesas no período",
                  value: "R$ 4.109",
                  color: "#d45f51",
                  background: "#fff0ed",
                },
                {
                  icon: Sparkles,
                  label: "Média livre por mês",
                  value: "R$ 3.420",
                  color: "#635bff",
                  background: "#efedff",
                },
              ].map(({ icon: Icon, label, value, color, background }) => (
                <div
                  key={label}
                  className="flex min-w-0 items-center gap-2 rounded-xl border border-[#eaecf0] bg-white p-2.5 sm:p-3"
                >
                  <span
                    className="hidden h-8 w-8 shrink-0 place-items-center rounded-lg sm:grid"
                    style={{ color, background }}
                  >
                    <Icon size={14} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[7px] font-semibold text-[#81838c] sm:text-[8px]">
                      {label}
                    </span>
                    <b className="mt-1 block truncate text-[11px] sm:text-sm">
                      {value}
                    </b>
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-[1.45fr_1fr]">
              <div className="overflow-hidden rounded-2xl border border-[#eaecf0] bg-white">
                <div className="flex items-center justify-between border-b border-[#efedf0] px-4 py-3">
                  <span>
                    <b className="block text-[10px]">Movimentações recentes</b>
                    <small className="text-[7px] text-[#92949b]">
                      O que aconteceu por último neste espaço.
                    </small>
                  </span>
                  <span className="text-[8px] font-bold text-[#635bff]">
                    Ver todas
                  </span>
                </div>
                <div className="divide-y divide-[#efedf0] px-3">
                  {[
                    ["Mercado do bairro", "Hoje · Mercado", "− R$ 186,40"],
                    ["Salário", "05 set · Receita", "+ R$ 6.800,00"],
                  ].map(([description, detail, value], index) => (
                    <div key={description} className="flex items-center gap-2 py-2.5">
                      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${index ? "bg-[#eaf8f3] text-[#168267]" : "bg-[#fff1ed] text-[#d45f51]"}`}>
                        {index ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-[9px]">{description}</b>
                        <small className="block truncate text-[7px] text-[#92949b]">
                          {detail}
                        </small>
                      </span>
                      <b className={`text-[8px] ${index ? "text-[#168267]" : "text-[#44464e]"}`}>
                        {value}
                      </b>
                    </div>
                  ))}
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl border border-[#eaecf0] bg-white">
                <div className="border-b border-[#efedf0] px-4 py-3">
                  <b className="block text-[10px]">Próximos compromissos</b>
                  <small className="text-[7px] text-[#92949b]">
                    Contas que merecem atenção.
                  </small>
                </div>
                <div className="divide-y divide-[#efedf0] px-3">
                  {[
                    ["Internet", "Vence em 12/09", "R$ 119,90"],
                    ["Energia", "Vence em 15/09", "R$ 164,30"],
                  ].map(([description, detail, value]) => (
                    <div key={description} className="flex items-center gap-2 py-2.5">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#fff1e9] text-[#d76e43]">
                        <CalendarDays size={12} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-[9px]">{description}</b>
                        <small className="block truncate text-[7px] text-[#92949b]">
                          {detail}
                        </small>
                      </span>
                      <b className="text-[8px]">{value}</b>
                    </div>
                  ))}
                </div>
              </div>
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
              Criar conta <ArrowRight size={15} />
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
              <Check className="mr-1 inline text-[#21a77d]" size={13} />
              Registre receitas e despesas · Acompanhe contas e Pix
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
