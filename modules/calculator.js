import { showToast, openModal, closeModal } from './ui.js';
import { _supabase } from '../supabaseClient.js'; 

const BACKEND_API_URL = 'https://painel-de-controle-gcv.onrender.com';

const DADOS_FRANZ_CORTINA = ["3.0", "2.8", "2.5", "2.0", "1.5", "1.2", "1.0"];
const DADOS_FRANZ_BLACKOUT = ["2.5", "2.0", "1.5", "1.2", "1.0"];
const TAXAS_PARCELAMENTO = {
    'DÉBITO': 0.0099, '1x': 0.0299, '2x': 0.0409, '3x': 0.0478, '4x': 0.0547, '5x': 0.0614, 
    '6x': 0.0681, '7x': 0.0767, '8x': 0.0833, '9x': 0.0898, '10x': 0.0963, '11x': 0.1026,
    '12x': 0.1090, '13x': 0.1152, '14x': 0.1214, '15x': 0.1276, '16x': 0.1337, '17x': 0.1397,
    '18x': 0.1457
};
const DADOS_MODELO_CORTINA = [
    "CELULAR", "ATENA", "ATENA PAINEL", "CORTINA TETO", "ILLUMINE", "LAMOUR", 
    "LUMIERE", "MELIADE", "ROLO STILLO", "PAINEL", "PERSIANA VERTICAL", 
    "PH 25", "PH 50", "PH 75", "PLISSADA", "ROLO", "ROMANA", 
    "TRILHO MOTORIZADO", "VERTIGLISS"
];
const DADOS_MODELO_TOLDO = [
 "PERGOLA", "BALI", "BERGAMO", "BERLIM", "CAPRI", "MILAO", "MILAO COMPACT", 
    "MILAO MATIK", "MILAO PLUS", "MILAO SEMI BOX", "MONACO", "ZURIQUE", "ZIP SYSTEM"
];
const DADOS_COR_ACESSORIOS = [
  "PADRAO", "BRANCO", "BRONZE", "CINZA", "MARFIM", "MARROM", "PRETO"
];
const DADOS_COMANDO = ["MANUAL", "MOTORIZADO"];

async function getAuthToken() {
  const { data: { session }, error } = await _supabase.auth.getSession();
  if (error || !session) {
    showToast("Sessão inválida ou expirada. Faça login novamente.", "error");
    console.error("Erro ao obter sessão:", error);
    return null;
  }
  return session.access_token;
}


function obterEstadoSection(sectionElement) {
    const sectionType = sectionElement.dataset.sectionType;
    const todasLinhas = sectionElement.querySelectorAll('.linha-calculo-cliente');
    const dadosSecao = [];

    todasLinhas.forEach(linhaCalc => {
        let estadoLinha = {
            ambiente: linhaCalc.querySelector('.input-ambiente')?.value || '',
            largura: linhaCalc.querySelector('.input-largura')?.value || '',
            altura: linhaCalc.querySelector('.input-altura')?.value || '',
            selecionado: linhaCalc.querySelector('.select-linha-checkbox')?.checked || false
        };
        if (sectionType === 'tecido') {
            estadoLinha.franzCortina = linhaCalc.querySelector('.select-franzCortina')?.value || '';
            estadoLinha.codTecidoCortina = linhaCalc.querySelector('.select-codTecidoCortina')?.value || 'SEM TECIDO';
            estadoLinha.codTecidoForro = linhaCalc.querySelector('.select-codTecidoForro')?.value || 'SEM TECIDO';
            estadoLinha.franzBlackout = linhaCalc.querySelector('.select-franzBlackout')?.value || '1.2';
            estadoLinha.codTecidoBlackout = linhaCalc.querySelector('.select-codTecidoBlackout')?.value || 'SEM TECIDO';
            estadoLinha.confecaoTexto = linhaCalc.querySelector('.select-confecao')?.value || '-';
            estadoLinha.trilhoTexto = linhaCalc.querySelector('.select-trilho')?.value || '-';
            estadoLinha.instalacao = linhaCalc.querySelector('.select-instalacao')?.value || '';
            estadoLinha.outros = linhaCalc.querySelector('.input-outros')?.value || '';
            estadoLinha.observacao = linhaCalc.querySelector('.input-observacao')?.value || '';

        } else if (sectionType === 'amorim') {
            estadoLinha.modelo_cortina = linhaCalc.querySelector('.select-modelo-cortina')?.value || '';
            estadoLinha.codigo_tecido = linhaCalc.querySelector('.input-cod-tecido')?.value || '';
            estadoLinha.colecao = linhaCalc.querySelector('.input-colecao')?.value || '';
            estadoLinha.cor_acessorios = linhaCalc.querySelector('.select-cor-acessorios')?.value || '';
            estadoLinha.comando = linhaCalc.querySelector('.select-comando')?.value || '';
            if (estadoLinha.comando === 'MOTORIZADO') {
                estadoLinha.altura_comando = linhaCalc.querySelector('.select-altura-comando-motor')?.value || '';
            } else {
                estadoLinha.altura_comando = linhaCalc.querySelector('.input-altura-comando-manual')?.value || '';
            }
            estadoLinha.valor_manual = linhaCalc.querySelector('.input-valor-manual')?.value || '';
            estadoLinha.observacao = linhaCalc.querySelector('.input-observacao')?.value || '';

        } else if (sectionType === 'toldos') {
            estadoLinha.modelo_toldo = linhaCalc.querySelector('.select-modelo-toldo')?.value || '';
            estadoLinha.codigo_tecido = linhaCalc.querySelector('.input-cod-tecido')?.value || '';
            estadoLinha.colecao = linhaCalc.querySelector('.input-colecao')?.value || '';
            estadoLinha.cor_acessorios = linhaCalc.querySelector('.select-cor-acessorios')?.value || '';
            estadoLinha.comando = linhaCalc.querySelector('.select-comando')?.value || '';
            if (estadoLinha.comando === 'MOTORIZADO') {
                estadoLinha.altura_comando = linhaCalc.querySelector('.select-altura-comando-motor')?.value || '';
            } else {
                estadoLinha.altura_comando = linhaCalc.querySelector('.input-altura-comando-manual')?.value || '';
            }
            estadoLinha.valor_manual = linhaCalc.querySelector('.input-valor-manual')?.value || '';
            estadoLinha.observacao = linhaCalc.querySelector('.input-observacao')?.value || '';
        }
        dadosSecao.push(estadoLinha);
    });
    return dadosSecao;
}

let elements = {};
let dataRefs = {};
let currentClientIdRef = { value: null };
let isDataLoadedRef = { value: false };
const formatadorReaisCalc = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
let estadoAbas = [];
let abaAtivaIndex = 0;
let linhaParaExcluir = null;
let abaParaExcluir = { index: null, element: null };
let secaoParaExcluir = { element: null, type: null, button: null };
let isDirty = false;

function setDirty() {
    if (isDirty) return; 
    isDirty = true;
    if (elements.btnManualSave && !elements.btnManualSave.disabled) {
        elements.btnManualSave.classList.remove('hidden');
    }
}

function setupDecimalFormatting(inputElement, decimalPlaces = 2) {
    if (!inputElement) return;

    inputElement.addEventListener('focus', (e) => {
        let value = e.target.value.replace(',', '.');
        let num = parseFloat(value);
        if (!isNaN(num) && num !== 0) {
            e.target.value = String(num).replace('.', ',');
        } else {
            e.target.value = '';
        }
    });

    inputElement.addEventListener('blur', (e) => {
        let value = e.target.value;
        let num = parseFloat(String(value).replace(',', '.')) || 0;
        
        e.target.value = num.toFixed(decimalPlaces).replace('.', ',');
    });
}

function setupCurrencyFormatting(inputElement) {
    if (!inputElement) return;

    inputElement.addEventListener('focus', (e) => {
        let v = e.target.value.replace("R$", "").trim().replace(/\./g, "").replace(",", ".");
        let n = parseFloat(v) || 0;
        e.target.value = (n > 0) ? String(n).replace('.', ',') : '';
    });

    inputElement.addEventListener('blur', (e) => {
         let n = parseFloat(String(e.target.value).replace(',', '.')) || 0;
         e.target.value = n !== 0 ? formatadorReaisCalc.format(n) : '';
         recalcularTotaisSelecionados();
         setDirty();
    });
}

