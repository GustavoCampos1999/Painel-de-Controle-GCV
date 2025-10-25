import { _supabase } from '../supabaseClient.js';
import { showToast, openModal, closeModal } from './ui.js'; 

let listaClientesEl, inputPesquisaClientesEl, formAddClienteEl, formEditarClienteEl;
let modalAddClienteEl, modalEditarClienteEl, modalExcluirClienteEl;
let btnConfirmarExcluirClienteEl;
let clienteParaExcluirInfo = null; 

export function initCRM(elements) {
    listaClientesEl = elements.listaClientes;
    inputPesquisaClientesEl = elements.inputPesquisaClientes;
    formAddClienteEl = elements.formAddCliente;
    formEditarClienteEl = elements.formEditarCliente;
    modalAddClienteEl = elements.modalAddCliente;
    modalEditarClienteEl = elements.modalEditarCliente;
    modalExcluirClienteEl = elements.modalExcluirCliente;
    btnConfirmarExcluirClienteEl = elements.btnConfirmarExcluirCliente;

    setupAddClienteButton();
    setupAddClienteForm();
    setupPesquisaClientes();
    setupAcoesCardCliente();
    setupModaisCliente();
}

export async function carregarClientes() {
    const { data: clientes, error } = await _supabase.from('clientes').select('*').order('nome', { ascending: true });
    
    if (error) {
        console.error('Erro ao carregar clientes:', error); 
        showToast("Erro ao carregar clientes.", "error"); 
    } else {
        renderizarListaClientes(clientes || []);
    }
}

function renderizarListaClientes(clientes) {
    if (!listaClientesEl) { console.warn("Elemento listaClientes não encontrado."); return; }
    listaClientesEl.innerHTML = '';
    if (!clientes || clientes.length === 0) { 
        listaClientesEl.innerHTML = '<p style="text-align: center; color: #777;">Nenhum cliente cadastrado.</p>'; 
        return; 
    }

    clientes.forEach(cliente => {
        const card = document.createElement('div');
        card.className = 'cliente-card';
        if (cliente.venda_realizada === true) {
            card.classList.add('venda-realizada');
        }
        card.dataset.id = cliente.id;
        card.dataset.nome = cliente.nome;
        card.dataset.telefone = cliente.telefone || '';
        card.dataset.email = cliente.email || '';
        card.dataset.endereco = cliente.endereco || '';
        
        card.innerHTML = `
            <div class="cliente-info">
                <p><strong>${cliente.nome || 'Sem nome'}</strong></p>
                <span>${cliente.telefone || 'Sem telefone'} | ${cliente.email || 'Sem email'}</span>
                <p style="font-size: 12px; color: #555; margin-top: 5px;">${cliente.endereco || 'Sem endereço'}</p>
            </div>
            <div class="cliente-acoes">
                <button class="btn-editar">Editar</button>
                <button class="btn-excluir">Excluir</button>
            </div>
        `;

        listaClientesEl.appendChild(card);
    });
}

function setupAddClienteButton() {
    const button = document.getElementById('btn-abrir-modal-add'); 
    if (button) button.addEventListener('click', () => {
        if(formAddClienteEl) formAddClienteEl.reset();
        openModal(modalAddClienteEl);
    });
}

function setupAddClienteForm() {
    if (!formAddClienteEl) return;
    formAddClienteEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        const dadosForm = new FormData(formAddClienteEl);
        const novoCliente = { 
            nome: dadosForm.get('nome'), 
            telefone: dadosForm.get('telefone'), 
            email: dadosForm.get('email'), 
            endereco: dadosForm.get('endereco') 
        };
        const { error } = await _supabase.from('clientes').insert(novoCliente);
        if (error) { 
            console.error('Erro ao salvar cliente:', error); 
            showToast('Erro ao salvar cliente.', "error"); 
        }
        else { 
            formAddClienteEl.reset(); 
            closeModal(modalAddClienteEl); 
            await carregarClientes();
            showToast('✅ Cliente cadastrado!'); 
        }
    });
}

