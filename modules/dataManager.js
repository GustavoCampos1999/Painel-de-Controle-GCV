import { _supabase } from '../supabaseClient.js';
import { showToast, openModal, closeModal } from './ui.js'; 

let elements = {};
let dataArrays = {}; 

let cachedLojaId = null;
async function getMyLojaId() {
    _supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
            cachedLojaId = null;
        }
    });

    if (cachedLojaId) {
        console.log("Usando loja_id do cache:", cachedLojaId);
        return cachedLojaId;
    }
    try {
        console.log("Buscando loja_id do perfil...");
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado.");
        
        const { data, error, status } = await _supabase
            .from('perfis')
            .select('loja_id') 
            .eq('user_id', user.id) 
            .single();

        if (error && status !== 406) { 
            throw error;
        }
        if (!data || !data.loja_id) {
            throw new Error("Perfil ou loja_id não encontrados para o usuário atual.");
        }
        cachedLojaId = data.loja_id;
        console.log("Loja_id encontrada e cacheada:", cachedLojaId);
        return cachedLojaId;
    } catch (error) {
        console.error("Erro ao buscar loja_id do perfil:", error);
        showToast(`Erro crítico: Não foi possível identificar sua loja (${error.message}). Tente recarregar.`, "error");
        return null; 
    }
}

function formatDecimal(value, decimalPlaces = 2) { 
    const num = parseFloat(String(value).replace(',', '.'));
    if (isNaN(num)) { return (0).toFixed(decimalPlaces).replace('.', ','); }
    return num.toFixed(decimalPlaces).replace('.', ',');
}
function setupInputFormatting(inputId, formatType) {
    const inputElement = document.getElementById(inputId);
    if (!inputElement) return;

    const isCurrency = formatType === 'currency';
    const decimalPlaces = (formatType === 'measure') ? 3 : 2;
    const prefix = isCurrency ? 'R$ ' : '';
    const formatador = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }); 

    inputElement.addEventListener('focus', (e) => {
        let value = e.target.value.replace(prefix, '').trim();
        if (isCurrency) {
            value = value.replace(/\./g, "").replace(",", "."); 
        }
        let num = parseFloat(value) || 0;
        
        e.target.value = (num > 0) ? String(num).replace('.', ',') : ''; 
    });

    inputElement.addEventListener('blur', (e) => {
        let value = e.target.value;
        let num = parseFloat(String(value).replace(',', '.')) || 0;
        
        if (isCurrency) {
            e.target.value = formatador.format(num);
        } else {
            e.target.value = num.toFixed(decimalPlaces).replace('.', ',');
        }
    });
}

function initDataManager(domElements, dataRefs) {
    elements = domElements;
    dataArrays = dataRefs; 
    setupCRUD('tecidos');
    setupPesquisa('tecidos', 'produto');
    setupCRUD('confeccao');
    setupPesquisa('confeccao', 'opcao');
    setupCRUD('trilho');
    setupPesquisa('trilho', 'opcao');
    setupCRUD('frete');
    setupPesquisa('frete', 'opcao'); 
    setupCRUD('instalacao');
    setupPesquisa('instalacao', 'opcao'); 

    setupInputFormatting('add-tecido-largura', 'measure');
    setupInputFormatting('add-tecido-atacado', 'currency');
    setupInputFormatting('edit-tecido-largura', 'measure');
    setupInputFormatting('edit-tecido-atacado', 'currency');
    setupInputFormatting('add-confeccao-valor', 'currency');
    setupInputFormatting('edit-confeccao-valor', 'currency');
    setupInputFormatting('add-trilho-valor', 'currency');
    setupInputFormatting('edit-trilho-valor', 'currency');
    setupInputFormatting('add-frete-valor', 'currency');
    setupInputFormatting('edit-frete-valor', 'currency');
    setupInputFormatting('add-instalacao-valor', 'currency');
    setupInputFormatting('edit-instalacao-valor', 'currency');
setupInputFormatting('add-confeccao-limite', 'measure'); 
setupInputFormatting('edit-confeccao-limite', 'measure');
}

function setupToggleCheckbox(checkboxId, containerId, inputId) {
    const chk = document.getElementById(checkboxId);
    const container = document.getElementById(containerId);
    const input = document.getElementById(inputId);
    
    if(!chk || !container) return;

    chk.addEventListener('change', () => {
        if(chk.checked) {
            container.classList.remove('hidden'); 
        } else {
            container.classList.add('hidden'); 
            if(input) input.value = ''; 
        }
    });
}

