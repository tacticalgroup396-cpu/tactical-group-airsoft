import { FormEvent, useEffect, useState } from "react";
import { RANKS } from "./types";

type User = { id:string; name:string; nickname:string; role:string; rank:string; games_count:number; function?:string };
type Game = { id:string; title:string; game_date:string; location:string; status:string; notes?:string };
type Rule = { id:string; title:string; description:string };

const api = async <T,>(url:string, options?:RequestInit):Promise<T> => {
  const r = await fetch(url, { headers: {"Content-Type":"application/json"}, ...options });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Erro na API");
  return data;
};

export default function App() {
  const [tab,setTab]=useState("home");
  const [users,setUsers]=useState<User[]>([]);
  const [games,setGames]=useState<Game[]>([]);
  const [rules,setRules]=useState<Rule[]>([]);
  const [user,setUser]=useState<User|null>(()=>JSON.parse(localStorage.getItem("tg-user")||"null"));
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);

  const load=async()=>{ try { const [u,g,r]=await Promise.all([api<User[]>("/api/operators"),api<Game[]>("/api/games"),api<Rule[]>("/api/rules")]); setUsers(u);setGames(g);setRules(r); } catch(e:any){setError(e.message)} finally{setLoading(false)} };
  useEffect(()=>{load()},[]);

  const logout=async()=>{try{await api("/api/logout",{method:"POST"})}catch{} localStorage.removeItem("tg-user");setUser(null);setTab("home")};

  return <div className="min-h-screen bg-[#0f1113] text-cream font-sans">
    <nav className="sticky top-0 z-40 border-b border-stone/15 bg-[#0f1113]/90 backdrop-blur flex items-center h-16 px-6 max-w-6xl mx-auto justify-between">
      <button onClick={()=>setTab("home")} className="font-display text-xl font-black">Tactical <span className="text-amber">Airsoft</span></button>
      <div className="flex gap-2 text-sm items-center">
        {user && <button onClick={()=>setTab("admin")} className="rounded-lg border border-stone/20 px-3 py-1.5 text-xs">Painel</button>}
        {user ? <button onClick={logout} className="rounded-lg border border-stone/20 px-3 py-1.5 text-xs">Sair</button> :
          <><button onClick={()=>setTab("login")} className="rounded-lg border border-stone/20 px-3 py-1.5 text-xs">Entrar</button>
          <button onClick={()=>setTab("cadastro")} className="rounded-lg bg-amber text-ink px-3 py-1.5 text-xs font-bold">Cadastrar</button></>}
      </div>
    </nav>
    {error && <div className="max-w-6xl mx-auto px-6 pt-4"><div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div></div>}
    {loading ? <div className="py-32 text-center text-slate-400">Carregando Tactical Group…</div> :
      <>
      {tab==="home" && <main>
        <section className="relative overflow-hidden"><img src="/hero-airsoft.jpg" alt="Airsoft" className="absolute inset-0 w-full h-full object-cover opacity-30"/><div className="absolute inset-0 bg-gradient-to-b from-[#0f1113]/80 via-[#0f1113]/50 to-[#0f1113]"/>
          <div className="relative max-w-6xl mx-auto px-6 pt-36 pb-24"><p className="text-amber font-bold tracking-[.25em] text-xs">TACTICAL GROUP</p><h1 className="font-display text-5xl sm:text-7xl font-black leading-[1.05] mt-3">Tactical Group <span className="text-amber">Airsoft</span></h1><p className="mt-6 text-lg text-stone max-w-2xl">Operação, treino e comunidade. Onde a disciplina do campo encontra a organização digital.</p>
            <div className="mt-8 flex gap-3"><button onClick={()=>setTab("cadastro")} className="rounded-xl bg-amber text-ink font-bold px-6 py-3">Criar conta</button><button onClick={()=>setTab("visitante")} className="rounded-xl border border-stone/30 px-6 py-3">Visitante</button></div>
          </div>
        </section>
        <section className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-3 gap-6">
          {[["Operadores","Cadastre-se e acompanhe sua patente e participação.","cadastro"],["Comandante","Administre operadores e crie eventos.","admin"],["Visitante","Visualize jogos e regras públicas.","visitante"]].map(([t,d,a])=><div key={t} className="rounded-2xl border border-stone/15 bg-[#141414] p-8"><h2 className="font-display text-2xl mb-3">{t}</h2><p className="text-sm text-slate-300 mb-6">{d}</p><button onClick={()=>setTab(a)} className="rounded-lg bg-amber text-ink font-bold px-5 py-2.5 text-sm">{t==="Comandante" && !user ? "Entrar" : "Acessar"}</button></div>)}
        </section>
        <section className="border-t border-stone/15 px-6 py-16 text-center"><h2 className="font-display text-3xl mb-3">Regras</h2><p className="text-slate-400 text-sm mb-6">Segurança, disciplina e respeito são obrigatórios.</p><button onClick={()=>setTab("regras")} className="rounded-xl bg-amber text-ink font-bold px-8 py-3">Ler regulamento</button></section>
        <section className="max-w-6xl mx-auto px-6 py-16"><h2 className="font-display text-3xl mb-6">Próximos jogos</h2>{games.length===0?<p className="text-slate-400">Nenhum jogo cadastrado.</p>:<div className="grid md:grid-cols-2 gap-4">{games.slice(0,4).map(g=><button key={g.id} onClick={()=>setTab("lista")} className="text-left rounded-2xl border border-stone/15 bg-[#141414] p-6"><h3 className="font-display text-xl">{g.title}</h3><p className="text-sm text-slate-300">{new Date(g.game_date+"T12:00:00").toLocaleDateString("pt-BR")} — {g.location}</p></button>)}</div>}</section>
      </main>}

      {tab==="cadastro" && <Register onDone={(u)=>{setUser(u);localStorage.setItem("tg-user",JSON.stringify(u));setTab("lista");load()}}/>}
      {tab==="login" && <Login onDone={(u)=>{setUser(u);localStorage.setItem("tg-user",JSON.stringify(u));setTab("lista");load()}}/>}
      {tab==="visitante" && <section className="max-w-3xl mx-auto px-6 py-12"><h1 className="font-display text-3xl mb-6">Acesso do Visitante</h1><div className="rounded-2xl border border-stone/20 bg-[#141414] p-8 text-center"><p className="text-xl font-display">Bem-vindo ao Tactical Group Airsoft</p><p className="text-sm text-slate-400 mt-2">Informações públicas do time, jogos e regulamento.</p><button onClick={()=>setTab("lista")} className="mt-4 rounded-lg bg-amber text-ink font-bold px-6 py-2">Ver jogos</button></div></section>}
      {tab==="regras" && <section className="max-w-4xl mx-auto px-6 py-12"><h1 className="font-display text-3xl mb-6">Regras do Grupo</h1><div className="grid md:grid-cols-2 gap-4">{rules.map(r=><div key={r.id} className="rounded-2xl border border-stone/20 bg-[#141414] p-6"><h3 className="font-display text-lg mb-2">{r.title}</h3><p className="text-sm text-slate-300">{r.description}</p></div>)}</div></section>}
      {tab==="lista" && <section className="max-w-5xl mx-auto px-6 py-12"><h1 className="font-display text-3xl mb-8">Lista de Jogos</h1><div className="grid md:grid-cols-2 gap-6">{games.map(g=><div key={g.id} className="rounded-2xl border border-stone/20 bg-[#141414] p-6"><h3 className="font-display text-xl">{g.title}</h3><p className="text-sm text-slate-300">{new Date(g.game_date+"T12:00:00").toLocaleDateString("pt-BR")} — {g.location}</p><div className="mt-3 text-xs bg-amber/20 text-amber rounded px-2 py-1 font-bold w-fit">{g.status.toUpperCase()}</div></div>)}</div></section>}
      {tab==="admin" && (!user ? <Login onDone={(u)=>{setUser(u);localStorage.setItem("tg-user",JSON.stringify(u));setTab("admin")}}/> : user.role !== "commander" ? <section className="max-w-3xl mx-auto px-6 py-16"><h1 className="font-display text-3xl">Acesso restrito</h1><p className="text-slate-400 mt-3">O painel é exclusivo do comandante.</p></section> : <Admin users={users} onRefresh={load}/>)}
      {tab==="eventos" && <section className="max-w-5xl mx-auto px-6 py-12"><h1 className="font-display text-3xl mb-6">Eventos</h1></section>}
      </>}
    <footer className="border-t border-stone/15 px-6 py-10 text-sm text-slate-500 text-center">© 2026 Tactical Group Airsoft · PWA · Neon · Vercel · Vertex AI</footer>
  </div>;
}

