import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const INTERVALOS = { "1M": "30 dias", "3M": "3 meses", "6M": "6 meses" };

const TONS = {
  up: { texto: "text-secondary", suave: "bg-secondary/10 text-secondary", forte: "bg-secondary/20 text-secondary", traco: "#4edea3" },
  down: { texto: "text-error", suave: "bg-error/10 text-error", forte: "bg-error/20 text-error", traco: "#ffb4ab" },
  flat: { texto: "text-on-surface-variant", suave: "bg-surface-container-high text-on-surface-variant", forte: "bg-surface-container-high text-on-surface-variant", traco: "#9cf0ff" },
};
function tom(v) {
  if (v > 0) return "up";
  if (v < 0) return "down";
  return "flat";
}
function seta(v) {
  if (v > 0) return "▲";
  if (v < 0) return "▼";
  return "●";
}
const SINAIS = {
  ALTA: { tom: "up", texto: "Tendência de alta", curto: "Subindo" },
  QUEDA: { tom: "down", texto: "Tendência de queda", curto: "Caindo" },
  NEUTRO: { tom: "flat", texto: "Sem tendência clara", curto: "Estável" },
};

function moeda(v, m) {
  if (v == null) return "—";
  const locale = m === "BRL" ? "pt-BR" : "en-US";
  return new Intl.NumberFormat(locale, { style: "currency", currency: m }).format(v);
}
const num = (v, d = 2) => (v == null ? "—" : v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }));
const pct = (v) => `${v > 0 ? "+" : ""}${num(v)}%`;
const dataBR = (iso) => new Date(iso).toLocaleDateString("pt-BR");

async function get(path) {
  const r = await fetch(`${API}${path}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function Grafico({ serie, traco }) {
  if (!serie?.length) return <div className="h-full grid place-items-center text-outline">Sem dados para este período</div>;
  const W = 600, H = 200, VOL = 45;
  const closes = serie.map((p) => p.close);
  const min = Math.min(...closes), span = Math.max(...closes) - min || 1;
  const maxV = Math.max(...serie.map((p) => p.volume)) || 1;
  const x = (i) => (i / (serie.length - 1 || 1)) * W;
  const y = (c) => 10 + (1 - (c - min) / span) * (H - VOL - 30);
  const linha = serie.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.close).toFixed(1)}`).join(" ");
  const bw = Math.max(1, (W / serie.length) * 0.6);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full" fill="none">
      <defs>
        <linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={traco} stopOpacity="0.35" />
          <stop offset="100%" stopColor={traco} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[30, 70, 110].map((g) => <line key={g} x1="0" x2={W} y1={g} y2={g} stroke="#3b494c" strokeDasharray="3 3" strokeOpacity="0.3" />)}
      {serie.map((p, i) => {
        const h = (p.volume / maxV) * VOL;
        return <rect key={i} x={x(i) - bw / 2} y={H - h} width={bw} height={h} fill="#3b494c" opacity="0.5" />;
      })}
      <path d={`${linha} L${W} ${H - VOL} L0 ${H - VOL} Z`} fill="url(#grad)" />
      <path d={linha} stroke={traco} strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function climaDoMercado(alta, queda) {
  if (alta > queda) return ["Mercado otimista", "up"];
  if (queda > alta) return ["Mercado cauteloso", "down"];
  return ["Mercado misto", "flat"];
}

function CartaoAtivo({ titulo, a }) {
  return (
    <div className="bg-surface-container rounded-lg p-4 flex flex-col gap-1">
      <span className="text-data-label font-data-label text-outline uppercase">{titulo}</span>
      <span className="text-on-surface font-bold">{a.nome}</span>
      <span className={`font-bold ${TONS[tom(a.var_pct)].texto}`}>{seta(a.var_pct)} {pct(a.var_pct)} hoje</span>
    </div>
  );
}