function getRenderFunction(tabela) { 
     switch (tabela) {
        case 'tecidos': return renderizarTabelaTecidos;
        case 'confeccao': return renderizarTabelaConfeccao;
        case 'trilho': return renderizarTabelaTrilho;
        case 'frete': return renderizarTabelaFrete;
        case 'instalacao': return renderizarTabelaInstalacao;
        default: return null;
    }
}
function renderizarTabelaFrete(opcoes) { 
     const tbody = elements.tabelaFreteBody;
     if (!tbody) return;
    tbody.innerHTML = '';
    const filtradas = (opcoes || []).filter(item => item.opcao !== '-');
    if (filtradas.length === 0) { tbody.innerHTML = '<tr><td colspan="2">Nenhuma opção encontrada.</td></tr>'; return; }

    filtradas.forEach(d => {
        const row = tbody.insertRow();
        row.dataset.id = d.id;
        row.dataset.opcao = d.opcao || ''; 
        row.dataset.valor = d.valor || 0;
        const opcaoTd = d.hasOwnProperty('opcao') ? `<td>${d.opcao}</td>` : '';
        row.innerHTML = `
            ${opcaoTd}
            <td>R$ ${formatDecimal(d.valor, 2)}</td>
            <td><button class="btn-editar">Editar</button><button class="btn-excluir">Excluir</button></td>`;
    });
}
function renderizarTabelaInstalacao(opcoes) { 
     const tbody = elements.tabelaInstalacaoBody;
     if (!tbody) return;
    tbody.innerHTML = '';
    const filtradas = (opcoes || []).filter(item => item.opcao !== '-');
   if (filtradas.length === 0) { tbody.innerHTML = '<tr><td colspan="2">Nenhuma opção encontrada.</td></tr>'; return; }

    filtradas.forEach(d => {
        const row = tbody.insertRow();
        row.dataset.id = d.id;
        row.dataset.opcao = d.opcao || '';
        row.dataset.valor = d.valor || 0;
        const opcaoTd = d.hasOwnProperty('opcao') ? `<td>${d.opcao}</td>` : '';
        row.innerHTML = `
             ${opcaoTd}
            <td>R$ ${formatDecimal(d.valor, 2)}</td>
            <td><button class="btn-editar">Editar</button><button class="btn-excluir">Excluir</button></td>`;
    });
}
function renderizarTabelaTecidos(tecidos) { 
    const tbody = elements.tabelaTecidosBody;
    if (!tbody) return;
    tbody.innerHTML = '';
    const tecidosFiltrados = (tecidos || []).filter(t => t.produto !== 'SEM TECIDO' && t.produto !== '-');
    if (tecidosFiltrados.length === 0) { tbody.innerHTML = '<tr><td colspan="5">Nenhum tecido encontrado.</td></tr>'; return; }

    tecidosFiltrados.forEach(d => {
        const row = tbody.insertRow();
        row.dataset.id = d.id; row.dataset.produto = d.produto; row.dataset.largura = d.largura || 0; row.dataset.atacado = d.atacado || 0; row.dataset.favorito = d.favorito || false;
        const favoritoClass = d.favorito ? 'favorito' : ''; const favoritoIcon = d.favorito ? '★' : '☆';
        row.innerHTML = `<td class="col-favorito-acao"><span class="btn-favorito ${favoritoClass}" title="Favoritar">${favoritoIcon}</span></td><td>${d.produto}</td><td>${formatDecimal(d.largura, 3)}</td><td>R$ ${formatDecimal(d.atacado, 2)}</td><td><button class="btn-editar">Editar</button><button class="btn-excluir">Excluir</button></td>`;
    });
}

function renderizarTabelaConfeccao(opcoes) {
    const tbody = elements.tabelaConfeccaoBody;
    if (!tbody) return;
    tbody.innerHTML = '';
    const filtradas = (opcoes || []).filter(item => item.opcao !== '-');
    if (filtradas.length === 0) { tbody.innerHTML = '<tr><td colspan="4">Nenhuma opção encontrada.</td></tr>'; return; }

    filtradas.forEach(d => {
        const row = tbody.insertRow();
        row.dataset.id = d.id; 
        row.dataset.opcao = d.opcao; 
        row.dataset.valor = d.valor || 0; 
        row.dataset.favorito = d.favorito || false;
        row.dataset.limite_largura = d.limite_largura || 0; 

        const favoritoClass = d.favorito ? 'favorito' : ''; 
        const favoritoIcon = d.favorito ? '★' : '☆';
        
        let regraTexto = '';
        if (d.limite_largura > 0) {
            regraTexto = `<br><span style="font-size:11px; color:#e06c6e;">(Maior que ${formatDecimal(d.limite_largura, 2)}m)</span>`;
        }

        row.innerHTML = `
            <td class="col-favorito-acao"><span class="btn-favorito ${favoritoClass}" title="Favoritar">${favoritoIcon}</span></td>
            <td>${d.opcao} ${regraTexto}</td>
            <td>R$ ${formatDecimal(d.valor, 2)}</td>
            <td><button class="btn-editar">Editar</button><button class="btn-excluir">Excluir</button></td>`;
    });
}