export function initCalculator(domElements, dataArrays, clientIdRef, isDataLoadedFlag) {
    elements = domElements;
    dataRefs = dataArrays;
    currentClientIdRef = clientIdRef;
    isDataLoadedRef = isDataLoadedFlag;
    
    if (elements.btnVoltarClientes) {
        elements.btnVoltarClientes.addEventListener('click', async () => {
            if (isDirty) {
                openModal(elements.modalConfirmSair);
            } else {
                window.location.hash = '';
            }
        });
    }

    const btnAddSectionTecido = document.getElementById('btn-add-section-tecido');
    const btnAddSectionAmorim = document.getElementById('btn-add-section-amorim');
    const btnAddSectionToldos = document.getElementById('btn-add-section-toldos');
    
    if (btnAddSectionTecido) btnAddSectionTecido.addEventListener('click', (e) => addSection('tecido', e.target));
    if (btnAddSectionAmorim) btnAddSectionAmorim.addEventListener('click', (e) => addSection('amorim', e.target));
    if (btnAddSectionToldos) btnAddSectionToldos.addEventListener('click', (e) => addSection('toldos', e.target));

    const globalTriggers = document.querySelectorAll('.global-calc-trigger');
    globalTriggers.forEach(input => {
        const eventType = (input.tagName === 'SELECT') ? 'change' : 'input';
        input.removeEventListener(eventType, recalcularTodasLinhas); 
        input.addEventListener(eventType, () => {
            recalcularTodasLinhas();
            recalcularTotaisSelecionados(); 
            setDirty();
        });
    });

    if (elements.btnConfirmarExcluirLinha) {
        elements.btnConfirmarExcluirLinha.addEventListener('click', () => {
            if (linhaParaExcluir) {
                linhaParaExcluir.remove();
                recalcularTotaisSelecionados();
                setDirty();
            }
            closeModal(elements.modalExcluirLinha); 
            linhaParaExcluir = null;
        });
    }

    if (elements.btnCancelarExcluirLinha) {
        elements.btnCancelarExcluirLinha.addEventListener('click', () => {
            closeModal(elements.modalExcluirLinha);
            linhaParaExcluir = null;
        });
    }

    if (elements.btnManualSave) {
        elements.btnManualSave.addEventListener('click', async () => {
            if (!currentClientIdRef.value) {
                console.log("Save: Nenhum cliente selecionado.");
                return;
            }
            
            elements.btnManualSave.disabled = true;
            if (elements.saveStatusMessage) {
                elements.saveStatusMessage.textContent = 'Salvando...';
                elements.saveStatusMessage.className = 'save-status-message saving';
            }
            
            await salvarEstadoCalculadora(currentClientIdRef.value);
            
            elements.btnManualSave.disabled = false;
        });
    }
if (elements.btnPrintOrcamento) {
    elements.btnPrintOrcamento.addEventListener('click', () => {
        window.print();
    });
}
    if (elements.btnConfirmarSair) {
        elements.btnConfirmarSair.addEventListener('click', () => {
            isDirty = false; 
            closeModal(elements.modalConfirmSair);
            window.location.hash = ''; 
        });
    }
    if (elements.btnCancelarSair) {
        elements.btnCancelarSair.addEventListener('click', () => {
            closeModal(elements.modalConfirmSair);
        });
    }
    
    if (elements.btnSalvarESair) {
        elements.btnSalvarESair.addEventListener('click', async () => {
            elements.btnSalvarESair.disabled = true;
            elements.btnConfirmarSair.disabled = true;
            elements.btnCancelarSair.disabled = true;
            elements.btnSalvarESair.textContent = "Salvando...";

            await salvarEstadoCalculadora(currentClientIdRef.value);

            elements.btnSalvarESair.disabled = false;
            elements.btnConfirmarSair.disabled = false;
            elements.btnCancelarSair.disabled = false;
            elements.btnSalvarESair.textContent = "Sair e Salvar";

            if (!isDirty) {
                closeModal(elements.modalConfirmSair);
                window.location.hash = '';
            }
        });
    }

    if (elements.selectParcelamentoGlobal) {
    elements.selectParcelamentoGlobal.addEventListener('change', () => {
         atualizarHeaderParcelado();
         recalcularParceladoAmorimToldos(); 
         recalcularTotaisSelecionados(); 
         setDirty();
    });
}

    setupCurrencyFormatting(elements.inputValorEntradaGlobal);

    if (elements.btnAddAba) {
        elements.btnAddAba.addEventListener('click', adicionarAba);
    }

    if (elements.tabsContainer) {
        elements.tabsContainer.addEventListener('click', (e) => {
            const tabElement = e.target.closest('.calc-tab');
            if (!tabElement) return;
            const tabIndex = parseInt(tabElement.dataset.index, 10);

            if (e.target.classList.contains('btn-close-aba')) {
                prepararExclusaoAba(tabIndex, tabElement);
            } else if (tabIndex !== abaAtivaIndex) {
                ativarAba(tabIndex);
            }
        });
        
        elements.tabsContainer.addEventListener('dblclick', (e) => {
             const tabNameElement = e.target.closest('.calc-tab-name');
             if(tabNameElement) {
                renomearAba(tabNameElement);
             }
        });

        let lastTap = 0;
        elements.tabsContainer.addEventListener('touchend', (e) => {
            const tabNameElement = e.target.closest('.calc-tab-name');
            if (!tabNameElement) return;

            const now = new Date().getTime();
            const timeSince = now - lastTap;
            if ((timeSince < 300) && (timeSince > 0)) {
                e.preventDefault(); 
                renomearAba(tabNameElement);
            }
            lastTap = now;
        });
    }

    if (elements.btnConfirmarExcluirAba) {
        elements.btnConfirmarExcluirAba.addEventListener('click', () => {
            if (abaParaExcluir.index !== null) {
                executarExclusaoAba(abaParaExcluir.index);
            }
        });
    }
    if (elements.btnCancelarExcluirAba) {
        elements.btnCancelarExcluirAba.addEventListener('click', () => {
            closeModal(elements.modalExcluirAba);
            abaParaExcluir = { index: null, element: null };
        });
    }
if (elements.chkSummaryVendaRealizada) {
        elements.chkSummaryVendaRealizada.addEventListener('change', () => {
            if (abaAtivaIndex < 0 || abaAtivaIndex >= estadoAbas.length) return;
            
            const newState = elements.chkSummaryVendaRealizada.checked;
            estadoAbas[abaAtivaIndex].venda_realizada = newState;
            renderizarTabs();
            atualizarStatusVendaCliente(true, currentClientIdRef.value); 
            setDirty();
        });        
    }
    if (elements.btnConfirmarExcluirSecao) {
        elements.btnConfirmarExcluirSecao.addEventListener('click', () => {
            executarExclusaoSecao();
        });
    }
    if (elements.btnCancelarExcluirSecao) {
        elements.btnCancelarExcluirSecao.addEventListener('click', () => {
            closeModal(elements.modalExcluirSecao);
            secaoParaExcluir = { element: null, type: null, button: null };
        });
    }

    if (elements.btnFecharConfigCalculadora) {
        elements.btnFecharConfigCalculadora.addEventListener('click', () => {
            closeModal(elements.modalConfigCalculadora);
        });
    }
}
function executarExclusaoSecao() {
    if (secaoParaExcluir && secaoParaExcluir.element && secaoParaExcluir.button) {
        secaoParaExcluir.element.remove();
        secaoParaExcluir.button.classList.remove('hidden');
        checkSectionControls();
        updateMoveButtonsVisibility();
        recalcularTotaisSelecionados();
        setDirty();
    }
    closeModal(elements.modalExcluirSecao);
    secaoParaExcluir = { element: null, type: null, button: null };
}

function checkSectionControls() {
    if (!elements.sectionControlsContainer) return;

    const btnTecido = document.getElementById('btn-add-section-tecido');
    const btnAmorim = document.getElementById('btn-add-section-amorim');
    const btnToldos = document.getElementById('btn-add-section-toldos');

    const allHidden = btnTecido.classList.contains('hidden') &&
                      btnAmorim.classList.contains('hidden') &&
                      btnToldos.classList.contains('hidden');

    elements.sectionControlsContainer.style.display = allHidden ? 'none' : 'flex';
}

