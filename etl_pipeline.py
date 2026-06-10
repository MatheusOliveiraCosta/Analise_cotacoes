import yfinance as yf
import pandas as pd

def extrair_dados(ticker):
    print(f"Extraindo dados de: {ticker}...")
    # Baixa o histórico dos últimos 6 meses
    ativo = yf.Ticker(ticker)
    df = ativo.history(period="6mo")
    
    # O yfinance traz várias colunas. Vamos manter só as que importam para o nosso BD
    df = df[['Open', 'High', 'Low', 'Close', 'Volume']]
    return df

def transformar_dados(df, ticker_nome):
    print(f"Limpando e transformando dados de: {ticker_nome}...")
    
    # 1. (USAR A IA): A data está no índice do DataFrame. Transforme-a em uma coluna normal.
    # df = ...
    
    # 2. (MISSÃO): Adicione uma nova coluna chamada 'ativo' e coloque o valor da variável ticker_nome nela.
    # df['ativo'] = ...

    # 3. (MISSÃO): Renomeie as colunas para o português, exatamente como está na tabela do banco de dados (preco_abertura, etc).
    # df.rename(...)
    
    # 4. (MISSÃO): Exclua qualquer linha que tenha valores nulos (NaN).
    # df = ...

    # 5. (USAR A IA): Calcule a média móvel de 7 dias baseada na coluna preco_fechamento e salve na coluna media_movel_7d.
    # df['media_movel_7d'] = ...

    # 6. (MISSÃO): Arredonde todas as colunas de preços para 4 casas decimais.
    # df = ...

    return df

# --- FLUXO PRINCIPAL ---
if __name__ == "__main__":
    ativos = ['BTC-USD', 'MXRF11.SA']
    lista_dfs = [] # Lista para guardar os dados de cada ativo
    
    for ativo in ativos:
        dados_brutos = extrair_dados(ativo)
        dados_limpos = transformar_dados(dados_brutos, ativo)
        lista_dfs.append(dados_limpos)
        
    # Junta os dados do Bitcoin e do Fundo Imobiliário em uma única tabela final
    df_final = pd.concat(lista_dfs, ignore_index=True)
    
    # Exibe as primeiras 10 linhas para você conferir se deu certo
    print(df_final.head(10))

