import { _supabase } from '../supabaseClient.js';

const formLogin = document.getElementById('form-login');
const inputEmail = document.getElementById('email');
const inputSenha = document.getElementById('senha');
const msgErro = document.getElementById('mensagem-erro');

formLogin.addEventListener('submit', async (e) => {
    e.preventDefault(); 

    const email = inputEmail.value;
    const senha = inputSenha.value;
    msgErro.textContent = ''; 

    try {
        const { data, error } = await _supabase.auth.signInWithPassword({
            email: email, 
            password: senha,
        });

        if (error) {
            console.error('Erro no login:', error.message);
            msgErro.textContent = 'Email ou senha inválidos.';
            return;
        }

        console.log('Login bem-sucedido!', data);
        
        window.location.href = '../admin.html'; //

    } catch (err) {
        console.error('Erro inesperado:', err);
        msgErro.textContent = 'Ocorreu um erro. Tente novamente.';
    }
});