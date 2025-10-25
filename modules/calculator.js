import { showToast, openModal, closeModal } from './ui.js';
import { DADOS_FRANZ_CORTINA, DADOS_FRANZ_BLACKOUT, DADOS_INSTALACAO, DADOS_FRETE } from '../data/opcoes.js';
import { _supabase } from '../supabaseClient.js'; 

const TAXAS_PARCELAMENTO = {
    'DÉBITO': 0.0099, '1x': 0.0299, '2x': 0.0409, '3x': 0.0478, '4x': 0.0547, '5x': 0.0614, 
    '6x': 0.0681, '7x': 0.0767, '8x': 0.0833, '9x': 0.0898, '10x': 0.0963, '11x': 0.1026,
    '12x': 0.1090, '13x': 0.1152, '14x': 0.1214, '15x': 0.1276, '16x': 0.1337, '17x': 0.1397,
    '18x': 0.1457
};

let elements = {};
let dataRefs = {};
let currentClientIdRef = { value: null };
let isDataLoadedRef = { value: false };

let autoSaveTimer = null;
let linhaParaExcluir = null;
let abaParaExcluir = { index: null, element: null };

let estadoAbas = []; 
let abaAtivaIndex = 0;

function debounce(func, delay) {
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => {
            func.apply(context, args);
        }, delay);
    }
}

const triggerAutoSave = debounce(async () => {
    if (!currentClientIdRef.value) {
        console.log("Auto-save: Nenhum cliente selecionado.");
        return;
    }
    if (elements.saveStatusElement) {
        elements.saveStatusElement.textContent = 'Salvando...';
        elements.saveStatusElement.className = 'save-status saving';
    }
    await salvarEstadoCalculadora(currentClientIdRef.value);
}, 1000);



