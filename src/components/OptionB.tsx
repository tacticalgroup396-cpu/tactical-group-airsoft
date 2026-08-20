import Icon from "./Icon";
import { brand, features, nav, plans, stats, testimonials } from "../data/site";

export default function OptionB() {
  return (
    <div className="min-h-screen bg-[#0b0d10] font-sans text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="animate-float-slow absolute -top-40 -left-24 h-[32rem] w-[32rem] rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, #6366f1 0%, rgba(11,13,16,0) 70%)" }}
        />
        <div
          className="animate-float-slow absolute top-40 -right-24 h-[28rem] w-[28rem] rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, #22d3ee 0%, rgba(11,13,16,0) 70%)", animationDelay: "3s" }}
        />
      </div>

      <div className="relative">
        <header className="sticky top-0 z-30 border-b border-white/8 bg-[#0b0d10]/80 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 text-sm font-bold text-[#0b0d10]">
                Ó
              </span>
              <span className="text-lg font-semibold tracking-tight">{brand.name}</span>
            </div>
            <nav className="hidden items-center gap-7 md:flex">
              {nav.map((i) => (
                <a key={i.href} href={i.href} className="text-sm text-slate-400 transition-colors hover:text-white">
                  {i.label}
                </a>
              ))}
            </nav>
            <button
              type="button"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#0b0d10] transition-transform hover:-translate-y-0.5"
            >
              Criar conta
            </button>
          </div>
        </header>

        <section className="mx-auto grid max-w-6xl items-center gap-14 px-6 py-20 lg:grid-cols-2 lg:py-28">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs font-medium text-cyan-300">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              Versão 3.0 disponível
            </span>
            <h1 className="mt-6 text-5xl leading-[1.05] font-bold tracking-tight text-balance sm:text-6xl">
              Operação de produto,{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-cyan-300 bg-clip-text text-transparent">
                sem ruído
              </span>
              .
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-400">{brand.claim}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                className="group inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-[#0b0d10] transition-transform hover:-translate-y-0.5"
              >
                Começar de graça
                <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
              <button
                type="button"
                className="rounded-lg border border-white/15 px-6 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/5"
              >
                Agendar demo
              </button>
            </div>
            <div className="mt-12 grid grid-cols-2 gap-6 border-t border-white/8 pt-8 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label}>
                  <div className="text-2xl font-bold">{s.value}</div>
                  <div className="mt-0.5 text-[12px] text-slate-500">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="animate-fade-up rounded-2xl border border-white/10 bg-white/4 p-2 backdrop-blur" style={{ animationDelay: "120ms" }}>
            <div className="rounded-xl bg-[#0f1216] p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Portfólio · Q1</span>
                <span className="rounded-md bg-emerald-400/10 px-2 py-1 text-[11px] font-medium text-emerald-300">
                  no ritmo
                </span>
              </div>
              <div className="mt-5 space-y-3">
                {[
                  { n: "Onboarding sem atrito", p: 78, c: "from-indigo-500 to-indigo-400" },
                  { n: "Checkout em 1 clique", p: 54, c: "from-cyan-500 to-cyan-400" },
                  { n: "Painel de retenção", p: 32, c: "from-fuchsia-500 to-fuchsia-400" },
                  { n: "API pública v2", p: 91, c: "from-emerald-500 to-emerald-400" },
                ].map((r) => (
                  <div key={r.n} className="rounded-lg border border-white/8 bg-white/3 p-3">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-slate-200">{r.n}</span>
                      <span className="text-slate-500">{r.p}%</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
                      <div className={`h-full rounded-full bg-gradient-to-r ${r.c}`} style={{ width: `${r.p}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="recursos" className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="max-w-xl text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Um sistema operacional para o time de produto.
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.index}
                className="rounded-2xl border border-white/10 bg-white/4 p-6 transition-colors hover:border-white/20 hover:bg-white/7"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/25 to-cyan-400/25 text-cyan-300">
                  <Icon name={f.icon} className="h-[18px] w-[18px]" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-slate-400">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="produto" className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-4 md:grid-cols-2">
            {testimonials.map((t) => (
              <figure key={t.author} className="rounded-2xl border border-white/10 bg-white/4 p-7">
                <blockquote className="text-lg leading-snug text-pretty text-slate-200">“{t.quote}”</blockquote>
                <figcaption className="mt-6 flex items-center gap-3 text-sm">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 text-xs font-bold text-[#0b0d10]">
                    {t.initials}
                  </span>
                  <span>
                    <span className="block font-semibold">{t.author}</span>
                    <span className="block text-[13px] text-slate-500">{t.role}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section id="planos" className="mx-auto max-w-6xl px-6 py-16 pb-32">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Planos</h2>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`rounded-2xl border p-7 ${
                  p.highlight
                    ? "border-cyan-400/40 bg-gradient-to-b from-cyan-400/12 to-transparent"
                    : "border-white/10 bg-white/4"
                }`}
              >
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{p.price}</span>
                  <span className="text-[13px] text-slate-500">{p.period}</span>
                </div>
                <p className="mt-3 text-[14px] text-slate-400">{p.description}</p>
                <ul className="mt-6 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[14px] text-slate-300">
                      <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className={`mt-7 w-full rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                    p.highlight
                      ? "bg-gradient-to-r from-indigo-500 to-cyan-400 text-[#0b0d10]"
                      : "border border-white/15 text-slate-200 hover:bg-white/5"
                  }`}
                >
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
