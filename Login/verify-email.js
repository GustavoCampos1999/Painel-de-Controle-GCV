import { _supabase } from '../supabaseClient.js';

const btnResend = document.getElementById('btn-resend');
const resendMsg = document.getElementById('resend-msg');
const emailDisplay = document.getElementById('user-email-display');

const btnOpenCorrection = document.getElementById('btn-open-correction');
const modalCorrection = document.getElementById('modal-correction');
const btnCancelCorrection = document.getElementById('btn-cancel-correction');
const btnSaveCorrection = document.getElementById('btn-save-correction');
const newEmailInput = document.getElementById('new-email-input');
const correctionMsg = document.getElementById('correction-msg');

const BACKEND_API_URL = 'https://painel-de-controle-gcv.onrender.com';

const params = new URLSearchParams(window.location.search);
let currentEmail = params.get('email');

if (currentEmail) {
    emailDisplay.textContent = currentEmail;
} else {
    emailDisplay.textContent = "E-mail não identificado";
    btnResend.disabled = true;
}

btnOpenCorrection.addEventListener('click', (e) => {
    e.preventDefault();
    modalCorrection.style.display = 'flex';
    newEmailInput.value = currentEmail || '';
    correctionMsg.textContent = '';
});

btnCancelCorrection.addEventListener('click', () => {
    modalCorrection.style.display = 'none';
});

btnSaveCorrection.addEventListener('click', async () => {
    const newEmail = newEmailInput.value.trim();
    if (!newEmail || !newEmail.includes('@')) {
        correctionMsg.textContent = 'Digite um e-mail válido.';
        correctionMsg.style.color = 'red';
        return;
    }

    btnSaveCorrection.disabled = true;
    btnSaveCorrection.textContent = 'Salvando...';

    try {
        const response = await fetch(`${BACKEND_API_URL}/api/correction-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                oldEmail: currentEmail,
                newEmail: newEmail
            })
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.erro || 'Erro ao atualizar');

        correctionMsg.textContent = 'E-mail atualizado! Reenviando confirmação...';
        correctionMsg.style.color = 'green';
        
        currentEmail = newEmail;
        emailDisplay.textContent = newEmail;
        
        await _supabase.auth.resend({ type: 'signup', email: newEmail });

        setTimeout(() => {
            modalCorrection.style.display = 'none';
            btnSaveCorrection.disabled = false;
            btnSaveCorrection.textContent = 'Salvar e Reenviar';
        }, 1500);

    } catch (error) {
        console.error(error);
        correctionMsg.textContent = error.message;
        correctionMsg.style.color = 'red';
        btnSaveCorrection.disabled = false;
        btnSaveCorrection.textContent = 'Salvar e Reenviar';
    }
});

btnResend.addEventListener('click', async () => {
    btnResend.disabled = true;
    btnResend.textContent = 'Enviando...';
    resendMsg.style.display = 'none';

    try {
        const { error } = await _supabase.auth.resend({
            type: 'signup',
            email: currentEmail
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
        resendMsg.style.color = '#dc3545';
        if (err.message && err.message.includes('Too many requests')) {
            resendMsg.textContent = 'Muitas tentativas. Aguarde 60s.';
        } else {
            resendMsg.textContent = 'Erro ao enviar. Verifique o e-mail.';
        }
        resendMsg.style.display = 'block';
        setTimeout(() => {
            btnResend.disabled = false;
            btnResend.textContent = 'Reenviar E-mail';
        }, 3000);
    }
});