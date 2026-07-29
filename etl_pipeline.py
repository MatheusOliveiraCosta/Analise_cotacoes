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

# --- FLUXO PRINCIPAL ---
if __name__ == "__main__":
    ativos = ['BTC-USD', 'MXRF11.SA']
    lista_dfs = []
    
    for ativo in ativos:
        dados_brutos = extrair_dados(ativo)
        dados_limpos = transformar_dados(dados_brutos, ativo)
        lista_dfs.append(dados_limpos)
        
    df_final = pd.concat(lista_dfs, ignore_index=True)
    
    print("Formato final:", df_final.shape)
    print("\nTipos de dado:\n", df_final.dtypes)
    print("\nValores nulos por coluna:\n", df_final.isna().sum())
    print("\nContagem de linhas por ativo:\n", df_final['ativo'].value_counts())
    print("\nAlgumas linhas de cada ativo:")
    print(df_final.groupby('ativo').head(3))

