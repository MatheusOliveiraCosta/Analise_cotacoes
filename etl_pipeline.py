import yfinance as yf
import pandas as pd
from dotenv import load_dotenv
from groq import Groq
from db import criar_tabelas, salvar_resultado
import os
import json
from indicadores import ATIVOS, calcular

load_dotenv()

def montar_prompt(metricas):
    linhas = [
        f"- {m['ticker']} ({m['nome']}): preço {m['preco']} {m['moeda']}, "
        f"variação do dia {m['var_pct']}%, RSI14 {m['rsi']}, MA20 {m['ma20']}, "
        f"MA50 {m['ma50']}, volume z-score {m['vol_z']}, sinal técnico {m['sinal']}"
        for m in metricas
    ]
    dados = "\n".join(linhas)
    return f"""Atue como um analista financeiro especializado no mercado brasileiro.

Dados de hoje:
{dados}

Responda SOMENTE um JSON com uma chave para cada ticker acima, neste formato:
{{"TICKER": {{"resumo": "1-2 frases sobre o movimento", "drivers": "1-2 frases sobre o que os indicadores mostram", "risco": "1-2 frases sobre riscos"}}}}

Use apenas os dados fornecidos. Não invente notícias, eventos ou números."""


def chamar_llm(prompt):
    client = Groq()
    MODELO  = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
    resposta = client.chat.completions.create(
        model=MODELO,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
    )
    return json.loads(resposta.choices[0].message.content)

def extrair_dados(ticker):
    print(f"Extraindo dados de: {ticker}...")
    
    # Baixa o histórico dos últimos 6 meses
    ativo = yf.Ticker(ticker)
    df = ativo.history(period="6mo")
    if df.empty:
            raise ValueError(f"Sem dados para '{ticker}'. Confira o código do ativo no Yahoo Finance.")
    
    # O yfinance traz várias colunas. Vamos manter só as que importam para o nosso BD
    df = df[['Open', 'High', 'Low', 'Close', 'Volume']]
    return df

def transformar_dados(df, ticker_nome):
    print(f"Limpando e transformando dados de: {ticker_nome}...")
    
    # 1. (USAR A IA): A data está no índice do DataFrame. Transforme-a em uma coluna normal.
    df = df.reset_index()
    df['Date'] = df['Date'].dt.tz_localize(None)
    
    # 2. (MISSÃO): Adicione uma nova coluna chamada 'ativo' e coloque o valor da variável ticker_nome nela.
    df['ativo'] = ticker_nome

    # 3. (MISSÃO): Renomeie as colunas para o português, exatamente como está na tabela do banco de dados (preco_abertura, etc).
    df = df.rename(columns={
    'Date': 'data',
    'Open': 'preco_abertura',
    'High': 'preco_maximo',
    'Low': 'preco_minimo',
    'Close': 'preco_fechamento',
    'Volume': 'volume'
    })
    
    # 4. (MISSÃO): Exclua qualquer linha que tenha valores nulos (NaN).
    df = df.dropna()

    # 5. (USAR A IA): Calcule a média móvel de 7 dias baseada na coluna preco_fechamento e salve na coluna media_movel_7d.
    df['media_movel_7d'] = df['preco_fechamento'].rolling(window=7).mean()

    # 6. (MISSÃO): Arredonde todas as colunas de preços para 4 casas decimais.
    colunas_preco = ['preco_abertura', 'preco_maximo', 'preco_minimo', 'preco_fechamento', 'media_movel_7d']
    df[colunas_preco] = df[colunas_preco].round(4)

    return df

def gerar_analise():
    criar_tabelas()
    dfs = [transformar_dados(extrair_dados(t), t) for t in ATIVOS]
    df_final = pd.concat(dfs, ignore_index=True)

    metricas = [calcular(g, t) for t, g in df_final.groupby("ativo")]
    detalhes = chamar_llm(montar_prompt(metricas))

    variacoes = {m["ticker"]: m["var_pct"] for m in metricas}
    resumo = "\n".join(f"{t}: {d.get('resumo', '')}" for t, d in detalhes.items())
    salvar_resultado(df_final, resumo, variacoes, detalhes)

    return {"resumo": resumo, "variacoes": variacoes}

# --- FLUXO PRINCIPAL ---
if __name__ == "__main__":
    
    resultado = gerar_analise()

    print("\n--- RESUMO DA IA ---")
    print(resultado["resumo"])
    print("\nVariações calculadas:", resultado["variacoes"])