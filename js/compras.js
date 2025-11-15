// js/compras.js

import { exibirAlerta } from "./alerta_global.js";
// Assumindo que você tem URL_API_FORNECEDORES e URL_API_COMPRAS no seu config.js
import { URL_API_FORNECEDORES, URL_API_COMPRAS, URL_API_CARDAPIO } from "./config.js"; 

// =========================================================
// VARIÁVEIS GLOBAIS E ELEMENTOS DO DOM
// =========================================================

// Fornecedores
const fornecedoresBody = document.getElementById('fornecedoresBody');
const fornecedorSearch = document.getElementById('fornecedorSearch');
const btnNovoFornecedor = document.getElementById('btnNovoFornecedor');
const modalFornecedor = document.getElementById('modalFornecedor');
const modalFornecedorTitle = document.getElementById('modalFornecedorTitle');
const formFornecedor = document.getElementById('formFornecedor');
const btnSalvarFornecedor = document.getElementById('btnSalvarFornecedor'); 
const fornecedorId = document.getElementById('fornecedorId');
const fornecedorNome = document.getElementById('fornecedorNome');
const fornecedorContato = document.getElementById('fornecedorContato');
const fornecedorTelefone = document.getElementById('fornecedorTelefone'); // Elemento para máscara
const fornecedorEmail = document.getElementById('fornecedorEmail');
const fornecedorEndereco = document.getElementById('fornecedorEndereco');

// Compras
const comprasBody = document.getElementById('comprasBody');
const filtroCompraFornecedor = document.getElementById('filtroCompraFornecedor');
const filtroCompraDataInicial = document.getElementById('filtroCompraDataInicial');
const filtroCompraDataFinal = document.getElementById('filtroCompraDataFinal');
const btnFiltrarCompras = document.getElementById('btnFiltrarCompras');
const btnNovaCompra = document.getElementById('btnNovaCompra');
const modalCompra = document.getElementById('modalCompra');
const modalCompraTitle = document.getElementById('modalCompraTitle');
const formCompra = document.getElementById('formCompra');
const btnSalvarCompra = document.getElementById('btnSalvarCompra'); 
const compraId = document.getElementById('compraId');
const compraFornecedor = document.getElementById('compraFornecedor');
const compraData = document.getElementById('compraData');
const compraDescricao = document.getElementById('compraDescricao');
const compraTotal = document.getElementById('compraTotal');
const compraObservacoes = document.getElementById('compraObservacoes');

let todosFornecedores = []; 
let todasCompras = [];     

// =========================================================
// FUNÇÕES DE UTILIDADE
// =========================================================

/**
 * Função global para abrir modais (requerida pelo modalCompra/Fornecedor).
 * Nota: Esta função é uma versão simplificada do alerta_global.js, caso não o importe.
 */
window.abrirModal = function(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'flex'; // Usar flex para centralizar
    }
}

/**
 * Função para aplicar a máscara de telefone no formato (XX) XXXXX-XXXX.
 * @param {Event} event - Evento de input do campo.
 */
function formatarTelefone(event) {
    let input = event.target;
    let value = input.value.replace(/\D/g, ""); // Remove tudo que não é dígito
    let formattedValue = '';

    // Limita o número de dígitos para evitar overflow
    if (value.length > 11) {
        value = value.substring(0, 11);
    }

    if (value.length > 0) {
        formattedValue += '(' + value.substring(0, 2);
    }
    if (value.length >= 3) {
        formattedValue += ') ' + value.substring(2, 7);
    }
    if (value.length >= 8) {
        formattedValue += '-' + value.substring(7, 11);
    }
    
    input.value = formattedValue;
}