function Register({onDone}:{onDone:(u:User)=>void}) {
 const [form,setForm]=useState({name:"",nickname:"",password:""}); const [err,setErr]=useState("");
 const submit=async(e:FormEvent)=>{e.preventDefault();try{const u=await api<User>("/api/operators",{method:"POST",body:JSON.stringify(form)});onDone(u)}catch(e:any){setErr(e.message)}};
 return <section className="max-w-md mx-auto px-6 py-16"><h1 className="font-display text-4xl mb-6">Criar conta</h1>{err&&<p className="text-red-300 text-sm mb-3">{err}</p>}<form onSubmit={submit} className="rounded-2xl border border-stone/20 bg-[#141414] p-8 space-y-3"><input required placeholder="Nome" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="field"/><input required placeholder="Apelido" value={form.nickname} onChange={e=>setForm({...form,nickname:e.target.value})} className="field"/><input required minLength={6} placeholder="Senha (mínimo 6 caracteres)" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} className="field"/><button className="rounded-lg bg-amber text-ink font-bold px-6 py-3 w-full">Criar conta</button></form></section>
}
function Login({onDone}:{onDone:(u:User)=>void}) {
 const [nickname,setN]=useState("");const [password,setP]=useState("");const [err,setErr]=useState("");
 const submit=async(e:FormEvent)=>{e.preventDefault();try{const d=await api<{user:User}>("/api/login",{method:"POST",body:JSON.stringify({nickname,password})});onDone(d.user)}catch(e:any){setErr(e.message)}};
 return <section className="max-w-md mx-auto px-6 py-16"><h1 className="font-display text-4xl mb-6">Entrar</h1>{err&&<p className="text-red-300 text-sm mb-3">{err}</p>}<form onSubmit={submit} className="rounded-2xl border border-stone/20 bg-[#141414] p-8 space-y-3"><input required placeholder="Apelido" value={nickname} onChange={e=>setN(e.target.value)} className="field"/><input required placeholder="Senha" type="password" value={password} onChange={e=>setP(e.target.value)} className="field"/><button className="rounded-lg bg-amber text-ink font-bold px-6 py-3 w-full">Entrar</button></form></section>
}
function Admin({users,onRefresh}:{users:User[];onRefresh:()=>void}) {
 const [f,setF]=useState({name:"",nickname:"",password:""});const [g,setG]=useState({title:"",gameDate:"",location:""});const [msg,setMsg]=useState("");
 const addUser=async(e:FormEvent)=>{e.preventDefault();try{await api("/api/operators",{method:"POST",body:JSON.stringify(f)});setF({name:"",nickname:"",password:""});setMsg("Operador criado.");onRefresh()}catch(e:any){setMsg(e.message)}};
 const addGame=async(e:FormEvent)=>{e.preventDefault();try{await api("/api/games",{method:"POST",body:JSON.stringify(g)});setG({title:"",gameDate:"",location:""});setMsg("Jogo criado.");onRefresh()}catch(e:any){setMsg(e.message)}};
 return <section className="max-w-6xl mx-auto px-6 py-12"><h1 className="font-display text-3xl mb-8">Painel do Comandante</h1>{msg&&<p className="text-amber text-sm mb-4">{msg}</p>}<div className="grid lg:grid-cols-2 gap-6"><form onSubmit={addUser} className="card"><h2 className="font-display text-xl mb-4">Cadastrar operador</h2><input required placeholder="Nome" value={f.name} onChange={e=>setF({...f,name:e.target.value})} className="field mb-3"/><input required placeholder="Apelido" value={f.nickname} onChange={e=>setF({...f,nickname:e.target.value})} className="field mb-3"/><input required minLength={6} type="password" placeholder="Senha" value={f.password} onChange={e=>setF({...f,password:e.target.value})} className="field mb-3"/><button className="button">Criar operador</button></form><form onSubmit={addGame} className="card"><h2 className="font-display text-xl mb-4">Criar jogo</h2><input required placeholder="Nome da operação" value={g.title} onChange={e=>setG({...g,title:e.target.value})} className="field mb-3"/><input required type="date" value={g.gameDate} onChange={e=>setG({...g,gameDate:e.target.value})} className="field mb-3"/><input required placeholder="Local" value={g.location} onChange={e=>setG({...g,location:e.target.value})} className="field mb-3"/><button className="button">Criar evento</button></form></div><div className="card mt-6"><h2 className="font-display text-xl mb-4">Operadores</h2><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="text-left py-2">Apelido</th><th>Patente</th><th>Jogos</th><th>Função</th></tr></thead><tbody>{users.map(u=><tr key={u.id} className="border-t border-stone/10"><td className="py-2 font-medium">@{u.nickname}</td><td className="text-center">{RANKS.find(r=>r.key===u.rank)?.label||u.rank}</td><td className="text-center">{u.games_count}</td><td className="text-center">{u.function||"—"}</td></tr>)}</tbody></table></div></div></section>
}
