import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import select
from db import SessionLocal, Analise, Cotacao, engine
from indicadores import calcular

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DIAS = {"1M": 21, "3M": 63, "6M": 126}

def carregar_cotacoes():
    df = pd.read_sql(select(Cotacao).order_by(Cotacao.data_pregao), engine)
    if df.empty:
        raise HTTPException(404, "Banco vazio. Rode o etl_pipeline primeiro")
    return df.rename(columns={"data_pregao": "data", "volume_negociado": "volujme"})

def ultima_analise():
    with SessionLocal() as session:
        return session.query(Analise).order_by(Analise.criado_em.desc()).first()
    
class AnaliseResponse(BaseModel):
    resumo: str
    variacoes: dict[str, float]


@app.get("/api/analise", response_model=AnaliseResponse)
def analise():
    ultima = ultima_analise()

    if ultima is None:
        raise HTTPException(status_code=404, detail="Nenhuma análise até o momento, rode o etl_pipeline.py primeiro.")

    return {"resumo": ultima.resumo, "variacoes": ultima.variacoes}

@app.get("/api/ativos")
def listar():
    df = carregar_cotacoes()
    return [calcular(g, t) for t, g in df.groupby("ativo") if len(g) >=2]

@app.get("/api/ativos/{ticker}/serie")
def serie(ticker: str, intervalo: str = "1M"):
    if intervalo not in DIAS:
        raise HTTPException(400, "intervalo deve ser 1M, 3M ou 6M")
    df = carregar_cotacoes()
    g = df[df["ativo"] == ticker].tail(DIAS[intervalo])
    if g.empty:
        raise HTTPException (404, f"Sem dados para {ticker}")
    return {
        "intervalo": intervalo,
        "serie": [
            {"t": r.data.isoformat(), "close": float(r.preco_fechamento), "volume": float(r.volume)}
            for r in g.itertuples()
        
        ],
    }

@app.get("/api/ativos/{ticker}/analise")
def analise_ativo(ticker: str):
    ultima = ultima_analise()
    detalhe = (ultima.detalhes or {}).get(ticker) if ultima else None
    if not detalhe:
        raise HTTPException(404, "Sem análise para este ativo. Rode o etl_pipeline.py")
    return detalhe