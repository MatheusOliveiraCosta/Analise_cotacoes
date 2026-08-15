# Análise de Cotações

Painel que busca a cotação diária de dois ativos (Bitcoin e um fundo imobiliário
brasileiro), calcula a variação percentual, gera um resumo em português via IA
(Groq/Llama) e exibe tudo num dashboard web.

## Arquitetura

```
┌─────────────────┐     ┌──────────┐     ┌─────────┐     ┌───────────┐
│  etl_pipeline.py │ ──▶ │  MySQL   │ ◀── │ api.py  │ ◀── │   React   │
│  (yfinance+Groq) │     │ (db.py)  │     │(FastAPI)│     │ (frontend)│
└─────────────────┘     └──────────┘     └─────────┘     └───────────┘
     roda quando           guarda o          serve o          exibe o
     você quiser           resultado         mais recente      resultado
     atualizar             mais recente      via HTTP          no navegador
```

A coleta de dados é separada do serviço: o `etl_pipeline.py` busca os dados,
gera o resumo com IA e salva no banco. A API (`api.py`) só lê o último
resultado salvo — por isso responde instantaneamente, sem esperar
yfinance/Groq a cada acesso.

## Stack

- **Coleta/ETL**: Python, yfinance, pandas
- **IA**: Groq (Llama 3.3 70B), com Few-Shot + Chain-of-Thought no prompt
- **Banco**: MySQL, via SQLAlchemy
- **Backend**: FastAPI
- **Frontend**: React (Vite) + Tailwind CSS

## Pré-requisitos

- Python 3.10+
- Node.js 18+
- MySQL rodando localmente (ou acessível)
- Uma chave de API da Groq ([console.groq.com](https://console.groq.com), grátis)

## Setup

### 1. Backend (Python)

```bash
pip install yfinance pandas python-dotenv groq "fastapi[standard]" sqlalchemy pymysql
```

Crie um arquivo `.env` na raiz do projeto:

```
GROQ_API_KEY=sua_chave_aqui
DATABASE_URL=mysql+pymysql://usuario:senha@localhost:3306/analise_cotacoes
```

No MySQL, crie o banco (as tabelas são criadas automaticamente na primeira
execução):

```sql
CREATE DATABASE analise_cotacoes;
```

### 2. Frontend (React)

```bash
cd frontend
npm install
```

## Como rodar

São 3 processos, cada um em seu próprio terminal, todos a partir da raiz do
projeto (exceto o frontend):

```bash
# 1. Popula o banco com dados frescos (rode sempre que quiser atualizar)
py etl_pipeline.py

# 2. Sobe a API
py -m uvicorn api:app --reload

# 3. Sobe o frontend (dentro da pasta frontend/)
npm run dev
```

Depois, abra `http://localhost:5173` no navegador.

## Estrutura de arquivos

```
.
├── etl_pipeline.py    # extração, transformação, prompt, chamada à IA
├── db.py              # modelos SQLAlchemy e funções de salvar/ler
├── api.py             # rotas FastAPI
├── .env                # chaves e credenciais (não versionado)
└── frontend/
    ├── src/
    │   ├── App.jsx     # componente principal (estados: carregando/erro/dados)
    │   └── index.css   # tema Tailwind
    └── vite.config.js
```

## Endpoints

| Rota            | Método | Descrição                                    |
|-----------------|--------|-----------------------------------------------|
| `/api/analise`  | GET    | Retorna o resumo e as variações mais recentes |
| `/docs`         | GET    | Documentação interativa (Swagger, automática) |
