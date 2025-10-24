import { showToast, openModal, closeModal } from './ui.js';
import { DADOS_FRANZ_CORTINA, DADOS_FRANZ_BLACKOUT, DADOS_INSTALACAO, DADOS_FRETE } from '../data/opcoes.js';

let elements = {};
let dataRefs = {};
let currentClientIdRef = { value: null };
let isDataLoadedRef = { value: false };

let autoSaveTimer = null;
let linhaParaExcluir = null;

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

    const btnAddLinha = document.getElementById('btn-add-linha-calc');
    if (btnAddLinha) {
        btnAddLinha.addEventListener('click', () => {
            if (!isDataLoadedRef.value) {
                 showToast("Aguarde, carregando dados base...", true);
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
            triggerAutoSave();
        });
    });

    if (elements.btnConfirmarExcluirLinha) {
        elements.btnConfirmarExcluirLinha.addEventListener('click', () => {
            if (linhaParaExcluir) {
                linhaParaExcluir.remove();
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
        .sort((a, b) => a.produto.localeCompare(b.produto))
        .forEach(tecido => {
            const option = new Option(tecido.produto, tecido.produto);
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
        showToast("Erro: Dados de confecção/trilho não carregados. Saia e entre no cliente novamente.", true);
        
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
        calcularOrcamentoLinha(novaLinha);
    }

    const gatilhos = novaLinha.querySelectorAll('input, select');
    gatilhos.forEach(gatilho => {
        const eventType = (gatilho.tagName === 'SELECT') ? 'change' : 'input';
        gatilho.addEventListener(eventType, () => {
             setTimeout(() => calcularOrcamentoLinha(novaLinha), 10);
             triggerAutoSave();
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
    const descAnt = parseFloat(elements.calculatorDescAntInput?.value) || 0;
    const desc12x = parseFloat(elements.calculatorDesc12xInput?.value) || 0;

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
        markupBase: markupP / 100.0,
        descontoAntecipado: descAnt / 100.0,
        desconto12x: desc12x / 100.0
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

        const ora = linha.querySelector('td:nth-child(18) input'); if(ora) ora.value = formatadorReaisCalc.format(resultados.orcamentoAntecipado ?? 0);
        const orx = linha.querySelector('td:nth-child(19) input'); if(orx) orx.value = formatadorReaisCalc.format(resultados.orcamento12x ?? 0);

    } catch (error) {
        console.error("Erro ao calcular orçamento:", error.message);
        const qtc = linha.querySelector('td:nth-child(7) input'); if(qtc) qtc.value = '0.00';
        const qtf = linha.querySelector('td:nth-child(9) input'); if(qtf) qtf.value = '0.00';
        const qtb = linha.querySelector('td:nth-child(12) input'); if(qtb) qtb.value = '0.00';
        const ora = linha.querySelector('td:nth-child(18) input'); if(ora) ora.value = formatadorReaisCalc.format(0);
        const orx = linha.querySelector('td:nth-child(19) input'); if(orx) orx.value = formatadorReaisCalc.format(0);
        showToast(`Erro no cálculo: ${error.message}`, true);
    }
}

async function salvarEstadoCalculadora(clientId) {
    if (!elements.calculatorView || !elements.calculatorTableBody) return;

    const todasLinhas = elements.calculatorTableBody.querySelectorAll('.linha-calculo-cliente');
    const dadosOrcamento = [];

    todasLinhas.forEach(linhaCalc => {
        const confecaoSelect = linhaCalc.querySelector('.select-confecao');
        const confecaoTexto = confecaoSelect ? confecaoSelect.value : '-';

        const trilhoSelect = linhaCalc.querySelector('.select-trilho');
        const trilhoTexto = trilhoSelect ? trilhoSelect.value : '-';

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
        };
        dadosOrcamento.push(estadoLinha);
    });

    const estadoCompleto = {
        ambientes: dadosOrcamento,
        markup: elements.calculatorMarkupInput?.value || '100',
        descAnt: elements.calculatorDescAntInput?.value || '0',
        desc12x: elements.calculatorDesc12xInput?.value || '0',
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
        showToast(`Erro ao salvar: ${error.message}`, true);
    }
}

async function carregarEstadoCalculadora(clientId) {
      if (elements.saveStatusElement) {
        elements.saveStatusElement.textContent = '';
        elements.saveStatusElement.className = 'save-status';
    }

    if (elements.calculatorTableBody) elements.calculatorTableBody.innerHTML = '';

    try {
        const response = await fetch(`https://api-calculadora-hgy8.onrender.com/api/orcamentos/${clientId}`);
        if (!response.ok) {
             const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido ao carregar orçamento.' }));
             console.error('Erro da API ao carregar:', response.status, errorData);
             throw new Error(errorData.message || 'Erro API carregar.');
        }
        const estado = await response.json();

        if (!estado || typeof estado !== 'object' || Object.keys(estado).length === 0 || !Array.isArray(estado.ambientes)) {
             console.log("Nenhum orçamento salvo ou formato inválido. Adicionando uma linha padrão.");
             adicionarLinhaCalculadora(null);
             if(elements.calculatorMarkupInput) elements.calculatorMarkupInput.value = '100';
             if(elements.calculatorDescAntInput) elements.calculatorDescAntInput.value = '0';
             if(elements.calculatorDesc12xInput) elements.calculatorDesc12xInput.value = '0';
             triggerAutoSave();
             return;
        }

        if(elements.calculatorMarkupInput) elements.calculatorMarkupInput.value = estado.markup || '100';
        const descAntVal = parseFloat(estado.descAnt) || 0;
        if(elements.calculatorDescAntInput) elements.calculatorDescAntInput.value = descAntVal !== 0 ? descAntVal : '';
        
        const desc12xVal = parseFloat(estado.desc12x) || 0;
        if(elements.calculatorDesc12xInput) elements.calculatorDesc12xInput.value = desc12xVal !== 0 ? desc12xVal : '';

        if (estado.ambientes.length > 0) {
            estado.ambientes.forEach(estadoLinha => {
                adicionarLinhaCalculadora(estadoLinha);
            });
        } else {
             console.log("Orçamento salvo existe, mas sem ambientes. Adicionando linha padrão.");
             adicionarLinhaCalculadora(null);
             triggerAutoSave();
        }

        if (elements.saveStatusElement) {
            elements.saveStatusElement.textContent = '';
        }

    } catch (error) {
        console.error("Erro ao carregar estado da calculadora:", error.message);
        if (elements.saveStatusElement) {
            elements.saveStatusElement.textContent = 'Erro ao carregar.';
            elements.saveStatusElement.className = 'save-status error';
        }
        showToast(`Erro ao carregar orçamento: ${error.message}`, true);
        adicionarLinhaCalculadora(null);
        triggerAutoSave();
    }
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

    } catch (err) {
        console.error("Erro ao preparar calculadora para o cliente:", err);
        showToast(err.message || "Erro ao carregar dados da calculadora.", true);
        if (elements.saveStatusElement) {
            elements.saveStatusElement.textContent = 'Erro ao carregar';
            elements.saveStatusElement.className = 'save-status error';
        }
        adicionarLinhaCalculadora(null);
        triggerAutoSave();
    }
}