function renderizarTabelaTrilho(opcoes) { 
     const tbody = elements.tabelaTrilhoBody;
     if (!tbody) return;
    tbody.innerHTML = '';
    const filtradas = (opcoes || []).filter(item => item.opcao !== '-');
    if (filtradas.length === 0) { tbody.innerHTML = '<tr><td colspan="4">Nenhuma opção encontrada.</td></tr>'; return; }

    filtradas.forEach(d => {
        const row = tbody.insertRow();
        row.dataset.id = d.id; row.dataset.opcao = d.opcao; row.dataset.valor = d.valor || 0; row.dataset.favorito = d.favorito || false;
        const favoritoClass = d.favorito ? 'favorito' : ''; const favoritoIcon = d.favorito ? '★' : '☆';
        row.innerHTML = `<td class="col-favorito-acao"><span class="btn-favorito ${favoritoClass}" title="Favoritar">${favoritoIcon}</span></td><td>${d.opcao}</td><td>R$ ${formatDecimal(d.valor, 2)}</td><td><button class="btn-editar">Editar</button><button class="btn-excluir">Excluir</button></td>`;
    });
}

function setupCRUD(tabela) {
    const nomeCapitalizado = tabela.charAt(0).toUpperCase() + tabela.slice(1);
    const nomeSingular = nomeCapitalizado.replace(/s$/, '');
    let chaveNome = 'opcao';

    if (tabela === 'tecidos') {
        chaveNome = 'produto';
    } else if (tabela === 'frete' || tabela === 'instalacao') {
        const firstItem = dataArrays[tabela]?.[0];
        if (firstItem && firstItem.hasOwnProperty('opcao')) {
             chaveNome = 'opcao';
        } else {
             chaveNome = 'valor'; 
        }
    }

    if (tabela === 'confeccao') {
        setupToggleCheckbox('check-add-confeccao-limite', 'container-add-confeccao-limite', 'add-confeccao-limite');
        setupToggleCheckbox('check-edit-confeccao-limite', 'container-edit-confeccao-limite', 'edit-confeccao-limite');
    }

    const btnAbrirModalAdd = elements[`btnAbrirModalAdd${nomeCapitalizado}`];
    const modalAdd = elements[`modalAdd${nomeCapitalizado}`];
    const formAdd = elements[`formAdd${nomeCapitalizado}`];
    const btnCancelAdd = elements[`btnCancelAdd${nomeCapitalizado}`];

    const modalEdit = elements[`modalEdit${nomeCapitalizado}`];
    const formEdit = elements[`formEdit${nomeCapitalizado}`];
    const btnCancelEdit = elements[`btnCancelEdit${nomeCapitalizado}`];

    const tbody = elements[`tabela${nomeCapitalizado}Body`];

    if (btnAbrirModalAdd) btnAbrirModalAdd.addEventListener('click', () => {
        if(formAdd) {
            formAdd.reset();
            const inputs = formAdd.querySelectorAll('input[name="largura"], input[name="atacado"], input[name="valor"], input[name="limite_largura"]');
            inputs.forEach(input => input.value = ''); 
        }
        
        if (tabela === 'confeccao') {
            const chk = document.getElementById('check-add-confeccao-limite');
            const cont = document.getElementById('container-add-confeccao-limite');
            if(chk) chk.checked = false;
            if(cont) cont.classList.add('hidden'); 
        }

        openModal(modalAdd);
    });

    if (formAdd) {
        formAdd.addEventListener('submit', async (e) => {
            e.preventDefault();
            const dadosFormulario = getFormData(formAdd, tabela);
            const lojaId = await getMyLojaId(); 
            if (!lojaId) return;
            const dadosParaInserir = { ...dadosFormulario, loja_id: lojaId };
            const { error } = await _supabase.from(tabela).insert(dadosParaInserir);
            handleSaveResponse(error, modalAdd, tabela, `✅ ${nomeSingular} adicionado(a)!`);
        });
    }
    if (btnCancelAdd) btnCancelAdd.addEventListener('click', () => closeModal(modalAdd));

    if (formEdit) {
        formEdit.addEventListener('submit', async (e) => {
            e.preventDefault();
            const dadosFormulario = getFormData(formEdit, tabela);
            const id = formEdit.querySelector(`input[name="id"]`)?.value; 
            if (!id) return;
            const lojaId = await getMyLojaId(); 
            if (!lojaId) return;
            const updateData = {...dadosFormulario};
            delete updateData.id;
            const { error } = await _supabase.from(tabela).update(updateData).match({ id: id, loja_id: lojaId }); 
            handleSaveResponse(error, modalEdit, tabela, `✅ ${nomeSingular} atualizado(a)!`);
        });
    }
    if (btnCancelEdit) btnCancelEdit.addEventListener('click', () => closeModal(modalEdit));

    if (tbody) {
        tbody.addEventListener('click', async (e) => { 
            const target = e.target;
            const row = target.closest('tr');
            if (!row || !row.dataset.id) return;

            const id = row.dataset.id; 
            const nome = row.dataset[chaveNome] || row.dataset.valor || `item ${id}`; 

            if (target.classList.contains('btn-favorito')) { 
                 const lojaId = await getMyLojaId(); 
                 if (!lojaId) return;
                 const starElement = target;
                 const isFavorito = row.dataset.favorito === 'true';
                 const newStatus = !isFavorito;
                 starElement.textContent = newStatus ? '★' : '☆';
                 starElement.classList.toggle('favorito', newStatus);
                 row.dataset.favorito = newStatus;
                 const { error } = await _supabase.from(tabela).update({ favorito: newStatus }).match({ id: id, loja_id: lojaId }); 
                 if (error) { showToast('Erro ao atualizar favorito.', true); } 
                 else { 
                    const itemInData = dataArrays[tabela].find(item => item.id == id);
                    if (itemInData) itemInData.favorito = newStatus;
                    document.dispatchEvent(new CustomEvent(`tabela${nomeCapitalizado}SortRequest`));
                 }
                 return;
            }
            if (target.classList.contains('btn-excluir')) {
                const lojaId = await getMyLojaId(); 
                if (window.prepararExclusaoGenerica) window.prepararExclusaoGenerica({ id, nome, tabela, loja_id: lojaId, elemento: row });
                return; 
            }

            if (target.classList.contains('btn-editar')) {
                if(formEdit){
                    formEdit.querySelector(`input[name="id"]`).value = id;
                    
                    for (const key in row.dataset) {
                       const input = formEdit.querySelector(`[name="${key}"]`);
                       if(input && key !== 'id') {
                            const num = parseFloat(row.dataset[key].replace('R$', '').replace(',', '.')) || 0; 
                            if (num === 0 && (key === 'largura' || key === 'atacado' || key === 'valor')) {
                                input.value = ''; 
                            } else if (key === 'largura') {
                                input.value = formatDecimal(row.dataset[key], 3); 
                            } else if (key === 'atacado' || key === 'valor') {
                                input.value = `R$ ${formatDecimal(row.dataset[key], 2)}`; 
                            } else {
                                input.value = row.dataset[key]; 
                            }
                       }
                    }

                    if (tabela === 'confeccao') {
                        const limiteVal = parseFloat(row.dataset.limite_largura) || 0;
                        const chk = document.getElementById('check-edit-confeccao-limite');
                        const container = document.getElementById('container-edit-confeccao-limite');
                        const inputLimite = document.getElementById('edit-confeccao-limite');

                        if (chk && container && inputLimite) {
                            if (limiteVal > 0) {
                                chk.checked = true;
                                container.classList.remove('hidden'); 
                                inputLimite.value = formatDecimal(limiteVal, 3);
                            } else {
                                chk.checked = false;
                                container.classList.add('hidden'); 
                                inputLimite.value = '';
                            }
                        }
                    }
                }
                openModal(modalEdit);
                return; 
            }
        });
    }
}

