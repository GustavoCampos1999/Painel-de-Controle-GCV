import { _supabase } from './supabaseClient.js';
import { checkUserSession, setupLogoutButton } from './modules/auth.js';
import { initUI, showToast, openModal, closeModal } from './modules/ui.js'; 
import { initCRM, carregarClientes } from './modules/crm.js';
import { initDataManager, carregarDados, renderizarTabelaTecidos, renderizarTabelaConfeccao, renderizarTabelaTrilho, renderizarTabelaFrete, renderizarTabelaInstalacao } from './modules/dataManager.js';
import { initCalculator, showCalculatorView } from './modules/calculator.js';

let tecidosDataGlobal = [];
let confeccaoDataGlobal = [];
let trilhoDataGlobal = [];
let freteDataGlobal = []; 
let instalacaoDataGlobal = []; 
let currentClientIdGlobal = { value: null };
let isDataLoadedFlag = { value: false }; 
let itemParaExcluirGenericoInfo = null;
let triggerTecidosSort = null;
let triggerConfeccaoSort = null; 
let triggerTrilhoSort = null; 
let triggerFreteSort = null; 
let triggerInstalacaoSort = null;
let elements = {}; 

function showClientListLocal() {
    if (document.getElementById('client-list-view')) document.getElementById('client-list-view').style.display = 'block';
    if (document.getElementById('calculator-view')) document.getElementById('calculator-view').style.display = 'none';
    currentClientIdGlobal.value = null;
    
    if (window.location.hash) {
        window.location.hash = '';
    }
}

function handleRouting() {
    const hash = window.location.hash;

    if (hash.startsWith('#cliente/')) {
        const clientId = hash.split('/')[1];
        if (!clientId) {
            showClientListLocal();
            return;
        }

        const card = elements.listaClientes.querySelector(`.cliente-card[data-id="${clientId}"]`);
        
        if (card) {
            const clientName = card.dataset.nome;
            currentClientIdGlobal.value = clientId;
            showCalculatorView(clientId, clientName);
        } else {
            console.warn(`Roteador: Cliente ${clientId} não encontrado no DOM. Recarregando clientes...`);
            carregarClientes().then(() => {
                 const cardRetry = elements.listaClientes.querySelector(`.cliente-card[data-id="${clientId}"]`);
                 if(cardRetry) {
                     const clientName = cardRetry.dataset.nome;
                     currentClientIdGlobal.value = clientId;
                     showCalculatorView(clientId, clientName);
                 } else {
                    console.error(`Cliente ${clientId} não encontrado.`);
                    showToast(`Cliente com ID ${clientId} não encontrado.`, 'error');
                    showClientListLocal();
                 }
            });
        }
    } else {
        showClientListLocal();
    }
}


