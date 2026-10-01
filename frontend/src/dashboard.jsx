import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const INTERVALOS = ["1M", "3M", "6M"];

const TONS = {
  up: { texto: "text-secondary", suave: "bg-secondary/10 text-secondary", forte: "bg-secondary/20 text-secondary", ponto: "bg-secondary", traco: "#4edea3" },
  down: { texto: "text-error", suave: "bg-error/10 text-error", forte: "bg-error/20 text-error", ponto: "bg-error", traco: "#ffb4ab" },
  flat: { texto: "text-on-surface-variant", suave: "bg-surface-container-high text-on-surface-variant", forte: "bg-surface-container-high text-on-surface-variant", ponto: "bg-outline", traco: "#9cf0ff" },
};
const tom = (v) => (v > 0 ? "up" : v < 0 ? "down" : "flat");
const TOM_SINAL = { ALTA: "up", QUEDA: "down", NEUTRO: "flat" };

const moeda = (v, m) =>
  v == null ? "—" : new Intl.NumberFormat(m === "BRL" ? "pt-BR" : "en-US", { style: "currency", currency: m }).format(v);
const num = (v, d = 2) => (v == null ? "—" : v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }));
const pct = (v) => `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
const hora = (iso, intervalo) => {
  const d = new Date(iso);
  return intervalo === "1D" ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString("pt-BR");
};

async function get(path) {
  const r = await fetch(`${API}${path}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function Grafico({ serie, traco }) {
  if (!serie?.length) return <div className="h-full grid place-items-center text-outline font-pipeline-log text-pipeline-log">Sem dados para este intervalo</div>;
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
      {[40, 90, 140].map((g) => (
        <line key={g} x1="0" x2={W} y1={g} y2={g} stroke="#3b494c" strokeDasharray="3 3" strokeOpacity="0.3" />
      ))}
      {serie.map((p, i) => {
        const h = (p.volume / maxV) * VOL;
        return <rect key={i} x={x(i) - bw / 2} y={H - h} width={bw} height={h} fill="#3b494c" opacity="0.5" />;
      })}
      <path d={`${linha} L${W} ${H - VOL} L0 ${H - VOL} Z`} fill="url(#grad)" />
      <path d={linha} stroke={traco} strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Tabela({ titulo, icone, badge, itens, fii, sel, onSel }) {
  return (
    <div className="bg-surface-container-low rounded-xl p-5 shadow-md flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-[20px]">{icone}</span>
        <span className="font-headline-md text-headline-md text-on-surface">{titulo}</span>
        <span className="px-2 py-0.5 rounded bg-surface-container-high font-data-label text-data-label text-primary-fixed">{badge}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left font-data-table text-data-table">
          <thead>
            <tr className="text-outline font-data-label text-data-label uppercase bg-surface-container-highest/40">
              <th className="py-2.5 px-3">Ticker</th>
              <th className="py-2.5 px-3 text-right">{fii ? "Cotação" : "Último"}</th>
              <th className="py-2.5 px-3 text-right">Var dia</th>
              <th className="py-2.5 px-3 text-right hidden sm:table-cell">Mín / Máx (dia)</th>
              <th className="py-2.5 px-3 text-center">Sinal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20">
            {itens.map((a) => {
              const t = TONS[tom(a.var_pct)];
              const ts = TONS[TOM_SINAL[a.sinal]];
              const ativo = a.ticker === sel;
              return (
                <tr key={a.ticker} onClick={() => onSel(a.ticker)}
                  className={`cursor-pointer transition-colors ${ativo ? "bg-surface-container-high" : "hover:bg-surface-container-high/60"}`}>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${ts.ponto}`} />
                      <div className="flex flex-col">
                        <span className={`font-bold tracking-wider ${ativo ? "text-primary" : "text-on-surface"}`}>{a.ticker}</span>
                        <span className="text-data-label text-on-surface-variant">{a.nome}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-on-surface">{moeda(a.preco, a.moeda)}</td>
                  <td className="py-3 px-3 text-right">
                    <span className={`px-1.5 py-0.5 rounded font-medium ${t.suave}`}>{pct(a.var_pct)}</span>
                  </td>
                  <td className="py-3 px-3 text-right text-on-surface-variant hidden sm:table-cell">
                    {num(a.minima)} / {num(a.maxima)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded font-data-label text-data-label uppercase font-bold tracking-wider ${ts.forte}`}>{a.sinal}</span>
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

function PainelIA({ ia, erro, sinal }) {
  const ts = TONS[TOM_SINAL[sinal] ?? "flat"];
  return (
    <div className="bg-surface-container rounded-lg p-5 flex flex-col gap-3 shadow-inner">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-[20px]">psychology</span>
        <span className="font-data-label text-data-label font-bold tracking-wider text-primary">RESUMO DA IA</span>
      </div>
      {erro ? (
        <p className="text-error font-pipeline-log text-pipeline-log">Não foi possível gerar a análise: {erro}</p>
      ) : !ia ? (
        <p className="text-outline font-pipeline-log text-pipeline-log animate-pulse">Gerando análise...</p>
      ) : (
        <>
          <div className="p-3.5 rounded bg-surface-container-low">
            <p className="text-body-md text-on-surface leading-relaxed">
              <strong className={`${ts.texto} font-bold`}>{sinal}</strong> — {ia.resumo}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1 p-3 rounded bg-surface-container-low">
              <span className="font-data-label text-data-label text-outline uppercase">Drivers</span>
              <p className="font-pipeline-log text-pipeline-log text-on-surface-variant">{ia.drivers}</p>
            </div>
            <div className="flex flex-col gap-1 p-3 rounded bg-surface-container-low">
              <span className="font-data-label text-data-label text-outline uppercase">Risco</span>
              <p className="font-pipeline-log text-pipeline-log text-on-surface-variant">{ia.risco}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Detalhe({ a }) {
  const [intervalo, setIntervalo] = useState("1M");
  const [serie, setSerie] = useState(null);
  const [ia, setIa] = useState(null);
  const [erroIa, setErroIa] = useState(null);
  const t = TONS[tom(a.var_pct)];

  useEffect(() => {
    let vivo = true;
    setSerie(null);
    get(`/api/ativos/${a.ticker}/serie?intervalo=${intervalo}`).then((d) => vivo && setSerie(d.serie)).catch(() => vivo && setSerie([]));
    return () => { vivo = false; };
  }, [a.ticker, intervalo]);

  useEffect(() => {
    let vivo = true;
    setIa(null); setErroIa(null);
    get(`/api/ativos/${a.ticker}/analise`).then((d) => vivo && setIa(d)).catch((e) => vivo && setErroIa(e.message));
    return () => { vivo = false; };
  }, [a.ticker]);

  const m = (v) => moeda(v, a.moeda);
  return (
    <div className="bg-surface-container-low rounded-xl p-6 shadow-xl flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <span className="font-headline-lg text-headline-lg font-bold text-on-surface">{a.ticker}</span>
            <span className="px-2.5 py-0.5 rounded bg-primary/10 text-primary font-data-label text-data-label uppercase font-bold">{a.classe}</span>
          </div>
          <span className="text-on-surface-variant">{a.nome}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-pipeline-log text-[28px] font-bold text-on-surface tracking-tight">{m(a.preco)}</span>
          <span className={`font-data-label text-data-label px-2 py-0.5 rounded font-bold ${t.forte}`}>
            {pct(a.var_pct)} ({a.var_abs > 0 ? "+" : ""}{m(a.var_abs)})
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-container p-3 rounded-lg">
        <div className="flex flex-wrap items-center gap-4 font-pipeline-log text-data-label text-on-surface-variant">
          <div><span className="text-outline">MA20: </span><span className="text-on-surface">{m(a.ma20)}</span></div>
          <div><span className="text-outline">MA50: </span><span className="text-on-surface">{m(a.ma50)}</span></div>
          <div><span className="text-outline">RSI: </span><span className={`font-bold ${a.rsi >= 70 ? "text-error" : a.rsi <= 30 ? "text-secondary" : "text-on-surface"}`}>{num(a.rsi, 1)}</span></div>
          <div><span className="text-outline">VOL_Z: </span><span className="text-on-surface">{a.vol_z > 0 ? "+" : ""}{num(a.vol_z)}σ</span></div>
        </div>
        <div className="flex items-center gap-1 bg-surface-container-high p-1 rounded">
          {INTERVALOS.map((i) => (
            <button key={i} onClick={() => setIntervalo(i)}
              className={`px-2.5 py-1 rounded font-data-label text-data-label transition-colors ${i === intervalo ? "bg-primary text-on-primary font-bold shadow-sm" : "text-on-surface-variant hover:text-on-surface"}`}>
              {i}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full bg-surface-container rounded-lg p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between font-data-label text-data-label text-outline">
          <span>PREÇO &amp; VOLUME ({intervalo})</span>
          <span className="text-on-surface-variant">MÁX DIA: {m(a.maxima)} | MÍN DIA: {m(a.minima)}</span>
        </div>
        <div className="w-full h-56">
          {serie === null ? <div className="h-full grid place-items-center text-outline animate-pulse">Carregando...</div> : <Grafico serie={serie} traco={t.traco} />}
        </div>
        {serie?.length > 1 && (
          <div className="flex items-center justify-between font-pipeline-log text-data-label text-outline pt-2">
            <span>{hora(serie[0].t, intervalo)}</span>
            <span>{hora(serie[Math.floor(serie.length / 2)].t, intervalo)}</span>
            <span>{hora(serie[serie.length - 1].t, intervalo)}</span>
          </div>
        )}
      </div>

      <PainelIA ia={ia} erro={erroIa} sinal={a.sinal} />
    </div>
  );
}

export default function Dashboard() {
  const [ativos, setAtivos] = useState([]);
  const [sel, setSel] = useState(null);
  const [erro, setErro] = useState(null);
  const [latencia, setLatencia] = useState(null);
  const [atualizado, setAtualizado] = useState(null);

  useEffect(() => {
    let vivo = true;
    const carregar = async () => {
      try {
        const t0 = performance.now();
        const d = await get("/api/ativos");
        if (!vivo) return;
        setAtivos(d);
        setLatencia(Math.round(performance.now() - t0));
        setAtualizado(new Date());
        setErro(null);
        setSel((s) => s ?? d[0]?.ticker);
      } catch (e) {
        if (vivo) setErro(e.message);
      }
    };
    carregar();
    const id = setInterval(carregar, 60000);
    return () => { vivo = false; clearInterval(id); };
  }, []);

  const atual = ativos.find((a) => a.ticker === sel);
  const online = !erro;

  return (
    <div className="dark bg-surface text-on-surface font-body-md min-h-screen antialiased">
      <header className="fixed top-0 inset-x-0 z-50 bg-surface-container-lowest/80 backdrop-blur-xl border-b border-outline-variant/30">
        <div className="h-14 px-margin-desktop flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-data-label text-data-label font-bold tracking-widest text-primary uppercase">FIN-TERMINAL</span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container-high border border-outline-variant/40">
              <span className={`w-2 h-2 rounded-full ${online ? "bg-secondary" : "bg-error"}`} />
              <span className={`font-data-label text-data-label tracking-wider ${online ? "text-secondary" : "text-error"}`}>{online ? "ONLINE" : "OFFLINE"}</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4 font-data-label text-data-label">
            <span className="text-outline">API: <span className="text-on-surface font-pipeline-log">{latencia != null ? `${latencia}ms` : "—"}</span></span>
            <span className="text-outline">ATUALIZADO: <span className="text-on-surface font-pipeline-log">{atualizado ? atualizado.toLocaleTimeString("pt-BR") : "—"}</span></span>
          </div>
        </div>
      </header>

      <main className="pt-14">
        <div className="px-margin-desktop py-4 flex flex-col gap-6">
          {erro && (
            <div className="bg-error-container text-on-error-container rounded-lg px-5 py-3 font-pipeline-log text-pipeline-log">
              Não foi possível falar com a API em {API} ({erro}). Confira se o uvicorn está rodando.
            </div>
          )}
          {!ativos.length && !erro && <p className="text-outline animate-pulse">Carregando ativos...</p>}
          {ativos.length > 0 && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              <div className="xl:col-span-6 flex flex-col gap-6">
                <Tabela titulo="Criptoativos" icone="currency_bitcoin" badge="USD SPOT" itens={ativos.filter((a) => a.classe === "CRYPTO")} sel={sel} onSel={setSel} />
                <Tabela titulo="Fundos Imobiliários (FIIs)" icone="apartment" badge="B3 / BRL" fii itens={ativos.filter((a) => a.classe === "FII")} sel={sel} onSel={setSel} />
              </div>
              <div className="xl:col-span-6">{atual && <Detalhe key={atual.ticker} a={atual} />}</div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}