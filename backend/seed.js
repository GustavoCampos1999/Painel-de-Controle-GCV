const db = require('./database.js');

const DADOS_TECIDOS = [
    { produto: "SEM TECIDO", largura: 0.00, atacado: 0.00 },
    { produto: "LINHO FRANCIS", largura: 3.00, atacado: 14.90 },
    { produto: "LINHO SERENA", largura: 3.00, atacado: 24.90 },
    { produto: "SÊDA ÁRABEIA", largura: 3.00, atacado: 10.90 },
    { produto: "MICROFIBRA 65G", largura: 3.00, atacado: 5.90 },
    { produto: "MICROFIBRA 90G", largura: 3.00, atacado: 8.90 },
    { produto: "BLACKOUT GIDEON", largura: 2.80, atacado: 22.90 },
    { produto: "LINHO ALEMÃO", largura: 2.90, atacado: 89.90 },
    { produto: "LINHO PORTUGUÊS", largura: 2.90, atacado: 89.90 },
    { produto: "LINHO POLONÊS", largura: 2.90, atacado: 69.90 },
    { produto: "LINHO HÚNGARO", largura: 2.90, atacado: 89.90 },
    { produto: "LINHO FINLANDÊS", largura: 3.00, atacado: 39.90 },
    { produto: "LINHO INDIANO", largura: 2.80, atacado: 29.90 },
    { produto: "LINHO LÍBIO", largura: 3.00, atacado: 9.90 },
    { produto: "LINHO LIBANÊS", largura: 3.00, atacado: 28.90 },
    { produto: "LINHO LITUÂNIO", largura: 3.00, atacado: 28.90 },
    { produto: "LINHO LUXEMBURGUÊS", largura: 3.00, atacado: 29.90 },
    { produto: "LINHO NORUEGUÊS", largura: 3.00, atacado: 49.90 },
    { produto: "LINHO AUSTRÍACO", largura: 3.00, atacado: 27.90 },
    { produto: "LINHO BRASILEIRO", largura: 2.95, atacado: 29.90 },
    { produto: "LINHO JAMAICANO", largura: 2.80, atacado: 29.90 },
    { produto: "LINHO BELGA", largura: 3.00, atacado: 77.90 },
    { produto: "LINHO BÚLGARO", largura: 3.00, atacado: 88.90 },
    { produto: "CHAMOIS CANADENSE", largura: 3.00, atacado: 18.90 },
    { produto: "LINHO URUGUAIO", largura: 2.80, atacado: 29.90 },
    { produto: "LINHO FRANCÊS", largura: 2.90, atacado: 89.90 },
    { produto: "LINHO ITALIANO", largura: 2.90, atacado: 49.90 },
    { produto: "LINHO ARMÊNIO", largura: 2.95, atacado: 59.90 },
    { produto: "LINHO AUSTRALIANO", largura: 3.00, atacado: 69.90 },
    { produto: "LINHO PANAMENSE", largura: 2.95, atacado: 55.90 },
    { produto: "LINHO CROATA", largura: 2.80, atacado: 69.90 },
    { produto: "LINHO DUPLA FACE DINAMARQUÊS", largura: 2.95, atacado: 115.90 },
    { produto: "LINHO ETÍOPE", largura: 3.00, atacado: 27.90 },
    { produto: "LINHO HAITIANO", largura: 2.80, atacado: 59.90 },
    { produto: "LINHO NICARAGUENSE", largura: 3.00, atacado: 69.90 },
    { produto: "LINHO HONDURENHO", largura: 3.00, atacado: 69.90 },
    { produto: "LINHO VENEZUELANO", largura: 3.00, atacado: 89.90 },
    { produto: "LINHO QUENIANO", largura: 3.00, atacado: 75.90 },
    { produto: "LINHO SHANTUNG EGÍPCIO", largura: 3.00, atacado: 99.80 },
    { produto: "LINHO SHANTUNG TURCO", largura: 3.00, atacado: 99.80 },
    { produto: "LINHO SHANTUNG SÍRIO", largura: 2.80, atacado: 68.50 },
    { produto: "LINHO SHANTUNG ROMÊNIO", largura: 2.95, atacado: 85.10 },
    { produto: "LINHO SHANTUNG PERUANO", largura: 2.80, atacado: 34.90 },
    { produto: "LINHO SHANTUNG PAQUISTANÊS", largura: 2.90, atacado: 109.70 },
    { produto: "LINHO SHANTUNG SUÍÇO", largura: 2.80, atacado: 34.90 },
    { produto: "LINHO SHANTUNG ESLOVÊNIO", largura: 2.80, atacado: 35.90 },
    { produto: "LINHO GREGO", largura: 2.90, atacado: 64.80 },
    { produto: "LINHO IRLANDÊS PROMOCIONAL", largura: 3.00, atacado: 17.90 },
    { produto: "LINHO IRLANDÊS", largura: 3.00, atacado: 29.90 },
    { produto: "LINHO IRLANDÊS 3.30 PROMOCIONAL", largura: 3.30, atacado: 18.90 },
    { produto: "LINHO ISRAELENSE", largura: 3.00, atacado: 18.90 },
    { produto: "LINHO ISRAELENSE PROMOCIONAL", largura: 3.00, atacado: 15.90 },
    { produto: "LINHO ISRAELENSE 3.27", largura: 3.27, atacado: 19.90 },
    { produto: "LINHO ISRAELENSE 3.27 PROMOCIONAL", largura: 3.27, atacado: 17.90 },
    { produto: "LINHO ISRAELENSE LINEN", largura: 3.00, atacado: 29.90 },
    { produto: "LINHO ISRAELENSE LINEN PROMOCIONAL", largura: 3.00, atacado: 25.90 },
    { produto: "LINHO ISRAELENSE LINEN 3.27", largura: 3.27, atacado: 34.90 },
    { produto: "LINHO ISRAELENSE LINEN 3.27 PROMOCIONAL", largura: 3.27, atacado: 29.90 },
    { produto: "LINHO IRANIANO PROMOCIONAL", largura: 3.00, atacado: 10.90 },
    { produto: "LINHO IRANIANO", largura: 3.00, atacado: 29.90 },
    { produto: "LINHO ISLANDÊS", largura: 2.90, atacado: 29.90 },
    { produto: "LINHO SÉRVIO", largura: 2.90, atacado: 63.90 },
    { produto: "LINHO CHILENO", largura: 3.00, atacado: 109.90 },
    { produto: "LINHO TAILANDÊS", largura: 3.00, atacado: 34.90 },
    { produto: "LINHO FILIPINO", largura: 3.00, atacado: 27.90 },
    { produto: "LINHO MALAIO", largura: 3.00, atacado: 34.90 },
    { produto: "LINHO NIGERIANO", largura: 2.90, atacado: 64.80 },
    { produto: "GAZE DE LINHO INGLÊS", largura: 3.00, atacado: 19.90 },
    { produto: "GAZE DE LINHO RUSSO", largura: 3.00, atacado: 12.90 },
    { produto: "LINHO JAPONÊS", largura: 3.00, atacado: 34.90 },
    { produto: "LINHO ARGENTINO", largura: 2.90, atacado: 29.90 },
    { produto: "LINHO COLOMBIANO", largura: 3.00, atacado: 39.90 },
    { produto: "LINHO MEXICANO", largura: 3.00, atacado: 33.90 },
    { produto: "LINHO MEXICANO PROMOCIONAL", largura: 3.00, atacado: 23.90 },
    { produto: "LINHO ESPANHOL", largura: 2.95, atacado: 79.90 },
    { produto: "LINHO PURO UCRANIANO", largura: 3.00, atacado: 274.90 },
    { produto: "LINHO PURO SUECO", largura: 3.00, atacado: 169.90 },
    { produto: "LINHO PURO ÁRABE", largura: 3.00, atacado: 169.90 },
    { produto: "LINHO CAMARONÊS", largura: 3.00, atacado: 85.90 },
    { produto: "LINHO SUL COREANO", largura: 3.00, atacado: 25.90 },
    { produto: "LINHO NORTE COREANO", largura: 3.00, atacado: 24.90 },
    { produto: "LINHO SUL AFRICANO", largura: 3.00, atacado: 64.90 },
    { produto: "LINHO NORTE AMERICANO", largura: 2.90, atacado: 29.90 },
    { produto: "LINHO ESCOCÊS", largura: 3.00, atacado: 19.90 },
    { produto: "LINHO TUNISIANO", largura: 2.95, atacado: 88.00 },
    { produto: "LINHO SÍRIO", largura: 3.00, atacado: 49.90 },
    { produto: "LINHO JORDANIANO", largura: 3.00, atacado: 49.90 },
    { produto: "LINHO EQUATORIANO", largura: 3.00, atacado: 92.90 },
    { produto: "LINHO ANGOLANO", largura: 3.00, atacado: 49.90 },
    { produto: "LINHO BOLIVIANO", largura: 3.00, atacado: 45.90 },
    { produto: "LINHO SENEGALÊS", largura: 3.00, atacado: 109.90 },
    { produto: "LINHO MOÇAMBICANO", largura: 2.95, atacado: 109.90 },
    { produto: "LINHO MADAGASCARENSE", largura: 2.80, atacado: 63.90 },
    { produto: "LINHO CATARINENSE", largura: 2.90, atacado: 64.70 },
    { produto: "LINHO KUWAITIANO", largura: 2.90, atacado: 64.70 },
    { produto: "LINHO ESLOVACO", largura: 3.00, atacado: 89.90 },
    { produto: "LINHO BIELORUSSO", largura: 3.00, atacado: 109.90 },
    { produto: "LINHO LIBERIANO", largura: 2.90, atacado: 69.90 },
    { produto: "LINHO MALIENSE", largura: 2.90, atacado: 45.90 },
    { produto: "LINHO MALDIVIO", largura: 2.90, atacado: 29.90 },
    { produto: "LINHO BELIZENHO", largura: 2.80, atacado: 89.90 },
    { produto: "LINHO GANÊS", largura: 2.90, atacado: 38.90 },
    { produto: "LINHO ALBANÊS", largura: 3.00, atacado: 37.90 },
    { produto: "LINHO ZAMBIANO", largura: 3.00, atacado: 69.90 },
    { produto: "MICROFIBRA PREMIUM", largura: 2.80, atacado: 15.90 },
    { produto: "MICROFIBRA PESADA", largura: 2.80, atacado: 10.50 },
    { produto: "MICROFIBRA LEVE", largura: 2.80, atacado: 9.90 },
    { produto: "MICROFIBRA EXTRA", largura: 3.00, atacado: 10.90 },
    { produto: "MICROFIBRA SUAVE", largura: 3.00, atacado: 9.90 },
    { produto: "MICROFIBRA PROMOCIONAL", largura: 3.00, atacado: 2.90 },
    { produto: "MICROFIBRA CLÁSSICA", largura: 3.00, atacado: 13.90 },
    { produto: "FORRO TRAMAXUS", largura: 2.90, atacado: 17.90 },
    { produto: "FORRO MALHA PESADO", largura: 3.00, atacado: 18.90 },
    { produto: "FORRO MALHA SUPER", largura: 3.00, atacado: 21.90 },
    { produto: "TERGAL VERÃO EXCLUSIVA", largura: 3.00, atacado: 25.90 },
    { produto: "GABARDINE CLÁSSICO", largura: 3.00, atacado: 26.90 },
    { produto: "GABARDINE NOBRE", largura: 3.00, atacado: 39.90 },
    { produto: "MICROFIBRA ELITE", largura: 2.80, atacado: 16.90 },
    { produto: "MACROMALHA CLÁSSICA", largura: 2.85, atacado: 33.90 },
    { produto: "CETIM VISON", largura: 3.00, atacado: 19.90 },
    { produto: "OXFORD", largura: 3.00, atacado: 14.90 },
    { produto: "SEMI BLACKOUT EXTRA", largura: 2.80, atacado: 22.90 },
    { produto: "SEMI BLACKOUT PREMIUM", largura: 3.00, atacado: 24.90 },
    { produto: "MAXI BLACKOUT ELITE", largura: 2.80, atacado: 99.90 },
    { produto: "BLACKOUT PREMIUM", largura: 2.80, atacado: 49.90 },
    { produto: "BLACKOUT NOBRE", largura: 2.80, atacado: 69.90 },
    { produto: "BLACKOUT AUSTRALIANO", largura: 2.80, atacado: 99.90 },
    { produto: "MAXI BLACKOUT DUPLA FACE LYON", largura: 2.80, atacado: 99.90 },
    { produto: "MAXI BLACKOUT DUPLA FACE LILLE", largura: 2.80, atacado: 99.90 },
    { produto: "MAXI BLACKOUT LINHO BOGOTÁ", largura: 2.80, atacado: 74.90 },
    { produto: "MAXI BLACKOUT ATLANTA", largura: 2.80, atacado: 69.90 },
    { produto: "MAXI BLACKOUT ZURICH", largura: 2.80, atacado: 48.00 },
    { produto: "MAXI BLACKOUT LINHO MADRI", largura: 2.80, atacado: 99.80 },
    { produto: "MAXI BLACKOUT PARIS", largura: 2.80, atacado: 74.90 },
    { produto: "MAXI BLACKOUT VENEZA", largura: 2.80, atacado: 99.90 },
    { produto: "MAXI BLACKOUT DUBLIN", largura: 2.80, atacado: 74.90 },
    { produto: "MAXI BLACKOUT CLÁSSICO", largura: 2.80, atacado: 34.90 },
    { produto: "BLACKOUT PROMOCIONAL", largura: 2.80, atacado: 25.90 },
    { produto: "BLACKOUT EXTRA", largura: 2.80, atacado: 39.90 },
    { produto: "BLACKOUT GORGURINHO TRADICIONAL", largura: 2.80, atacado: 75.00 },
    { produto: "BLACKOUT GORGURINHO NÁPOLES", largura: 2.80, atacado: 75.00 },
    { produto: "BLACKOUT GORGURINHO PORTO", largura: 2.80, atacado: 75.00 },
    { produto: "BLACKOUT LINHO ATENAS", largura: 2.80, atacado: 98.00 },
    { produto: "BLACKOUT ROMA", largura: 2.80, atacado: 99.90 },
    { produto: "BLACKOUT LINHO MOSCOU", largura: 2.80, atacado: 99.80 },
    { produto: "BLACKOUT LINHO ISTAMBUL", largura: 2.80, atacado: 69.90 },
    { produto: "BLACKOUT LINHO BOGOTÁ", largura: 2.80, atacado: 79.80 },
    { produto: "SEMI BLACKOUT LISBOA", largura: 2.80, atacado: 49.90 },
    { produto: "SEMI BLACKOUT SANTIAGO", largura: 2.80, atacado: 49.90 },
    { produto: "SEMI BLACKOUT VANCOUVER", largura: 2.80, atacado: 39.90 },
    { produto: "SEMI BLACKOUT CAIRO", largura: 2.80, atacado: 49.80 },
    { produto: "SEMI BLACKOUT MESSINA", largura: 2.80, atacado: 47.80 },
    { produto: "SEMI BLACKOUT DUBAI", largura: 2.80, atacado: 53.90 },
    { produto: "SEMI BLACKOUT ESTOCOLMO", largura: 2.80, atacado: 59.90 },
    { produto: "SEMI BLACKOUT FLORENÇA", largura: 2.80, atacado: 45.90 },
    { produto: "SEMI BLACKOUT TREVISO", largura: 2.80, atacado: 45.80 },
    { produto: "SEMI BLACKOUT AMSTERDÃ", largura: 2.80, atacado: 35.80 },
    { produto: "BLACKOUT DUPLO", largura: 1.40, atacado: 18.90 },
    { produto: "BLACKOUT FUNDO CINZA", largura: 1.40, atacado: 12.90 },
    { produto: "LINHO INOVAÇÃO", largura: 3.30, atacado: 58.90 },
    { produto: "LINHO FINESSE", largura: 3.30, atacado: 59.90 },
    { produto: "LINHO SUTIL", largura: 3.30, atacado: 59.90 },
    { produto: "LINHO SOBERANO", largura: 3.30, atacado: 53.90 },
    { produto: "LINHO MAGNÍFICO", largura: 3.30, atacado: 69.90 },
    { produto: "GAZE FRISADO", largura: 3.00, atacado: 35.90 },
    { produto: "GAZE SUTIL", largura: 2.90, atacado: 28.90 },
    { produto: "VOIL REFINADO", largura: 3.00, atacado: 18.90 },
    { produto: "VOIL SUÍÇO", largura: 3.00, atacado: 16.90 },
    { produto: "VOIL SUÍÇO PREMIUM", largura: 3.00, atacado: 23.90 },
    { produto: "VOIL SUÍÇO TELA", largura: 3.00, atacado: 23.90 },
    { produto: "VOIL SUÍÇO CLÁSSICO", largura: 3.00, atacado: 18.90 },
    { produto: "VOIL NEBLINA", largura: 3.00, atacado: 29.90 },
    { produto: "GAZE REFINADO", largura: 3.00, atacado: 30.90 },
    { produto: "LINHO GLAMOUR", largura: 3.00, atacado: 39.90 },
    { produto: "GAZE FLOCOS", largura: 2.80, atacado: 24.90 },
    { produto: "GAZE DE LINHO RUSSO", largura: 3.00, atacado: 12.90 },
    { produto: "VOIL TRIPLE", largura: 3.00, atacado: 32.90 },
    { produto: "VOIL CRISTAL PREMIUM", largura: 3.00, atacado: 19.90 },
    { produto: "CHIFFON ELEGANCE", largura: 3.00, atacado: 19.90 },
    { produto: "CHIFFON ELEGANCE PROMOCIONAL", largura: 3.00, atacado: 12.90 },
    { produto: "VOIL LISO", largura: 3.00, atacado: 9.99 },
    { produto: "VOIL LISO PROMOCIONAL", largura: 3.00, atacado: 7.99 },
    { produto: "VOIL XADREZ", largura: 3.00, atacado: 9.90 },
    { produto: "OXFORD", largura: 3.00, atacado: 14.90 },
    { produto: "MICROFIBRA ELITE", largura: 2.80, atacado: 16.90 },
    { produto: "CETIM VISON", largura: 3.00, atacado: 19.90 },
    { produto: "VOIL RAMI", largura: 3.00, atacado: 29.90 },
    { produto: "SHANTUNG BOTONÊ", largura: 3.00, atacado: 39.90 },
    { produto: "LINHO REQUINTE", largura: 3.30, atacado: 53.90 },
    { produto: "LINHO ELEGÂNCIA", largura: 3.30, atacado: 57.90 },
    { produto: "LINHO NOBRE", largura: 3.20, atacado: 137.00 },
    { produto: "GAZE IMPERIAL", largura: 3.00, atacado: 24.90 },
    { produto: "LINHO SUCCESS", largura: 2.80, atacado: 69.90 },
    { produto: "LINHO NEVADA PREMIUM", largura: 2.80, atacado: 49.90 },
    { produto: "LINHO NEVADA", largura: 3.00, atacado: 23.90 },
    { produto: "LINHÃO RAFIA", largura: 3.00, atacado: 19.90 },
    { produto: "LINHÃO RAFIA PREMIUM", largura: 3.00, atacado: 55.90 },
    { produto: "SHANTUNG ESCANDINAVO", largura: 2.90, atacado: 59.90 },
    { produto: "SHANTUNG CLÁSSICO", largura: 2.90, atacado: 57.90 },
    { produto: "SHANTUNG GORGURINHO", largura: 2.80, atacado: 33.90 },
    { produto: "GORGURINHO ELITE", largura: 2.95, atacado: 25.90 },
    { produto: "GORGURINHO TRADICIONAL", largura: 2.90, atacado: 24.90 },
    { produto: "PIQUET EXTRA", largura: 2.50, atacado: 34.00 },
    { produto: "RÚSTICO PESADO", largura: 2.90, atacado: 19.90 },
    { produto: "RÚSTICO PESADO MESCLA", largura: 2.90, atacado: 23.90 },
    { produto: "RÚSTICO PESADO PILLAR", largura: 2.90, atacado: 23.90 }
];

