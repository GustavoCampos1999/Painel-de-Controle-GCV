document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-register');
    const inputNomeEmpresa = document.getElementById('nome_empresa');
    const inputCnpj = document.getElementById('cnpj');
    const inputTelefone = document.getElementById('telefone');
    const inputEmail = document.getElementById('email');
    const inputSenha = document.getElementById('senha');
    const inputConfirmarSenha = document.getElementById('confirmar_senha');
    const inputNomeUsuario = document.getElementById('nome_usuario');
    const msgErro = document.getElementById('mensagem-erro');
    const msgInfo = document.getElementById('mensagem-info');
    const btnRegister = document.getElementById('btn-register');

    const BACKEND_API_URL = 'https://painel-de-controle-gcv.onrender.com';

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        msgErro.textContent = '';
        msgInfo.textContent = '';

        if (inputSenha.value.length < 6) {
            msgErro.textContent = 'A senha deve ter no mínimo 6 caracteres.';
            return;
        }
        if (inputSenha.value !== inputConfirmarSenha.value) {
            msgErro.textContent = 'As senhas não coincidem.';
            return;
        }

        const cnpjLimpo = inputCnpj.value.replace(/\D/g, '');
        if (cnpjLimpo.length !== 14) {
            msgErro.textContent = 'CNPJ inválido. Digite os 14 números.';
            return;
        }

        msgInfo.textContent = 'Registrando sua loja, aguarde...';
        btnRegister.disabled = true;
        btnRegister.textContent = 'Processando...';

        try {
            const response = await fetch(`${BACKEND_API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: inputEmail.value,
                    password: inputSenha.value,
                    cnpj: cnpjLimpo,
                    nome_empresa: inputNomeEmpresa.value,
                    telefone: inputTelefone.value,
                    nome_usuario: inputNomeUsuario.value
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.erro || `Erro ${response.status} do servidor.`);
            }

            msgErro.textContent = '';
            msgInfo.style.color = "#28a745"; 
            msgInfo.textContent = data.mensagem + " Você será redirecionado para o login...";
            
            setTimeout(() => {
                window.location.href = 'login.html'; 
            }, 3000);

        } catch (err) {
            console.error('Erro ao registrar:', err);
            msgInfo.textContent = '';
            msgErro.textContent = err.message || 'Ocorreu um erro. Tente novamente.';
            btnRegister.disabled = false;
            btnRegister.textContent = 'Criar Conta e Iniciar Teste de 7 Dias';
        }
    });
});