// =========================================================
// EVENT LISTENERS E INICIALIZAÇÃO
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded disparado. Iniciando carregamento de dados e listeners.');
    carregarFornecedores();
    carregarCompras();
    
    // Fornecedores
    if (btnNovoFornecedor) btnNovoFornecedor.addEventListener('click', () => abrirModalFornecedor());
    else console.warn('btnNovoFornecedor não encontrado. Verifique o ID no HTML.');

    if (formFornecedor) formFornecedor.addEventListener('submit', salvarFornecedor);
    else console.warn('formFornecedor não encontrado. Verifique o ID no HTML.');

    if (fornecedorSearch) fornecedorSearch.addEventListener('input', filtrarFornecedores);
    else console.warn('fornecedorSearch não encontrado. A busca por fornecedor não funcionará.');
    
    // NOVO: Listener para Máscara de Telefone
    if (fornecedorTelefone) fornecedorTelefone.addEventListener('input', formatarTelefone);

    // Compras
    if (btnNovaCompra) btnNovaCompra.addEventListener('click', () => abrirModalCompra());
    else console.warn('btnNovaCompra não encontrado. Verifique o ID no HTML.');

    if (formCompra) formCompra.addEventListener('submit', salvarCompra);
    else console.warn('formCompra não encontrado. Verifique o ID no HTML.');

    if (btnFiltrarCompras) btnFiltrarCompras.addEventListener('click', filtrarCompras);
    else console.warn('btnFiltrarCompras não encontrado. O filtro de compras não funcionará.');

    // Definir datas padrão para filtros de compra
    setDefaultDates();
});

function setDefaultDates() {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const formatDate = (date) => date.toISOString().split('T')[0];

    if (filtroCompraDataFinal) filtroCompraDataFinal.value = formatDate(today);
    if (filtroCompraDataInicial) filtroCompraDataInicial.value = formatDate(thirtyDaysAgo);
}

// Sobrescreve a função global para limpar o form ao fechar (referenciada pelo onclick no HTML)
window.fecharModal = function(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'none'; 
        // Limpa o formulário correspondente
        if (id === 'modalFornecedor' && formFornecedor) {
            formFornecedor.reset();
            fornecedorId.value = '';
        } else if (id === 'modalCompra' && formCompra) {
            formCompra.reset();
            compraId.value = '';
        }
    }
}


// =========================================================
// FUNÇÕES DE FORNECEDORES
// =========================================================

async function carregarFornecedores() {
    if (fornecedoresBody) { // Adicionado if para evitar erro se fornecedoresBody for null
        fornecedoresBody.innerHTML = '<tr><td colspan="4" class="text-center">Carregando fornecedores...</td></tr>';
    }
    try {
        const response = await fetch(URL_API_FORNECEDORES);
        if (!response.ok) {
            // Tenta ler o erro do corpo da resposta, se houver
            const errorText = await response.text();
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
               const errorData = JSON.parse(errorText);
               errorMessage = errorData.message || errorMessage;
            } catch (e) { /* ignore JSON parse error, use text */ }
            throw new Error(errorMessage);
        }
        todosFornecedores = await response.json();
        renderizarFornecedores(todosFornecedores);
        popularFiltroFornecedores(todosFornecedores);
        popularSelectFornecedoresCompra(todosFornecedores);
    } catch (error) {
        console.error('Erro ao carregar fornecedores:', error);
        exibirAlerta(`Erro ao carregar fornecedores: ${error.message}. Verifique o servidor de API.`, 'error');
        if (fornecedoresBody) {
            fornecedoresBody.innerHTML = '<tr><td colspan="4" class="text-danger text-center">Erro ao carregar fornecedores.</td></tr>';
        }
    }
}

function renderizarFornecedores(fornecedores) {
    if (!fornecedoresBody) return; // Proteção extra
    fornecedoresBody.innerHTML = '';
    
    if (fornecedores.length === 0) {
        fornecedoresBody.innerHTML = '<tr><td colspan="4" class="text-center">Nenhum fornecedor cadastrado.</td></tr>';
        return;
    }

    fornecedores.forEach(fornecedor => {
        const row = fornecedoresBody.insertRow();
        row.innerHTML = `
            <td>${fornecedor.nome}</td>
            <td>${fornecedor.contato || '-'}</td>
            <td>${fornecedor.telefone || '-'}</td>
            <td class="action-buttons-cell">
                <button class="action-button-secondary edit-button" data-id="${fornecedor.id}">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="action-button-danger delete-button" data-id="${fornecedor.id}">
                    <i class="fas fa-trash-alt"></i> Excluir
                </button>
            </td>
        `;
        row.querySelector('.edit-button').addEventListener('click', (e) => editarFornecedor(e.currentTarget.dataset.id));
        row.querySelector('.delete-button').addEventListener('click', (e) => removerFornecedor(e.currentTarget.dataset.id));
    });
}

