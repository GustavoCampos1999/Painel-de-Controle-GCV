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
        res.json(result.rows.length > 0 ? (result.rows[0].data || {}) : {});
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
            `INSERT INTO orcamentos (client_id, data) VALUES ($1, $2)
             ON CONFLICT (client_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
             RETURNING id, updated_at`,
            [clientId, orcamentoData]
        );
        console.log(`Orçamento salvo/atualizado para client_id ${clientId}:`, result.rows[0]);
        res.status(200).json({ success: true, updated_at: result.rows[0].updated_at });
    } catch (err) {
        console.error(`Erro ao salvar orçamento para client_id ${clientId}:`, err);
        res.status(500).json({ "erro": err.message });
    }
});

app.listen(PORTA, () => {
    console.log(`--- Servidor rodando em http://localhost:${PORTA} ---`);
    console.log('API pronta para servir dados do Supabase.');
});