from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from etl_pipeline import gerar_analise

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http//localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnaliseResponse(BaseModel):
    resumo: str
    variacoes: dict[str, float]

@app.get("/api/analise", response_model=AnaliseResponse)
def analise():
    session = SessionLocal()
    ultima = session.query(Analise).order_by(Analse.criado_em.desc()).first()
    session.close()

    if ultima is None:
        raise HTTPExpection(status_code=404, detail="Nenhuma análise até o momento, rode o etl_pipeline.py primeiro.")
    
    return {"reusmo": ultima.resumo, "variacoes": ultima.variacoes}