function setupPesquisaClientes() {
    if (!inputPesquisaClientesEl) return;
    inputPesquisaClientesEl.addEventListener('input', () => { 
        const termo = inputPesquisaClientesEl.value.trim().toLowerCase();
         _supabase.from('clientes').select('*').ilike('nome', `%${termo}%`).order('nome', { ascending: true })
         .then(({ data: clientes, error }) => {
             if (error) console.error('Erro ao pesquisar clientes:', error);
             else renderizarListaClientes(clientes || []);
         });
    });
}

function setupAcoesCardCliente() {
    if (!listaClientesEl) return;
    listaClientesEl.addEventListener('click', (e) => {
        const card = e.target.closest('.cliente-card');
        if (!card) return;
        const clientId = card.dataset.id;
        const clientName = card.dataset.nome;

        if (e.target.classList.contains('btn-excluir')) {
            const spanNome = document.getElementById('cliente-nome-excluir');
            if(spanNome) spanNome.textContent = clientName || 'este cliente';
            clienteParaExcluirInfo = { id: clientId, cardElemento: card };
            openModal(modalExcluirClienteEl);
            return;
        }
        if (e.target.classList.contains('btn-editar')) {
            if(formEditarClienteEl){
                formEditarClienteEl.querySelector('#edit-id').value = card.dataset.id;
                formEditarClienteEl.querySelector('#edit-nome').value = card.dataset.nome;
                formEditarClienteEl.querySelector('#edit-telefone').value = card.dataset.telefone;
                formEditarClienteEl.querySelector('#edit-email').value = card.dataset.email;
                formEditarClienteEl.querySelector('#edit-endereco').value = card.dataset.endereco;
            }
            openModal(modalEditarClienteEl);
            return;
        }
        
        document.dispatchEvent(new CustomEvent('clienteSelecionado', { detail: { clientId, clientName } }));
    });
}

function setupModaisCliente() {
    const btnCancelAdd = document.getElementById('btn-cancelar-add');
    if(btnCancelAdd) btnCancelAdd.addEventListener('click', () => closeModal(modalAddClienteEl));

    const btnCancelEdit = document.getElementById('btn-cancelar-editar');
    if(btnCancelEdit) btnCancelEdit.addEventListener('click', () => closeModal(modalEditarClienteEl));

    if(formEditarClienteEl) formEditarClienteEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        const dadosForm = new FormData(formEditarClienteEl);
        const id = dadosForm.get('id');
        const dadosCliente = { 
            nome: dadosForm.get('nome'), 
            telefone: dadosForm.get('telefone'), 
            email: dadosForm.get('email'), 
            endereco: dadosForm.get('endereco') 
        };
        const { error } = await _supabase.from('clientes').update(dadosCliente).match({ id: id });
        if (error) { 
            console.error('Erro ao atualizar:', error); 
            showToast('Erro ao salvar dados.', "error"); 
        }
        else { 
            closeModal(modalEditarClienteEl); 
            await carregarClientes(); 
            showToast('✅ Dados salvos!'); 
        }
    });

    const btnCancelExcluir = document.getElementById('btn-cancelar-excluir-cliente');
    if(btnCancelExcluir) btnCancelExcluir.addEventListener('click', () => {
        closeModal(modalExcluirClienteEl); clienteParaExcluirInfo = null;
    });

    if(btnConfirmarExcluirClienteEl) btnConfirmarExcluirClienteEl.addEventListener('click', async () => {
         if (!clienteParaExcluirInfo) return;
        const { id, cardElemento } = clienteParaExcluirInfo;
        const { error } = await _supabase.from('clientes').delete().match({ id: id });
        if (error) { 
            console.error('Erro ao excluir cliente:', error); 
            showToast('Erro ao excluir cliente.', "error"); 
        }
        else { 
            cardElemento.remove(); 
            showToast('Cliente excluído.'); 
        }
        closeModal(modalExcluirClienteEl); 
        clienteParaExcluirInfo = null;
    });
}