function addSection(sectionType, buttonElement, isInitialLoad = false) {
    if (!isDataLoadedRef.value) {
        showToast("Aguarde, carregando dados base...", "error"); 
        return;
    }

    const templateId = `template-section-${sectionType}`;
    const template = document.getElementById(templateId);
    if (!template) {
        console.error(`Template ${templateId} não encontrado!`);
        return;
    }

    const sectionClone = template.content.cloneNode(true);
    const sectionElement = sectionClone.querySelector('.quote-section');
    const tableBody = sectionElement.querySelector('.tabela-calculo-body');
    const btnAddLinha = sectionElement.querySelector('.btn-add-linha');
    const btnRemoverSecao = sectionElement.querySelector('.btn-remover-secao'); 

    const btnMoveUp = sectionElement.querySelector('.btn-move-up');
    const btnMoveDown = sectionElement.querySelector('.btn-move-down');

    if (sectionType === 'tecido') {
        const btnConfig = sectionElement.querySelector('.btn-abrir-config-calculadora');
        if (btnConfig) {
            btnConfig.addEventListener('click', () => {
                if (elements.modalConfigCalculadora) {
                    openModal(elements.modalConfigCalculadora);
                }
            });
        }
    }

if (btnMoveUp) {
    btnMoveUp.addEventListener('click', () => {
        const prev = sectionElement.previousElementSibling;
        if (prev) {
            const secPos = sectionElement.getBoundingClientRect();
            const prevPos = prev.getBoundingClientRect();
            elements.quoteSectionsContainer.insertBefore(sectionElement, prev);
            const newSecPos = sectionElement.getBoundingClientRect();
            const newPrevPos = prev.getBoundingClientRect();
            const secDeltaY = secPos.top - newSecPos.top;
            const prevDeltaY = prevPos.top - newPrevPos.top;

            requestAnimationFrame(() => {
                sectionElement.style.transition = 'none';
                prev.style.transition = 'none';
                sectionElement.style.transform = `translateY(${secDeltaY}px)`;
                prev.style.transform = `translateY(${prevDeltaY}px)`;
                requestAnimationFrame(() => {
                    sectionElement.classList.add('animating');
                    prev.classList.add('animating');
                    sectionElement.style.transition = ''; 
                    prev.style.transition = '';
                    sectionElement.style.transform = '';
                    prev.style.transform = '';
                    setTimeout(() => {
                        sectionElement.classList.remove('animating');
                        prev.classList.remove('animating');
                        sectionElement.style.transform = '';
                        prev.style.transform = '';
                        updateMoveButtonsVisibility();
                        if (!isInitialLoad) {
        setDirty();
    }
                    }, 300); 
                });
            });
        }
    });
}

if (btnMoveDown) {
    btnMoveDown.addEventListener('click', () => {
        const next = sectionElement.nextElementSibling;
        if (next) {
            const secPos = sectionElement.getBoundingClientRect();
            const nextPos = next.getBoundingClientRect();

            elements.quoteSectionsContainer.insertBefore(sectionElement, next.nextElementSibling);

            const newSecPos = sectionElement.getBoundingClientRect();
            const newNextPos = next.getBoundingClientRect();

            const secDeltaY = secPos.top - newSecPos.top;
            const nextDeltaY = nextPos.top - newNextPos.top;

            requestAnimationFrame(() => {
                sectionElement.style.transition = 'none';
                next.style.transition = 'none';
                sectionElement.style.transform = `translateY(${secDeltaY}px)`;
                next.style.transform = `translateY(${nextDeltaY}px)`;

                requestAnimationFrame(() => {
                    sectionElement.classList.add('animating');
                    next.classList.add('animating');
                    sectionElement.style.transition = ''; 
                    next.style.transition = '';

                    sectionElement.style.transform = '';
                    next.style.transform = '';

                    setTimeout(() => {
                        sectionElement.classList.remove('animating');
                        next.classList.remove('animating');
                        sectionElement.style.transform = '';
                        next.style.transform = '';
                        updateMoveButtonsVisibility();
                        setDirty();
                    }, 300); 
                });
            });
        }
    });
}

    if (btnAddLinha) {
    btnAddLinha.addEventListener('click', () => {
        switch (sectionType) {
            case 'tecido':
                adicionarLinhaTecido(tableBody, null, false); 
                break;
            case 'amorim':
                adicionarLinhaAmorim(tableBody, null, false); 
                break;
            case 'toldos':
                adicionarLinhaToldos(tableBody, null, false);
                break;
        }
    });
}

    if (btnRemoverSecao) {
        btnRemoverSecao.addEventListener('click', () => {
            secaoParaExcluir = {
                element: sectionElement,
                type: sectionType,
                button: buttonElement 
            };
            if (elements.spanSecaoNomeExcluir) {
                elements.spanSecaoNomeExcluir.textContent = sectionElement.querySelector('h3').textContent;
            }
            openModal(elements.modalExcluirSecao);
        });
    }

 switch (sectionType) {
    case 'tecido':
        adicionarLinhaTecido(tableBody, null, isInitialLoad); 
        break;
    case 'amorim':
        adicionarLinhaAmorim(tableBody, null, isInitialLoad); 
        break;
    case 'toldos':
        adicionarLinhaToldos(tableBody, null, isInitialLoad); 
        break;
}

    document.getElementById('quote-sections-container').appendChild(sectionElement);

    if (buttonElement) {
        buttonElement.classList.add('hidden');
    }

    atualizarHeaderParcelado();
    checkSectionControls(); 
    updateMoveButtonsVisibility();
   if (!isInitialLoad) {
        setDirty();
    }
}
function calcularParceladoLinhaAmorim(linha, taxaParcelamento) {
    if (!linha) return;

    const inputValorTotal = linha.querySelector('.resultado-preco-total');
    const inputValorParcelado = linha.querySelector('.resultado-preco-parcelado');

    if (!inputValorTotal || !inputValorParcelado) return;

    const valorTotal = parseCurrencyValue(inputValorTotal.value);
    const valorParcelado = valorTotal * (1 + taxaParcelamento);

    inputValorParcelado.value = formatadorReaisCalc.format(valorParcelado);
}
function recalcularParceladoAmorimToldos() {
    const parcelamentoKey = elements.selectParcelamentoGlobal?.value || 'DÉBITO'; 
    const taxaParcelamento = TAXAS_PARCELAMENTO[parcelamentoKey] || 0.0;

    const todasLinhas = document.querySelectorAll('#quote-sections-container .linha-calculo-cliente[data-linha-type="amorim"], #quote-sections-container .linha-calculo-cliente[data-linha-type="toldos"]');

    todasLinhas.forEach(linha => {
        calcularParceladoLinhaAmorim(linha, taxaParcelamento);
    });
}

function updateMoveButtonsVisibility() {
    if (!elements.quoteSectionsContainer) return;
    const sections = elements.quoteSectionsContainer.querySelectorAll('.quote-section');

    sections.forEach((section, index) => {
        const btnUp = section.querySelector('.btn-move-up');
        const btnDown = section.querySelector('.btn-move-down');

        if (btnUp) {
            btnUp.style.display = (index === 0) ? 'none' : 'inline-block';
        }
        if (btnDown) {
            btnDown.style.display = (index === sections.length - 1) ? 'none' : 'inline-block';
        }
    });
}

async function atualizarStatusVendaCliente(triggerSave = false, clientId) { 
    if (!clientId || clientId === 'null' || clientId === 'undefined') {
        console.error("atualizarStatusVendaCliente chamado com ID inválido:", clientId);
        return; 
    }

    let nomeUsuario = null; 
    try {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado.");

        const { data: perfil, error } = await _supabase
            .from('perfis')
            .select('nome_usuario')
            .eq('user_id', user.id) 
            .single();
            
        if (error) throw error;
        if (perfil && perfil.nome_usuario) nomeUsuario = perfil.nome_usuario;
    } catch (e) {
        console.warn("Nao foi possivel obter nome do usuario para 'updated_by_name' ao salvar status da venda", e.message);
    }

    const algumaVendaRealizada = estadoAbas.some(aba => aba.venda_realizada === true);
    
    const dadosUpdate = {
        venda_realizada: algumaVendaRealizada,
        updated_at: new Date().toISOString(),
        updated_by_name: nomeUsuario
    };
    
    const { error } = await _supabase
        .from('clientes')
        .update(dadosUpdate)
        .match({ id: clientId }) 
        .select(); 
    
    if (error) {
        console.error("Erro ao atualizar status de venda do cliente:", error); 
        if (triggerSave) {
            showToast(`Erro ao atualizar status: ${error.message}`, "error");
        }
    } else {
        console.log("Status de venda e 'Última Edição' do cliente atualizados para:", algumaVendaRealizada, nomeUsuario);
        document.dispatchEvent(new CustomEvent('clienteAtualizado')); 
    }
}

function preencherSelectParcelamento() {
    const select = elements.selectParcelamentoGlobal;
    if (!select) return;
    select.innerHTML = '';
    for (const key in TAXAS_PARCELAMENTO) {
        const option = new Option(key.replace('x', ''), key);
        if(key.includes('x')) {
            option.textContent = `${key} (taxa ${ (TAXAS_PARCELAMENTO[key] * 100).toFixed(2).replace('.',',') }%)`;
        } else {
             option.textContent = `${key} (taxa ${ (TAXAS_PARCELAMENTO[key] * 100).toFixed(2).replace('.',',') }%)`;
        }

        select.appendChild(option);
    }
    select.value = 'DÉBITO'; 
}

function atualizarHeaderParcelado() {
    const select = elements.selectParcelamentoGlobal;
    if (!select) return;

    const novoTextoHeader = select.value; 
    const headers = document.querySelectorAll('#quote-sections-container .th-parcelado-header');
    headers.forEach(header => {
        header.textContent = novoTextoHeader;
    });
    if(elements.summaryParceladoLabel) {
        elements.summaryParceladoLabel.textContent = novoTextoHeader;
    }
}

