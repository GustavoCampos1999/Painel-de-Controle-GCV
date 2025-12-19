import { _supabase } from '../supabaseClient.js';
import { showToast, openModal, closeModal } from './ui.js';
import { can } from './permissions.js';

let listaClientesEl, inputPesquisaClientesEl, formAddClienteEl, formEditarClienteEl;
let modalAddClienteEl, modalEditarClienteEl, modalExcluirClienteEl;
let btnConfirmarExcluirClienteEl;
let clienteParaExcluirInfo = null;
let btnToggleFilterEl, selectClientFilterEl, btnToggleSortOrderEl;
let cachedLojaIdCrm = null; 
let isSortAscending = true;
async function getMyLojaIdCrm() {
    _supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT' || event === 'USER_DELETED') { cachedLojaIdCrm = null; }
    });
    if (cachedLojaIdCrm) return cachedLojaIdCrm;
    try {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) return null;
        const { data, error } = await _supabase
            .from('perfis')
            .select('loja_id')
            .eq('user_id', user.id)
            .maybeSingle();

        if (error) throw error;
        if (!data?.loja_id) {
            console.warn("Usuário sem loja_id no perfil.");
            return null;
        }
        cachedLojaIdCrm = data.loja_id;
        return cachedLojaIdCrm;
    } catch (error) {
        console.error("Erro CRM ao buscar Loja ID:", error.message);
        return null;
    }
}

async function obterNomeUsuarioLogado() {
    try {
        const { data: { user }, error: authError } = await _supabase.auth.getUser();
        if (authError || !user) return 'Usuário Desconhecido';
        const userElement = document.getElementById('user-email');
        if (userElement && userElement.textContent.includes('Olá, ')) {
            const nomeHeader = userElement.textContent.replace('Olá, ', '').trim();
            if (nomeHeader !== 'Carregando...') return nomeHeader;
        }
        const { data: perfil, error: perfilError } = await _supabase
            .from('perfis')
            .select('nome_usuario')
            .eq('user_id', user.id)
            .maybeSingle();

        if (perfilError) throw perfilError;

        if (perfil && perfil.nome_usuario) {
            return perfil.nome_usuario;
        }
        return user.email ? user.email.split('@')[0] : 'Usuário';
    } catch (e) {
        console.error("Erro ao obter nome:", e.message);
        return 'Sistema';
    }
}

function formatarDataHora(isoString) {
    if (!isoString) return 'N/A';
    try {
        const d = new Date(isoString);
        return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return 'Data inválida'; }
}

export function initCRM(elements) {
    listaClientesEl = elements.listaClientes;
    inputPesquisaClientesEl = elements.inputPesquisaClientes;
    formAddClienteEl = elements.formAddCliente;
    formEditarClienteEl = elements.formEditarCliente;
    modalAddClienteEl = elements.modalAddCliente;
    modalEditarClienteEl = elements.modalEditarCliente;
    modalExcluirClienteEl = elements.modalExcluirCliente;
    btnConfirmarExcluirClienteEl = elements.btnConfirmarExcluirCliente;
    btnToggleFilterEl = elements.btnToggleFilter; 
    selectClientFilterEl = elements.selectClientFilter;
    
    if (elements.btnToggleSortOrder) btnToggleSortOrderEl = elements.btnToggleSortOrder;
    else btnToggleSortOrderEl = document.getElementById('btn-toggle-sort-order');

    setupAddClienteButton();
    setupAddClienteForm(); 
    setupPesquisaClientes();
    setupAcoesCardCliente();
    setupModaisCliente();
    setupFiltroClientes();
    
    document.addEventListener('clienteAtualizado', () => aplicarFiltroEOrdenacao());
}

export async function carregarClientes(filterOptions = {}) {
    const lojaId = await getMyLojaIdCrm(); 
    if (!lojaId) return;

    let query = _supabase.from('clientes')
                       .select('*, updated_by_name, created_by_name')
                       .eq('loja_id', lojaId); 

    if (filterOptions.venda_realizada === true) query = query.eq('venda_realizada', true);
    else if (filterOptions.venda_realizada === false) query = query.or('venda_realizada.is.null,venda_realizada.eq.false');
    if (filterOptions.searchTerm) query = query.ilike('nome', `%${filterOptions.searchTerm}%`);

    const orderBy = filterOptions.orderBy || 'nome';
    const ascending = filterOptions.ascending !== false;
    query = query.order(orderBy, { ascending: ascending });

    const { data: clientes, error } = await query;
    if (!error) renderizarListaClientes(clientes || []);
}