function abrirModalFornecedor(fornecedor = {}) {
    if (!modalFornecedor || !modalFornecedorTitle) return; // Proteção
    modalFornecedorTitle.textContent = fornecedor.id ? 'Editar Fornecedor' : 'Novo Fornecedor';
    fornecedorId.value = fornecedor.id || '';
    fornecedorNome.value = fornecedor.nome || '';
    fornecedorContato.value = fornecedor.contato || '';
    
    // Aplica a máscara ao carregar (se houver um valor)
    if (fornecedor.telefone) {
        fornecedorTelefone.value = fornecedor.telefone;
        // Chama a função de formatação para garantir o padrão (XX) XXXXX-XXXX
        formatarTelefone({ target: fornecedorTelefone }); 
    } else {
        fornecedorTelefone.value = '';
    }
    
    fornecedorEmail.value = fornecedor.email || '';
    fornecedorEndereco.value = fornecedor.endereco || '';
    
    abrirModal('modalFornecedor'); // Usa a função auxiliar
}

async function salvarFornecedor(event) {
    event.preventDefault();
    
    if (!btnSalvarFornecedor) return; // Proteção
    btnSalvarFornecedor.disabled = true;
    btnSalvarFornecedor.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

    const fornecedorData = {
        nome: fornecedorNome.value,
        contato: fornecedorContato.value,
        // Envia o telefone SEM formatação para a API
        telefone: fornecedorTelefone.value.replace(/\D/g, ""), 
        email: fornecedorEmail.value,
        endereco: fornecedorEndereco.value,
    };

    const method = fornecedorId.value ? 'PUT' : 'POST';
    const url = fornecedorId.value ? `${URL_API_FORNECEDORES}/${fornecedorId.value}` : URL_API_FORNECEDORES;

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fornecedorData),
        });

        if (!response.ok) {
             const errorText = await response.text();
             let errorMessage = `HTTP error! status: ${response.status}`;
             try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.message || errorMessage;
             } catch (e) { /* ignore JSON parse error, use text */ }
             throw new Error(errorMessage);
        }

        const mensagem = fornecedorId.value ? 'Fornecedor atualizado com sucesso!' : 'Fornecedor cadastrado com sucesso!';
        exibirAlerta(mensagem, 'success');
        fecharModal('modalFornecedor');
        carregarFornecedores(); 
    } catch (error) {
        console.error('Erro ao salvar fornecedor:', error);
        exibirAlerta(`Erro ao salvar fornecedor: ${error.message}`, 'error');
    } finally {
        btnSalvarFornecedor.disabled = false;
        btnSalvarFornecedor.innerHTML = '<i class="fas fa-save"></i> Salvar Fornecedor';
    }
}

function editarFornecedor(id) {
    const fornecedor = todosFornecedores.find(f => f.id == id); 
    
    if (fornecedor) {
        abrirModalFornecedor(fornecedor);
    } else {
        exibirAlerta('Fornecedor não encontrado no cache. Recarregue a página.', 'error');
    }
}

async function removerFornecedor(id) {
    if (!confirm(`Tem certeza que deseja remover o fornecedor ID #${id}?`)) {
        return;
    }
    try {
        const response = await fetch(`${URL_API_FORNECEDORES}/${id}`, {
            method: 'DELETE',
        });
        if (response.status === 204 || response.status === 200) {
            exibirAlerta('Fornecedor removido com sucesso!', 'success');
            carregarFornecedores();
            carregarCompras(); 
        } else {
            const errorText = await response.text();
             let errorMessage = `HTTP error! status: ${response.status}`;
             try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.message || errorMessage;
             } catch (e) { /* ignore JSON parse error, use text */ }
             throw new Error(errorMessage);
        }
    } catch (error) {
        console.error('Erro ao remover fornecedor:', error);
        exibirAlerta(`Erro ao remover fornecedor: ${error.message}`, 'error');
    }
}

