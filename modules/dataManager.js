import { _supabase } from '../supabaseClient.js';
import { showToast, openModal, closeModal } from './ui.js';

let elements = {};
let dataArrays = {}; 
let itemParaExcluirInfo = null; 

export function initDataManager(domElements, dataRefs) {
    elements = domElements;
    dataArrays = dataRefs;

    setupCRUD('tecidos');
    setupPesquisa('tecidos', 'produto');
    setupCRUD('confeccao');
    setupPesquisa('confeccao', 'opcao');
    setupCRUD('trilho');
    setupPesquisa('trilho', 'opcao');
}

export async function carregarDados(tabela, ordenarPor) {
    console.log(`Carregando dados para ${tabela}...`);
    const { data, error } = await _supabase.from(tabela).select('*').order(ordenarPor, { ascending: true });
    if (error) {
        console.error(`Erro ao carregar ${tabela}:`, error);
        dataArrays[tabela] = []; 
        showToast(`Erro ao carregar ${tabela}.`, true);
    } else {
        dataArrays[tabela] = data || []; 
        console.log(`${tabela} carregados:`, dataArrays[tabela].length);
    }
}

function getRenderFunction(tabela) {
    switch (tabela) {
        case 'tecidos': return renderizarTabelaTecidos;
        case 'confeccao': return renderizarTabelaConfeccao;
        case 'trilho': return renderizarTabelaTrilho;
        default: return null;
    }
}

export function renderizarTabelaTecidos(tecidos) {
    const tbody = elements.tabelaTecidosBody;
    if (!tbody) return;
    tbody.innerHTML = '';
    const tecidosFiltrados = (tecidos || []).filter(t => t.produto !== 'SEM TECIDO' && t.produto !== '-');
    if (tecidosFiltrados.length === 0) { 
        tbody.innerHTML = '<tr><td colspan="5">Nenhum tecido encontrado.</td></tr>'; 
        return; 
    }
    const formatBRL = (v) => v != null ? parseFloat(v).toFixed(2).replace('.', ',') : '0,00';
    tecidosFiltrados.forEach(d => {
        const row = tbody.insertRow();
        row.dataset.id = d.id; 
        row.dataset.produto = d.produto; 
        row.dataset.largura = d.largura || 0; 
        row.dataset.atacado = d.atacado || 0;
        row.dataset.favorito = d.favorito || false; 

        const favoritoClass = d.favorito ? 'favorito' : '';
        const favoritoIcon = d.favorito ? '★' : '☆';

        row.innerHTML = `
            <td class="col-favorito-acao"><span class="btn-favorito ${favoritoClass}" title="Favoritar">${favoritoIcon}</span></td>
            <td>${d.produto}</td>
            <td>${formatBRL(d.largura)}</td>
            <td>R$ ${formatBRL(d.atacado)}</td>
            <td><button class="btn-editar">Editar</button><button class="btn-excluir">Excluir</button></td>`;
    });
}
export function renderizarTabelaConfeccao(opcoes) {
    const tbody = elements.tabelaConfeccaoBody;
     if (!tbody) return;
    tbody.innerHTML = '';
    const filtradas = (opcoes || []).filter(item => item.opcao !== '-');
    if (filtradas.length === 0) { tbody.innerHTML = '<tr><td colspan="3">Nenhuma opção encontrada.</td></tr>'; return; }
    const formatBRL = (v) => v != null ? parseFloat(v).toFixed(2).replace('.', ',') : '0,00';
    filtradas.forEach(d => {
        const row = tbody.insertRow();
        row.dataset.id = d.id; row.dataset.opcao = d.opcao; row.dataset.valor = d.valor || 0;
        row.innerHTML = `<td>${d.opcao}</td><td>R$ ${formatBRL(d.valor)}</td><td><button class="btn-editar">Editar</button><button class="btn-excluir">Excluir</button></td>`;
    });
}
export function renderizarTabelaTrilho(opcoes) {
     const tbody = elements.tabelaTrilhoBody;
     if (!tbody) return;
    tbody.innerHTML = '';
    const filtradas = (opcoes || []).filter(item => item.opcao !== '-');
    if (filtradas.length === 0) { tbody.innerHTML = '<tr><td colspan="3">Nenhuma opção encontrada.</td></tr>'; return; }
    const formatBRL = (v) => v != null ? parseFloat(v).toFixed(2).replace('.', ',') : '0,00';
    filtradas.forEach(d => {
        const row = tbody.insertRow();
        row.dataset.id = d.id; row.dataset.opcao = d.opcao; row.dataset.valor = d.valor || 0;
        row.innerHTML = `<td>${d.opcao}</td><td>R$ ${formatBRL(d.valor)}</td><td><button class="btn-editar">Editar</button><button class="btn-excluir">Excluir</button></td>`;
    });
}

