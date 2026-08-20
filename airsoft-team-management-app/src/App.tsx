import { useState } from "react";
import { RANKS } from "./types";

export default function App() {
  const [tab, setTab] = useState("home");
  const [users] = useState([
    { id:1, nickname:"Tango7", rank:1, games:7, funcao:"Mediador" },
    { id:2, nickname:"Delta2", rank:0, games:1, funcao:"Recruta" },
  ]);
  const [games] = useState([
    { id:1, title:"Operação Floresta", date:"15/07/2026", local:"Área Norte", status:"confirmado" },
  ]);
  return (
    <div className="min-h-screen bg-[#0f1113] text-cream font-sans">
      <nav className="sticky top-0 z-40 border-b border-stone/15 bg-[#0f1113]/90 backdrop-blur flex items-center h-16 px-6 max-w-6xl mx-auto justify-between">
        <button onClick={()=>setTab("home")} className="font-display text-xl font-black">Tactical <span className="text-amber">Airsoft</span></button>
        <div className="flex gap-3 text-sm">
          <button onClick={()=>setTab("login")} className="rounded-lg border border-stone/20 px-3 py-1.5 text-xs">Entrar</button>
          <button onClick={()=>setTab("cadastro")} className="rounded-lg bg-amber text-ink px-3 py-1.5 text-xs font-bold">Cadastrar</button>
        </div>
      </nav>

      {tab === "home" && (
        <main>
          <section className="relative overflow-hidden"><img src="/hero-airsoft.jpg" alt="Airsoft" className="absolute inset-0 w-full h-full object-cover opacity-30" /><div className="absolute inset-0 bg-gradient-to-b from-[#0f1113]/80 via-[#0f1113]/50 to-[#0f1113]" /><div className="relative max-w-6xl mx-auto px-6 pt-36 pb-24"><h1 className="font-display text-5xl sm:text-7xl font-black leading-[1.05]">Tactical Group <span className="text-amber">Airsoft</span></h1><p className="mt-6 text-lg text-stone max-w-2xl">Operação, treino e comunidade. Onde a disciplina do campo encontra a organização digital.</p><div className="mt-8 flex gap-3"><button onClick={()=>setTab("cadastro")} className="rounded-xl bg-amber text-ink font-bold px-6 py-3">Criar conta</button><button onClick={()=>setTab("visitante")} className="rounded-xl border border-stone/30 px-6 py-3">Visitante</button></div></div></section>
          <section className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-3 gap-6">
            {[ {t:"Operadores", d:"Cadastre-se, suba de patente conforme participa.", btn:"Cadastrar", a:"cadastro"}, {t:"Comandante", d:"Administre operadores e crie eventos.", btn:"Admin", a:"admin"}, {t:"Visitante", d:"Visualize informações sem ser operador.", btn:"Entrar", a:"visitante"} ].map(c => (
              <div key={c.t} className="rounded-2xl border border-stone/15 bg-[#141414] p-8"><h2 className="font-display text-2xl mb-3">{c.t}</h2><p className="text-sm text-slate-300 mb-6">{c.d}</p><button onClick={()=>setTab(c.a)} className="rounded-lg bg-amber text-ink font-bold px-5 py-2.5 text-sm">{c.btn}</button></div>
            ))}
          </section>
          <section className="border-t border-stone/15 bg-[#0f1113] px-6 py-16 text-center"><h2 className="font-display text-3xl mb-3">Regras</h2><p className="text-slate-400 text-sm mb-6">Segurança, disciplina e respeito são obrigatórios.</p><button onClick={()=>setTab("regras")} className="rounded-xl bg-amber text-ink font-bold px-8 py-3">Ler regulamento</button></section>
          <section className="max-w-6xl mx-auto px-6 py-16"><h2 className="font-display text-3xl mb-6">Próximos jogos</h2><div className="grid md:grid-cols-2 gap-4"><button onClick={()=>setTab("lista")} className="text-left rounded-2xl border border-stone/15 bg-[#141414] p-6"><h3 className="font-display text-xl">{games[0].title}</h3><p className="text-sm text-slate-300">{games[0].date} — {games[0].local}</p></button></div></section>
        </main>
      )}

      {tab === "cadastro" && (
        <section className="max-w-md mx-auto px-6 py-16 text-center"><h1 className="font-display text-4xl mb-2">Criar conta</h1><div className="rounded-2xl border border-stone/20 bg-[#141414] p-8 space-y-3"><input placeholder="Nome" className="w-full bg-[#1a1a1a] border border-stone/20 rounded-lg px-4 py-3 text-sm" /><input placeholder="Apelido" className="w-full bg-[#1a1a1a] border border-stone/20 rounded-lg px-4 py-3 text-sm" /><input placeholder="Senha" type="password" className="w-full bg-[#1a1a1a] border border-stone/20 rounded-lg px-4 py-3 text-sm" /><button onClick={()=>setTab("login")} className="rounded-lg bg-amber text-ink font-bold px-6 py-3 w-full">Criar conta</button></div></section>
      )}

      {tab === "login" && (
        <section className="max-w-md mx-auto px-6 py-16 text-center"><h1 className="font-display text-4xl mb-2">Entrar</h1><div className="rounded-2xl border border-stone/20 bg-[#141414] p-8 space-y-3"><input placeholder="Apelido" className="w-full bg-[#1a1a1a] border border-stone/20 rounded-lg px-4 py-3 text-sm" /><input placeholder="Senha" type="password" className="w-full bg-[#1a1a1a] border border-stone/20 rounded-lg px-4 py-3 text-sm" /><button onClick={()=>setTab("lista")} className="rounded-lg bg-amber text-ink font-bold px-6 py-3 w-full">Entrar</button></div></section>
      )}

      {tab === "visitante" && (
        <section className="max-w-3xl mx-auto px-6 py-12"><h1 className="font-display text-3xl mb-6">Acesso do Visitante</h1><div className="rounded-2xl border border-stone/20 bg-[#141414] p-8 text-center mb-6"><p className="text-xl font-display">Bem-vindo ao Tactical Group Airsoft</p><p className="text-sm text-slate-400 mt-2">Visualize informações do time sem ser operador.</p><button onClick={()=>setTab("lista")} className="mt-4 rounded-lg bg-amber text-ink font-bold px-6 py-2">Entrar como visitante</button></div></section>
      )}

      {tab === "regras" && (
        <section className="max-w-4xl mx-auto px-6 py-12"><h1 className="font-display text-3xl mb-6">Regras do Grupo</h1><div className="grid md:grid-cols-2 gap-4">{[
          {t:"Equipamento obrigatório", d:"EYE PRO, máscara, uniformes, rádio e no mínimo 300 BBs."},
          {t:"Segurança no campo", d:"Nunca apontar para o rosto. Respeitar zonas de exclusão."},
          {t:"Patente e hierarquia", d:"Recrutas seguem Sargentos até adaptação completa."},
          {t:"Participação", d:"Três faltas sem aviso resultam em suspensão."},
          {t:"Comportamento", d:"Proibido álcool antes/durante. Respeito obrigatório."},
          {t:"Eventos", d:"Jogos programados previamente. Avisar com 48h."},
        ].map(r => (<div key={r.t} className="rounded-2xl border border-stone/20 bg-[#141414] p-6"><h3 className="font-display text-lg mb-2">{r.t}</h3><p className="text-sm text-slate-300">{r.d}</p></div>))}</div></section>
      )}

      {tab === "lista" && (
        <section className="max-w-5xl mx-auto px-6 py-12"><h1 className="font-display text-3xl mb-8">Lista de Jogos</h1><div className="grid md:grid-cols-2 gap-6"><div className="rounded-2xl border border-stone/20 bg-[#141414] p-6"><h3 className="font-display text-xl">{games[0].title}</h3><p className="text-sm text-slate-300">{games[0].date} — {games[0].local}</p><div className="mt-3 text-xs bg-amber/20 text-amber rounded px-2 py-1 font-bold w-fit">Função: Mediador</div><div className="mt-2 text-xs text-slate-400">Participantes: {users.map(u=>"@"+u.nickname).join(", ")}</div></div></div></section>
      )}

      {tab === "admin" && (
        <section className="max-w-5xl mx-auto px-6 py-12"><h1 className="font-display text-3xl mb-8">Painel do Comandante</h1><div className="grid lg:grid-cols-2 gap-6"><div className="rounded-2xl border border-stone/20 bg-[#141414] p-6"><h2 className="font-display text-xl mb-4">Cadastre operador</h2><input placeholder="Nome" className="w-full bg-[#1a1a1a] border border-stone/20 rounded-lg px-4 py-2 text-sm mb-3" /><input placeholder="Apelido" className="w-full bg-[#1a1a1a] border border-stone/20 rounded-lg px-4 py-2 text-sm mb-3" /><button onClick={()=>setTab("admin")} className="rounded-lg bg-amber text-ink font-bold px-5 py-2 w-full">Criar</button><p className="text-xs text-slate-500 mt-3">Recruta. Subirá conforme participa.</p></div><div className="rounded-2xl border border-stone/20 bg-[#141414] p-6"><h2 className="font-display text-xl mb-4">Operadores</h2><table className="w-full text-sm"><thead><tr><th className="text-left">Apelido</th><th>Patente</th><th>Jogos</th></tr></thead><tbody>{users.map(u => <tr key={u.id} className="border-t border-stone/10"><td className="py-2 font-medium">{u.nickname}</td><td className="py-2">{RANKS[u.rank]?.label||"Recruta"}</td><td className="py-2">{u.games}</td></tr>)}</tbody></table></div></div></section>
      )}

      {tab === "eventos" && (
        <section className="max-w-5xl mx-auto px-6 py-12"><h1 className="font-display text-3xl mb-6">Eventos</h1><div className="grid md:grid-cols-2 gap-6">{games.map(g => <div key={g.id} className="rounded-2xl bg-[#141414] p-6 border border-stone/20"><h3 className="font-display text-xl">{g.title}</h3><p>{g.date} — {g.local}</p><span className="text-xs text-amber font-bold">{g.status.toUpperCase()}</span></div>)}</div></section>
      )}

      <footer className="border-t border-stone/15 bg-[#0f1113] px-6 py-10 text-sm text-slate-500 text-center">© 2026 Tactical Group Airsoft</footer>
    </div>
  );
}
