from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from db import SessionLocal, Analise

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnaliseResponse(BaseModel):
    resumo: str
    variacoes: dict[str, float]


@app.get("/api/analise", response_model=AnaliseResponse)
def analise():
    session = SessionLocal()
    ultima = session.query(Analise).order_by(Analise.criado_em.desc()).first()
    session.close()

    if ultima is None:
        raise HTTPException(status_code=404, detail="Nenhuma análise até o momento, rode o etl_pipeline.py primeiro.")

    return {"resumo": ultima.resumo, "variacoes": ultima.variacoes}