function getFormData(form, tabela) {
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
        if (key === 'largura' || key === 'atacado' || key === 'valor' || key === 'limite_largura') {
            const valorLimpo = String(value).replace('R$', '').trim();
            const valorNumerico = valorLimpo.replace(',', '.');
            data[key] = value === '' ? null : (parseFloat(valorNumerico) || 0);
        } else {
            data[key] = value;
        }
    });
    return data;
}

async function handleSaveResponse(error, modalToClose, tabela, successMessage) {
    if (error) {
        console.error(`Erro ao salvar ${tabela}:`, error);
        let userMessage = `Erro ao salvar ${tabela}.`;
        if (error.message.includes('violates row-level security policy')) {
            userMessage += " Verifique suas permissões ou o status da sua assinatura.";
        } else if (error.message.includes('violates not-null constraint') && error.message.includes('loja_id')) {
            userMessage += " Erro interno: loja não identificada.";
        } else if (error.message.includes('duplicate key value violates unique constraint')) {
            userMessage += " Já existe um item com este nome/opção.";
        } else {
             userMessage += ` Detalhe: ${error.message}`;
        }
        showToast(userMessage, "error");
    } else {
        closeModal(modalToClose);
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
            item[chaveNome] && String(item[chaveNome]).toLowerCase().includes(termo)
        );
        renderFunction(dadosFiltrados); 
    });
}

export {
    initDataManager,
    renderizarTabelaFrete,
    renderizarTabelaInstalacao,
    renderizarTabelaTecidos,
    renderizarTabelaConfeccao,
    renderizarTabelaTrilho
};