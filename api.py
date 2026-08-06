from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from etl_pipleine import gerar_analise

app = FastAPI()

app.add_middleware(CORSMiddleware, allow_origens["http//localhost:5173", "http://localhost:3000"], allow_methods=["*"], allow_headers=["*"],)

class AnaliseResponse(BaseModel):
    resumo: str
    variacoes: dict[str, float]

@app.get("/api/analise", response_model=AnaliseResponse)
def analise():
    return gerar_analise()