function renderizarListaClientes(clientes) {
    if (!listaClientesEl) return;
    listaClientesEl.innerHTML = '';
    
    if (!clientes || clientes.length === 0) {
        listaClientesEl.innerHTML = '<p style="text-align: center; color: #777;">Nenhum cliente encontrado.</p>';
        return;
    }

    const podeEditar = can('perm_clientes_edit');
    const podeExcluir = can('perm_clientes_delete');

    clientes.forEach(cliente => {
        const card = document.createElement('div');
        card.className = `cliente-card ${cliente.venda_realizada ? 'venda-realizada' : ''}`;
        
        card.dataset.id = cliente.id; 
        card.dataset.nome = cliente.nome; 
        card.dataset.telefone = cliente.telefone || '';
        card.dataset.email = cliente.email || '';
        card.dataset.endereco = cliente.endereco || '';
    
        const criador = cliente.created_by_name || 'Desconhecido';
        const editor = cliente.updated_by_name || 'Desconhecido';
        const textoCriado = `${formatarDataHora(cliente.created_at)} por ${criador}`;
        const textoEditado = `${formatarDataHora(cliente.updated_at)} por ${editor}`;

        card.dataset.infoCriado = textoCriado;
        card.dataset.infoEditado = textoEditado;

        let botoesHtml = '';
        if (podeEditar) botoesHtml += `<button class="btn-editar">Editar</button>`;
        if (podeExcluir) botoesHtml += `<button class="btn-excluir">Excluir</button>`;

        card.innerHTML = `
            <div class="card-content">
                <div class="card-header">
                    <p class="cliente-nome"><strong>${cliente.nome || 'Sem nome'}</strong></p>
                    <div class="cliente-timestamps">
                        <span class="timestamp updated">Última Edição: ${textoEditado}</span>
                        <span class="timestamp created">Criado: ${textoCriado}</span>
                    </div>
                </div>
                <div class="cliente-details">
                    <span>${cliente.telefone || 'Sem telefone'} | ${cliente.email || 'Sem email'}</span>
                    <p>${cliente.endereco || 'Sem endereço'}</p>
                </div>
            </div>
            <div class="cliente-acoes">${botoesHtml}</div>`; 
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
        const btn = formAddClienteEl.querySelector('button[type="submit"]');
        if (btn) btn.disabled = true;

        try { 
            const dadosForm = new FormData(formAddClienteEl);
            const lojaId = await getMyLojaIdCrm();
            const nomeUsuario = await obterNomeUsuarioLogado(); 

            if (!lojaId) return; 

            const novoCliente = {
                nome: dadosForm.get('nome'), 
                telefone: dadosForm.get('telefone'), 
                email: dadosForm.get('email'), 
                endereco: dadosForm.get('endereco'),
                loja_id: lojaId,
                created_by_name: nomeUsuario,
                updated_by_name: nomeUsuario,
                updated_at: new Date().toISOString()
            };

            const { error } = await _supabase.from('clientes').insert(novoCliente);
            if (!error) {
                formAddClienteEl.reset();
                closeModal(modalAddClienteEl);
                await aplicarFiltroEOrdenacao(); 
                showToast(`✅ Cliente criado por ${nomeUsuario}`);
            } else { showToast("Erro ao salvar.", "error"); }
        } finally {
            if (btn) btn.disabled = false; 
        }
    });
}

function setupAcoesCardCliente() {
    if (!listaClientesEl) return;
    listaClientesEl.addEventListener('click', (e) => {
        const card = e.target.closest('.cliente-card');
        if (!card) return;
        
        if (e.target.classList.contains('btn-excluir')) {
            const spanNome = document.getElementById('cliente-nome-excluir');
            if(spanNome) spanNome.textContent = card.dataset.nome || 'cliente';
            clienteParaExcluirInfo = { id: card.dataset.id, cardElemento: card }; 
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

                const infoCriadoEl = document.getElementById('edit-created-info');
                const infoEditadoEl = document.getElementById('edit-updated-info');
                
                if(infoCriadoEl) infoCriadoEl.textContent = card.dataset.infoCriado || '-';
                if(infoEditadoEl) infoEditadoEl.textContent = card.dataset.infoEditado || '-';
            }
            openModal(modalEditarClienteEl);
            return;
        }
        window.location.hash = `#cliente/${card.dataset.id}`;
    });
}