const formatadorReaisCalc = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function initCalculator(domElements, dataArrays, clientIdRef, isDataLoadedFlag) {
    elements = domElements;
    dataRefs = dataArrays;
    currentClientIdRef = clientIdRef;
    isDataLoadedRef = isDataLoadedFlag;
if (elements.btnVoltarClientes) {
        elements.btnVoltarClientes.addEventListener('click', async () => {
            if (elements.saveStatusElement && elements.saveStatusElement.textContent.includes('Salvando...')) {

                showToast("Aguarde, salvando alterações...", "warning"); 
                return; 
            }

            if (elements.saveStatusElement) {
                elements.saveStatusElement.textContent = 'Salvando...';
                elements.saveStatusElement.className = 'save-status saving';
            }
            
          await salvarEstadoCalculadora(currentClientIdRef.value);
            document.dispatchEvent(new CustomEvent('clienteAtualizado'));
            window.location.hash = '';
        });

        elements.btnVoltarClientes.addEventListener('mouseover', () => {
            if (elements.saveStatusElement && elements.saveStatusElement.textContent.includes('Salvando...')) {
                elements.btnVoltarClientes.style.cursor = 'wait';
            } else {
                elements.btnVoltarClientes.style.cursor = 'pointer';
            }
        });
    }
    const btnAddLinha = document.getElementById('btn-add-linha-calc');
    if (btnAddLinha) {
        btnAddLinha.addEventListener('click', () => {
            if (!isDataLoadedRef.value) {
                 showToast("Aguarde, carregando dados base...", "error"); 
                 return;
            }
            adicionarLinhaCalculadora(null);
            triggerAutoSave();
        });
    }
    const globalTriggers = document.querySelectorAll('.global-calc-trigger');
    globalTriggers.forEach(input => {
        const eventType = (input.tagName === 'SELECT') ? 'change' : 'input';
        input.removeEventListener(eventType, recalcularTodasLinhas); 
        input.addEventListener(eventType, () => {
            recalcularTodasLinhas();
            recalcularTotaisSelecionados(); 
            triggerAutoSave();
        });
    });

    if (elements.btnConfirmarExcluirLinha) {
        elements.btnConfirmarExcluirLinha.addEventListener('click', () => {
            if (linhaParaExcluir) {
                linhaParaExcluir.remove();
                recalcularTotaisSelecionados();
                triggerAutoSave(); 
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
    
    preencherSelectParcelamento();
    if (elements.selectParcelamentoGlobal) {
        elements.selectParcelamentoGlobal.addEventListener('change', () => {
             atualizarHeaderParcelado();
             recalcularTotaisSelecionados(); 
        });
    }
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
            
            atualizarStatusVendaCliente();
            
            triggerAutoSave();
        });
    }
}

async function atualizarStatusVendaCliente() {
    if (!currentClientIdRef.value) return;

    const algumaVendaRealizada = estadoAbas.some(aba => aba.venda_realizada === true);

    const { error } = await _supabase
        .from('clientes')
        .update({ venda_realizada: algumaVendaRealizada })
        .match({ id: currentClientIdRef.value });

    if (error) {
        console.error("Erro ao atualizar status de venda do cliente:", error);
        showToast("Erro ao atualizar status do cliente.", "error");
    } else {
        console.log("Status de venda do cliente atualizado para:", algumaVendaRealizada);
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
    const header = elements.thParceladoHeader;
    const select = elements.selectParcelamentoGlobal;
    if (header && select) {
        header.textContent = select.value;
    }
    if(elements.summaryParceladoLabel) {
        elements.summaryParceladoLabel.textContent = select.value;
    }
}

function aguardarDadosBase() {
    return new Promise((resolve, reject) => {
        if (isDataLoadedRef.value) {
            console.log("Dados base já carregados.");
            resolve();
        } else {
            console.log("Calculadora: Aguardando dados base (tecidos, etc.)...");
            const timeout = 10000;
            let timeElapsed = 0;
            const interval = setInterval(() => {
                if (isDataLoadedRef.value) {
                    clearInterval(interval);
                    console.log("Calculadora: Dados base carregados!");
                    resolve();
                }
                timeElapsed += 100;
                if (timeElapsed >= timeout) {
                    clearInterval(interval);
                    console.error("Calculadora: Timeout ao esperar dados base.");
                    reject(new Error("Timeout ao carregar dados base."));
                }
            }, 100);
        }
    });
}


function preencherSelectCalculadora(selectElement, dados, usarChaves = false) {
    if (!selectElement) return;
    selectElement.innerHTML = '';

    if (usarChaves) {
        const optionDefault = new Option('-', '-');
        optionDefault.dataset.valorReal = 0;
        selectElement.appendChild(optionDefault);

        if (dados && typeof dados === 'object' && !Array.isArray(dados)) {
            
            Object.keys(dados).forEach(chave => {
                const option = new Option(chave, chave);
                
                option.dataset.valorReal = dados[chave];
                
                selectElement.appendChild(option);
            });

        } else {
            console.error("preencherSelectCalculadora 'usarChaves=true' esperava um OBJETO, mas recebeu:", dados);
        }

        selectElement.value = '-';

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

function adicionarLinhaCalculadora(estadoLinha = null) {
    if (!elements.calculatorTableBody) return;
    const template = document.getElementById('template-linha-calculadora');
    if (!template) return;

    if (!dataRefs.tecidos || !dataRefs.confeccao || !dataRefs.trilho ||
        dataRefs.tecidos.length === 0 || 
        (typeof dataRefs.confeccao !== 'object' || Object.keys(dataRefs.confeccao).length === 0) || 
        (typeof dataRefs.trilho !== 'object' || Object.keys(dataRefs.trilho).length === 0)) 
    {
        console.error("adicionarLinhaCalculadora: Tentativa de adicionar linha falhou. Os dados (tecidos, confeccao, trilho) ainda não estão prontos em dataRefs.", dataRefs);
        showToast("Erro: Dados de confecção/trilho não carregados. Saia e entre no cliente novamente.", "error"); 
        
        return; 
    }

    const novaLinha = template.content.cloneNode(true).querySelector('tr');

    preencherSelectCalculadora(novaLinha.querySelector('.select-franzCortina'), DADOS_FRANZ_CORTINA);
    preencherSelectCalculadora(novaLinha.querySelector('.select-franzBlackout'), DADOS_FRANZ_BLACKOUT);
    preencherSelectTecidosCalculadora(novaLinha.querySelector('.select-codTecidoCortina'));
    preencherSelectTecidosCalculadora(novaLinha.querySelector('.select-codTecidoForro'));
    preencherSelectTecidosCalculadora(novaLinha.querySelector('.select-codTecidoBlackout'));
    preencherSelectCalculadora(novaLinha.querySelector('.select-confecao'), dataRefs.confeccao, true);
    preencherSelectCalculadora(novaLinha.querySelector('.select-trilho'), dataRefs.trilho, true);
    preencherSelectCalculadora(novaLinha.querySelector('.select-instalacao'), DADOS_INSTALACAO);
    preencherSelectCalculadora(novaLinha.querySelector('.select-frete'), DADOS_FRETE);

    if (!estadoLinha || !estadoLinha.franzBlackout) {
        const selectFranzBk = novaLinha.querySelector('.select-franzBlackout');
        if (selectFranzBk) selectFranzBk.value = "1.2";
    }

    if (estadoLinha) {
        novaLinha.querySelector('.input-ambiente').value = estadoLinha.ambiente || '';
        novaLinha.querySelector('.input-largura').value = estadoLinha.largura || '';
        novaLinha.querySelector('.input-altura').value = estadoLinha.altura || '';
        novaLinha.querySelector('.select-franzCortina').value = estadoLinha.franzCortina || (DADOS_FRANZ_CORTINA.length > 0 ? DADOS_FRANZ_CORTINA[0] : '');
        novaLinha.querySelector('.select-codTecidoCortina').value = estadoLinha.codTecidoCortina || 'SEM TECIDO';
        novaLinha.querySelector('.select-codTecidoForro').value = estadoLinha.codTecidoForro || 'SEM TECIDO';
        novaLinha.querySelector('.select-franzBlackout').value = estadoLinha.franzBlackout || '1.2';
        novaLinha.querySelector('.select-codTecidoBlackout').value = estadoLinha.codTecidoBlackout || 'SEM TECIDO';
        
        const selectConfecao = novaLinha.querySelector('.select-confecao');
        if (selectConfecao) {
            selectConfecao.value = estadoLinha.confecaoTexto || '-';
        }
        const selectTrilho = novaLinha.querySelector('.select-trilho');
        if (selectTrilho) {
             selectTrilho.value = estadoLinha.trilhoTexto || '-';
        }
        
        novaLinha.querySelector('.select-instalacao').value = estadoLinha.instalacao || (DADOS_INSTALACAO.length > 0 ? DADOS_INSTALACAO[0] : '');
        novaLinha.querySelector('.select-frete').value = estadoLinha.frete || (DADOS_FRETE.length > 0 ? DADOS_FRETE[0] : '');
        const inputOutros = novaLinha.querySelector('.input-outros');
        if (inputOutros) {
            const v = parseFloat(String(estadoLinha.outros || '0').replace(/[R$\.\s]/g, "").replace(",", ".")) || 0;
            inputOutros.value = v > 0 ? formatadorReaisCalc.format(v) : '';
        }

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
                triggerAutoSave();
            });
        } else {
            gatilho.addEventListener(eventType, () => {
                 setTimeout(() => calcularOrcamentoLinha(novaLinha), 10);
                 triggerAutoSave();
            });
        }
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
             triggerAutoSave();
        });
    }

    const btnRemover = novaLinha.querySelector('.btn-remover-linha');
    if (btnRemover) {
        btnRemover.addEventListener('click', () => {
            removerLinhaCalculadora(novaLinha);
        });
    }

    elements.calculatorTableBody.appendChild(novaLinha);

    if (!estadoLinha) {
        calcularOrcamentoLinha(novaLinha);
    }
}

