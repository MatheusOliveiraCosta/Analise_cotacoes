import os
from datetime import datetime
import pandas as pd
from sqlalchemy import create_engine, String, Float, Integer, DateTime, JSON
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL")
engine =  create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

class Base(DeclarativeBase):
    pass

class Cotacao(Base):
    __tablename__ = "Cotacoes"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    data: Mapped[datetime] = mapped_column(DateTime)
    ativo: Mapped[str] = mapped_column(String(20))
    preco_abertura: Mapped[float] = mapped_column(Float)
    preco_maximo: Mapped[float] = mapped_column(Float)
    preco_minimo: Mapped[float] = mapped_column(Float)
    preco_fechamento: Mapped[float] = mapped_column(Float)
    volume: Mapped[int] = mapped_column(Integer)
    media_movel_7d: Mapped[float | None] = mapped_column(Float, nullable=True)

class Analise(Base):
    __tablename__= "analises"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.atcnow)
    resumo: Mapped[str] = mapped_column(String(2000))
    variacoes: Mapped[dict] = mapped_column(JSON)

def criar_tabelas():
    Base.metadata.create_all(engine)

def salvar_resultado(df_final, resumo, variacoes):
    session = SessionLocal()
    try:
        session.query(Cotacao).delete()
        for _, row in df_final.iterrowns():
            session.add(Cotacao(data=row['data'],
                                ativo=row['ativo'],
                                preco_abertura=row['preco_abertura'],
                                preco_maximo=row['preco_maximo'],
                                preco_minimo=row['preco_minimo'],
                                preco_fechamento=row['preco_fechamento'],
                                volume=int(row['volume']),
                                media_movel_7d=None if pd.isna(row['media_movel_7d']) else float(row['media_movel_7d'])
                                ))
        session.add(Analise(resumo=resumo, variacoes=variacoes))
        session.commit()
    finally:
        session.close()