function aguardarDadosBase() {
    return new Promise((resolve, reject) => {
        if (isDataLoadedRef.value) {
            console.log("Dados base já carregados.");
            resolve();
            return;
        } 
        
        console.log("Calculadora: Aguardando evento 'dadosBaseCarregados'...");
        const timeout = 15000; 

        const onDadosCarregados = () => {
            clearTimeout(timer);
            console.log("Calculadora: Evento 'dadosBaseCarregados' recebido!");
            resolve();
        };

        const onTimeout = () => {
            document.removeEventListener('dadosBaseCarregados', onDadosCarregados);
            console.error("Calculadora: Timeout ao esperar dados base.");
            reject(new Error("Timeout ao carregar dados base. Verifique a conexão com o backend."));
        };

        const timer = setTimeout(onTimeout, timeout);
        document.addEventListener('dadosBaseCarregados', onDadosCarregados, { once: true });
    });
}

function preencherSelectCalculadora(selectElement, dados, usarChaves = false, defaultText = "Nenhum", valueAsNumber = false) {
    if (!selectElement) return;
    selectElement.innerHTML = '';

    if (usarChaves) {
        const defaultValue = valueAsNumber ? '0' : '-';
        const optionDefault = new Option(defaultText, defaultValue);
        if (!valueAsNumber) optionDefault.dataset.valorReal = 0;
        selectElement.appendChild(optionDefault);

        if (dados && typeof dados === 'object' && !Array.isArray(dados)) {
            Object.keys(dados).forEach(chave => {
                const optionValue = valueAsNumber ? dados[chave] : chave;
                const option = new Option(chave, optionValue);
                if (!valueAsNumber) option.dataset.valorReal = dados[chave]; 
                selectElement.appendChild(option);
            });
        } else {
            console.error("preencherSelectCalculadora 'usarChaves=true' esperava um OBJETO, mas recebeu:", dados);
        }
        selectElement.value = defaultValue;
    } else {
        dados.forEach(valor => {
             const option = new Option(valor, valor);
             selectElement.appendChild(option);
        });
        if (dados.length > 0) {
           selectElement.value = dados[0];
        }
    }
}

function preencherSelectTecidosCalculadora(selectElement) {
    if (!selectElement) return;
    selectElement.innerHTML = '';

    const tecidos = dataRefs.tecidos || []; 

    const optionSemTecido = new Option('SEM TECIDO', 'SEM TECIDO');
    selectElement.appendChild(optionSemTecido);

    tecidos
        .filter(t => t.produto && t.produto !== 'SEM TECIDO' && t.produto !== '-')
        .sort((a, b) => {
            if (a.favorito && !b.favorito) return -1;
            if (!a.favorito && b.favorito) return 1;
            return a.produto.localeCompare(b.produto);
        })
        .forEach(tecido => {
            const optionText = tecido.produto; 
            const option = new Option(optionText, tecido.produto);
            selectElement.appendChild(option);
    });

    selectElement.value = 'SEM TECIDO';
}

function adicionarLinhaTecido(tableBody, estadoLinha = null, isInitialLoad = false) { 
    if (!tableBody) {
        console.error("adicionarLinhaTecido chamada sem tableBody!");
        return;
    }
    
    const template = document.getElementById('template-linha-tecido'); 
    if (!template) return;

    const novaLinha = template.content.cloneNode(true).querySelector('tr');
    
    setupDecimalFormatting(novaLinha.querySelector('.input-largura'), 3);
    setupDecimalFormatting(novaLinha.querySelector('.input-altura'), 3);

    preencherSelectCalculadora(novaLinha.querySelector('.select-franzCortina'), DADOS_FRANZ_CORTINA);
    preencherSelectCalculadora(novaLinha.querySelector('.select-franzBlackout'), DADOS_FRANZ_BLACKOUT);
    preencherSelectTecidosCalculadora(novaLinha.querySelector('.select-codTecidoCortina'));
    preencherSelectTecidosCalculadora(novaLinha.querySelector('.select-codTecidoForro')); 
    preencherSelectTecidosCalculadora(novaLinha.querySelector('.select-codTecidoBlackout')); 
    
    const selectConfecaoInit = novaLinha.querySelector('.select-confecao');
    if (selectConfecaoInit) {
        selectConfecaoInit.innerHTML = '';
        const optionDefault = new Option("NENHUM", "-");
        optionDefault.dataset.valorReal = 0;
        selectConfecaoInit.appendChild(optionDefault);
    }
    
    preencherSelectCalculadora(novaLinha.querySelector('.select-trilho'), dataRefs.trilho, true, "NENHUM", false);
    preencherSelectCalculadora(novaLinha.querySelector('.select-instalacao'), dataRefs.instalacao, true, "NENHUM", true);

    const inputLargura = novaLinha.querySelector('.input-largura');
    inputLargura.addEventListener('blur', () => {
        atualizarOpcoesConfeccao(novaLinha); 
        calcularOrcamentoLinha(novaLinha);   
        setDirty();                          
    });

    if (!estadoLinha || !estadoLinha.franzBlackout) {
        const selectFranzBk = novaLinha.querySelector('.select-franzBlackout');
        if (selectFranzBk) selectFranzBk.value = "1.2";
    }

    if (estadoLinha) {
        novaLinha.querySelector('.input-ambiente').value = estadoLinha.ambiente || '';
        
        const larguraVal = parseFloat(String(estadoLinha.largura || '0').replace(',', '.')) || 0;
        novaLinha.querySelector('.input-largura').value = larguraVal.toFixed(3).replace('.', ',');

        const alturaVal = parseFloat(String(estadoLinha.altura || '0').replace(',', '.')) || 0;
        novaLinha.querySelector('.input-altura').value = alturaVal.toFixed(3).replace('.', ',');

        atualizarOpcoesConfeccao(novaLinha);

        const selectConfecao = novaLinha.querySelector('.select-confecao');
        if (selectConfecao) {
            selectConfecao.value = estadoLinha.confecaoTexto || '-';
            if (selectConfecao.selectedIndex === -1) selectConfecao.value = '-';
        }

        novaLinha.querySelector('.select-franzCortina').value = estadoLinha.franzCortina || (DADOS_FRANZ_CORTINA.length > 0 ? DADOS_FRANZ_CORTINA[0] : '');
        novaLinha.querySelector('.select-codTecidoCortina').value = estadoLinha.codTecidoCortina || 'SEM TECIDO';
        novaLinha.querySelector('.select-codTecidoForro').value = estadoLinha.codTecidoForro || 'SEM TECIDO';
        novaLinha.querySelector('.select-franzBlackout').value = estadoLinha.franzBlackout || '1.2';
        novaLinha.querySelector('.select-codTecidoBlackout').value = estadoLinha.codTecidoBlackout || 'SEM TECIDO';

        const selectTrilho = novaLinha.querySelector('.select-trilho');
        if (selectTrilho) {
            selectTrilho.value = estadoLinha.trilhoTexto || '-';
        }

        novaLinha.querySelector('.select-instalacao').value = estadoLinha.instalacao || '0';
        
        const inputOutros = novaLinha.querySelector('.input-outros');
        if (inputOutros) {
            const v = parseFloat(String(estadoLinha.outros || '0').replace(/[R$\.\s]/g, "").replace(",", ".")) || 0;
            inputOutros.value = v > 0 ? formatadorReaisCalc.format(v) : '';
        }
        novaLinha.querySelector('.input-observacao').value = estadoLinha.observacao || '';

        const checkbox = novaLinha.querySelector('.select-linha-checkbox');
        if (checkbox) {
            checkbox.checked = estadoLinha.selecionado === true;
        }

        calcularOrcamentoLinha(novaLinha);
    }

    const gatilhos = novaLinha.querySelectorAll('input, select');
    gatilhos.forEach(gatilho => {
        const eventType = (gatilho.tagName === 'SELECT') ? 'change' : 'input';

        if (gatilho.classList.contains('select-linha-checkbox')) {
            gatilho.addEventListener('change', () => {
                recalcularTotaisSelecionados();
                setDirty(); 
            });
        } else if (gatilho.type !== 'text') { 
            gatilho.addEventListener(eventType, () => {
                setTimeout(() => calcularOrcamentoLinha(novaLinha), 10);
                setDirty();
            });
        } else if (gatilho.classList.contains('input-ambiente') || gatilho.classList.contains('input-observacao')) {
            gatilho.addEventListener('input', () => {
                setDirty();
            });
        }
    });

    const inputsTexto = novaLinha.querySelectorAll('.input-largura, .input-altura');
    inputsTexto.forEach(input => {
        input.addEventListener('blur', () => {
            setTimeout(() => calcularOrcamentoLinha(novaLinha), 10);
            setDirty();
        });
    });

    const inputOutros = novaLinha.querySelector('.input-outros');
    if(inputOutros){
        inputOutros.addEventListener('focus', (e) => {
            let v = e.target.value.replace("R$", "").trim().replace(/\./g, "").replace(",", ".");
            e.target.value = parseFloat(v) || '';
        });
        inputOutros.addEventListener('blur', (e) => {
            let n = parseFloat(e.target.value) || 0;
            e.target.value = n !== 0 ? formatadorReaisCalc.format(n) : '';
            calcularOrcamentoLinha(novaLinha);
            setDirty();
        });
    }

    const btnRemover = novaLinha.querySelector('.btn-remover-linha');
    if (btnRemover) {
        btnRemover.addEventListener('click', () => {
            removerLinhaCalculadora(novaLinha);
        });
    }
    
    tableBody.appendChild(novaLinha);
    
    if (!estadoLinha) {
        atualizarOpcoesConfeccao(novaLinha); 
        calcularOrcamentoLinha(novaLinha);
        if (!isInitialLoad) { 
            setDirty();
        }
    }
}

