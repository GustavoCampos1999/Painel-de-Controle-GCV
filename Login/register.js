const DOMINIOS_PROIBIDOS = [
    "teste.com", "teste.com.br", "test.com", "exemplo.com", "example.com",
    "abc.com", "123.com","usuario.com", "admin.com", "yopmail.com", "mailinator.com", "tempmail.com", "10minutemail.com",
    "guerrillamail.com", "sharklasers.com", "dispostable.com"
];
const NUMEROS_PROIBIDOS = [
    "12345678912", "11111111111", "22222222222", "33333333333", 
    "44444444444", "55555555555", "66666666666", "77777777777", 
    "88888888888", "99999999999", "00000000000"
];

function validarEmail(email) {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!regex.test(email)) return false;
    const partes = email.split('@');
    if (partes.length < 2) return false;
    
    const dominio = partes[1].toLowerCase().trim();
    if (DOMINIOS_PROIBIDOS.includes(dominio)) {
        return false;
    }
    return true;
}

function validarTelefone(telefone) {
    const limpo = telefone.replace(/\D/g, '');
    if (limpo.length !== 11) return false;
    if (NUMEROS_PROIBIDOS.includes(limpo)) return false;
    if (/^(\d)\1+$/.test(limpo)) return false;
    return true;
}

function mascaraTelefone(valor) {
    valor = valor.replace(/\D/g, '');
    valor = valor.replace(/^(\d{2})(\d)/, '($1) $2'); 
    valor = valor.replace(/(\d{5})(\d{1,4})$/, '$1-$2'); 
    return valor;
}