const DADOS_CONFECCAO = {
    "-": 0, 
    "CORTINA": 50, 
    "CORTINA/FORRO": 80, 
    "CORTINA/FORRO/BK": 105, 
    "CORTINA/BK": 75, 
    "BK": 25,
    ">3,50 CORTINA": 75, 
    ">3,50 CORTINA/FORRO": 120, 
    ">3,50 CORTINA/FORRO/BK": 150
};

const DADOS_TRILHO = {
    "-": 0, 
    "MAX 1 VIA": 20, 
    "MAX 2 VIAS": 40, 
    "BASTÃO BASIC 1 VIA": 50, 
    "BASTÃO BASIC 2 VIAS": 70,
    "BASTÃO PREMIUM 1 VIA": 90, 
    "BASTÃO PREMIUM 2 VIAS": 140
};

async function popularBanco() {
  const client = await db.pool.connect();
  console.log('Iniciando script de população (seed)...');

  try {
    await client.query('BEGIN'); 

    console.log('Criando tabelas...');
    
    await client.query(`CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        nome TEXT,
        telefone TEXT,
        email TEXT,
        endereco TEXT
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS tecidos (
        id SERIAL PRIMARY KEY,
        produto TEXT UNIQUE NOT NULL,
        largura REAL,
        atacado REAL
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS confeccao (
        id SERIAL PRIMARY KEY,
        opcao TEXT UNIQUE NOT NULL,
        valor REAL
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS trilho (
        id SERIAL PRIMARY KEY,
        opcao TEXT UNIQUE NOT NULL,
        valor REAL
    )`);
    
await client.query(`CREATE TABLE IF NOT EXISTS orcamentos (
        client_id INTEGER PRIMARY KEY,
        data JSONB,
        updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    console.log('Tabelas criadas (ou já existiam).');
    console.log('Tabelas criadas (ou já existiam).');

    console.log('Populando tecidos...');
    for (const tecido of DADOS_TECIDOS) {
      await client.query(
        'INSERT INTO tecidos (produto, largura, atacado) VALUES ($1, $2, $3) ON CONFLICT (produto) DO NOTHING',
        [tecido.produto, tecido.largura, tecido.atacado]
      );
    }

    console.log('Populando confecção...');
    for (const [opcao, valor] of Object.entries(DADOS_CONFECCAO)) {
      await client.query(
        'INSERT INTO confeccao (opcao, valor) VALUES ($1, $2) ON CONFLICT (opcao) DO NOTHING',
        [opcao, valor]
      );
    }

    console.log('Populando trilho...');
    for (const [opcao, valor] of Object.entries(DADOS_TRILHO)) {
      await client.query(
        'INSERT INTO trilho (opcao, valor) VALUES ($1, $2) ON CONFLICT (opcao) DO NOTHING',
        [opcao, valor]
      );
    }

    await client.query('COMMIT'); 
    console.log('\n--- SCRIPT FINALIZADO COM SUCESSO ---');
    console.log('Banco de dados Supabase pronto para uso.');

  } catch (e) {
    await client.query('ROLLBACK'); 
    console.error('Erro ao popular o banco de dados. Nenhuma alteração foi feita.', e);
  } finally {
    client.release();
  }
}

popularBanco();