function adicionarLinhaAmorim(tableBody, estadoLinha = null, isInitialLoad = false) { 
    if (!tableBody) return;
    const template = document.getElementById('template-linha-amorim');
    if (!template) return;

    const novaLinha = template.content.cloneNode(true).querySelector('tr');

    preencherSelectCalculadora(novaLinha.querySelector('.select-modelo-cortina'), DADOS_MODELO_CORTINA, false, "Nenhum");
    preencherSelectCalculadora(novaLinha.querySelector('.select-cor-acessorios'), DADOS_COR_ACESSORIOS, false, "Nenhum");
    preencherSelectCalculadora(novaLinha.querySelector('.select-comando'), DADOS_COMANDO, false, "Nenhum");

    setupDecimalFormatting(novaLinha.querySelector('.input-largura'), 3);
    setupDecimalFormatting(novaLinha.querySelector('.input-altura'), 3);
    const inputValorManual = novaLinha.querySelector('.input-valor-manual');
    setupCurrencyFormatting(inputValorManual); 

    const selectComando = novaLinha.querySelector('.select-comando');
    const inputManual = novaLinha.querySelector('.input-altura-comando-manual');
    const selectMotor = novaLinha.querySelector('.select-altura-comando-motor');

    const toggleComandoInput = () => {
        if (selectComando.value === 'MOTORIZADO') {
            inputManual.classList.add('hidden');
            selectMotor.classList.remove('hidden');
        } else { 
            inputManual.classList.remove('hidden');
            selectMotor.classList.add('hidden');
        }
    };

    if (estadoLinha) {
        novaLinha.querySelector('.input-ambiente').value = estadoLinha.ambiente || '';
        novaLinha.querySelector('.input-largura').value = (parseFloat(String(estadoLinha.largura || '0').replace(',', '.')) || 0).toFixed(3).replace('.', ',');
        novaLinha.querySelector('.input-altura').value = (parseFloat(String(estadoLinha.altura || '0').replace(',', '.')) || 0).toFixed(3).replace('.', ',');
        novaLinha.querySelector('.select-modelo-cortina').value = estadoLinha.modelo_cortina || DADOS_MODELO_CORTINA[0];
        novaLinha.querySelector('.input-cod-tecido').value = estadoLinha.codigo_tecido || '';
        novaLinha.querySelector('.input-colecao').value = estadoLinha.colecao || '';
        novaLinha.querySelector('.select-cor-acessorios').value = estadoLinha.cor_acessorios || DADOS_COR_ACESSORIOS[0];

        selectComando.value = estadoLinha.comando || DADOS_COMANDO[0];
        if (estadoLinha.comando === 'MOTORIZADO') {
            selectMotor.value = estadoLinha.altura_comando || '127v';
        } else {
            inputManual.value = estadoLinha.altura_comando || '';
        }
        toggleComandoInput();

        novaLinha.querySelector('.input-valor-manual').value = estadoLinha.valor_manual || '';
        novaLinha.querySelector('.input-observacao').value = estadoLinha.observacao || '';
        novaLinha.querySelector('.select-linha-checkbox').checked = estadoLinha.selecionado === true;
    } else {
        toggleComandoInput();
    }

    const gatilhos = novaLinha.querySelectorAll('input, select');
    gatilhos.forEach(gatilho => {
        const eventType = (gatilho.tagName === 'SELECT') ? 'change' : 'input';

        gatilho.addEventListener(eventType, () => {
            recalcularTotaisSelecionados(); 
            setDirty();
        });
    });

    selectComando.addEventListener('change', toggleComandoInput);

   inputValorManual.addEventListener('blur', () => {
    const parcelamentoKey = elements.selectParcelamentoGlobal?.value || 'DÉBITO'; 
    const taxaParcelamento = TAXAS_PARCELAMENTO[parcelamentoKey] || 0.0;
    calcularParceladoLinhaAmorim(novaLinha, taxaParcelamento); 

    recalcularTotaisSelecionados();
    setDirty();
});

    const btnRemover = novaLinha.querySelector('.btn-remover-linha');
    if (btnRemover) {
        btnRemover.addEventListener('click', () => {
            removerLinhaCalculadora(novaLinha); 
        });
    }

    tableBody.appendChild(novaLinha);
    const parcelamentoKey = elements.selectParcelamentoGlobal?.value || 'DÉBITO'; 
const taxaParcelamento = TAXAS_PARCELAMENTO[parcelamentoKey] || 0.0;
calcularParceladoLinhaAmorim(novaLinha, taxaParcelamento);
if (!estadoLinha && !isInitialLoad) setDirty();
}

function adicionarLinhaToldos(tableBody, estadoLinha = null, isInitialLoad = false) { 
    if (!tableBody) return;
    const template = document.getElementById('template-linha-toldos');
    if (!template) return;

    const novaLinha = template.content.cloneNode(true).querySelector('tr');

    preencherSelectCalculadora(novaLinha.querySelector('.select-modelo-toldo'), DADOS_MODELO_TOLDO, false, "Nenhum");
    preencherSelectCalculadora(novaLinha.querySelector('.select-cor-acessorios'), DADOS_COR_ACESSORIOS, false, "Nenhum");
    preencherSelectCalculadora(novaLinha.querySelector('.select-comando'), DADOS_COMANDO, false, "Nenhum");

    setupDecimalFormatting(novaLinha.querySelector('.input-largura'), 3);
    setupDecimalFormatting(novaLinha.querySelector('.input-altura'), 3);
    const inputValorManual = novaLinha.querySelector('.input-valor-manual');
    setupCurrencyFormatting(inputValorManual);

    const selectComando = novaLinha.querySelector('.select-comando');
    const inputManual = novaLinha.querySelector('.input-altura-comando-manual');
    const selectMotor = novaLinha.querySelector('.select-altura-comando-motor');

    const toggleComandoInput = () => {
        if (selectComando.value === 'MOTORIZADO') {
            inputManual.classList.add('hidden');
            selectMotor.classList.remove('hidden');
        } else { 
            inputManual.classList.remove('hidden');
            selectMotor.classList.add('hidden');
        }
    };

    if (estadoLinha) {
        novaLinha.querySelector('.input-ambiente').value = estadoLinha.ambiente || '';
        novaLinha.querySelector('.input-largura').value = (parseFloat(String(estadoLinha.largura || '0').replace(',', '.')) || 0).toFixed(3).replace('.', ',');
        novaLinha.querySelector('.input-altura').value = (parseFloat(String(estadoLinha.altura || '0').replace(',', '.')) || 0).toFixed(3).replace('.', ',');
        novaLinha.querySelector('.select-modelo-toldo').value = estadoLinha.modelo_toldo || DADOS_MODELO_TOLDO[0];
        novaLinha.querySelector('.input-cod-tecido').value = estadoLinha.codigo_tecido || '';
        novaLinha.querySelector('.input-colecao').value = estadoLinha.colecao || '';
        novaLinha.querySelector('.select-cor-acessorios').value = estadoLinha.cor_acessorios || DADOS_COR_ACESSORIOS[0];

        selectComando.value = estadoLinha.comando || DADOS_COMANDO[0];
        if (estadoLinha.comando === 'MOTORIZADO') {
            selectMotor.value = estadoLinha.altura_comando || '127v';
        } else {
            inputManual.value = estadoLinha.altura_comando || '';
        }
        toggleComandoInput();

        novaLinha.querySelector('.input-valor-manual').value = estadoLinha.valor_manual || '';
        novaLinha.querySelector('.input-observacao').value = estadoLinha.observacao || '';
        novaLinha.querySelector('.select-linha-checkbox').checked = estadoLinha.selecionado === true;
    } else {
        toggleComandoInput();
    }

    const gatilhos = novaLinha.querySelectorAll('input, select');
    gatilhos.forEach(gatilho => {
        const eventType = (gatilho.tagName === 'SELECT') ? 'change' : 'input';
        gatilho.addEventListener(eventType, () => {
            recalcularTotaisSelecionados();
            setDirty();
        });
    });

    selectComando.addEventListener('change', toggleComandoInput);

   inputValorManual.addEventListener('blur', () => {
    const parcelamentoKey = elements.selectParcelamentoGlobal?.value || 'DÉBITO'; 
    const taxaParcelamento = TAXAS_PARCELAMENTO[parcelamentoKey] || 0.0;
    calcularParceladoLinhaAmorim(novaLinha, taxaParcelamento);

    recalcularTotaisSelecionados();
    setDirty();
});

    const btnRemover = novaLinha.querySelector('.btn-remover-linha');
    if (btnRemover) {
        btnRemover.addEventListener('click', () => {
            removerLinhaCalculadora(novaLinha);
        });
    }

    tableBody.appendChild(novaLinha);
const parcelamentoKey = elements.selectParcelamentoGlobal?.value || 'DÉBITO'; 
const taxaParcelamento = TAXAS_PARCELAMENTO[parcelamentoKey] || 0.0;
calcularParceladoLinhaAmorim(novaLinha, taxaParcelamento);
if (!estadoLinha && !isInitialLoad) setDirty(); 
}
function recalcularTodasLinhas() {
    const todasLinhasTecido = document.querySelectorAll('#quote-sections-container .linha-calculo-cliente[data-linha-type="tecido"]');
    todasLinhasTecido.forEach(linha => {
        calcularOrcamentoLinha(linha);
    });
}