function Resumo({ ativos }) {
  const ord = [...ativos].sort((a, b) => b.var_pct - a.var_pct);
  const melhor = ord[0], pior = ord.at(-1);
  const subiram = ativos.filter((a) => a.var_pct > 0).length;
  const caíram = ativos.filter((a) => a.var_pct < 0).length;
  const alta = ativos.filter((a) => a.sinal === "ALTA").length;
  const queda = ativos.filter((a) => a.sinal === "QUEDA").length;
  const [clima, t] = climaDoMercado(alta, queda);
  return (
    <section className="bg-surface-container-low rounded-xl p-6 flex flex-col gap-4 shadow-md">
      <div className="flex flex-col gap-1">
        <span className="text-data-label font-data-label text-outline uppercase">Como está o mercado hoje</span>
        <h1 className={`font-headline-lg text-headline-lg ${TONS[t].texto}`}>{clima}</h1>
        <p className="text-on-surface-variant">
          Dos {ativos.length} ativos acompanhados, <strong className="text-secondary">{subiram} subiram</strong> e <strong className="text-error">{caíram} caíram</strong> no último dia.
          {" "}{alta} estão em tendência de alta e {queda} em tendência de queda nas últimas semanas.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <CartaoAtivo titulo="Maior alta do dia" a={melhor} />
        <CartaoAtivo titulo="Maior queda do dia" a={pior} />
        <div className="bg-surface-container rounded-lg p-4 text-on-surface-variant text-data-table font-data-table">
          <span className="text-secondary font-bold">▲ verde</span> = subiu · <span className="text-error font-bold">▼ vermelho</span> = caiu · <span className="font-bold">● cinza</span> = estável
        </div>
      </div>
    </section>
  );
}

