import { _supabase } from '../supabaseClient.js';

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
            try {
                const { data: perfil, error } = await _supabase
                    .from('perfis')
                    .select('nome_usuario') //
                    .eq('user_id', session.user.id) 
                    .single();

                if (error) throw error;

                if (perfil && perfil.nome_usuario) {
                    userElement.textContent = `Logado como: ${perfil.nome_usuario}`;
                } else {
                    userElement.textContent = `Logado como: ${session.user.email}`;
                }
            } catch (error) {
                console.warn("Não foi possível buscar o nome do perfil, exibindo email.", error.message);
                userElement.textContent = `Logado como: ${session.user.email}`;
            }
        }
    }
}

export function setupLogoutButton() {
    const btnLogout = document.getElementById('btn-logout');
    if (!btnLogout) return;

    btnLogout.addEventListener('click', async (e) => {
        e.preventDefault();
        btnLogout.disabled = true;
        btnLogout.style.opacity = '0.7';
        btnLogout.textContent = 'Saindo...';

        const { error } = await _supabase.auth.signOut();

        if (error) {
            if (error.name === 'AuthSessionMissingError') {
                console.log('Tentativa de logout sem sessão. Redirecionando...');
            } else {
                console.error('Erro ao fazer logout:', error); 
                btnLogout.disabled = false;
                btnLogout.style.opacity = '1';
                btnLogout.textContent = 'Sair';
                return; 
            }
        }

        console.log('Logout bem-sucedido ou sessão já inexistente. Redirecionando...');
        
        localStorage.clear(); 
        
        window.location.href = './Login/login.html';
    });
}