function removerLinhaCalculadora(linhaParaRemover) {
    if (!linhaParaRemover) return;
    linhaParaExcluir = linhaParaRemover;
    const nomeAmbiente = linhaParaRemover.querySelector('.input-ambiente')?.value || 'sem nome';
    if (elements.spanAmbienteNomeExcluir) {
        elements.spanAmbienteNomeExcluir.textContent = nomeAmbiente;
    }

    openModal(elements.modalExcluirLinha);
}

function obterValorRealSelect(selectElement) {
    if (!selectElement) return 0;
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    return parseFloat(selectedOption?.dataset.valorReal) || 0;
}

function parseCurrencyValue(value) {
    if (!value || typeof value !== 'string') return 0;
    return parseFloat(value.replace(/[R$\.\s]/g, "").replace(",", ".")) || 0;
}

function recalcularTotaisSelecionados() {
    let totalAvista = 0;
    let algumaLinhaSelecionada = false;
    let totalInstalacao = 0; 
    
    const parcelamentoKey = elements.selectParcelamentoGlobal?.value || 'DÉBITO'; 
    const taxaParcelamento = TAXAS_PARCELAMENTO[parcelamentoKey] || 0.0;
    const todasLinhas = document.querySelectorAll('#quote-sections-container .linha-calculo-cliente');
    
    todasLinhas.forEach(linha => {
        const checkbox = linha.querySelector('.select-linha-checkbox');
        if (checkbox && checkbox.checked) {
            algumaLinhaSelecionada = true;

            const inputAvista = linha.querySelector('.resultado-preco-total'); 
            
            totalAvista += parseCurrencyValue(inputAvista.value);
            
            if (linha.dataset.linhaType === 'tecido') {
                totalInstalacao += parseFloat(linha.querySelector('.select-instalacao')?.value) || 0;
            }
        }
    });

    const valorFreteGlobal = parseFloat(elements.selectFreteGlobal?.value) || 0;
    const valorEntradaGlobal = parseCurrencyValue(elements.inputValorEntradaGlobal?.value);
    
    let valorTotalFinal = 0;
    let valorRestanteFinal = 0;
    let valorParceladoFinal = 0;

    if (algumaLinhaSelecionada) {
        valorTotalFinal = totalAvista + valorFreteGlobal;
        valorRestanteFinal = valorTotalFinal - valorEntradaGlobal;
        
        let valorParaParcelar = (totalAvista - totalInstalacao) - valorEntradaGlobal;
        if (valorParaParcelar < 0) {
            valorParaParcelar = 0; 
        }
        
        const valorParceladoComTaxa = valorParaParcelar * (1 + taxaParcelamento);
        valorParceladoFinal = valorParceladoComTaxa + valorFreteGlobal + totalInstalacao;
    }
    
    if (elements.summaryContainer) {
        if (algumaLinhaSelecionada) {
            elements.summaryContainer.style.display = 'block';
        
            if (elements.summaryTotalAvista) {
                elements.summaryTotalAvista.textContent = formatadorReaisCalc.format(valorTotalFinal);
            }
            
            if (elements.summaryTotalParcelado) {
                elements.summaryTotalParcelado.textContent = formatadorReaisCalc.format(valorParceladoFinal);
            }
            
            if (valorEntradaGlobal > 0) {
                if(elements.summaryTotalEntrada && elements.summaryTotalEntradaValue) {
                    elements.summaryTotalEntrada.style.display = 'block';
                    elements.summaryTotalEntradaValue.textContent = formatadorReaisCalc.format(valorEntradaGlobal);
                }
                if(elements.summaryTotalRestante && elements.summaryTotalRestanteValue) {
                    elements.summaryTotalRestante.style.display = 'block';
                    elements.summaryTotalRestanteValue.textContent = formatadorReaisCalc.format(valorRestanteFinal);
                }
            } else {
                if(elements.summaryTotalEntrada) elements.summaryTotalEntrada.style.display = 'none';
                if(elements.summaryTotalRestante) elements.summaryTotalRestante.style.display = 'none';
            }

            if(elements.summaryParceladoLabel && elements.selectParcelamentoGlobal) {
                 elements.summaryParceladoLabel.textContent = elements.selectParcelamentoGlobal.value;
            }
        } else {
            elements.summaryContainer.style.display = 'none';
            if (elements.summaryTotalEntrada) elements.summaryTotalEntrada.style.display = 'none';
            if (elements.summaryTotalRestante) elements.summaryTotalRestante.style.display = 'none';
        }
    }
}