function setupModaisCliente() {
    const btnCancelAdd = document.getElementById('btn-cancelar-add');
    if(btnCancelAdd) btnCancelAdd.addEventListener('click', () => closeModal(modalAddClienteEl));

    const btnCancelEdit = document.getElementById('btn-cancelar-editar');
    if(btnCancelEdit) btnCancelEdit.addEventListener('click', () => closeModal(modalEditarClienteEl));

    if(formEditarClienteEl) formEditarClienteEl.addEventListener('submit', async (e) => { 
        e.preventDefault(); 
        
        const btnSalvar = formEditarClienteEl.querySelector('button[type="submit"]');
        if (btnSalvar) {
            btnSalvar.disabled = true;
            btnSalvar.textContent = "Salvando...";
        }

        try {
            const nomeUsuarioAtivo = await obterNomeUsuarioLogado();
            console.log("Nome que será registrado na edição:", nomeUsuarioAtivo);

            const dadosForm = new FormData(formEditarClienteEl); 
            const clienteId = dadosForm.get('id');

            const dadosCliente = { 
                nome: dadosForm.get('nome'), 
                telefone: dadosForm.get('telefone'), 
                email: dadosForm.get('email'), 
                endereco: dadosForm.get('endereco'),
                updated_by_name: nomeUsuarioAtivo, 
                updated_at: new Date().toISOString()
            };

            const lojaId = await getMyLojaIdCrm();
            if (!lojaId) throw new Error("Loja não encontrada.");

            const { error } = await _supabase.from('clientes')
                .update(dadosCliente)
                .match({ id: clienteId, loja_id: lojaId });

            if (!error) {
                closeModal(modalEditarClienteEl);
                await carregarClientes(); 
                showToast(`✅ Atualizado por ${nomeUsuarioAtivo}`);
            } else { 
                console.error("Erro Supabase:", error);
                showToast("Erro ao atualizar dados.", "error"); 
            }
        } catch (err) {
            console.error("Erro na submissão:", err);
            showToast("Falha ao salvar alterações.", "error");
        } finally {
            if (btnSalvar) {
                btnSalvar.disabled = false;
                btnSalvar.textContent = "Salvar Alterações";
            }
        }
    });

    const btnCancelExcluir = document.getElementById('btn-cancelar-excluir-cliente');
    if(btnCancelExcluir) btnCancelExcluir.addEventListener('click', () => { closeModal(modalExcluirClienteEl); clienteParaExcluirInfo = null; });

    if(btnConfirmarExcluirClienteEl) btnConfirmarExcluirClienteEl.addEventListener('click', async () => {
        if (!clienteParaExcluirInfo) return;
        const lojaId = await getMyLojaIdCrm();
        if (!lojaId) return;
        const { error } = await _supabase.from('clientes').delete().match({ id: clienteParaExcluirInfo.id, loja_id: lojaId }); 
        if (!error) {
            clienteParaExcluirInfo.cardElemento.remove();
            showToast('Cliente excluído.');
        } else showToast("Erro ao excluir.", "error");
        closeModal(modalExcluirClienteEl);
        clienteParaExcluirInfo = null;
    });
}

function setupPesquisaClientes() {
    if (!inputPesquisaClientesEl) return;
    inputPesquisaClientesEl.addEventListener('input', () => {
        aplicarFiltroEOrdenacao({ searchTerm: inputPesquisaClientesEl.value.trim().toLowerCase() }); 
    });
}

function setupFiltroClientes() {
    if (selectClientFilterEl) selectClientFilterEl.addEventListener('change', () => {
        if(inputPesquisaClientesEl) inputPesquisaClientesEl.value = '';
        isSortAscending = true; 
        aplicarFiltroEOrdenacao();
    });
    if (btnToggleSortOrderEl) btnToggleSortOrderEl.addEventListener('click', () => {
        isSortAscending = !isSortAscending; 
        aplicarFiltroEOrdenacao();
    });
}

function aplicarFiltroEOrdenacao(additionalOptions = {}) {
    if (!selectClientFilterEl) { carregarClientes(additionalOptions); return; }
    const valor = selectClientFilterEl.value;
    let opts = { ...additionalOptions, orderBy: 'nome', ascending: isSortAscending };
    let isDate = false;

    if (valor === 'venda_realizada_true') { opts.venda_realizada = true; opts.orderBy = 'updated_at'; isDate = true; }
    else if (valor === 'venda_realizada_false') { opts.venda_realizada = false; opts.orderBy = 'updated_at'; isDate = true; }
    else if (valor === 'updated_at' || valor === 'created_at') { opts.orderBy = valor; isDate = true; }

    if (isDate) opts.ascending = !isSortAscending; 
    btnToggleSortOrderEl.textContent = isSortAscending ? (isDate ? 'Mais Recentes' : 'A-Z') : (isDate ? 'Mais Antigos' : 'Z-A');
    carregarClientes(opts);
}