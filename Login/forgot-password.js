import { _supabase } from '../supabaseClient.js';

const form = document.getElementById('form-forgot');
const inputEmail = document.getElementById('email');
const msgInfo = document.getElementById('mensagem-info');
const msgErro = document.getElementById('mensagem-erro');
const btnSubmit = document.getElementById('btn-submit');

const BACKEND_API_URL = 'https://painel-de-controle-gcv.onrender.com'; 
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    msgErro.style.display = 'none';
    msgInfo.style.display = 'none';
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Verificando...';

    const email = inputEmail.value.trim();

    try {
        const response = await fetch(`${BACKEND_API_URL}/api/check-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (!data.exists) {
            msgErro.style.display = 'block';
            msgErro.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; gap: 10px; padding: 10px; background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; border-radius: 5px;">
                    <span style="font-size: 20px;">✖</span>
                    <span>Este e-mail não foi encontrado no sistema.</span>
                </div>
            `;
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Enviar Link';
            return; 
        }

        btnSubmit.textContent = 'Enviando...';
        
        const currentUrl = window.location.href;
        const redirectUrl = currentUrl.replace('forgot-password.html', 'update-password.html');

        const { error } = await _supabase.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl,
        });

        if (error) throw error;

        msgInfo.style.display = 'block';
        msgInfo.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px; padding: 10px; background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; border-radius: 5px;">
                <span style="font-size: 20px;">✔</span>
                <span style="text-align: left;">E-mail confirmado!<br>O link de redefinição foi enviado.</span>
            </div>
        `;
        inputEmail.value = '';

    } catch (err) {
        console.error('Erro:', err);
        msgErro.style.display = 'block';
        msgErro.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px; padding: 10px; background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; border-radius: 5px;">
                <span style="font-size: 20px;">✖</span>
                <span>Erro de conexão. Tente novamente.</span>
            </div>
        `;
    } finally {
        if (btnSubmit.textContent !== 'Enviando...') {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Enviar Link';
        }
    }
});