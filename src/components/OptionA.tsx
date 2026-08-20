import { useState } from "react";
import Icon from "./Icon";
import { brand, faqs, features, nav, plans, stats, steps, testimonials } from "../data/site";

function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-ink/10 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="#topo" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/20 bg-ink text-paper">
            <span className="font-display text-[15px] leading-none">Ó</span>
          </span>
          <span className="font-display text-xl tracking-tight text-ink">{brand.name}</span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-[13px] font-medium tracking-wide text-ink/60 uppercase transition-colors hover:text-ink"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <a href="#planos" className="text-sm font-medium text-ink/70 transition-colors hover:text-ink">
            Entrar
          </a>
          <a
            href="#planos"
            className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5"
          >
            Criar conta
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 text-ink md:hidden"
          aria-label="Abrir menu"
        >
          <Icon name={open ? "close" : "map"} className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div className="border-t border-ink/10 bg-paper px-6 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="text-sm text-ink/70"
              >
                {item.label}
              </a>
            ))}
            <a
              href="#planos"
              onClick={() => setOpen(false)}
              className="mt-1 rounded-full bg-ink px-4 py-2 text-center text-sm text-paper"
            >
              Criar conta
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section id="topo" className="relative overflow-hidden px-6 pt-20 pb-16 sm:pt-28">
      <div
        className="pointer-events-none absolute top-[-18rem] left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle, #e7d9c5 0%, rgba(250,248,244,0) 70%)" }}
      />
      <div className="relative mx-auto max-w-3xl text-center">
        <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white/60 px-3 py-1 text-[12px] font-medium tracking-wide text-ink/70 uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-clay" />
          Versão 3.0 disponível
        </span>

        <h1
          className="animate-fade-up font-display mt-7 text-[2.75rem] leading-[1.05] font-light tracking-tight text-balance text-ink sm:text-6xl"
          style={{ animationDelay: "60ms" }}
        >
          {brand.tagline}
        </h1>

        <p
          className="animate-fade-up mx-auto mt-6 max-w-xl text-lg leading-relaxed text-pretty text-ink/60"
          style={{ animationDelay: "120ms" }}
        >
          {brand.claim}
        </p>

        <div
          className="animate-fade-up mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          style={{ animationDelay: "180ms" }}
        >
          <a
            href="#planos"
            className="group inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper shadow-[0_12px_30px_-12px_rgba(20,16,12,0.6)] transition-transform hover:-translate-y-0.5"
          >
            Começar de graça
            <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
          <a
            href="#como-funciona"
            className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-ink/5"
          >
            Ver como funciona
          </a>
        </div>

        <p className="animate-fade-in mt-5 text-[13px] text-ink/45" style={{ animationDelay: "260ms" }}>
          Sem cartão de crédito · Cancelamento em um clique
        </p>
      </div>

      <div
        className="animate-fade-up relative mx-auto mt-16 max-w-5xl"
        style={{ animationDelay: "260ms" }}
      >
        <div className="overflow-hidden rounded-2xl border border-ink/12 bg-white shadow-[0_40px_80px_-40px_rgba(20,16,12,0.35)]">
          <div className="flex items-center gap-2 border-b border-ink/10 bg-paper px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
            <span className="ml-3 rounded-md bg-white px-3 py-1 text-[11px] text-ink/40">
              app.orbita.com.br/portfolio
            </span>
          </div>
          <div className="grid gap-px bg-ink/8 sm:grid-cols-3">
            {[
              { t: "Descoberta", n: 4, c: "bg-[#e8dcc8]" },
              { t: "Em construção", n: 7, c: "bg-[#cfdcd2]" },
              { t: "Medindo impacto", n: 3, c: "bg-[#e3d5d0]" },
            ].map((col) => (
              <div key={col.t} className="bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold tracking-wide text-ink/70 uppercase">
                    {col.t}
                  </span>
                  <span className="rounded-full bg-ink/6 px-2 py-0.5 text-[11px] text-ink/50">{col.n}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-lg border border-ink/8 bg-paper/60 p-3">
                      <div className={`h-1.5 w-10 rounded-full ${col.c}`} />
                      <div className="mt-2.5 h-2 w-full rounded-full bg-ink/8" />
                      <div className="mt-1.5 h-2 w-2/3 rounded-full bg-ink/6" />
                      <div className="mt-3 flex items-center gap-1.5">
                        <span className="h-4 w-4 rounded-full bg-ink/10" />
                        <span className="h-4 w-4 rounded-full bg-ink/6" />
                        <span className="ml-auto h-2 w-8 rounded-full bg-ink/8" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  return (
    <section className="border-y border-ink/10 bg-white/50 px-6 py-10">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div className="font-display text-3xl font-light text-ink">{s.value}</div>
            <div className="mt-1 text-[12px] tracking-wide text-ink/45 uppercase">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="max-w-2xl">
      <span className="text-[12px] font-semibold tracking-[0.18em] text-clay uppercase">{eyebrow}</span>
      <h2 className="font-display mt-3 text-3xl leading-tight font-light text-balance text-ink sm:text-4xl">
        {title}
      </h2>
      {text && <p className="mt-4 text-[17px] leading-relaxed text-pretty text-ink/60">{text}</p>}
    </div>
  );
}

function Features() {
  return (
    <section id="recursos" className="px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <SectionTitle
          eyebrow="Recursos"
          title="Tudo o que o time de produto abre em dez abas, em uma só."
          text="A Órbita não tenta ser mais uma ferramenta. Ela costura o que você já usa e devolve o contexto no lugar certo."
        />

        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-ink/10 bg-ink/10 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <article key={f.index} className="group bg-paper p-7 transition-colors hover:bg-white">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/12 text-ink/70 transition-colors group-hover:border-clay/40 group-hover:text-clay">
                  <Icon name={f.icon} className="h-[18px] w-[18px]" />
                </span>
                <span className="font-display text-sm text-ink/25">{f.index}</span>
              </div>
              <h3 className="font-display mt-5 text-xl text-ink">{f.title}</h3>
              <p className="mt-2.5 text-[15px] leading-relaxed text-ink/55">{f.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="como-funciona" className="border-t border-ink/10 bg-white/60 px-6 py-20 sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionTitle
          eyebrow="Como funciona"
          title="Do caos ao ritual em três passos."
          text="A implantação média leva menos de uma tarde. Não é promessa de vendedor: é o tempo real medido nos últimos 300 workspaces criados."
        />

        <div className="space-y-px overflow-hidden rounded-2xl border border-ink/10 bg-ink/10">
          {steps.map((s) => (
            <div key={s.number} className="flex gap-5 bg-paper p-7">
              <span className="font-display flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-lg text-paper">
                {s.number}
              </span>
              <div>
                <h3 className="font-display text-xl text-ink">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink/55">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section id="produto" className="px-6 py-20 sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2">
        {testimonials.map((t) => (
          <figure
            key={t.author}
            className="flex flex-col justify-between rounded-2xl border border-ink/10 bg-white p-8"
          >
            <Icon name="quote" className="h-7 w-7 text-clay/60" />
            <blockquote className="font-display mt-5 text-[22px] leading-snug font-light text-pretty text-ink">
              “{t.quote}”
            </blockquote>
            <figcaption className="mt-7 flex items-center gap-3 border-t border-ink/10 pt-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-moss/12 text-sm font-semibold text-moss">
                {t.initials}
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink">{t.author}</span>
                <span className="block text-[13px] text-ink/50">{t.role}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="planos" className="border-t border-ink/10 px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
          <SectionTitle
            eyebrow="Planos"
            title="Preço simples, sem surpresa na renovação."
            text="Cobramos por pessoa que realmente entra na ferramenta. Convidados e stakeholders são sempre gratuitos."
          />
          <span className="rounded-full border border-moss/25 bg-moss/8 px-3.5 py-1.5 text-[13px] font-medium text-moss">
            2 meses grátis no plano anual
          </span>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`flex flex-col rounded-2xl border p-8 transition-transform hover:-translate-y-1 ${
                p.highlight
                  ? "border-ink bg-ink text-paper shadow-[0_30px_60px_-30px_rgba(20,16,12,0.7)]"
                  : "border-ink/12 bg-white text-ink"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl">{p.name}</h3>
                {p.highlight && (
                  <span className="rounded-full bg-paper/15 px-2.5 py-1 text-[11px] tracking-wide uppercase">
                    Mais escolhido
                  </span>
                )}
              </div>
              <p className={`mt-2 text-[14px] leading-relaxed ${p.highlight ? "text-paper/60" : "text-ink/55"}`}>
                {p.description}
              </p>
              <div className="mt-7 flex items-baseline gap-2">
                <span className="font-display text-4xl font-light">{p.price}</span>
                <span className={`text-[13px] ${p.highlight ? "text-paper/50" : "text-ink/45"}`}>
                  {p.period}
                </span>
              </div>
              <ul className="mt-7 flex-1 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[15px]">
                    <Icon
                      name="check"
                      className={`mt-0.5 h-4 w-4 shrink-0 ${p.highlight ? "text-paper/70" : "text-moss"}`}
                    />
                    <span className={p.highlight ? "text-paper/85" : "text-ink/70"}>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className={`mt-8 rounded-full px-5 py-3 text-sm font-medium transition-colors ${
                  p.highlight
                    ? "bg-paper text-ink hover:bg-white"
                    : "border border-ink/20 text-ink hover:bg-ink hover:text-paper"
                }`}
              >
                {p.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="border-t border-ink/10 bg-white/60 px-6 py-20 sm:py-24">
      <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionTitle eyebrow="Dúvidas" title="Perguntas que sempre chegam." />
        <div className="divide-y divide-ink/10 border-y border-ink/10">
          {faqs.map((f, i) => (
            <div key={f.q}>
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-6 py-5 text-left"
              >
                <span className="font-display text-lg text-ink">{f.q}</span>
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ink/15 text-ink/60 transition-transform ${
                    open === i ? "rotate-45" : ""
                  }`}
                >
                  <span className="text-lg leading-none">+</span>
                </span>
              </button>
              {open === i && (
                <p className="animate-fade-in max-w-xl pb-5 text-[15px] leading-relaxed text-ink/60">{f.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Cta() {
  return (
    <section className="px-6 py-20">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-ink px-8 py-16 text-center text-paper">
        <div
          className="animate-float-slow pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, #b4562f 0%, rgba(20,16,12,0) 70%)" }}
        />
        <h2 className="font-display relative text-3xl leading-tight font-light text-balance sm:text-4xl">
          Comece hoje e mostre o primeiro relatório automático na weekly da semana que vem.
        </h2>
        <p className="relative mx-auto mt-4 max-w-lg text-[16px] text-paper/60">
          Grátis para até cinco pessoas, para sempre. Migração assistida incluída nos planos pagos.
        </p>
        <form
          className="relative mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
          onSubmit={(e) => e.preventDefault()}
        >
          <input
            type="email"
            required
            placeholder="seu@email.com.br"
            className="flex-1 rounded-full border border-paper/20 bg-paper/8 px-5 py-3 text-sm text-paper placeholder:text-paper/40 focus:border-paper/50 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-full bg-paper px-6 py-3 text-sm font-medium text-ink transition-transform hover:-translate-y-0.5"
          >
            Criar workspace
          </button>
        </form>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-ink/10 px-6 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-paper">
            <span className="font-display text-[13px] leading-none">Ó</span>
          </span>
          <span className="font-display text-lg text-ink">{brand.name}</span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-ink/55">
          <a href="#recursos" className="hover:text-ink">Recursos</a>
          <a href="#planos" className="hover:text-ink">Planos</a>
          <a href="#como-funciona" className="hover:text-ink">Documentação</a>
          <a href="#topo" className="hover:text-ink">Privacidade</a>
        </nav>
        <p className="text-[13px] text-ink/40">© 2026 Órbita Tecnologia</p>
      </div>
    </footer>
  );
}

export default function OptionA() {
  return (
    <div className="bg-paper font-sans text-ink">
      <Nav />
      <main>
        <Hero />
        <Stats />
        <Features />
        <HowItWorks />
        <Testimonials />
        <Pricing />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </div>
  );
}