function setupCRUD(tabela) {
    const nomeCapitalizado = tabela.charAt(0).toUpperCase() + tabela.slice(1);
    const nomeSingular = nomeCapitalizado.replace(/s$/, '');
    const chaveNome = tabela === 'tecidos' ? 'produto' : 'opcao';

    const btnAbrirModalAdd = elements[`btnAbrirModalAdd${nomeCapitalizado}`];
    const modalAdd = elements[`modalAdd${nomeCapitalizado}`];
    const formAdd = elements[`formAdd${nomeCapitalizado}`];
    const btnCancelAdd = elements[`btnCancelAdd${nomeCapitalizado}`];

    const modalEdit = elements[`modalEdit${nomeCapitalizado}`];
    const formEdit = elements[`formEdit${nomeCapitalizado}`];
    const btnCancelEdit = elements[`btnCancelEdit${nomeCapitalizado}`];

    const tbody = elements[`tabela${nomeCapitalizado}Body`];

    if (btnAbrirModalAdd) btnAbrirModalAdd.addEventListener('click', () => {
        if(formAdd) formAdd.reset();
        openModal(modalAdd);
    });
    if (formAdd) formAdd.addEventListener('submit', async (e) => {
        e.preventDefault();
        const dados = getFormData(formAdd, tabela);
        const { error } = await _supabase.from(tabela).insert(dados);
        handleSaveResponse(error, modalAdd, tabela, `✅ ${nomeSingular} adicionado(a)!`, tabela === 'tecidos' ? 'produto' : 'opcao');
    });
    if (btnCancelAdd) btnCancelAdd.addEventListener('click', () => closeModal(modalAdd));

    if (formEdit) formEdit.addEventListener('submit', async (e) => {
        e.preventDefault();
        const dados = getFormData(formEdit, tabela);
        const id = formEdit.querySelector(`input[name="id"]`)?.value; 
        if (!id) { console.error("ID não encontrado no formulário de edição"); return; }
        const updateData = {...dados}; 
        delete updateData.id; 
        const { error } = await _supabase.from(tabela).update(updateData).match({ id: id });
         handleSaveResponse(error, modalEdit, tabela, `✅ ${nomeSingular} atualizado(a)!`, tabela === 'tecidos' ? 'produto' : 'opcao');
    });
    if (btnCancelEdit) btnCancelEdit.addEventListener('click', () => closeModal(modalEdit));

    if (tbody) tbody.addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        if (!row || !row.dataset.id) return;
        const id = row.dataset.id;
        const nome = row.dataset[chaveNome];
        if (e.target.classList.contains('btn-favorito')) {
            if (tabela !== 'tecidos') return; 

            const starElement = e.target;
            const isFavorito = row.dataset.favorito === 'true';
            const newStatus = !isFavorito;
            
            starElement.textContent = newStatus ? '★' : '☆';
            starElement.classList.toggle('favorito', newStatus);
            row.dataset.favorito = newStatus;

            _supabase.from('tecidos').update({ favorito: newStatus }).match({ id: id })
                .then(async ({ error }) => {
                    if (error) {
                        console.error('Erro ao favoritar:', error);
                        showToast('Erro ao favoritar item.', true);
                        starElement.textContent = isFavorito ? '★' : '☆';
                        starElement.classList.toggle('favorito', isFavorito);
                        row.dataset.favorito = isFavorito;
                    } else {
                        showToast(newStatus ? 'Tecido favoritado!' : 'Tecido desfavoritado.');
                        const itemInData = dataArrays.tecidos.find(t => t.id == id);
                        if (itemInData) itemInData.favorito = newStatus;

                        document.dispatchEvent(new CustomEvent('tabelaTecidosSortRequest'));
                    }
                });
            return; 
        }

        if (e.target.classList.contains('btn-excluir')) {
            itemParaExcluirInfo = { id, nome, tabela, elemento: row };
            const spanNome = elements.spanItemNomeExcluir;
            if (spanNome) spanNome.textContent = nome;
            openModal(elements.modalExcluirGenerico);
        }
        if (e.target.classList.contains('btn-editar')) {
            if(formEdit){
                formEdit.querySelector(`input[name="id"]`).value = id; 
                for (const key in row.dataset) {
                   const input = formEdit.querySelector(`[name="${key}"]`);
                   if(input && key !== 'id') {
                       input.value = row.dataset[key];
                   } else if (key === 'id' && !formEdit.querySelector(`input[name="id"]`)){
                       console.warn("Input hidden 'id' não encontrado no form de edição para", tabela);
                   }
                }
            }
            openModal(modalEdit);
        }
    });
}

function getFormData(form, tabela) {
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
        if (key === 'id' && form.id.includes('edit')) return;

        if (key === 'largura' || key === 'atacado' || key === 'valor') {
            data[key] = value === '' ? null : (parseFloat(value) || 0); 
        } else {
            data[key] = value;
        }
    });
    return data;
}

async function handleSaveResponse(error, modalToClose, tabela, successMessage, ordenarPor) {
    if (error) {
        console.error(`Erro ao salvar ${tabela}:`, error);
        showToast(`Erro ao salvar ${tabela}. Verifique se o nome/opção já existe.`, true); 
    } else {
        closeModal(modalToClose);
        await carregarDados(tabela, ordenarPor);
        showToast(successMessage);
        document.dispatchEvent(new CustomEvent('dadosBaseAlterados'));
    }
}

function setupPesquisa(tabela, chaveNome) {
    const nomeCapitalizado = tabela.charAt(0).toUpperCase() + tabela.slice(1);
    const input = elements[`inputPesquisa${nomeCapitalizado}`];
    const renderFunction = getRenderFunction(tabela);
    if (!input || !renderFunction) return;

    input.addEventListener('keyup', () => {
        const termo = input.value.trim().toLowerCase();
        const dadosFiltrados = (dataArrays[tabela] || []).filter(item =>
            item[chaveNome] && item[chaveNome].toLowerCase().includes(termo)
        );
        renderFunction(dadosFiltrados);
    });
}