function Tabela({ titulo, icone, explicacao, itens, sel, onSel }) {
  return (
    <div className="bg-surface-container-low rounded-xl p-5 shadow-md flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">{icone}</span>
          <span className="font-headline-md text-headline-md text-on-surface">{titulo}</span>
        </div>
        <span className="text-on-surface-variant text-data-table font-data-table">{explicacao}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-data-table font-data-table">
          <thead>
            <tr className="text-outline text-data-label font-data-label uppercase bg-surface-container-highest/40">
              <th className="py-2.5 px-3">Ativo</th>
              <th className="py-2.5 px-3 text-right">Preço</th>
              <th className="py-2.5 px-3 text-right">Hoje</th>
              <th className="py-2.5 px-3 text-center">Rumo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20">
            {itens.map((a) => {
              const s = SINAIS[a.sinal] ?? SINAIS.NEUTRO;
              return (
                <tr key={a.ticker} onClick={() => onSel(a.ticker)}
                  className={`cursor-pointer transition-colors ${a.ticker === sel ? "bg-surface-container-high" : "hover:bg-surface-container-high/60"}`}>
                  <td className="py-3 px-3">
                    <div className="flex flex-col">
                      <span className={`font-bold ${a.ticker === sel ? "text-primary" : "text-on-surface"}`}>{a.nome}</span>
                      <span className="text-data-label text-outline">{a.ticker}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-on-surface">{moeda(a.preco, a.moeda)}</td>
                  <td className="py-3 px-3 text-right">
                    <span className={`px-1.5 py-0.5 rounded font-medium ${TONS[tom(a.var_pct)].suave}`}>{seta(a.var_pct)} {pct(a.var_pct)}</span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded font-bold ${TONS[s.tom].forte}`}>{s.curto}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Bloco({ titulo, texto }) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded bg-surface-container-low">
      <span className="text-data-label font-data-label text-outline uppercase">{titulo}</span>
      <p className="text-on-surface-variant text-data-table font-data-table">{texto}</p>
    </div>
  );
}

function ConteudoIA({ ia, erro }) {
  if (erro) return <p className="text-error">Ainda não há explicação para este ativo ({erro}).</p>;
  if (!ia) return <p className="text-outline animate-pulse">Preparando explicação...</p>;
  return (
    <>
      <Bloco titulo="O que aconteceu" texto={ia.resumo} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Bloco titulo="O que os números mostram" texto={ia.drivers} />
        <Bloco titulo="Pontos de atenção" texto={ia.risco} />
      </div>
    </>
  );
}

function PainelIA({ ia, erro }) {
  return (
    <div className="bg-surface-container rounded-lg p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-[20px]">psychology</span>
        <span className="text-data-label font-data-label font-bold tracking-wider text-primary uppercase">Em palavras simples (gerado por IA)</span>
      </div>
      <ConteudoIA ia={ia} erro={erro} />
    </div>
  );
}

function textoRsi(rsi) {
  if (rsi == null) return "Sem dados suficientes.";
  if (rsi >= 70) return "Alto: subiu rápido demais e pode esfriar.";
  if (rsi <= 30) return "Baixo: caiu bastante e pode reagir.";
  return "Normal: sem exagero de compra ou venda.";
}

function textoMedia(preco, ma20) {
  if (ma20 == null) return "Sem dados suficientes.";
  return preco > ma20
    ? "O preço está acima da média recente (sinal positivo)."
    : "O preço está abaixo da média recente (sinal negativo).";
}

function textoVolume(vz) {
  if (vz == null) return "Sem dados.";
  if (vz > 1) return "Muita gente negociando: acima do normal.";
  if (vz < -1) return "Pouca negociação: abaixo do normal.";
  return "Movimento de negociação normal.";
}

function Linha({ nome, valor, txt }) {
  return (
    <div className="flex flex-col gap-0.5 py-2">
      <div className="flex justify-between"><span className="text-on-surface font-bold">{nome}</span><span className="text-on-surface">{valor}</span></div>
      <span className="text-on-surface-variant">{txt}</span>
    </div>
  );
}

function Tecnicos({ a, m }) {
  return (
    <details className="bg-surface-container rounded-lg p-4 text-data-table font-data-table">
      <summary className="cursor-pointer text-primary font-bold">Quer se aprofundar? Ver indicadores técnicos</summary>
      <div className="divide-y divide-outline-variant/20 mt-2">
        <Linha nome="Média dos últimos 20 dias" valor={m(a.ma20)} txt={textoMedia(a.preco, a.ma20)} />
        <Linha nome="Média dos últimos 50 dias" valor={m(a.ma50)} txt="Mostra o preço médio de médio prazo, para comparar com o preço de hoje." />
        <Linha nome="RSI (força da alta ou queda)" valor={num(a.rsi, 1)} txt={textoRsi(a.rsi)} />
        <Linha nome="Volume de negociação" valor={`${a.vol_z > 0 ? "+" : ""}${num(a.vol_z)}`} txt={textoVolume(a.vol_z)} />
      </div>
    </details>
  );
}

function Detalhe({ a }) {
  const [intervalo, setIntervalo] = useState("1M");
  const [resSerie, setResSerie] = useState({ chave: "", dados: null });
  const chave = `${a.ticker}|${intervalo}`;
  const serie = resSerie.chave === chave ? resSerie.dados : null; // null = carregando
  const [ia, setIa] = useState(null);
  const [erroIa, setErroIa] = useState(null);
  const t = TONS[tom(a.var_pct)];
  const s = SINAIS[a.sinal] ?? SINAIS.NEUTRO;
  const m = (v) => moeda(v, a.moeda);

  useEffect(() => {
    let vivo = true;
    get(`/api/ativos/${a.ticker}/serie?intervalo=${intervalo}`)
      .then((d) => vivo && setResSerie({ chave, dados: d.serie }))
      .catch(() => vivo && setResSerie({ chave, dados: [] }));
    return () => { vivo = false; };
  }, [a.ticker, intervalo, chave]);

  useEffect(() => {
    let vivo = true;
    get(`/api/ativos/${a.ticker}/analise`).then((d) => vivo && setIa(d)).catch((e) => vivo && setErroIa(e.message));
    return () => { vivo = false; };
  }, [a.ticker]);

  const temSerie = serie?.length > 1;
  const periodo = temSerie ? (serie[serie.length - 1].close / serie[0].close - 1) * 100 : null;
  const closes = temSerie ? serie.map((p) => p.close) : [];

  return (
    <div className="bg-surface-container-low rounded-xl p-6 shadow-xl flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="font-headline-lg text-headline-lg font-bold text-on-surface">{a.nome}</span>
          <span className="text-outline text-data-label font-data-label">{a.ticker}</span>
          <span className={`mt-1 px-2 py-0.5 rounded font-bold w-fit ${TONS[s.tom].forte}`}>{s.texto}</span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[28px] font-bold text-on-surface">{m(a.preco)}</span>
          <span className={`px-2 py-0.5 rounded font-bold ${t.forte}`}>
            {seta(a.var_pct)} {pct(a.var_pct)} hoje ({a.var_abs > 0 ? "+" : ""}{m(a.var_abs)})
          </span>
        </div>
      </div>

      <div className="bg-surface-container rounded-lg p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-on-surface font-bold">Como o preço andou</span>
          <div className="flex items-center gap-1 bg-surface-container-high p-1 rounded">
            {Object.entries(INTERVALOS).map(([k, rotulo]) => (
              <button key={k} onClick={() => setIntervalo(k)}
                className={`px-2.5 py-1 rounded text-data-label font-data-label transition-colors ${k === intervalo ? "bg-primary text-on-primary font-bold" : "text-on-surface-variant hover:text-on-surface"}`}>
                {rotulo}
              </button>
            ))}
          </div>
        </div>
        {temSerie && (
          <p className="text-on-surface-variant">
            Nos últimos {INTERVALOS[intervalo]}, o preço <strong className={TONS[tom(periodo)].texto}>{periodo >= 0 ? "subiu" : "caiu"} {num(Math.abs(periodo))}%</strong>.
            {" "}O ponto mais baixo foi {m(Math.min(...closes))} e o mais alto, {m(Math.max(...closes))}.
          </p>
        )}
        <div className="w-full h-56">
          {serie === null ? <div className="h-full grid place-items-center text-outline animate-pulse">Carregando...</div> : <Grafico serie={serie} traco={t.traco} />}
        </div>
        {temSerie && (
          <div className="flex justify-between text-data-label font-data-label text-outline">
            <span>{dataBR(serie[0].t)}</span><span>{dataBR(serie[serie.length - 1].t)}</span>
          </div>
        )}
        <span className="text-data-label font-data-label text-outline">As barras cinzas embaixo mostram o quanto o ativo foi negociado a cada dia.</span>
      </div>

      <PainelIA ia={ia} erro={erroIa} />
      <Tecnicos a={a} m={m} />
    </div>
  );
}

export default function Dashboard() {
  const [ativos, setAtivos] = useState([]);
  const [sel, setSel] = useState(null);
  const [erro, setErro] = useState(null);
  const [atualizado, setAtualizado] = useState(null);

  useEffect(() => {
    let vivo = true;
    const carregar = async () => {
      try {
        const d = await get("/api/ativos");
        if (!vivo) return;
        setAtivos(d);
        setAtualizado(new Date());
        setErro(null);
        setSel((s) => s ?? d[0]?.ticker);
      } catch (e) {
        if (vivo) setErro(e.message);
      }
    };
    void carregar();
    const id = setInterval(carregar, 60000);
    return () => { vivo = false; clearInterval(id); };
  }, []);

  const atual = ativos.find((a) => a.ticker === sel);

  return (
    <div className="dark bg-surface text-on-surface font-body-md min-h-screen antialiased">
      <header className="sticky top-0 z-50 bg-surface-container-lowest/80 backdrop-blur-xl border-b border-outline-variant/30">
        <div className="h-14 px-margin-mobile md:px-margin-desktop flex items-center justify-between">
          <span className="text-data-label font-data-label font-bold tracking-widest text-primary uppercase">Painel de Mercado</span>
          <div className="flex items-center gap-3 text-data-label font-data-label">
            <span className="hidden sm:inline text-outline">Consultado às {atualizado ? atualizado.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"}</span>
            <span className={erro ? "text-error" : "text-secondary"}>● {erro ? "Sem conexão" : "Conectado"}</span>
          </div>
        </div>
      </header>

      <main className="px-margin-mobile md:px-margin-desktop py-6 flex flex-col gap-6 max-w-container-max mx-auto">
        {erro && (
          <div className="bg-error-container text-on-error-container rounded-lg px-5 py-3">
            Não foi possível carregar os dados ({erro}). Confira se a API está rodando em {API}.
          </div>
        )}
        {!ativos.length && !erro && <p className="text-outline animate-pulse">Carregando...</p>}
        {ativos.length > 0 && (
          <>
            <Resumo ativos={ativos} />
            <p className="text-on-surface-variant">Clique em um ativo para ver o histórico e a explicação.</p>
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              <div className="xl:col-span-5 flex flex-col gap-6">
                <Tabela titulo="Criptomoedas" icone="currency_bitcoin" explicacao="Moedas digitais, como o Bitcoin. Preços em dólar e oscilam bastante, inclusive nos fins de semana."
                  itens={ativos.filter((a) => a.classe === "CRYPTO")} sel={sel} onSel={setSel} />
                <Tabela titulo="Fundos imobiliários (FIIs)" icone="apartment" explicacao="Fundos que investem em imóveis ou títulos do setor e costumam pagar renda todo mês. Preços em reais."
                  itens={ativos.filter((a) => a.classe === "FII")} sel={sel} onSel={setSel} />
              </div>
              <div className="xl:col-span-7">{atual && <Detalhe key={atual.ticker} a={atual} />}</div>
            </div>
          </>
        )}
        <footer className="text-outline text-data-label font-data-label border-t border-outline-variant/30 pt-4">
          Os preços são do último fechamento diário, não em tempo real. As explicações são geradas por IA a partir dos números e podem conter imprecisões.
          Este painel é apenas informativo e não é recomendação de investimento.
        </footer>
      </main>
    </div>
  );
}