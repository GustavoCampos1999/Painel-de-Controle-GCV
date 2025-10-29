require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { calcularOrcamento } = require('./calculo.js'); //

const app = express();
app.use(cors());
app.use(express.json());

const PORTA = process.env.PORT || 3000;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Erro: Variáveis de ambiente SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórias.");
  process.exit(1);
}

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('API: Requisição sem token Bearer.');
    return res.status(401).json({ erro: "Token de autenticação Bearer necessário." });
  }

  const token = authHeader.split(' ')[1];
  req.supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
  console.log('API: Cliente Supabase autenticado criado.');
  next();
};

app.use('/api', authMiddleware);

app.get('/health', (req, res) => {
  res.status(200).send('Servidor backend está operacional.');
});

app.post('/api/calcular', (req, res) => {
   try {
    const resultados = calcularOrcamento(req.body);
    res.json(resultados);
   } catch (error) {
    console.error("Erro no endpoint /api/calcular:", error);
    res.status(500).json({ erro: "Erro ao processar cálculo." });
   }
});

app.get('/api/dados-base', async (req, res) => {
  try {
    const [tecidosRes, confeccaoRes, trilhoRes, freteRes, instalacaoRes] = await Promise.all([
      req.supabase.from('tecidos').select('*').order('produto'),
      req.supabase.from('confeccao').select('*').order('opcao'),
      req.supabase.from('trilho').select('*').order('opcao'),
      req.supabase.from('frete').select('*').order('valor'),
      req.supabase.from('instalacao').select('*').order('valor')
    ]);

    if (tecidosRes.error) throw tecidosRes.error;
    if (confeccaoRes.error) throw confeccaoRes.error;
    if (trilhoRes.error) throw trilhoRes.error;
    if (freteRes.error) throw freteRes.error;
    if (instalacaoRes.error) throw instalacaoRes.error;

    res.json({
      tecidos: tecidosRes.data || [],
      confeccao: confeccaoRes.data || [],
      trilho: trilhoRes.data || [],
      frete: freteRes.data || [],
      instalacao: instalacaoRes.data || []
    });

  } catch (error) {
    console.error('Erro Supabase/inesperado em /api/dados-base:', error);
    res.status(error.status || 500).json({ erro: error.message || "Erro ao buscar dados base." });
  }
});

app.get('/api/orcamentos/:clientId', async (req, res) => {
     const { clientId } = req.params;
    if (isNaN(parseInt(clientId))) {
         return res.status(400).json({ erro: "ID do cliente inválido." });
    }
    try {
        const { data, error } = await req.supabase
          .from('orcamentos')
          .select('data')
          .eq('client_id', clientId)
          .maybeSingle();
        if (error) throw error;
        if (data) {
            res.json(data.data || {});
        } else {
            res.status(404).json({ message: 'Orçamento não encontrado ou acesso negado.' });
        }
    } catch (error) {
        console.error(`Erro Supabase/inesperado GET /api/orcamentos/${clientId}:`, error);
        res.status(error.status || 500).json({ erro: error.message || "Erro interno." });
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
        const { data: perfilData, error: perfilError } = await req.supabase
            .from('perfis').select('loja_id').single();
        if (perfilError || !perfilData) throw new Error("Não foi possível identificar a loja do usuário.");
        const lojaId = perfilData.loja_id;

        const { data, error } = await req.supabase
          .from('orcamentos')
          .upsert({ client_id: clientId, loja_id: lojaId, data: orcamentoData },
                  { onConflict: 'client_id, loja_id' })
          .select('data, updated_at').single();
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        console.error(`Erro Supabase/inesperado PUT /api/orcamentos/${clientId}:`, error);
        res.status(error.status || 500).json({ erro: error.message || "Erro interno." });
    }
});

app.listen(PORTA, '0.0.0.0', () => {
    console.log(`--- Backend rodando na porta ${PORTA} ---`);
    console.log(`Conectado à API Supabase em: ${supabaseUrl.substring(0, 30)}...`);
});