async function calcularOrcamentoLinha(linha) {
     if (!linha || !isDataLoadedRef.value) return;
    const nomeCortina = linha.querySelector('.select-codTecidoCortina')?.value;
    const tecCortina = (dataRefs.tecidos || []).find(t => t.produto === nomeCortina);
    const nomeForro = linha.querySelector('.select-codTecidoForro')?.value;
    const tecForro = (dataRefs.tecidos || []).find(t => t.produto === nomeForro);
    const nomeBk = linha.querySelector('.select-codTecidoBlackout')?.value;
    const tecBk = (dataRefs.tecidos || []).find(t => t.produto === nomeBk);
    const inputOutros = linha.querySelector('.input-outros');
    const vOutrosF = inputOutros ? inputOutros.value : "";
    const vOutrosL = vOutrosF.replace(/[R$\.\s]/g, "").replace(",", ".");
    const vOutrosN = parseFloat(vOutrosL) || 0;
    const markupP = parseFloat(elements.calculatorMarkupInput?.value) || 100;
    const parcelamentoKey = elements.selectParcelamentoGlobal?.value || 'DÉBITO'; 
    const taxaParcelamento = TAXAS_PARCELAMENTO[parcelamentoKey] || 0.0;
    const valorConfecao = obterValorRealSelect(linha.querySelector('.select-confecao'));
    const valorTrilho = obterValorRealSelect(linha.querySelector('.select-trilho'));

    const dadosDeEntrada = {
        largura: parseFloat(String(linha.querySelector('.input-largura')?.value).replace(',', '.')) || 0,
        altura: parseFloat(String(linha.querySelector('.input-altura')?.value).replace(',', '.')) || 0,
        franzCortina: parseFloat(linha.querySelector('.select-franzCortina')?.value) || 1.0,
        franzBlackout: parseFloat(linha.querySelector('.select-franzBlackout')?.value) || 1.0,
        tecidoCortina: { largura: tecCortina?.largura || 0, preco: tecCortina?.atacado || 0 },
        tecidoForro: { largura: tecForro?.largura || 0, preco: tecForro?.atacado || 0 },
        tecidoBlackout: { largura: tecBk?.largura || 0, preco: tecBk?.atacado || 0 },
        valorConfecao: valorConfecao,
        valorTrilho: valorTrilho,
        valorInstalacao: parseFloat(linha.querySelector('.select-instalacao')?.value) || 0,
        valorFrete: 0, 
        valorOutros: vOutrosN,
        markupBase: markupP / 100.0
    };

     try {
        const token = await getAuthToken();
        if (!token) return; 

        const response = await fetch(`${BACKEND_API_URL}/api/calcular`, { 
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify(dadosDeEntrada)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido na API de cálculo.' }));
            console.error('Erro da API:', response.status, errorData);
            throw new Error(errorData.erro || errorData.message || 'Erro na API de cálculo.');
        }

        const resultados = await response.json();
        const fmtDecQtd = (v) => v != null ? v.toFixed(3).replace('.',',') : '0,000';
        const qtc = linha.querySelector('td:nth-child(8) input'); if(qtc) qtc.value = fmtDecQtd(resultados.qtdTecidoCortina);
        const qtf = linha.querySelector('td:nth-child(10) input'); if(qtf) qtf.value = fmtDecQtd(resultados.qtdTecidoForro);
        const qtb = linha.querySelector('td:nth-child(13) input'); if(qtb) qtb.value = fmtDecQtd(resultados.qtdTecidoBlackout);
        
        const valorAVista = resultados.orcamentoBase ?? 0;

        const valorInstalacaoLinha = dadosDeEntrada.valorInstalacao;
        const valorBaseParaParcelar = valorAVista - valorInstalacaoLinha;
        const valorParcelado = (valorBaseParaParcelar * (1 + taxaParcelamento)) + valorInstalacaoLinha;
        const ora = linha.querySelector('td:nth-last-child(3) input'); if(ora) ora.value = formatadorReaisCalc.format(valorAVista);
        const orx = linha.querySelector('td:nth-last-child(2) input'); if(orx) orx.value = formatadorReaisCalc.format(valorParcelado);

} catch (error) {
        console.error("Erro ao calcular orçamento:", error.message);
        const qtc = linha.querySelector('td:nth-child(8) input'); if(qtc) qtc.value = '0,000';
        const qtf = linha.querySelector('td:nth-child(10) input'); if(qtf) qtf.value = '0,000';
        const qtb = linha.querySelector('td:nth-child(13) input'); if(qtb) qtb.value = '0,000';
        const ora = linha.querySelector('td:nth-last-child(3) input'); if(ora) ora.value = formatadorReaisCalc.format(0);
        const orx = linha.querySelector('td:nth-last-child(2) input'); if(orx) orx.value = formatadorReaisCalc.format(0);
        showToast(`Erro no cálculo: ${error.message}`, "error"); 
    }

    recalcularTotaisSelecionados();
}

async function salvarEstadoCalculadora(clientId) {
    if (abaAtivaIndex < 0 || abaAtivaIndex >= estadoAbas.length) {
         console.warn("Salvamento ignorado, aba ativa inválida:", abaAtivaIndex);
         return;
    }

    const sectionsData = {};
    const sectionElements = document.querySelectorAll('#quote-sections-container .quote-section');
    sectionElements.forEach(sectionEl => {
        const sectionType = sectionEl.dataset.sectionType;
        if (sectionType) {
            sectionsData[sectionType] = {
                active: true,
                ambientes: obterEstadoSection(sectionEl) 
            };
        }
    });
    const sectionOrder = Array.from(sectionElements).map(el => el.dataset.sectionType);

    estadoAbas[abaAtivaIndex].sections = sectionsData;
    estadoAbas[abaAtivaIndex].sectionOrder = sectionOrder; 

    estadoAbas[abaAtivaIndex].venda_realizada = elements.chkSummaryVendaRealizada ? elements.chkSummaryVendaRealizada.checked : false;
    const estadoCompleto = { abas: estadoAbas,};


     try {
        const token = await getAuthToken();
        if (!token) return; 

        const response = await fetch(`${BACKEND_API_URL}/api/orcamentos/${clientId}`, { 
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify(estadoCompleto)
        });

        if (!response.ok) {
             const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido ao salvar.' }));
             console.error('Erro da API ao salvar:', response.status, errorData);
             throw new Error(errorData.erro || errorData.message || 'Erro na API ao salvar.');
        }

       const result = await response.json();
       isDirty = false;
        if (elements.btnManualSave) {
            elements.btnManualSave.classList.add('hidden');
        }
        if (elements.saveStatusMessage) {
            elements.saveStatusMessage.textContent = `Salvo às ${new Date(result.updated_at).toLocaleTimeString()}`;
            elements.saveStatusMessage.className = 'save-status-message saved';
        }
        console.log("Estado da calculadora salvo:", result);
        atualizarStatusVendaCliente(false, clientId);
    } catch (error) {
        console.error("Erro ao salvar estado da calculadora:", error.message);
        if (elements.saveStatusMessage) {
            elements.saveStatusMessage.textContent = 'Erro ao salvar';
            elements.saveStatusMessage.className = 'save-status-message error';
        }
        showToast(`Erro ao salvar: ${error.message}`, "error"); 
    }
}

async function carregarEstadoCalculadora(clientId) {
    isDirty = false; 
    if (elements.btnManualSave) { 
        elements.btnManualSave.classList.add('hidden');
    }
    
    if (elements.saveStatusMessage) {
        elements.saveStatusMessage.textContent = '';
        elements.saveStatusMessage.className = 'save-status-message';
    }

    const container = document.getElementById('quote-sections-container');
    if (container) container.innerHTML = '';
    
    estadoAbas = []; 
    abaAtivaIndex = 0;

    try {
        const token = await getAuthToken();
        if (!token) return; 

        const response = await fetch(`${BACKEND_API_URL}/api/orcamentos/${clientId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}` 
            }
        });

        if (!response.ok) {
             if (response.status === 404) {
                console.log("Nenhum orçamento salvo. Criando novo.");
                if(elements.calculatorMarkupInput) elements.calculatorMarkupInput.value = '100';
                if(elements.selectParcelamentoGlobal) elements.selectParcelamentoGlobal.value = 'DÉBITO';
                
                estadoAbas = [{ nome: "Orçamento 1", sections: {}, venda_realizada: false }];
                abaAtivaIndex = 0;
                
             } else {
                 const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido ao carregar orçamento.' }));
                 console.error('Erro da API ao carregar:', response.status, errorData);
                 throw new Error(errorData.erro || errorData.message || 'Erro API carregar.');
             }
        } else {
            const estado = await response.json();

            if(elements.calculatorMarkupInput) elements.calculatorMarkupInput.value = estado.markup || '100';
            if(elements.selectParcelamentoGlobal) {
                elements.selectParcelamentoGlobal.value = estado.parcelamento || 'DÉBITO'; 
            }
            if(elements.selectFreteGlobal) elements.selectFreteGlobal.value = estado.frete || '0';
            if(elements.inputValorEntradaGlobal) elements.inputValorEntradaGlobal.value = estado.entrada || '';
            if (estado && Array.isArray(estado.abas) && estado.abas.length > 0) {
                estadoAbas = estado.abas;
                estadoAbas.forEach(aba => {
                    if (aba.venda_realizada === undefined) {
                        aba.venda_realizada = false;
                    }
                });
                abaAtivaIndex = 0; 
                
            } else if (estado && Array.isArray(estado.ambientes)) {
                console.log("Migrando orçamento de formato antigo...");
                estadoAbas = [{ 
                    nome: "Principal", 
                    sections: { 
                        'tecido': { active: true, ambientes: estado.ambientes } 
                    }, 
                    venda_realizada: false 
                }];
                abaAtivaIndex = 0;
                
            } else {
                console.log("Orçamento salvo vazio ou inválido. Criando novo.");
                estadoAbas = [{ nome: "Orçamento 1", sections: {}, venda_realizada: false }];
                abaAtivaIndex = 0;
            }
        }
        
        renderizarTabs(); 
        ativarAba(abaAtivaIndex, true); 
        
        if (elements.saveStatusMessage) { elements.saveStatusMessage.textContent = ''; }

    } catch (error) {
        console.error("Erro ao carregar estado da calculadora:", error.message);
        if (elements.saveStatusMessage) {
            elements.saveStatusMessage.textContent = 'Erro ao carregar.';
            elements.saveStatusMessage.className = 'save-status-message error';
        }
        showToast(`Erro ao carregar orçamento: ${error.message}`, "error"); 
        
        estadoAbas = [{ nome: "Orçamento 1 (Erro)", sections: {}, venda_realizada: false }];
        abaAtivaIndex = 0;
        renderizarTabs();
        ativarAba(0, true); 
    }
}
function renderizarTabs() {
    if (!elements.tabsContainer) return;
    
    const abasAtuais = elements.tabsContainer.querySelectorAll('.calc-tab');
    abasAtuais.forEach(tab => tab.remove());

    estadoAbas.forEach((aba, index) => {
        const template = document.getElementById('template-calc-tab');
        const novaAba = template.content.cloneNode(true).querySelector('.calc-tab');
        
        novaAba.dataset.index = index;
        novaAba.querySelector('.calc-tab-name').textContent = aba.nome || `Aba ${index + 1}`;
        
        if (index === abaAtivaIndex) {
            novaAba.classList.add('active');
        }
        
        if (aba.venda_realizada === true) {
            novaAba.classList.add('venda-realizada');
        }
        
        elements.tabsContainer.insertBefore(novaAba, elements.btnAddAba);
    });
}