function filtrarFornecedores() {
    // Proteção adicionada
    if (!fornecedorSearch || !todosFornecedores) return; 

    const searchTerm = fornecedorSearch.value.toLowerCase();
    const fornecedoresFiltrados = todosFornecedores.filter(f => 
        f.nome.toLowerCase().includes(searchTerm) ||
        f.contato?.toLowerCase().includes(searchTerm) ||
        f.telefone?.toLowerCase().includes(searchTerm)
    );
    renderizarFornecedores(fornecedoresFiltrados);
}

function popularFiltroFornecedores(fornecedores) {
    if (!filtroCompraFornecedor) return; // Proteção
    filtroCompraFornecedor.innerHTML = '<option value="">Todos os Fornecedores</option>';
    fornecedores.forEach(fornecedor => {
        const option = document.createElement('option');
        option.value = fornecedor.id;
        option.textContent = fornecedor.nome;
        filtroCompraFornecedor.appendChild(option);
    });
}

function popularSelectFornecedoresCompra(fornecedores) {
    if (!compraFornecedor) return; // Proteção
    compraFornecedor.innerHTML = '<option value="">Selecione um Fornecedor</option>';
    fornecedores.forEach(fornecedor => {
        const option = document.createElement('option');
        option.value = fornecedor.id;
        option.textContent = fornecedor.nome;
        compraFornecedor.appendChild(option);
    });
}


// =========================================================
// FUNÇÕES DE COMPRAS
// =========================================================

async function carregarCompras() {
    if (comprasBody) { // Adicionado if para evitar erro se comprasBody for null
        comprasBody.innerHTML = '<tr><td colspan="5" class="text-center">Carregando compras...</td></tr>';
    }
    try {
        const response = await fetch(URL_API_COMPRAS);
        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
               const errorData = JSON.parse(errorText);
               errorMessage = errorData.message || errorMessage;
            } catch (e) { /* ignore JSON parse error, use text */ }
            throw new Error(errorMessage);
        }
        todasCompras = await response.json();
        filtrarCompras(); 
    } catch (error) {
        console.error('Erro ao carregar compras:', error);
        exibirAlerta(`Erro ao carregar compras: ${error.message}. Verifique o servidor de API.`, 'error');
        if (comprasBody) {
            comprasBody.innerHTML = '<tr><td colspan="5" class="text-danger text-center">Erro ao carregar compras.</td></tr>';
        }
    }
}

function renderizarCompras(compras) {
    if (!comprasBody) return; // Proteção extra
    comprasBody.innerHTML = '';
    
    if (compras.length === 0) {
        comprasBody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhuma compra registrada no período/filtro.</td></tr>';
        return;
    }

    compras.forEach(compra => {
        const fornecedor = todosFornecedores.find(f => f.id == compra.fornecedorId);
        const fornecedorNome = fornecedor ? fornecedor.nome : 'Desconhecido';
        const dataFormatada = new Date(compra.data).toLocaleDateString('pt-BR');
        const totalFormatado = parseFloat(compra.total).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        const row = comprasBody.insertRow();
        row.innerHTML = `
            <td>${dataFormatada}</td>
            <td>${fornecedorNome}</td>
            <td>${compra.descricao || '-'}</td>
            <td style="text-align: right;">R$ ${totalFormatado}</td>
            <td class="action-buttons-cell">
                <button class="action-button-secondary edit-button" data-id="${fornecedor.id}">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="action-button-danger delete-button" data-id="${fornecedor.id}">
                    <i class="fas fa-trash-alt"></i> Excluir
                </button>
            </td>
        `;
        // ATENÇÃO: Os seletores agora usam .edit-button e .delete-button para padronizar
        row.querySelector('.edit-button').addEventListener('click', (e) => editarCompra(e.currentTarget.dataset.id));
        row.querySelector('.delete-button').addEventListener('click', (e) => removerCompra(e.currentTarget.dataset.id));
    });
}

function abrirModalCompra(compra = {}) {
    if (!modalCompra || !modalCompraTitle) return; // Proteção
    modalCompraTitle.textContent = compra.id ? 'Editar Compra' : 'Nova Compra';
    compraId.value = compra.id || '';
    
    compraFornecedor.value = compra.fornecedorId || '';
    // Garante que a data sempre seja formatada para YYYY-MM-DD para o input type="date"
    compraData.value = compra.data ? new Date(compra.data).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    compraDescricao.value = compra.descricao || '';
    compraTotal.value = compra.total || '';
    compraObservacoes.value = compra.observacoes || '';
    
    abrirModal('modalCompra'); // Usa a função auxiliar
}

