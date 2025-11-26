import { _supabase } from '../supabaseClient.js';

const formLogin = document.getElementById('form-login');
const inputEmail = document.getElementById('email');
const inputSenha = document.getElementById('senha');
const msgErro = document.getElementById('mensagem-erro');

formLogin.addEventListener('submit', async (e) => {
    e.preventDefault(); 

    const email = inputEmail.value.trim(); 
    const senha = inputSenha.value.trim();
    
    msgErro.textContent = ''; 
    msgErro.style.display = 'none'; 

    try {
        const { data, error } = await _supabase.auth.signInWithPassword({
            email: email, 
            password: senha,
        });

        if (error) {
            console.error('Erro no login:', error.message);
        
            if (error.message.includes('Invalid login credentials')) {
                msgErro.textContent = 'Email ou senha incorretos.';
            } else if (error.message.includes('Email not confirmed')) {
                msgErro.textContent = 'Seu email ainda não foi confirmado.';
            } else {
                msgErro.textContent = 'Erro ao entrar: ' + error.message;
            }
            
            msgErro.style.display = 'block'; 
            return;
        }

        console.log('Login bem-sucedido!', data);
        window.location.href = '../index.html'; 

    } catch (err) {
        console.error('Erro inesperado:', err);
        msgErro.textContent = 'Ocorreu um erro de conexão. Tente novamente.';
        msgErro.style.display = 'block';
    }
});