function ativarAba(index, isInitialLoad = false) { 
    if (index < 0 || index >= estadoAbas.length) {
         console.error("Tentativa de ativar aba inválida:", index);
         return;
    }
    if (!isInitialLoad && abaAtivaIndex >= 0 && abaAtivaIndex < estadoAbas.length) {
         const sectionsData = {};
         const sectionElements = document.querySelectorAll('#quote-sections-container .quote-section');
         sectionElements.forEach(sectionEl => {
            const sectionType = sectionEl.dataset.sectionType;
            sectionsData[sectionType] = {
                active: true,
                ambientes: obterEstadoSection(sectionEl) 
            };
         });
         estadoAbas[abaAtivaIndex].sections = sectionsData;
    }
    
    abaAtivaIndex = index;

    const abasAtuais = elements.tabsContainer.querySelectorAll('.calc-tab');
    abasAtuais.forEach((tab, i) => {
        tab.classList.toggle('active', i === index);
    });
    const container = document.getElementById('quote-sections-container');
    if (container) container.innerHTML = '';
    
    document.getElementById('btn-add-section-tecido').classList.remove('hidden'); 
    document.getElementById('btn-add-section-amorim').classList.remove('hidden'); 
    document.getElementById('btn-add-section-toldos').classList.remove('hidden'); 
    
    const abaAtiva = estadoAbas[index];
    const sectionsDaAba = abaAtiva.sections || {};

    const sectionOrder = abaAtiva.sectionOrder || ['tecido', 'amorim', 'toldos'];

    if (!abaAtiva.sections && Array.isArray(abaAtiva.ambientes)) {
        console.log("Migrando aba de formato antigo...");
        sectionsDaAba['tecido'] = { active: true, ambientes: abaAtiva.ambientes };
        abaAtiva.sections = sectionsDaAba;
        delete abaAtiva.ambientes;
    }

    sectionOrder.forEach(sectionType => {
        const sectionData = sectionsDaAba[sectionType];
        if (sectionData && sectionData.active) {
            addSection(sectionType, document.getElementById(`btn-add-section-${sectionType}`), isInitialLoad);
            
            const sectionEl = container.querySelector(`.quote-section[data-section-type="${sectionType}"]`);
            const tableBody = sectionEl.querySelector('.tabela-calculo-body');
            tableBody.innerHTML = ''; 
            if (sectionData.ambientes && sectionData.ambientes.length > 0) {
                sectionData.ambientes.forEach(estadoLinha => {
                    switch (sectionType) {
                        case 'tecido':
                            adicionarLinhaTecido(tableBody, estadoLinha);
                            break;
                        case 'amorim':
                            adicionarLinhaAmorim(tableBody, estadoLinha);
                            break;
                        case 'toldos':
                            adicionarLinhaToldos(tableBody, estadoLinha);
                            break;
                    }
                });
            } else {
                 switch (sectionType) {
                        case 'tecido':
                            adicionarLinhaTecido(tableBody, null);
                            break;
                        case 'amorim':
                            adicionarLinhaAmorim(tableBody, null);
                            break;
                        case 'toldos':
                            adicionarLinhaToldos(tableBody, null);
                            break;
                    }
            }
        }
    });

    if (elements.chkSummaryVendaRealizada) {
        elements.chkSummaryVendaRealizada.checked = abaAtiva.venda_realizada === true;
    }
checkSectionControls();
atualizarHeaderParcelado();
recalcularParceladoAmorimToldos(); 
recalcularTotaisSelecionados();
updateMoveButtonsVisibility();}

function atualizarOpcoesConfeccao(linha) {
    const inputLargura = linha.querySelector('.input-largura');
    const selectConfecao = linha.querySelector('.select-confecao');
    if (!inputLargura || !selectConfecao) return;

    let larguraTecido = parseFloat(inputLargura.value.replace(',', '.')) || 0;
    const valorSelecionadoAnterior = selectConfecao.value;

    selectConfecao.innerHTML = '';

    const optionDefault = new Option("NENHUM", "-");
    optionDefault.dataset.valorReal = 0;
    selectConfecao.appendChild(optionDefault);

    const confeccoes = dataRefs.confeccao || [];
    
    confeccoes.forEach(conf => {
        const limite = parseFloat(conf.limite_largura) || 0;
        
        let deveMostrar = true;
        
        if (limite > 0) {
            if (larguraTecido > limite) {
                deveMostrar = true;
            } else {
                deveMostrar = false;
            }
        }

        if (deveMostrar) {
            const option = new Option(conf.opcao, conf.opcao);
            option.dataset.valorReal = conf.valor;
            selectConfecao.appendChild(option);
        }
    });

    let opcaoAindaExiste = false;
    for (let i = 0; i < selectConfecao.options.length; i++) {
        if (selectConfecao.options[i].value === valorSelecionadoAnterior) {
            selectConfecao.value = valorSelecionadoAnterior;
            opcaoAindaExiste = true;
            break;
        }
    }
}

function adicionarAba() {
    if (abaAtivaIndex >= 0 && abaAtivaIndex < estadoAbas.length) {
         const sectionsData = {};
         const sectionElements = document.querySelectorAll('#quote-sections-container .quote-section');
         sectionElements.forEach(sectionEl => {
            const sectionType = sectionEl.dataset.sectionType;
            sectionsData[sectionType] = {
                active: true,
                ambientes: obterEstadoSection(sectionEl) 
            };
         });
         const sectionOrder = Array.from(sectionElements).map(el => el.dataset.sectionType);
         estadoAbas[abaAtivaIndex].sectionOrder = sectionOrder;
         
         estadoAbas[abaAtivaIndex].sections = sectionsData;
         estadoAbas[abaAtivaIndex].venda_realizada = elements.chkSummaryVendaRealizada ? elements.chkSummaryVendaRealizada.checked : false;
    }
    
    const novaAba = {
        nome: `Orçamento ${estadoAbas.length + 1}`,
        sections: {},
        venda_realizada: false 
    };
    estadoAbas.push(novaAba);
    const novoIndex = estadoAbas.length - 1;
    renderizarTabs();
    ativarAba(novoIndex); 
    setDirty();
}

function prepararExclusaoAba(index, element) {
    if (estadoAbas.length <= 1) {
        showToast("Não é possível excluir a última aba.", "error"); 
        return;
    }
    abaParaExcluir = { index, element };
    if (elements.spanAbaNomeExcluir) {
        elements.spanAbaNomeExcluir.textContent = estadoAbas[index].nome || `Aba ${index + 1}`;
    }
    openModal(elements.modalExcluirAba);
}

function executarExclusaoAba(index) {
    if (estadoAbas.length <= 1 || index < 0 || index >= estadoAbas.length) {
        closeModal(elements.modalExcluirAba);
        return;
    }

    estadoAbas.splice(index, 1);
    
    if (abaAtivaIndex === index) {
        abaAtivaIndex = Math.max(0, index - 1);
    } else if (abaAtivaIndex > index) {
        abaAtivaIndex--;
    }

    renderizarTabs();
    ativarAba(abaAtivaIndex);
    atualizarStatusVendaCliente();
    closeModal(elements.modalExcluirAba);
    abaParaExcluir = { index: null, element: null };
    setDirty();
}

function renomearAba(tabNameElement) {
    const abaIndex = parseInt(tabNameElement.closest('.calc-tab').dataset.index, 10);
    const nomeAntigo = estadoAbas[abaIndex].nome;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = nomeAntigo;
    input.className = 'calc-tab-name-input'; 
    
    input.addEventListener('blur', () => finalizaRenomear());
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
        if (e.key === 'Escape') {
            input.value = nomeAntigo; 
            input.blur();
        }
    });

    const finalizaRenomear = () => {
        const novoNome = input.value.trim();
        if (novoNome && novoNome !== nomeAntigo) {
            estadoAbas[abaIndex].nome = novoNome;
            tabNameElement.textContent = novoNome;
            setDirty();
        } else {
             tabNameElement.textContent = nomeAntigo;
        }
        tabNameElement.style.display = 'inline-block'; 
        input.remove();
    };
    
    tabNameElement.style.display = 'none';
    tabNameElement.parentNode.insertBefore(input, tabNameElement);
    input.focus();
    input.select();
}


export async function showCalculatorView(clientId, clientName) {
    if (!elements.clientListView || !elements.calculatorView || !elements.calculatorClientName) {
        console.error("Elementos da UI da calculadora ou lista de clientes não encontrados.");
        return;
    }

    elements.clientListView.style.display = 'none';
    elements.calculatorView.style.display = 'block';
    elements.calculatorClientName.textContent = `Orçamento para: ${clientName || 'Cliente'}`;
    if (elements.saveStatusMessage) {
    elements.saveStatusMessage.textContent = 'Carregando dados...';
    elements.saveStatusMessage.className = 'save-status-message loading';
}


    try {
        await aguardarDadosBase();
        preencherSelectParcelamento();
        preencherSelectCalculadora(elements.selectFreteGlobal, dataRefs.frete, true, "SEM FRETE", true);
        await carregarEstadoCalculadora(clientId); 
        atualizarHeaderParcelado(); 

    } catch (err) {
        console.error("Erro ao preparar calculadora para o cliente:", err);
        showToast(err.message || "Erro ao carregar dados da calculadora.", "error"); 
        if (elements.saveStatusMessage) {
        elements.saveStatusMessage.textContent = 'Erro ao carregar';
        elements.saveStatusMessage.className = 'save-status-message error';
    }
}
}