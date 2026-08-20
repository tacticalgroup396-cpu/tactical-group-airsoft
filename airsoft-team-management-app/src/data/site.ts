export const brand = {
  name: "Órbita",
  tagline: "Operação de produto, sem ruído.",
  claim:
    "A plataforma onde roadmap, métricas e rituais do time finalmente vivem no mesmo lugar.",
};

export const nav = [
  { label: "Produto", href: "#produto" },
  { label: "Recursos", href: "#recursos" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Planos", href: "#planos" },
];

export const stats = [
  { value: "12.400", label: "times ativos" },
  { value: "38%", label: "menos reuniões" },
  { value: "4,9/5", label: "avaliação média" },
  { value: "99,98%", label: "disponibilidade" },
];

export type Feature = {
  index: string;
  title: string;
  description: string;
  icon: string;
};

export const features: Feature[] = [
  {
    index: "01",
    title: "Roadmap vivo",
    description:
      "Cada iniciativa carrega contexto, dono e impacto esperado. Nada de planilha paralela morrendo em uma pasta esquecida.",
    icon: "map",
  },
  {
    index: "02",
    title: "Métricas no fluxo",
    description:
      "Conecte seu data warehouse e veja o indicador ao lado da entrega que prometeu movê-lo. Verdade única, sem debate.",
    icon: "chart",
  },
  {
    index: "03",
    title: "Rituais automáticos",
    description:
      "Daily, weekly e review montam a própria pauta a partir do que realmente mudou desde o último encontro.",
    icon: "clock",
  },
  {
    index: "04",
    title: "Documentos conectados",
    description:
      "Specs, decisões e pesquisas ancoradas na iniciativa certa. O histórico do porquê nunca se perde.",
    icon: "doc",
  },
  {
    index: "05",
    title: "Visão de portfólio",
    description:
      "Liderança acompanha dezenas de times em uma tela só, com sinal de risco calculado a partir do ritmo real.",
    icon: "layers",
  },
  {
    index: "06",
    title: "Integrações nativas",
    description:
      "GitHub, Linear, Slack, Figma e Notion sincronizam nos dois sentidos, em segundos, sem plugins frágeis.",
    icon: "plug",
  },
];

export const steps = [
  {
    number: "1",
    title: "Conecte suas ferramentas",
    text: "Autorize GitHub, Slack e seu BI. A Órbita importa times, épicos e métricas em poucos minutos.",
  },
  {
    number: "2",
    title: "Desenhe o mapa",
    text: "Organize iniciativas por objetivo, não por pasta. Cada card ganha dono, aposta e métrica-alvo.",
  },
  {
    number: "3",
    title: "Deixe o ritual rodar",
    text: "As pautas se montam sozinhas e os relatórios chegam prontos. O time volta a discutir produto.",
  },
];

export const testimonials = [
  {
    quote:
      "Trocamos quatro ferramentas por uma. Em dois meses o tempo de decisão caiu pela metade e a diretoria parou de pedir status por e-mail.",
    author: "Marina Duarte",
    role: "Head de Produto · Cobalto",
    initials: "MD",
  },
  {
    quote:
      "A visão de portfólio é o que me faz dormir tranquilo. Consigo ver risco real, não uma barra verde otimista feita à mão.",
    author: "Rafael Nogueira",
    role: "CPO · Grupo Vertente",
    initials: "RN",
  },
];

export type Plan = {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlight?: boolean;
  cta: string;
};

export const plans: Plan[] = [
  {
    name: "Essencial",
    price: "R$ 0",
    period: "para sempre",
    description: "Para times pequenos que estão organizando o primeiro roadmap.",
    features: ["Até 5 pessoas", "1 workspace", "Integrações básicas", "Histórico de 30 dias"],
    cta: "Começar grátis",
  },
  {
    name: "Time",
    price: "R$ 39",
    period: "por pessoa / mês",
    description: "O plano de quem já roda rituais sérios e precisa de métricas conectadas.",
    features: [
      "Pessoas ilimitadas",
      "Workspaces ilimitados",
      "Métricas do data warehouse",
      "Rituais automáticos",
      "Suporte em até 4h",
    ],
    highlight: true,
    cta: "Testar 14 dias",
  },
  {
    name: "Escala",
    price: "Sob medida",
    period: "contrato anual",
    description: "Governança, segurança e visão de portfólio para várias unidades de negócio.",
    features: ["SSO e SCIM", "Auditoria completa", "Ambiente dedicado", "CSM nomeado"],
    cta: "Falar com vendas",
  },
];

export const faqs = [
  {
    q: "Preciso migrar tudo de uma vez?",
    a: "Não. A maioria dos times começa com um único squad, mantém as ferramentas antigas em leitura e migra o resto quando o ritual já está rodando.",
  },
  {
    q: "Como funciona a conexão com métricas?",
    a: "Conectamos direto a BigQuery, Snowflake, Redshift e Postgres. Você escreve a query uma vez e reutiliza o indicador em qualquer iniciativa.",
  },
  {
    q: "Meus dados ficam onde?",
    a: "Em datacenters no Brasil, com criptografia em repouso e em trânsito. No plano Escala é possível usar ambiente dedicado.",
  },
];

export type HistoryEntry = {
  id: string;
  option: "A" | "B";
  label: string;
  when: string;
  note: string;
  current?: boolean;
};

export const history: HistoryEntry[] = [
  {
    id: "v3",
    option: "A",
    label: "Opção A · original restaurada",
    when: "agora mesmo",
    note: "Layout editorial claro, hero centralizado e grade de recursos com numeração — exatamente como estava antes.",
    current: true,
  },
  {
    id: "v2",
    option: "B",
    label: "Opção B · versão escura",
    when: "há 2 horas",
    note: "Hero dividido, fundo escuro com gradientes e bento grid. Continua disponível para comparação.",
  },
  {
    id: "v1",
    option: "A",
    label: "Opção A · rascunho inicial",
    when: "ontem",
    note: "Primeira versão do layout claro, com a mesma estrutura de seções aprovada pelo time.",
  },
];
