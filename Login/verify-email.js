import { _supabase } from './supabaseClient.js';

const btnResend = document.getElementById('btn-resend');
const resendMsg = document.getElementById('resend-msg');

const params = new URLSearchParams(window.location.search);
const email = params.get('email');

btnResend.addEventListener('click', async () => {
    if (!email) {
        resendMsg.style.color = 'red';
        resendMsg.textContent = 'E-mail não identificado. Tente fazer login novamente.';
        resendMsg.style.display = 'block';
        return;
    }

    btnResend.disabled = true;
    btnResend.textContent = 'Enviando...';
    resendMsg.style.display = 'none';

    try {
        const { error } = await _supabase.auth.resend({
            type: 'signup',
            email: email
        });

        if (error) {
            throw error;
        }

        resendMsg.style.color = '#28a745';
        resendMsg.innerHTML = '✔ E-mail reenviado! Aguarde alguns minutos.';
        resendMsg.style.display = 'block';

        let countdown = 30;
        const interval = setInterval(() => {
            btnResend.textContent = `Aguarde ${countdown}s`;
            countdown--;
            if (countdown < 0) {
                clearInterval(interval);
                btnResend.disabled = false;
                btnResend.textContent = 'Reenviar E-mail';
            }
        }, 1000);

    } catch (err) {
        console.error(err);
        resendMsg.style.color = '#dc3545';
        
        if (err.message.includes('Too many requests') || err.status === 429) {
            resendMsg.textContent = 'Muitas tentativas. Aguarde um pouco.';
        } else {
            resendMsg.textContent = 'Erro ao reenviar. Verifique se o e-mail está correto.';
        }
        resendMsg.style.display = 'block';
        btnResend.disabled = false;
        btnResend.textContent = 'Reenviar E-mail';
    }
});