import { _supabase } from '../supabaseClient.js';
import { showToast } from './ui.js'; 

export async function checkUserSession() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) {
        const path = window.location.pathname;
        if (!path.endsWith('login.html') && !path.endsWith('Login/')) {
            window.location.href = 'Login/login.html';
        }
    } else {
        const userElement = document.getElementById('user-email');
        if (userElement) {
            userElement.textContent = `Logado como: ${session.user.email}`;
        }
    }
}

export function setupLogoutButton() {
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) btnLogout.addEventListener('click', async (e) => {
        e.preventDefault();
        const { error } = await _supabase.auth.signOut();
        if (error) {
            console.error("Erro ao fazer logout:", error);
            showToast("Erro ao sair.", true); 
        } else {
            window.location.href = 'Login/login.html';
        }
    });
}