document.addEventListener('DOMContentLoaded', () => {
    
    const loadingOverlay = document.getElementById('loading-overlay');
    
    elements = {
        toast: document.getElementById('toast-notification'),
        userEmail: document.getElementById('user-email'),
        btnLogout: document.getElementById('btn-logout'),
        clientListView: document.getElementById('client-list-view'),
        calculatorView: document.getElementById('calculator-view'),
        listaClientes: document.getElementById('lista-clientes'),
        inputPesquisaClientes: document.getElementById('input-pesquisa'),
        btnToggleFilter: document.getElementById('btn-toggle-filter'),
        selectClientFilter: document.getElementById('select-client-filter'),
        modalAddCliente: document.getElementById('modal-add-cliente'),
        formAddCliente: document.getElementById('form-add-cliente'),
        modalEditarCliente: document.getElementById('modal-editar-cliente'),
        formEditarCliente: document.getElementById('form-editar-cliente'),
        modalExcluirCliente: document.getElementById('modal-confirm-excluir-cliente'),
        btnConfirmarExcluirCliente: document.getElementById('btn-confirmar-excluir-cliente'),
        tabelaTecidosBody: document.querySelector('#tabela-tecidos-body'),
        tabelaConfeccaoBody: document.querySelector('#tabela-confeccao-body'),
        tabelaTrilhoBody: document.querySelector('#tabela-trilho-body'),
        inputPesquisaTecidos: document.getElementById('input-pesquisa-tecidos'),
        inputPesquisaConfeccao: document.getElementById('input-pesquisa-confeccao'),
        inputPesquisaTrilho: document.getElementById('input-pesquisa-trilho'),
        btnAbrirModalAddTecidos: document.getElementById('btn-abrir-modal-add-tecido'),
        modalAddTecidos: document.getElementById('modal-add-tecido'),
        formAddTecidos: document.getElementById('form-add-tecido'),
        btnCancelAddTecidos: document.getElementById('btn-cancelar-add-tecido'),
        btnAbrirModalAddConfeccao: document.getElementById('btn-abrir-modal-add-confeccao'),
        modalAddConfeccao: document.getElementById('modal-add-confeccao'),
        formAddConfeccao: document.getElementById('form-add-confeccao'),
        btnCancelAddConfeccao: document.getElementById('btn-cancelar-add-confeccao'),
        btnAbrirModalAddTrilho: document.getElementById('btn-abrir-modal-add-trilho'),
        modalAddTrilho: document.getElementById('modal-add-trilho'),
        formAddTrilho: document.getElementById('form-add-trilho'),
        btnCancelAddTrilho: document.getElementById('btn-cancelar-add-trilho'),
        modalEditTecidos: document.getElementById('modal-edit-tecido'),
        formEditTecidos: document.getElementById('form-edit-tecido'),
        btnCancelEditTecidos: document.getElementById('btn-cancelar-edit-tecido'),
        modalEditConfeccao: document.getElementById('modal-edit-confeccao'),
        formEditConfeccao: document.getElementById('form-edit-confeccao'),
        btnCancelEditConfeccao: document.getElementById('btn-cancelar-edit-confeccao'),
        modalEditTrilho: document.getElementById('modal-edit-trilho'),
        formEditTrilho: document.getElementById('form-edit-trilho'),
        btnCancelEditTrilho: document.getElementById('btn-cancelar-edit-trilho'),
        tabelaFreteBody: document.querySelector('#tabela-frete-body'),
        inputPesquisaFrete: document.getElementById('input-pesquisa-frete'),
        btnAbrirModalAddFrete: document.getElementById('btn-abrir-modal-add-frete'),
        modalAddFrete: document.getElementById('modal-add-frete'),
        formAddFrete: document.getElementById('form-add-frete'),
        btnCancelAddFrete: document.getElementById('btn-cancelar-add-frete'),
        modalEditFrete: document.getElementById('modal-edit-frete'),
        formEditFrete: document.getElementById('form-edit-frete'),
        btnCancelEditFrete: document.getElementById('btn-cancelar-edit-frete'),
        tabelaInstalacaoBody: document.querySelector('#tabela-instalacao-body'),
        inputPesquisaInstalacao: document.getElementById('input-pesquisa-instalacao'),
        btnAbrirModalAddInstalacao: document.getElementById('btn-abrir-modal-add-instalacao'),
        modalAddInstalacao: document.getElementById('modal-add-instalacao'),
        formAddInstalacao: document.getElementById('form-add-instalacao'),
        btnCancelAddInstalacao: document.getElementById('btn-cancelar-add-instalacao'),
        modalEditInstalacao: document.getElementById('modal-edit-instalacao'),
        formEditInstalacao: document.getElementById('form-edit-instalacao'),
        btnCancelEditInstalacao: document.getElementById('btn-cancelar-edit-instalacao'),
        modalExcluirGenerico: document.getElementById('modal-confirm-excluir-generico'),
        btnConfirmarExcluirGenerico: document.getElementById('btn-confirmar-excluir-generico'),
        btnCancelExcluirGenerico: document.getElementById('btn-cancelar-excluir-generico'),
        spanItemNomeExcluir: document.getElementById('item-nome-excluir'),
        calculatorClientName: document.getElementById('calculator-client-name'),
        calculatorTableBody: document.getElementById('corpo-tabela-calculo-cliente'),
        saveStatusMessage: document.getElementById('save-status-message'),
        btnManualSave: document.getElementById('btn-manual-save'),
        calculatorMarkupInput: document.getElementById('input-markup-base-calc'),
        selectParcelamentoGlobal: document.getElementById('select-parcelamento-global'),
        inputValorEntradaGlobal: document.getElementById('input-valor-entrada-global'),
        selectFreteGlobal: document.getElementById('select-frete-global'),
        thParceladoHeader: document.getElementById('th-parcelado-header'),
        btnVoltarClientes: document.getElementById('btn-voltar-clientes'),
        modalExcluirLinha: document.getElementById('modal-confirm-excluir-linha'),
        btnConfirmarExcluirLinha: document.getElementById('btn-confirmar-excluir-linha'),
        btnCancelarExcluirLinha: document.getElementById('btn-cancelar-excluir-linha'),
        spanAmbienteNomeExcluir: document.getElementById('ambiente-nome-excluir'),
        btnAbrirConfigCalculadora: document.getElementById('btn-abrir-config-calculadora'),
        modalConfigCalculadora: document.getElementById('modal-config-calculadora'),
        btnFecharConfigCalculadora: document.getElementById('btn-fechar-config-calculadora'),
        tabsContainer: document.getElementById('calc-tabs-container'),
        btnAddAba: document.getElementById('btn-add-aba-calc'),
        summaryContainer: document.getElementById('calculator-summary'),
        summaryTotalAvista: document.getElementById('summary-total-avista'),
        summaryTotalParcelado: document.getElementById('summary-total-parcelado'),
        summaryParceladoLabel: document.getElementById('summary-parcelado-label'),
        summaryTotalEntrada: document.getElementById('summary-total-entrada'),
        summaryTotalEntradaValue: document.getElementById('summary-total-entrada-value'),
        summaryTotalRestante: document.getElementById('summary-total-restante'),
        summaryRestanteLabel: document.getElementById('summary-restante-label'),
        summaryTotalRestanteValue: document.getElementById('summary-total-restante-value'),
        modalExcluirAba: document.getElementById('modal-confirm-excluir-aba'),
        btnConfirmarExcluirAba: document.getElementById('btn-confirmar-excluir-aba'),
        btnCancelarExcluirAba: document.getElementById('btn-cancelar-excluir-aba'),
        spanAbaNomeExcluir: document.getElementById('aba-nome-excluir'),
        chkSummaryVendaRealizada: document.getElementById('chk-summary-venda-realizada'),
        modalConfirmSair: document.getElementById('modal-confirm-sair'),
        btnCancelarSair: document.getElementById('btn-cancelar-sair'),
        btnConfirmarSair: document.getElementById('btn-confirmar-sair'),
        btnSalvarESair: document.getElementById('btn-salvar-e-sair'),
        btnThemeToggle: document.getElementById('btn-theme-toggle')
    };

    const dataRefs = {
        tecidos: tecidosDataGlobal,
        confeccao: confeccaoDataGlobal,
        trilho: trilhoDataGlobal,
        frete: freteDataGlobal, 
        instalacao: instalacaoDataGlobal
    };
    const calculatorDataRefs = {
         tecidos: tecidosDataGlobal, 
         confeccao: {},
         trilho: {},
         frete: {}, 
         instalacao: {} 
    };

    checkUserSession(); 
    setupLogoutButton(); 
    initUI(elements); 
if (elements.btnThemeToggle) {
        const body = document.body;
        
        const applyTheme = (theme) => {
            if (theme === 'dark') {
                body.classList.add('dark-mode');
                elements.btnThemeToggle.textContent = '☀️'; 
            } else {
                body.classList.remove('dark-mode');
                elements.btnThemeToggle.textContent = '🌙'; 
            }
        };
        
        const currentTheme = localStorage.getItem('theme') || 'light';
        applyTheme(currentTheme);

        elements.btnThemeToggle.addEventListener('click', () => {
            let newTheme = body.classList.contains('dark-mode') ? 'light' : 'dark';
            localStorage.setItem('theme', newTheme);
            elements.btnThemeToggle.classList.add('toggling');
            applyTheme(newTheme);
            setTimeout(() => {
                elements.btnThemeToggle.classList.remove('toggling');
            }, 400); 
        });
    }
    initCRM(elements);
    initDataManager(elements, dataRefs);
    initCalculator(elements, calculatorDataRefs, currentClientIdGlobal, isDataLoadedFlag); 

    document.addEventListener('clienteAtualizado', () => {
        console.log("Evento 'clienteAtualizado' recebido, recarregando lista de clientes.");
        carregarClientes(); 
    });

    if (elements.btnAbrirConfigCalculadora) {
        elements.btnAbrirConfigCalculadora.addEventListener('click', () => {
            openModal(elements.modalConfigCalculadora);
        });
    }
    if (elements.btnFecharConfigCalculadora) {
        elements.btnFecharConfigCalculadora.addEventListener('click', () => {
            closeModal(elements.modalConfigCalculadora);
        });
    }

    if (elements.btnConfirmarExcluirGenerico) {
        elements.btnConfirmarExcluirGenerico.addEventListener('click', async () => {
            if (!itemParaExcluirGenericoInfo) return;
            const { id, tabela } = itemParaExcluirGenericoInfo;
            const { error } = await _supabase.from(tabela).delete().match({ id: id });
            
            if (error) {
                console.error(`Erro ao excluir ${tabela}:`, error);
                showToast(`Erro ao excluir: ${error.message}`, 'error');
            } else {
                showToast('Item excluído com sucesso.');
                itemParaExcluirGenericoInfo.elemento?.remove();
                document.dispatchEvent(new CustomEvent('dadosBaseAlterados')); 
            }
            closeModal(elements.modalExcluirGenerico);
            itemParaExcluirGenericoInfo = null;
        });
    }
    if (elements.btnCancelExcluirGenerico) {
        elements.btnCancelExcluirGenerico.addEventListener('click', () => {
            closeModal(elements.modalExcluirGenerico);
            itemParaExcluirGenericoInfo = null;
        });
    }
    window.prepararExclusaoGenerica = (info) => {
        itemParaExcluirGenericoInfo = info;
        if (elements.spanItemNomeExcluir) {
            elements.spanItemNomeExcluir.textContent = info.nome || 'este item';
        }
        openModal(elements.modalExcluirGenerico);
    };
    document.addEventListener('tabelaTecidosSortRequest', () => {
        if (triggerTecidosSort) {
            triggerTecidosSort(); 
        } else {
            console.warn("triggerTecidosSort não está definido.");
        }
    });

    document.addEventListener('tabelaConfeccaoSortRequest', () => {
        if (triggerConfeccaoSort) {
            triggerConfeccaoSort();
        } else {
            console.warn("triggerConfeccaoSort não está definido.");
        }
    });

    document.addEventListener('tabelaTrilhoSortRequest', () => {
        if (triggerTrilhoSort) {
            triggerTrilhoSort();
        } else {
            console.warn("triggerTrilhoSort não está definido.");
        }
    });
    document.addEventListener('tabelaFreteSortRequest', () => {
        if (triggerFreteSort) {
            triggerFreteSort();
        } else {
            console.warn("triggerFreteSort não está definido.");
        }
    });
    document.addEventListener('tabelaInstalacaoSortRequest', () => {
        if (triggerInstalacaoSort) {
            triggerInstalacaoSort();
        } else {
            console.warn("triggerInstalacaoSort não está definido.");
        }
    });
    console.log("Iniciando carregamento de todos os dados...");
    Promise.all([
        carregarClientes(),
        carregarDados('tecidos', 'produto'),
        carregarDados('confeccao', 'opcao'), 
        carregarDados('trilho', 'opcao'),
        carregarDados('frete', 'valor'),
        carregarDados('instalacao', 'valor') 
    ]).then(() => {
        console.log("Todos os dados carregados, configurando ordenação...");
         setupTableSorting('tabela-tecidos', dataRefs.tecidos, renderizarTabelaTecidos);
         setupTableSorting('tabela-confeccao', dataRefs.confeccao, renderizarTabelaConfeccao);
         setupTableSorting('tabela-trilho', dataRefs.trilho, renderizarTabelaTrilho);
         setupTableSorting('tabela-frete', dataRefs.frete, renderizarTabelaFrete);
         setupTableSorting('tabela-instalacao', dataRefs.instalacao, renderizarTabelaInstalacao);

         calculatorDataRefs.tecidos = dataRefs.tecidos; 
         calculatorDataRefs.confeccao = (dataRefs.confeccao || []).reduce((acc, item) => { acc[item.opcao] = item.valor; return acc; }, {});
         calculatorDataRefs.trilho = (dataRefs.trilho || []).reduce((acc, item) => { acc[item.opcao] = item.valor; return acc; }, {});
        calculatorDataRefs.frete = (dataRefs.frete || []).reduce((acc, item) => {
             const key = 'R$ ' + (item.valor || 0).toFixed(2).replace('.', ',');
             acc[key] = item.valor; 
             return acc; 
         }, {});
         calculatorDataRefs.instalacao = (dataRefs.instalacao || []).reduce((acc, item) => {
             const key = 'R$ ' + (item.valor || 0).toFixed(2).replace('.', ',');
             acc[key] = item.valor; 
             return acc; 
         }, {});
         isDataLoadedFlag.value = true;

         if (loadingOverlay) {
            loadingOverlay.style.opacity = '0';
            setTimeout(() => { loadingOverlay.style.display = 'none'; }, 500); 
        }
        
        console.log("Iniciando roteador...");
        handleRouting();
        window.addEventListener('hashchange', handleRouting);

    }).catch(error => {
        console.error("Erro no fluxo de carregamento inicial:", error);
        showToast("Erro crítico ao inicializar. Verifique o console.", 'error');
        if (loadingOverlay) {
            loadingOverlay.innerHTML = '<p style="color: red; padding: 20px; text-align: center;">Erro crítico ao carregar dados.<br>Verifique o console e sua conexão com o backend.</p>';
        }
    });

});

