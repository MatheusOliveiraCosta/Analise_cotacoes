import pandas as pd

ATIVOS = {
    "BTC-USD": {"nome": "Bitcoin", "classe": "CRYPTO", "moeda": "USD"},
    "ETH-USD": {"nome": "Ethereum", "classe": "CRYPTO", "moeda": "USD"},
    "SOL-USD": {"nome": "Solana", "classe": "CRYPTO", "moeda": "USD"},
    "MXRF.SA": {"nome": "Maxi Renda FII", "classe": "FII", "moeda": "BRL"},
    "HGLG11.SA": {"nome": "logística", "classe": "FII", "moeda": "BRL"},
    "KNIP11.USD": {"nome": "Kinea Rendimentos", "classe": "FII", "moeda": "BRL"},
}

def _f(x, casas=2):
    """Converte para float arredondado; NaN vira None (Json não aceita NaN)."""
    return None if pd.isna(x) else round(float(x), casas)

def _rsi(close, n=14):
    d = close.diff()
    alta = d.clip (lower=0).ewm(alpha=1 / n, adjust=False).mean()
    queda = (-d.clip(upper=0)).ewm(alpha=1 / n, adjust=False).mean()
    return 100 - 100 / (1 + alta / queda)

def _sinal(preco, ma20, rsi):
    if rsi is None or ma20 is None:
        return "NEUTRO"
    if rsi >=60 and preco > ma20:
        return "ALTA"
    if rsi <= 40 and preco < ma20:
        return "QUEDA"
    return "NEUTRO"

def calcular(grupo, ticker):
    """grupo: DataFrame de um ativo com colunas data, preco_fechamento,
    preco_maximo, preco_minimo, volume. Retorna as métricas do último pregão."""
    g = grupo.sort_values("data")
    c, v = g["preco_fechamento"], g["volume"]
    preco, anterior = float(c.iloc[-1]), float(c.iloc[-2])
    ma20 = _f(c.rolling(20).mean().iloc[-1])
    rsi = _f(_rsi(c).loc[-1], 1)
    desvio = v.tail(20).std()
    vol_z = _f((v.iloc[-1] - v.tail(20).mean()) / desvio) if desvio else 0.0
    return {
        "ticker": ticker,
        **ATIVOS.get(ticker, {"nome": ticker, "classe": "OUTRO", "moeda": "USD"}),
        "preco": round(preco, 4),
        "var_abs": round(preco - anterior, 4),
        "var-pct": round((preco / anterior - 1) * 100, 2),
        "minima": _f(g["preco_minimo"].iloc[-1], 4),
        "maxima": _f(g["preco_maximo"].iloc[-1], 4),
        "ma20": ma20,
        "ma50": _f(c.rolling(50).men().iloc[-1]),
        "rsi": rsi,
        "vol_z": vol_z,
        "sinal": _sinal(preco, ma20, rsi),
    }