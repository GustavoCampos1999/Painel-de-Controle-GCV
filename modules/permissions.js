import { _supabase } from '../supabaseClient.js';

const BACKEND_API_URL = 'https://painel-de-controle-gcv.onrender.com';
let currentPermissions = {};
let isAdmin = false;

export async function loadPermissions() {
    try {
        const { data: { session } } = await _supabase.auth.getSession();
        if (!session) return;

        const response = await fetch(`${BACKEND_API_URL}/api/me/permissions`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.isAdmin) {
                isAdmin = true;
                currentPermissions = {}; 
            } else {
                isAdmin = false;
                currentPermissions = data;
            }
            applyPermissionsUI(); 
        }
    } catch (e) {
        console.error("Erro loading permissions:", e);
    }
}

export function can(permissionKey) {
    if (isAdmin) return true;
    return currentPermissions[permissionKey] === true;
}

export function applyPermissionsUI() {
    const map = {
        'perm_clientes_delete': '.btn-excluir-cliente, #btn-confirmar-excluir-cliente',
        'perm_clientes_add': '#btn-abrir-modal-add',
        'perm_clientes_edit': '.btn-editar-cliente',
        
        'perm_data_edit': '#tab-gerenciar-dados .btn-adicionar, #tab-gerenciar-dados .btn-editar',
        'perm_data_view': '#tab-button[data-tab="tab-gerenciar-dados"]', 
        
        'perm_calc_save': '#btn-manual-save, #btn-salvar-e-sair',
        'perm_team_manage': '#btn-tab-equipe'
    };

    for (const [perm, selector] of Object.entries(map)) {
        if (!can(perm)) {
            document.querySelectorAll(selector).forEach(el => {
                el.style.display = 'none';
            });
        }
    }
}