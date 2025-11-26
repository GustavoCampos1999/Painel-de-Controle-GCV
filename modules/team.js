import { _supabase } from '../supabaseClient.js';
import { showToast, openModal, closeModal } from './ui.js';

const BACKEND_API_URL = 'https://painel-de-controle-gcv.onrender.com'; 

let elements = {};
let membroParaExcluir = null;
let roleParaExcluir = null;

export function initTeamManager(domElements) {
    elements = domElements;
    
    elements.btnSubtabMembros = document.getElementById('btn-subtab-membros');
    elements.btnSubtabCargos = document.getElementById('btn-subtab-cargos');
    elements.viewMembros = document.getElementById('view-equipe-membros');
    elements.viewCargos = document.getElementById('view-equipe-cargos');
    
    elements.modalRoleEditor = document.getElementById('modal-role-editor');
    elements.formRoleEditor = document.getElementById('form-role-editor');
    elements.btnAbrirModalAddCargo = document.getElementById('btn-abrir-modal-add-cargo');
    elements.btnCancelarRole = document.getElementById('btn-cancelar-role');

    if(elements.btnSubtabMembros) elements.btnSubtabMembros.addEventListener('click', () => switchSubTab('membros'));
    if(elements.btnSubtabCargos) elements.btnSubtabCargos.addEventListener('click', () => switchSubTab('cargos'));

    if (elements.btnAbrirModalAddMembro) {
        elements.btnAbrirModalAddMembro.addEventListener('click', async () => {
            elements.formAddMembro.reset();
            await preencherSelectCargos(); 
            openModal(elements.modalAddMembro);
        });
    }
    if (elements.btnCancelarAddMembro) elements.btnCancelarAddMembro.addEventListener('click', () => closeModal(elements.modalAddMembro));
    if (elements.formAddMembro) elements.formAddMembro.addEventListener('submit', handleAddMembro);
    if (elements.btnConfirmarExcluirMembro) elements.btnConfirmarExcluirMembro.addEventListener('click', handleExcluirMembro);
    if (elements.btnCancelarExcluirMembro) elements.btnCancelarExcluirMembro.addEventListener('click', () => closeModal(elements.modalExcluirMembro));

    if (elements.btnAbrirModalAddCargo) {
        elements.btnAbrirModalAddCargo.addEventListener('click', () => {
            elements.formRoleEditor.reset();
            document.getElementById('role-id').value = '';
            document.getElementById('modal-role-title').textContent = 'Criar Novo Cargo';
            openModal(elements.modalRoleEditor);
        });
    }
    if (elements.btnCancelarRole) elements.btnCancelarRole.addEventListener('click', () => closeModal(elements.modalRoleEditor));
    if (elements.formRoleEditor) elements.formRoleEditor.addEventListener('submit', handleSaveRole);

    checkAdminRole();
}

function switchSubTab(tab) {
    if (tab === 'membros') {
        elements.btnSubtabMembros.classList.add('active');
        elements.btnSubtabCargos.classList.remove('active');
        elements.viewMembros.style.display = 'block';
        elements.viewCargos.style.display = 'none';
        carregarEquipe();
    } else {
        elements.btnSubtabMembros.classList.remove('active');
        elements.btnSubtabCargos.classList.add('active');
        elements.viewMembros.style.display = 'none';
        elements.viewCargos.style.display = 'block';
        carregarCargos();
    }
}

async function checkAdminRole() {
    try {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) return;

        const { data: perfil } = await _supabase
            .from('perfis')
            .select('role')
            .eq('user_id', user.id)
            .single();

        if (perfil && perfil.role === 'admin') {
            const btnTab = document.getElementById('btn-tab-equipe');
            if (btnTab) {
                btnTab.style.display = 'block'; 
                btnTab.addEventListener('click', () => switchSubTab('membros'));
            }
        }
    } catch (e) {
        console.error("Erro permissão:", e);
    }
}

