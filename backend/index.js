require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { calcularOrcamento } = require('./calculo.js');

const allowedOrigins = [
  'https://gustavocampos1999.github.io', 
  'http://127.0.0.1:5500'               
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Não permitido pela política de CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],    
  allowedHeaders: ['Content-Type', 'Authorization'] 
};

app.use(express.json());
app.use(cors(corsOptions)); 

const PORTA = process.env.PORT || 3000;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; 

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error("Erro: Variáveis de ambiente SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_KEY são obrigatórias.");
  process.exit(1);
}

const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

app.get('/health', (req, res) => res.status(200).send('Servidor backend está operacional.'));

app.post('/register', async (req, res) => {
    const { email, password, cnpj, nome_empresa, telefone, nome_usuario } = req.body;

    if (!email || !password || !cnpj || !nome_empresa || !nome_usuario) {
        return res.status(400).json({ erro: "Email, senha, nome da empresa, nome de usuário e CNPJ são obrigatórios." });
    }
    const cnpjLimpo = String(cnpj).replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) {
        return res.status(400).json({ erro: "CNPJ inválido. Deve conter 14 números." });
    }

    try {

        console.log(`[Registro] Validando CNPJ: ${cnpjLimpo} (simulação bem-sucedida)`);
        
        const { data: existingLoja, error: lojaCheckError } = await supabaseService
            .from('lojas').select('id').eq('cnpj', cnpjLimpo).maybeSingle();
        
        if (lojaCheckError) throw lojaCheckError;
        if (existingLoja) return res.status(409).json({ erro: "Este CNPJ já está cadastrado." });

        const { data: userData, error: userError } = await supabaseService.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true
        });
        if (userError) throw userError;

        const newUserId = userData.user.id;

        const trialEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: lojaData, error: lojaError } = await supabaseService
            .from('lojas')
            .insert({
                nome: nome_empresa,
                owner_user_id: newUserId,
                cnpj: cnpjLimpo,
                telefone: telefone,
                subscription_status: 'trialing',
                trial_ends_at: trialEndDate
            })
            .select('id')
            .single();
        if (lojaError) throw lojaError;

        const newLojaId = lojaData.id;

        const { error: perfilError } = await supabaseService
            .from('perfis')
            .insert({
                user_id: newUserId,
                loja_id: newLojaId,
                role: 'admin',
                nome_usuario: nome_usuario             
            });
        if (perfilError) throw perfilError;

        console.log(`[Registro] Loja ${newLojaId} criada com sucesso para ${email}.`);
        res.status(201).json({ mensagem: "Conta criada com sucesso! Você já pode fazer login." });

    } catch (error) {
        console.error("Erro durante o registro:", error);
        return res.status(500).json({ erro: error.message || "Erro interno no servidor." });
    }
});

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ erro: "Token de autenticação Bearer necessário." });
  }
  const token = authHeader.split(' ')[1];
  req.supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
  next();
};
app.use('/api', authMiddleware);


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
    const checkError = (response, tableName) => { if (response.error) throw new Error(`Erro ao buscar ${tableName}: ${response.error.message}`); };
    checkError(tecidosRes, 'tecidos');
    checkError(confeccaoRes, 'confeccao');
    checkError(trilhoRes, 'trilho');
    checkError(freteRes, 'frete');
    checkError(instalacaoRes, 'instalacao');
    res.json({
      tecidos: tecidosRes.data || [],
      confeccao: confeccaoRes.data || [],
      trilho: trilhoRes.data || [],
      frete: freteRes.data || [],
      instalacao: instalacaoRes.data || []
    });
  } catch (error) {
    console.error('Erro em /api/dados-base:', error);
    const statusCode = error.status || 500;
    res.status(statusCode).json({ erro: error.message || "Erro ao buscar dados base." });
  }
});

app.get('/api/orcamentos/:clientId', async (req, res) => {
    const { clientId } = req.params;
    if (isNaN(parseInt(clientId))) return res.status(400).json({ erro: "ID do cliente inválido." });
    try {
        const { data, error } = await req.supabase
          .from('orcamentos').select('data').eq('client_id', clientId).maybeSingle();
        if (error) throw error;
        if (data) res.json(data.data || {});
        else res.status(404).json({ message: 'Orçamento não encontrado ou acesso negado.' });
    } catch (error) {
        console.error(`Erro GET /api/orcamentos/${clientId}:`, error);
        res.status(error.status || 500).json({ erro: error.message || "Erro interno." });
    }
});

app.put('/api/orcamentos/:clientId', async (req, res) => {
    const { clientId } = req.params;
    if (isNaN(parseInt(clientId))) return res.status(400).json({ erro: "ID do cliente inválido." });
    const orcamentoData = req.body;
    if (!orcamentoData || typeof orcamentoData !== 'object') return res.status(400).json({ erro: "Dados do orçamento inválidos." });
    try {
        const { data: perfilData, error: perfilError } = await req.supabase.from('perfis').select('loja_id').single();
        if (perfilError || !perfilData) throw new Error("Não foi possível identificar a loja do usuário.");
        const lojaId = perfilData.loja_id;
        const { data, error } = await req.supabase
          .from('orcamentos')
          .upsert({ client_id: clientId, loja_id: lojaId, data: orcamentoData }, { onConflict: 'client_id, loja_id' })
          .select('data, updated_at').single();
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        console.error(`Erro PUT /api/orcamentos/${clientId}:`, error);
        res.status(error.status || 500).json({ erro: error.message || "Erro interno." });
    }
});

app.listen(PORTA, '0.0.0.0', () => {
    console.log(`--- Backend rodando na porta ${PORTA} ---`);
    console.log(`Conectado à API Supabase em: ${supabaseUrl.substring(0, 30)}...`);
});