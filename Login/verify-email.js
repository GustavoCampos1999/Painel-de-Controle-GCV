import { _supabase } from '../supabaseClient.js';

const btnResend = document.getElementById('btn-resend');
const resendMsg = document.getElementById('resend-msg');
const emailDisplay = document.getElementById('user-email-display');

const params = new URLSearchParams(window.location.search);
const email = params.get('email');

if (email) {
    emailDisplay.textContent = email;
} else {
    emailDisplay.textContent = "E-mail não identificado";
    resendMsg.style.color = '#dc3545';
    resendMsg.textContent = 'Erro: E-mail não encontrado na URL.';
    resendMsg.style.display = 'block';
    btnResend.disabled = true;
}

btnResend.addEventListener('click', async () => {
    btnResend.disabled = true; 
    btnResend.textContent = 'Enviando...';
    resendMsg.style.display = 'none';

    try {
        const { error } = await _supabase.auth.resend({
            type: 'signup',
            email: email
        });

        if (error) throw error;

        resendMsg.style.color = '#28a745';
        resendMsg.innerHTML = '✔ E-mail reenviado com sucesso!';
        resendMsg.style.display = 'block';

        let countdown = 30;
        btnResend.textContent = `Aguarde ${countdown}s`;

        const interval = setInterval(() => {
            countdown--;
            btnResend.textContent = `Aguarde ${countdown}s`;

            if (countdown <= 0) {
                clearInterval(interval);
                btnResend.disabled = false;
                btnResend.textContent = 'Reenviar E-mail';
            }
        }, 1000);

    } catch (err) {
        console.error(err);
        resendMsg.style.color = '#dc3545';

        if (err.message && (err.message.includes('Too many requests') || err.status === 429)) {
            resendMsg.textContent = 'Muitas tentativas. Aguarde 60 segundos.';
        } else {
            resendMsg.textContent = 'Erro ao reenviar. Verifique o console.';
        }
        
        resendMsg.style.display = 'block';
        setTimeout(() => {
            btnResend.disabled = false;
            btnResend.textContent = 'Reenviar E-mail';
        }, 3000);
    }
});