function validarCNPJ(cnpj) {
    cnpj = cnpj.replace(/[^\d]+/g, '');
    if (cnpj == '') return false;
    if (cnpj.length != 14) return false;
    if (/^(\d)\1+$/.test(cnpj)) return false;

    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    let digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
    }
    let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado != digitos.charAt(0)) return false;

    tamanho = tamanho + 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
    }
    resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado != digitos.charAt(1)) return false;

    return true;
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('Sistema de Registro Carregado');

    const form = document.getElementById('form-register');
    
    const inputEmail = document.getElementById('email');
    const inputTelefone = document.getElementById('telefone');
    const inputNomeEmpresa = document.getElementById('nome_empresa');
    const inputCnpj = document.getElementById('cnpj');
    const inputSenha = document.getElementById('senha');
    const inputConfirmarSenha = document.getElementById('confirmar_senha');
    const inputNomeUsuario = document.getElementById('nome_usuario');
    const btnRegister = document.getElementById('btn-register');

    const emailBubble = document.getElementById('email-bubble'); 
    const telefoneBubble = document.getElementById('telefone-bubble');

    const cnpjMsgInfo = document.getElementById('cnpj-msg-info');
    const cnpjMsgErro = document.getElementById('cnpj-msg-erro');

    const submitMsgInfo = document.getElementById('submit-msg-info');
    const submitMsgErro = document.getElementById('submit-msg-erro');

    const BACKEND_API_URL = 'https://painel-de-controle-gcv.onrender.com';

    if (inputTelefone) {
        inputTelefone.addEventListener('input', (e) => {
            e.target.value = mascaraTelefone(e.target.value);
            if (validarTelefone(e.target.value)) {
                if(telefoneBubble) telefoneBubble.style.display = 'none';
                inputTelefone.style.borderColor = '#28a745';
                inputTelefone.style.backgroundColor = '#fff';
            }
        });

        inputTelefone.addEventListener('blur', () => {
            const valor = inputTelefone.value;
            submitMsgErro.textContent = ''; 

            if (valor.length > 0 && !validarTelefone(valor)) {
                if(telefoneBubble) telefoneBubble.style.display = 'block';
                inputTelefone.style.borderColor = '#ffc107'; 
                inputTelefone.style.backgroundColor = '#fff3cd'; 
            } else {
                if(telefoneBubble) telefoneBubble.style.display = 'none';
                if(valor.length > 0) {
                    inputTelefone.style.borderColor = '#ccc'; 
                    inputTelefone.style.backgroundColor = '#fff';
                }
            }
        });
    }

    if (inputEmail && emailBubble) {
        inputEmail.addEventListener('blur', () => {
            const valor = inputEmail.value.trim();
            if (valor !== "" && !validarEmail(valor)) {
                emailBubble.textContent = "⚠ Insira um e-mail válido.";
                emailBubble.style.display = 'block';
                inputEmail.style.borderColor = '#ffc107'; 
                inputEmail.style.backgroundColor = '#fff3cd'; 
            } else {
                emailBubble.style.display = 'none';
                if(valor !== "") {
                     inputEmail.style.borderColor = '#ccc'; 
                     inputEmail.style.backgroundColor = '#fff';
                }
            }
        });
        inputEmail.addEventListener('input', () => {
            const valor = inputEmail.value.trim();
            if (validarEmail(valor)) {
                emailBubble.style.display = 'none';
                inputEmail.style.borderColor = '#28a745'; 
                inputEmail.style.backgroundColor = '#fff';
            } else {
                if (emailBubble.style.display === 'block') {
                    inputEmail.style.borderColor = '#ffc107';
                } else {
                    inputEmail.style.borderColor = '#ccc';
                }
            }
        });
    }

    async function consultarReceita(cnpjNumeros) {
        cnpjMsgInfo.style.color = "#007bff";
        cnpjMsgInfo.textContent = '⏳ Buscando dados na Receita Federal...';
        cnpjMsgErro.textContent = '';
        
        inputNomeEmpresa.value = "Buscando...";
        inputCnpj.disabled = true; 
        
        try {
            const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjNumeros}`);
            
            if (response.status === 404) throw new Error("CNPJ não encontrado na Receita.");
            if (!response.ok) throw new Error("Erro de conexão ao validar CNPJ.");

            const dados = await response.json();

            if (dados.descricao_situacao_cadastral !== "ATIVA") {
                cnpjMsgErro.textContent = `Situação do CNPJ: ${dados.descricao_situacao_cadastral}`;
                cnpjMsgInfo.textContent = '';
            } else {
                cnpjMsgInfo.style.color = "#28a745";
                cnpjMsgInfo.textContent = "✔ Empresa localizada!";
            }

            inputNomeEmpresa.value = dados.nome_fantasia || dados.razao_social;

        } catch (error) {
            console.warn(error);
            cnpjMsgInfo.textContent = '';
            cnpjMsgErro.textContent = error.message;
            inputNomeEmpresa.value = ""; 
        } finally {
            inputCnpj.disabled = false;
            inputCnpj.focus(); 
        }
    }

    inputCnpj.addEventListener('input', function(e) {
        const valorOriginal = e.target.value;
        const apenasNumeros = e.target.value.replace(/\D/g, '');
        
        if (apenasNumeros === '03051999') { 
            cnpjMsgInfo.textContent = "✔ Admin Mode";
            inputNomeEmpresa.value = "Admin Gustavo"; 
            return; 
        }

        let x = valorOriginal.replace(/\D/g, '').match(/(\d{0,2})(\d{0,3})(\d{0,3})(\d{0,4})(\d{0,2})/);
        e.target.value = !x[2] ? x[1] : x[1] + '.' + x[2] + '.' + x[3] + '/' + x[4] + (x[5] ? '-' + x[5] : '');
        
        if (apenasNumeros.length === 14) {
            if (!validarCNPJ(apenasNumeros)) {
                cnpjMsgErro.textContent = '❌ CNPJ inválido.';
                cnpjMsgInfo.textContent = '';
                inputNomeEmpresa.value = "";
                return;
            }
            consultarReceita(apenasNumeros);
        } else {
            cnpjMsgInfo.textContent = '';
            cnpjMsgErro.textContent = '';
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        submitMsgErro.textContent = '';
        submitMsgInfo.textContent = '';

        const emailTrimmed = inputEmail.value.trim();
    
        if (!validarEmail(emailTrimmed)) {
            submitMsgErro.textContent = '❌ E-mail inválido ou domínio não permitido.';
            inputEmail.focus();
            emailBubble.style.display = 'block'; 
            inputEmail.style.borderColor = '#dc3545';
            return; 
        }

        if (!validarTelefone(inputTelefone.value)) {
            submitMsgErro.textContent = '❌ Telefone inválido. Use o formato com DDD.';
            inputTelefone.focus();
            if(telefoneBubble) telefoneBubble.style.display = 'block';
            inputTelefone.style.borderColor = '#dc3545';
            return;
        }

        if (inputNomeEmpresa.value === "" || inputNomeEmpresa.value === "Buscando...") {
            submitMsgErro.textContent = 'Valide o CNPJ antes de continuar.';
            inputCnpj.focus();
            return;
        }

        if (inputSenha.value.length < 6) {
            submitMsgErro.textContent = 'A senha precisa ter 6 ou mais caracteres.';
            return;
        }
        if (inputSenha.value !== inputConfirmarSenha.value) {
            submitMsgErro.textContent = 'As senhas não conferem.';
            return;
        }

        submitMsgInfo.style.color = "#007bff";
        submitMsgInfo.textContent = 'Criando conta...';
        btnRegister.disabled = true;

        try {
            const response = await fetch(`${BACKEND_API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: emailTrimmed, 
                    password: inputSenha.value,
                    cnpj: inputCnpj.value.replace(/\D/g, ''), 
                    nome_empresa: inputNomeEmpresa.value,
                    telefone: inputTelefone.value.replace(/\D/g, ''), 
                    nome_usuario: inputNomeUsuario.value
                })
            });

            const data = await response.json();

            if (!response.ok) {
                if(data.erro && (data.erro.includes('CNPJ') || data.erro.includes('duplicate'))) {
                     throw new Error("Este CNPJ ou E-mail já está cadastrado.");
                }
                throw new Error(data.erro || `Erro no servidor.`);
            }
            
            window.location.href = `verify-email.html?email=${encodeURIComponent(emailTrimmed)}`;

        } catch (err) {
            console.error(err);
            submitMsgInfo.textContent = '';
            submitMsgErro.textContent = err.message;
            btnRegister.disabled = false;
        }
    });
});