async function carregarEquipe() {
    const tbody = document.getElementById('lista-equipe-body');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Carregando...</td></tr>';

    try {
        const { data: { session } } = await _supabase.auth.getSession();
        const response = await fetch(`${BACKEND_API_URL}/api/team`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        const equipe = await response.json();
        renderizarTabelaEquipe(equipe);
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="3" style="color:red;">Erro ao carregar.</td></tr>';
    }
}

function renderizarTabelaEquipe(lista) {
    const tbody = document.getElementById('lista-equipe-body');
    tbody.innerHTML = '';
    if (lista.length === 0) return;

    lista.forEach(membro => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding: 10px;">${membro.nome_usuario || 'Sem nome'}</td>
            <td style="padding: 10px;">${membro.role || 'Padrão'}</td>
            <td style="padding: 10px; text-align: center;">
                ${membro.role !== 'admin' ? `<button class="btn-excluir btn-remove-membro" data-id="${membro.user_id}" data-nome="${membro.nome_usuario}">Remover</button>` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.querySelectorAll('.btn-remove-membro').forEach(btn => {
        btn.addEventListener('click', (e) => {
            membroParaExcluir = { id: e.target.dataset.id, nome: e.target.dataset.nome };
            document.getElementById('nome-membro-excluir').textContent = membroParaExcluir.nome;
            openModal(elements.modalExcluirMembro);
        });
    });
}

async function preencherSelectCargos() {
    const select = elements.formAddMembro.querySelector('select[name="role"]');
    if(!select) return;
    select.innerHTML = '<option>Carregando...</option>';

    try {
        const { data: { session } } = await _supabase.auth.getSession();
        const response = await fetch(`${BACKEND_API_URL}/api/roles`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        const roles = await response.json();
        
        select.innerHTML = '';
        const optAdmin = new Option('Administrador (Acesso Total)', 'admin'); 

        if(roles.length === 0) {
             select.innerHTML = '<option value="" disabled>Nenhum cargo criado. Crie na aba Permissões.</option>';
        } else {
            roles.forEach(role => {
                const option = new Option(role.nome, role.id); 
                select.appendChild(option);
            });
        }
    } catch (e) {
        console.error("Erro loading roles:", e);
        select.innerHTML = '<option value="vendedor">Vendedor (Padrão)</option>';
    }
}

async function handleAddMembro(e) {
    e.preventDefault();
    const btn = elements.formAddMembro.querySelector('button[type="submit"]');
    btn.disabled = true;
    
    const formData = new FormData(elements.formAddMembro);
    const dados = {
        nome: formData.get('nome'),
        email: formData.get('email'),
        senha: formData.get('senha'),
        role_id: formData.get('role') 
    };

    try {
        const { data: { session } } = await _supabase.auth.getSession();
        const response = await fetch(`${BACKEND_API_URL}/api/team/add`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify(dados)
        });

        if (!response.ok) throw new Error("Erro ao criar");
        showToast("Membro adicionado!");
        closeModal(elements.modalAddMembro);
        carregarEquipe();
    } catch (error) {
        showToast(error.message || "Erro", "error");
    } finally {
        btn.disabled = false;
    }
}

async function handleExcluirMembro() {
    if (!membroParaExcluir) return;
    try {
        const { data: { session } } = await _supabase.auth.getSession();
        await fetch(`${BACKEND_API_URL}/api/team/${membroParaExcluir.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        showToast("Removido.");
        closeModal(elements.modalExcluirMembro);
        carregarEquipe();
    } catch (error) {
        showToast("Erro ao remover.", "error");
    }
}

async function carregarCargos() {
    const tbody = document.getElementById('lista-cargos-body');
    tbody.innerHTML = '<tr><td>Carregando...</td></tr>';
    
    try {
        const { data: { session } } = await _supabase.auth.getSession();
        const response = await fetch(`${BACKEND_API_URL}/api/roles`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        const roles = await response.json();
        renderizarTabelaCargos(roles);
    } catch (e) {
        console.error(e);
    }
}

function renderizarTabelaCargos(roles) {
    const tbody = document.getElementById('lista-cargos-body');
    tbody.innerHTML = '';
    if(roles.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3">Nenhum cargo personalizado. Crie um!</td></tr>';
        return;
    }

    roles.forEach(role => {
        const permsCount = Object.values(role.permissions || {}).filter(v => v).length;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding: 10px;"><strong>${role.nome}</strong></td>
            <td style="padding: 10px;">${permsCount} permissões ativas</td>
            <td style="padding: 10px; text-align: center;">
                <button class="btn-editar btn-edit-role" data-id="${role.id}">Editar</button>
                <button class="btn-excluir btn-delete-role" data-id="${role.id}">Excluir</button>
            </td>
        `;
        tbody.appendChild(tr);
        
        tr.querySelector('.btn-edit-role').roleData = role;
    });

    document.querySelectorAll('.btn-edit-role').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const role = e.target.roleData;
            abrirModalEdicaoRole(role);
        });
    });

    document.querySelectorAll('.btn-delete-role').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if(confirm("Excluir este cargo? Usuários com ele perderão acesso.")) {
                await deleteRole(e.target.dataset.id);
            }
        });
    });
}

function abrirModalEdicaoRole(role) {
    const form = elements.formRoleEditor;
    form.reset();
    document.getElementById('role-id').value = role.id;
    document.getElementById('role-nome').value = role.nome;
    document.getElementById('modal-role-title').textContent = `Editar Cargo: ${role.nome}`;

    const perms = role.permissions || {};
    for (const [key, value] of Object.entries(perms)) {
        const chk = document.getElementById(key);
        if(chk) chk.checked = value;
    }
    
    openModal(elements.modalRoleEditor);
}

async function handleSaveRole(e) {
    e.preventDefault();
    const formData = new FormData(elements.formRoleEditor);
    
    const permissions = {};
    elements.formRoleEditor.querySelectorAll('input[type="checkbox"]').forEach(chk => {
        permissions[chk.id] = chk.checked;
    });

    const dados = {
        id: formData.get('id') || null,
        nome: formData.get('nome'),
        permissions: permissions
    };

    try {
        const { data: { session } } = await _supabase.auth.getSession();
        const response = await fetch(`${BACKEND_API_URL}/api/roles`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify(dados)
        });

        if(!response.ok) throw new Error("Erro ao salvar cargo");
        
        showToast("Cargo salvo!");
        closeModal(elements.modalRoleEditor);
        carregarCargos();

    } catch (error) {
        showToast("Erro ao salvar.", "error");
    }
}

async function deleteRole(id) {
    try {
        const { data: { session } } = await _supabase.auth.getSession();
        await fetch(`${BACKEND_API_URL}/api/roles/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        carregarCargos();
    } catch (e) {
        showToast("Erro ao excluir.", "error");
    }
}