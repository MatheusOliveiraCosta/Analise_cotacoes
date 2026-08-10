import { useEffect, useState } from 'react'
import './App.css'

const API_URL = 'http://127.0.0.1:8000/api/analise'

function App() {
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    fetch(API_URL)
      .then((res) => {
        if (!res.ok) throw new Error('Nenhuma análise disponível ainda.')
        return res.json()
      })
      .then((json) => setDados(json))
      .catch((err) => setErro(err.message))
      .finally(() => setCarregando(false))
  }, [])

  return (
    <div className="painel">
      <header className="painel-header">
        <span className="painel-eyebrow">Fechamento de hoje</span>
        <h1>Cotações</h1>
      </header>

      {carregando && <p className="estado">Carregando...</p>}
      {erro && <p className="estado erro">{erro} Rode o etl_pipeline.py primeiro.</p>}

      {dados && (
        <>
          <div className="cards">
            {Object.entries(dados.variacoes).map(([ativo, variacao]) => (
              <div key={ativo} className={`card ${variacao >= 0 ? 'alta' : 'queda'}`}>
                <span className="ticker">{ativo}</span>
                <span className="variacao">
                  {variacao >= 0 ? '+' : ''}{variacao}%
                </span>
              </div>
            ))}
          </div>

          <div className="resumo">
            {dados.resumo.split('\n').map((linha, i) => (
              <p key={i}>{linha}</p>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default App