async function salvarCompra(event) {
    event.preventDefault();
    
    if (!compraFornecedor.value) {
        exibirAlerta('Selecione um fornecedor para a compra.', 'warning');
        return;
    }
    if (!btnSalvarCompra) return; // Proteção

    btnSalvarCompra.disabled = true;
    btnSalvarCompra.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

    const compraDataPayload = {
        fornecedorId: parseInt(compraFornecedor.value),
        data: compraData.value, // A API espera o formato de data do input (YYYY-MM-DD)
        descricao: compraDescricao.value,
        total: parseFloat(compraTotal.value),
        observacoes: compraObservacoes.value,
    };

    const method = compraId.value ? 'PUT' : 'POST';
    const url = compraId.value ? `${URL_API_COMPRAS}/${compraId.value}` : URL_API_COMPRAS;

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(compraDataPayload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
               const errorData = JSON.parse(errorText);
               errorMessage = errorData.message || errorMessage;
            } catch (e) { /* ignore JSON parse error, use text */ }
            throw new Error(errorMessage);
        }

        const mensagem = compraId.value ? 'Compra atualizada com sucesso!' : 'Compra registrada com sucesso!';
        exibirAlerta(mensagem, 'success');
        fecharModal('modalCompra');
        carregarCompras(); 
    } catch (error) {
        console.error('Erro ao salvar compra:', error);
        exibirAlerta(`Erro ao salvar compra: ${error.message}`, 'error');
    } finally {
        btnSalvarCompra.disabled = false;
        btnSalvarCompra.innerHTML = '<i class="fas fa-save"></i> Salvar Compra';
    }
}

function editarCompra(id) {
    const compra = todasCompras.find(c => c.id == id);
    if (compra) {
        abrirModalCompra(compra);
    } else {
        exibirAlerta('Compra não encontrada no cache. Recarregue a página.', 'error');
    }
}

async function removerCompra(id) {
    if (!confirm(`Tem certeza que deseja remover a compra ID #${id}?`)) {
        return;
    }
    try {
        const response = await fetch(`${URL_API_COMPRAS}/${id}`, {
            method: 'DELETE',
        });
        if (response.status === 204 || response.status === 200) {
            exibirAlerta('Compra removida com sucesso!', 'success');
            carregarCompras();
        } else {
            const errorText = await response.text();
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
               const errorData = JSON.parse(errorText);
               errorMessage = errorData.message || errorMessage;
            } catch (e) { /* ignore JSON parse error, use text */ }
            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error('Erro ao remover compra:', error);
        exibirAlerta(`Erro ao remover compra: ${error.message}`, 'error');
    }
}

function filtrarCompras() {
    // Proteção adicionada
    if (!filtroCompraFornecedor || !filtroCompraDataInicial || !filtroCompraDataFinal || !todasCompras) return; 

    let comprasFiltradas = [...todasCompras]; 

    const fornecedorSelecionadoId = filtroCompraFornecedor.value;
    const dataInicialValor = filtroCompraDataInicial.value;
    const dataFinalValor = filtroCompraDataFinal.value;

    if (fornecedorSelecionadoId) {
        comprasFiltradas = comprasFiltradas.filter(compra => compra.fornecedorId == fornecedorSelecionadoId);
    }

    if (dataInicialValor) {
        const dataInicial = new Date(dataInicialValor + 'T00:00:00');
        comprasFiltradas = comprasFiltradas.filter(compra => {
            // A compra.data da API deve ser uma string de data válida (ex: "2025-10-25T15:00:00Z")
            const dataCompra = new Date(compra.data);
            return dataCompra >= dataInicial;
        });
    }

    if (dataFinalValor) {
        const dataFinal = new Date(dataFinalValor + 'T23:59:59');
        comprasFiltradas = comprasFiltradas.filter(compra => {
            const dataCompra = new Date(compra.data);
            return dataCompra <= dataFinal;
        });
    }

    renderizarCompras(comprasFiltradas);
}