function setupTableSorting(tableId, dataArray, renderFunction) {
    const table = document.getElementById(tableId);
    if (!table) {
        console.warn(`Tabela com ID '${tableId}' não encontrada para ordenação.`);
        return;
    }
    const headers = table.querySelectorAll('th.sortable-header');
    let sortConfig = { key: null, asc: true };

    const sortAndRender = () => {
        dataArray.sort((a, b) => {
            if (a.hasOwnProperty('favorito') && b.hasOwnProperty('favorito')) {
                if (a.favorito && !b.favorito) return -1;
                if (!a.favorito && b.favorito) return 1;
            }
            
            if (sortConfig.key) {
                let valA = a[sortConfig.key];
                let valB = b[sortConfig.key];
                if (typeof valA === 'number' && typeof valB === 'number') {
                    return sortConfig.asc ? valA - valB : valB - valA;
                }
                if (typeof valA === 'string' && typeof valB === 'string') {
                    return sortConfig.asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
                }
                if (valA > valB || valA === null) return sortConfig.asc ? 1 : -1;
                if (valA < valB || valB === null) return sortConfig.asc ? -1 : 1;
            }
            return 0;
        });
        renderFunction(dataArray);
    };

   if (tableId === 'tabela-tecidos') {
        triggerTecidosSort = sortAndRender;
    } else if (tableId === 'tabela-confeccao') {
        triggerConfeccaoSort = sortAndRender;
    } else if (tableId === 'tabela-trilho') { 
        triggerTrilhoSort = sortAndRender;
    }
    else if (tableId === 'tabela-frete') { 
        triggerFreteSort = sortAndRender;
    }
    else if (tableId === 'tabela-instalacao') { 
        triggerInstalacaoSort = sortAndRender;
    }

    headers.forEach(header => {
        header.addEventListener('click', () => {
            const sortKey = header.dataset.sortKey;
            if (!sortKey) {
                console.warn("Cabeçalho clicável não possui 'data-sort-key'.");
                return;
            }

            let newAsc = true;
            if (sortConfig.key === sortKey) {
                newAsc = !sortConfig.asc; 
            }

            headers.forEach(h => {
                h.classList.remove('asc', 'desc');
                const span = h.querySelector('span.sort-arrow');
                if (span) span.textContent = '';
            });

            header.classList.add(newAsc ? 'asc' : 'desc');
            const arrowSpan = header.querySelector('span.sort-arrow');
            if (arrowSpan) {
                arrowSpan.textContent = newAsc ? ' ▲' : ' ▼';
            }
            
            sortConfig = { key: sortKey, asc: newAsc };
            sortAndRender(); 
        });
    });

    if (headers.length > 0) {
        const initialSortKey = headers[0].dataset.sortKey; 
        if (initialSortKey) {
            sortConfig = { key: initialSortKey, asc: true };
            headers[0].classList.add('asc');
            const arrowSpan = headers[0].querySelector('span.sort-arrow');
            if (arrowSpan) arrowSpan.textContent = ' ▲';
        }
    }
    sortAndRender(); 
}