function recalcularTodasLinhas() {
    const todasLinhas = elements.calculatorTableBody.querySelectorAll('.linha-calculo-cliente');
    todasLinhas.forEach(linha => {
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
    let totalParcelado = 0;
    let algumaLinhaSelecionada = false;

    const todasLinhas = elements.calculatorTableBody.querySelectorAll('.linha-calculo-cliente');
    
    todasLinhas.forEach(linha => {
        const checkbox = linha.querySelector('.select-linha-checkbox');
        if (checkbox && checkbox.checked) {
            algumaLinhaSelecionada = true;
            const inputAvista = linha.querySelector('td:nth-last-child(2) input');
            const inputParcelado = linha.querySelector('td:nth-last-child(1) input');
            
            totalAvista += parseCurrencyValue(inputAvista.value);
            totalParcelado += parseCurrencyValue(inputParcelado.value);
        }
    });

    if (elements.summaryContainer) {
        if (algumaLinhaSelecionada) {
            elements.summaryContainer.style.display = 'block';
            if (elements.summaryTotalAvista) {
                elements.summaryTotalAvista.textContent = formatadorReaisCalc.format(totalAvista);
            }
            if (elements.summaryTotalParcelado) {
                elements.summaryTotalParcelado.textContent = formatadorReaisCalc.format(totalParcelado);
            }
            if(elements.summaryParceladoLabel && elements.selectParcelamentoGlobal) {
                 elements.summaryParceladoLabel.textContent = elements.selectParcelamentoGlobal.value;
            }
        } else {
            elements.summaryContainer.style.display = 'none';
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
        largura: parseFloat(linha.querySelector('.input-largura')?.value) || 0,
        altura: parseFloat(linha.querySelector('.input-altura')?.value) || 0,
        franzCortina: parseFloat(linha.querySelector('.select-franzCortina')?.value) || 1.0,
        franzBlackout: parseFloat(linha.querySelector('.select-franzBlackout')?.value) || 1.0,
        tecidoCortina: { largura: tecCortina?.largura || 0, preco: tecCortina?.atacado || 0 },
        tecidoForro: { largura: tecForro?.largura || 0, preco: tecForro?.atacado || 0 },
        tecidoBlackout: { largura: tecBk?.largura || 0, preco: tecBk?.atacado || 0 },
        valorConfecao: valorConfecao,
        valorTrilho: valorTrilho,
        valorInstalacao: parseFloat(linha.querySelector('.select-instalacao')?.value) || 0,
        valorFrete: parseFloat(linha.querySelector('.select-frete')?.value) || 0,
        valorOutros: vOutrosN,
        markupBase: markupP / 100.0
    };

     try {
        const response = await fetch('https://api-calculadora-hgy8.onrender.com/api/calcular', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosDeEntrada)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido na API de cálculo.' }));
            console.error('Erro da API:', response.status, errorData);
            throw new Error(errorData.message || 'Erro na API de cálculo.');
        }

        const resultados = await response.json();
        const fmtDec = (v) => v != null ? v.toFixed(2) : '0.00';
        const qtc = linha.querySelector('td:nth-child(7) input'); if(qtc) qtc.value = fmtDec(resultados.qtdTecidoCortina);
        const qtf = linha.querySelector('td:nth-child(9) input'); if(qtf) qtf.value = fmtDec(resultados.qtdTecidoForro);
        const qtb = linha.querySelector('td:nth-child(12) input'); if(qtb) qtb.value = fmtDec(resultados.qtdTecidoBlackout);

        const valorAVista = resultados.orcamentoBase ?? 0;
        const valorParcelado = valorAVista * (1 + taxaParcelamento);

        const ora = linha.querySelector('td:nth-last-child(2) input'); if(ora) ora.value = formatadorReaisCalc.format(valorAVista);
        const orx = linha.querySelector('td:nth-last-child(1) input'); if(orx) orx.value = formatadorReaisCalc.format(valorParcelado);

    } catch (error) {
        console.error("Erro ao calcular orçamento:", error.message);
        const qtc = linha.querySelector('td:nth-child(7) input'); if(qtc) qtc.value = '0.00';
        const qtf = linha.querySelector('td:nth-child(9) input'); if(qtf) qtf.value = '0.00';
        const qtb = linha.querySelector('td:nth-child(12) input'); if(qtb) qtb.value = '0.00';
        const ora = linha.querySelector('td:nth-last-child(2) input'); if(ora) ora.value = formatadorReaisCalc.format(0);
        const orx = linha.querySelector('td:nth-last-child(1) input'); if(orx) orx.value = formatadorReaisCalc.format(0);
        showToast(`Erro no cálculo: ${error.message}`, "error"); 
    }

    recalcularTotaisSelecionados();
}

function obterEstadoAbaAtual() {
    const todasLinhas = elements.calculatorTableBody.querySelectorAll('.linha-calculo-cliente');
    const dadosOrcamento = [];

    todasLinhas.forEach(linhaCalc => {
        const confecaoSelect = linhaCalc.querySelector('.select-confecao');
        const confecaoTexto = confecaoSelect ? confecaoSelect.value : '-';

        const trilhoSelect = linhaCalc.querySelector('.select-trilho');
        const trilhoTexto = trilhoSelect ? trilhoSelect.value : '-';
        
        const checkbox = linhaCalc.querySelector('.select-linha-checkbox');

        const estadoLinha = {
            ambiente: linhaCalc.querySelector('.input-ambiente')?.value || '',
            largura: linhaCalc.querySelector('.input-largura')?.value || '',
            altura: linhaCalc.querySelector('.input-altura')?.value || '',
            franzCortina: linhaCalc.querySelector('.select-franzCortina')?.value || '',
            codTecidoCortina: linhaCalc.querySelector('.select-codTecidoCortina')?.value || 'SEM TECIDO',
            codTecidoForro: linhaCalc.querySelector('.select-codTecidoForro')?.value || 'SEM TECIDO',
            franzBlackout: linhaCalc.querySelector('.select-franzBlackout')?.value || '1.2',
            codTecidoBlackout: linhaCalc.querySelector('.select-codTecidoBlackout')?.value || 'SEM TECIDO',
            confecaoTexto: confecaoTexto,
            trilhoTexto: trilhoTexto,
            instalacao: linhaCalc.querySelector('.select-instalacao')?.value || '',
            frete: linhaCalc.querySelector('.select-frete')?.value || '',
            outros: linhaCalc.querySelector('.input-outros')?.value || '',
            selecionado: checkbox ? checkbox.checked : false 
        };
        dadosOrcamento.push(estadoLinha);
    });
    return dadosOrcamento;
}

async function salvarEstadoCalculadora(clientId) {
    if (!elements.calculatorView || !elements.calculatorTableBody) return;
    if (abaAtivaIndex < 0 || abaAtivaIndex >= estadoAbas.length) {
         console.warn("Salvamento ignorado, aba ativa inválida:", abaAtivaIndex);
         return;
    }

    estadoAbas[abaAtivaIndex].ambientes = obterEstadoAbaAtual();

    const estadoCompleto = {
        abas: estadoAbas, 
        markup: elements.calculatorMarkupInput?.value || '100',
        parcelamento: elements.selectParcelamentoGlobal?.value || 'DÉBITO', 
    };

     try {
        const response = await fetch(`https://api-calculadora-hgy8.onrender.com/api/orcamentos/${clientId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(estadoCompleto)
        });

        if (!response.ok) {
             const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido ao salvar.' }));
             console.error('Erro da API ao salvar:', response.status, errorData);
             throw new Error(errorData.message || 'Erro na API ao salvar.');
        }

        const result = await response.json();
        if (elements.saveStatusElement) {
            elements.saveStatusElement.textContent = `Salvo às ${new Date(result.updated_at).toLocaleTimeString()}`;
            elements.saveStatusElement.className = 'save-status saved';
        }
        console.log("Estado da calculadora salvo:", result);
    } catch (error) {
        console.error("Erro ao salvar estado da calculadora:", error.message);
        if (elements.saveStatusElement) {
            elements.saveStatusElement.textContent = 'Erro ao salvar';
            elements.saveStatusElement.className = 'save-status error';
        }
        showToast(`Erro ao salvar: ${error.message}`, "error"); 
    }
}

async function carregarEstadoCalculadora(clientId) {
      if (elements.saveStatusElement) {
        elements.saveStatusElement.textContent = '';
        elements.saveStatusElement.className = 'save-status';
    }

    if (elements.calculatorTableBody) elements.calculatorTableBody.innerHTML = '';
    estadoAbas = []; 
    abaAtivaIndex = 0;

    try {
        const response = await fetch(`https://api-calculadora-hgy8.onrender.com/api/orcamentos/${clientId}`);
        if (!response.ok) {
             if (response.status === 404) {
                console.log("Nenhum orçamento salvo. Criando novo.");
                if(elements.calculatorMarkupInput) elements.calculatorMarkupInput.value = '100';
                if(elements.selectParcelamentoGlobal) elements.selectParcelamentoGlobal.value = 'DÉBITO';
                
                estadoAbas = [{ nome: "Orçamento 1", ambientes: [], venda_realizada: false }];
                abaAtivaIndex = 0;
                
                renderizarTabs();
                ativarAba(0, true); 
                triggerAutoSave();
                return;
             }
             const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido ao carregar orçamento.' }));
             console.error('Erro da API ao carregar:', response.status, errorData);
             throw new Error(errorData.message || 'Erro API carregar.');
        }
        const estado = await response.json();

        if(elements.calculatorMarkupInput) elements.calculatorMarkupInput.value = estado.markup || '100';
        if(elements.selectParcelamentoGlobal) {
            elements.selectParcelamentoGlobal.value = estado.parcelamento || 'DÉBITO'; 
        }
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
            estadoAbas = [{ nome: "Principal", ambientes: estado.ambientes, venda_realizada: false }];
            abaAtivaIndex = 0;
        } else {
            console.log("Orçamento salvo vazio ou inválido. Criando novo.");
            estadoAbas = [{ nome: "Orçamento 1", ambientes: [], venda_realizada: false }];
            abaAtivaIndex = 0;
        }
        
        renderizarTabs();
        ativarAba(abaAtivaIndex, true); 
        
        if (elements.saveStatusElement) {
            elements.saveStatusElement.textContent = '';
        }

    } catch (error) {
        console.error("Erro ao carregar estado da calculadora:", error.message);
        if (elements.saveStatusElement) {
            elements.saveStatusElement.textContent = 'Erro ao carregar.';
            elements.saveStatusElement.className = 'save-status error';
        }
        showToast(`Erro ao carregar orçamento: ${error.message}`, "error"); 
        
        estadoAbas = [{ nome: "Orçamento 1", ambientes: [], venda_realizada: false }];
        abaAtivaIndex = 0;
        renderizarTabs();
        ativarAba(0, true); 
        triggerAutoSave();
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
         estadoAbas[abaAtivaIndex].ambientes = obterEstadoAbaAtual();
    }
    
    abaAtivaIndex = index;

    const abasAtuais = elements.tabsContainer.querySelectorAll('.calc-tab');
    abasAtuais.forEach((tab, i) => {
        tab.classList.toggle('active', i === index);
    });

    if (elements.calculatorTableBody) elements.calculatorTableBody.innerHTML = '';
    
    const abaAtiva = estadoAbas[index];
    const ambientesDaAba = abaAtiva.ambientes || [];
    
    if (ambientesDaAba.length > 0) {
        ambientesDaAba.forEach(estadoLinha => {
            adicionarLinhaCalculadora(estadoLinha);
        });
    } else {
        adicionarLinhaCalculadora(null);
    }

    if (elements.chkSummaryVendaRealizada) {
        elements.chkSummaryVendaRealizada.checked = abaAtiva.venda_realizada === true;
    }

    atualizarHeaderParcelado();
    recalcularTotaisSelecionados();
}

function adicionarAba() {

    if (abaAtivaIndex >= 0 && abaAtivaIndex < estadoAbas.length) {
        estadoAbas[abaAtivaIndex].ambientes = obterEstadoAbaAtual();
    }
    
    const novaAba = {
        nome: `Orçamento ${estadoAbas.length + 1}`,
        ambientes: [],
        venda_realizada: false 
    };
    estadoAbas.push(novaAba);
    
    const novoIndex = estadoAbas.length - 1;

    renderizarTabs();
    ativarAba(novoIndex); 

    triggerAutoSave();
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
    
    triggerAutoSave();

    closeModal(elements.modalExcluirAba);
    abaParaExcluir = { index: null, element: null };
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
            triggerAutoSave();
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
    if (elements.saveStatusElement) {
        elements.saveStatusElement.textContent = 'Carregando dados...';
        elements.saveStatusElement.className = 'save-status loading';
    }


    try {
        await aguardarDadosBase();
        await carregarEstadoCalculadora(clientId); 
        atualizarHeaderParcelado(); 

    } catch (err) {
        console.error("Erro ao preparar calculadora para o cliente:", err);
        showToast(err.message || "Erro ao carregar dados da calculadora.", "error"); 
        if (elements.saveStatusElement) {
            elements.saveStatusElement.textContent = 'Erro ao carregar';
            elements.saveStatusElement.className = 'save-status error';
        }
    }
}