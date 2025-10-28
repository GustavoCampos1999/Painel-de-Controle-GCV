require('dotenv').config();
const express = require('express');
const cors = require('cors'); 
const db = require('./database.js'); 
const { calcularOrcamento } = require('./calculo.js');

const app = express();
app.use(cors()); 
app.use(express.json());

const PORTA = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  res.status(200).send('Servidor está acordado.');
});

app.post('/api/calcular', (req, res) => {
   try {
    const dadosDeEntrada = req.body;
    if (dadosDeEntrada == null || typeof dadosDeEntrada !== 'object') {
        return res.status(400).json({ erro: "Dados de entrada inválidos." });
    }
    const resultados = calcularOrcamento(dadosDeEntrada);
    res.json(resultados);
  } catch (error) {
    console.error("Erro no cálculo:", error);
    res.status(500).json({ erro: "Ocorreu um erro ao processar o cálculo." });
  }
});

app.get('/api/tecidos', async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM tecidos ORDER BY produto ASC", []);
    res.json(result.rows || []); 
  } catch (err) {
    console.error('Erro ao buscar tecidos:', err);
    res.status(500).json({ "erro": err.message });
  }
});

app.get('/api/confeccao', async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM confeccao ORDER BY opcao ASC", []); 
    res.json(result.rows || []);
  } catch (err) {
    console.error('Erro ao buscar confecção:', err);
    res.status(500).json({ "erro": err.message });
  }
});

app.get('/api/trilho', async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM trilho ORDER BY opcao ASC", []);
    res.json(result.rows || []);
  } catch (err) {
    console.error('Erro ao buscar trilho:', err);
    res.status(500).json({ "erro": err.message });
  }
});

app.get('/api/orcamentos/:clientId', async (req, res) => {
    const { clientId } = req.params;
    if (isNaN(parseInt(clientId))) {
         return res.status(400).json({ erro: "ID do cliente inválido." });
    }
    try {
        const result = await db.query("SELECT data FROM orcamentos WHERE client_id = $1", [clientId]);
        
        if (result.rows.length > 0) {
            res.json(result.rows[0].data || {});
        } else {
            res.status(404).json({ message: 'Orçamento não encontrado.' });
        }
    } catch (err) {
        console.error(`Erro ao buscar orçamento para client_id ${clientId}:`, err);
        res.status(500).json({ "erro": err.message });
    }
});

app.put('/api/orcamentos/:clientId', async (req, res) => {
    const { clientId } = req.params;
     if (isNaN(parseInt(clientId))) {
         return res.status(400).json({ erro: "ID do cliente inválido." });
    }
    const orcamentoData = req.body; 
    if (!orcamentoData || typeof orcamentoData !== 'object') {
        return res.status(400).json({ erro: "Dados do orçamento inválidos." });
    }
    try {
        const result = await db.query(
            `INSERT INTO orcamentos (client_id, data, updated_at) VALUES ($1, $2, NOW())
             ON CONFLICT (client_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
             RETURNING data, updated_at`, 
            [clientId, orcamentoData]
        );
        res.status(200).json(result.rows[0]); 

    } catch (err) {
        console.error(`Erro ao salvar orçamento para client_id ${clientId}:`, err);
        res.status(500).json({ "erro": err.message });
    }
});

app.listen(PORTA, '0.0.0.0', () => {
    console.log(`--- Servidor rodando na porta ${PORTA} ---`); 
    console.log('API pronta para servir dados do Supabase.');
});