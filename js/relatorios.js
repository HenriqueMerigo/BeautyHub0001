// relatorios.js (Código Completo e Otimizado - Com Relatórios de Compras)

// =========================================================
// VARIÁVEIS GLOBAIS E CONFIGURAÇÃO
// =========================================================
import { URL_API_FORNECEDORES, URL_API_CARDAPIO, URL_API_COMPRAS, RELATORIOS_API_URL } from "./config.js";
// Assumindo que RELATORIOS_API_URL já está definida no config.js
// URL_API_COMPRAS é a URL para buscar todos os dados de /api/compras

// Configuração das URLs
const CARDAPIO_API_URL = URL_API_CARDAPIO;
const COMPRAS_API_URL = URL_API_COMPRAS; // NOVO: URL da API de Compras
const FORNECEDORES_API_URL = URL_API_FORNECEDORES; // NOVO

// Elementos DOM (Mantidos)
const tipoRelatorio = document.getElementById('tipoRelatorio');
const filtroDataInicial = document.getElementById('filtroDataInicial');
const filtroDataFinal = document.getElementById('filtroDataFinal');
const btnGerarRelatorio = document.getElementById('btnGerarRelatorio');
const btnExportarRelatorio = document.getElementById('btnExportarRelatorio');
const msgRelatorio = document.getElementById('msg-relatorio');
const chartCanvas = document.getElementById('relatorioChart');
const tabelaDadosBrutos = document.getElementById('tabela-dados-brutos');

// Cache de Dados
let chartInstance = null;
let dadosCompletosItens = [];
let cardapioCache = [];
let comprasCache = []; // NOVO: Cache de dados de Compras
let dadosAtuaisRelatorio = [];
let fornecedoresCache = []; // NOVO: Cache de Fornecedores

// =========================================================
// EVENT LISTENERS E INICIALIZAÇÃO (Mantidos)
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    carregarDadosIniciais();
    
    if(btnGerarRelatorio) btnGerarRelatorio.addEventListener('click', gerarRelatorio);
    if(btnExportarRelatorio) btnExportarRelatorio.addEventListener('click', exportarCSV);
    
    setDefaultDates();
});

function setDefaultDates() {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const formatDate = (date) => {
        const year = date.getFullYear();
        // Meses são 0-indexados, então +1
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    if (filtroDataFinal) filtroDataFinal.value = formatDate(today);
    if (filtroDataInicial) filtroDataInicial.value = formatDate(thirtyDaysAgo);
}


async function carregarDadosIniciais() {
    msgRelatorio.textContent = 'Carregando dados...';
    try {
        // Busca paralela de todos os dados: Vendas, Cardápio e AGORA, COMPRAS
        const [vendasResponse, cardapioResponse, comprasResponse, fornecedoresResponse] = await Promise.all([
            fetch(RELATORIOS_API_URL),
            fetch(CARDAPIO_API_URL),
            fetch(COMPRAS_API_URL),
            fetch(FORNECEDORES_API_URL) // Busca de Fornecedores
        ]);

        if (!vendasResponse.ok) throw new Error('Falha ao carregar itens vendidos.');
        if (!cardapioResponse.ok) throw new Error('Falha ao carregar cardápio.');
        if (!comprasResponse.ok) throw new Error('Falha ao carregar dados de compras.'); 
        if (!fornecedoresResponse.ok) throw new Error('Falha ao carregar dados de fornecedores.'); // NOVO

        dadosCompletosItens = await vendasResponse.json();
        cardapioCache = await cardapioResponse.json(); 
        comprasCache = await comprasResponse.json();
        fornecedoresCache = await fornecedoresResponse.json(); // Armazena dados de fornecedores

        msgRelatorio.textContent = `Dados carregados. ${dadosCompletosItens.length} itens de venda, ${comprasCache.length} registros de compra e ${fornecedoresCache.length} fornecedores disponíveis.`;        
    } catch (error) {
        console.error('Erro ao carregar dados iniciais para relatório:', error);
        msgRelatorio.textContent = `Erro: ${error.message}. Verifique o server.js e se o servidor está rodando.`;
    }
}


// =========================================================
// FLUXO DE GERAÇÃO E FILTRO
// =========================================================

// Função de filtro de vendas (renomeada para refletir que filtra itens de venda)
function filtrarItensPorData(itens) {
    const dataInicialValor = filtroDataInicial?.value;
    const dataFinalValor = filtroDataFinal?.value;

    let itensFiltrados = itens;

    if (dataInicialValor) {
        const dataInicial = new Date(dataInicialValor + 'T00:00:00'); 
        itensFiltrados = itensFiltrados.filter(item => {
            const dataFechamento = new Date(item.dataFechamento); 
            return dataFechamento >= dataInicial;
        });
    }

    if (dataFinalValor) {
        const dataFinal = new Date(dataFinalValor + 'T23:59:59'); 
        itensFiltrados = itensFiltrados.filter(item => {
            const dataFechamento = new Date(item.dataFechamento);
            return dataFechamento <= dataFinal;
        });
    }
    
    return itensFiltrados;
}


// NOVO: Função para filtrar Compras por Data
function filtrarComprasPorData(compras) {
    const dataInicialValor = filtroDataInicial?.value;
    const dataFinalValor = filtroDataFinal?.value;

    let comprasFiltradas = compras;

    if (dataInicialValor) {
        const dataInicial = new Date(dataInicialValor + 'T00:00:00'); 
        comprasFiltradas = comprasFiltradas.filter(compra => {
            // Assumimos que o campo de data de compra se chama 'data' e é uma string ISO
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
    
    return comprasFiltradas;
}


function gerarRelatorio() {
    const tipo = tipoRelatorio.value;
    let resultado = { labels: [], datasets: [], dadosTabela: [] };
    let dadosParaProcessar = [];
    let mensagemPadrao = '';

    // Lógica para selecionar e filtrar os dados
    if (tipo.startsWith('compras_')) {
        // Se for relatório de COMPRAS, usa o cache de compras
        if (comprasCache.length === 0) {
            msgRelatorio.textContent = 'Nenhuma compra registrada ou os dados não foram carregados.';
            destruirGrafico();
            tabelaDadosBrutos.innerHTML = '';
            dadosAtuaisRelatorio = [];
            return;
        }
        dadosParaProcessar = filtrarComprasPorData(comprasCache);
        mensagemPadrao = `${dadosParaProcessar.length} registros de compra analisados.`;

    } else {
        // Se for relatório de VENDAS (categorias, top itens, horaria)
        if (dadosCompletosItens.length === 0) {
            msgRelatorio.textContent = 'Nenhuma venda registrada ou os dados não foram carregados.';
            destruirGrafico();
            tabelaDadosBrutos.innerHTML = '';
            dadosAtuaisRelatorio = [];
            return;
        }
        dadosParaProcessar = filtrarItensPorData(dadosCompletosItens);
        // Apenas para relatórios de VENDAS é que mapeamos a categoria
        dadosParaProcessar = mapearCategoriaItens(dadosParaProcessar); 
        mensagemPadrao = `${dadosParaProcessar.length} itens de venda analisados.`;
    }
    
    if (dadosParaProcessar.length === 0) {
        msgRelatorio.textContent = 'Nenhum dado encontrado no período selecionado.';
        destruirGrafico();
        tabelaDadosBrutos.innerHTML = '';
        dadosAtuaisRelatorio = [];
        return;
    }
    
    // Chama a função de processamento específica
    if (tipo === 'vendas_categoria') {
        resultado = processarVendasPorCategoria(dadosParaProcessar);
    } else if (tipo === 'top_itens_vendidos') {
        resultado = processarTopItensVendidos(dadosParaProcessar);
    } else if (tipo === 'movimentacao_horaria') {
        resultado = processarMovimentacaoHoraria(dadosParaProcessar);
    } else if (tipo === 'compras_total') { // NOVO
        resultado = processarTotalCompras(dadosParaProcessar);
    } else if (tipo === 'compras_por_fornecedor') { // NOVO
        resultado = processarComprasPorFornecedor(dadosParaProcessar);
    }
    
    dadosAtuaisRelatorio = resultado.dadosTabela;
    
    // Renderiza
    renderizarGrafico(resultado, tipo);
    renderizarTabela(resultado.dadosTabela, tipo);
    msgRelatorio.textContent = `Relatório "${tipoRelatorio.options[tipoRelatorio.selectedIndex].text}" gerado. ${mensagemPadrao}`;
}


// =========================================================
// FUNÇÕES AUXILIARES DE PROCESSAMENTO DE DADOS (VENDAS)
// =========================================================
// MapearCategoriaItens, processarVendasPorCategoria, processarTopItensVendidos, processarMovimentacaoHoraria
// ... (Mantidas, usei o seu código original para estas funções)
// =========================================================

/**
 * Associa a categoria do cardápio a cada item vendido, usando case-insensitive.
 */
function mapearCategoriaItens(itens) {
    const cardapioMap = new Map(cardapioCache.map(i => [i.nome.toLowerCase(), i.categoria]));
    
    return itens.map(item => {
        const nomeItemLower = item.nomeItem.toLowerCase();
        let categoria = cardapioMap.get(nomeItemLower); 
        
        if (!categoria) {
            categoria = 'Outros'; 
        }

        return {
            ...item,
            categoria: categoria.charAt(0).toUpperCase() + categoria.slice(1).toLowerCase() 
        };
    });
}


/**
 * Processa dados para Vendas por Categoria (Valor Total).
 */
function processarVendasPorCategoria(itens) {
    const vendasPorCategoria = itens.reduce((acc, item) => {
        const cat = item.categoria || 'Outros';
        acc[cat] = (acc[cat] || 0) + item.totalItem;
        return acc;
    }, {});

    const categoriasOrdenadas = Object.keys(vendasPorCategoria).sort((a, b) => vendasPorCategoria[b] - vendasPorCategoria[a]);
    const valoresOrdenados = categoriasOrdenadas.map(cat => vendasPorCategoria[cat]);
    
    const totalGeral = valoresOrdenados.reduce((a, b) => a + b, 0);

    const dadosTabela = categoriasOrdenadas.map(cat => ({
        categoria: cat,
        valorTotal: vendasPorCategoria[cat],
        percentual: (vendasPorCategoria[cat] / totalGeral) * 100
    }));

    return {
        labels: categoriasOrdenadas,
        datasets: [{
            label: 'Faturamento por Categoria (R$)',
            data: valoresOrdenados,
            backgroundColor: gerarCoresAleatorias(categoriasOrdenadas.length)
        }],
        dadosTabela: dadosTabela
    };
}

/**
 * Processa dados para Top 10 Itens Vendidos (por Quantidade).
 */
function processarTopItensVendidos(itens) {
    const contagemItens = itens.reduce((acc, item) => {
        const key = item.nomeItem;
        acc[key] = {
            quantidade: (acc[key]?.quantidade || 0) + item.quantidade,
            faturamento: (acc[key]?.faturamento || 0) + item.totalItem,
            precoUnitario: item.precoUnitario 
        };
        return acc;
    }, {});

    const itensArray = Object.keys(contagemItens).map(nome => ({
        nomeItem: nome,
        ...contagemItens[nome]
    }));

    itensArray.sort((a, b) => b.quantidade - a.quantidade);
    const top10 = itensArray.slice(0, 10);
    
    const labels = top10.map(item => item.nomeItem);
    const quantidades = top10.map(item => item.quantidade);
    
    return {
        labels: labels,
        datasets: [{
            label: 'Quantidade Vendida',
            data: quantidades,
            backgroundColor: gerarCoresAleatorias(top10.length)
        }],
        dadosTabela: top10
    };
}


/**
 * Processa dados para Movimentação Horária (por Número de Itens).
 */
function processarMovimentacaoHoraria(itens) {
    const movimentacaoHoraria = itens.reduce((acc, item) => {
        const hora = new Date(item.dataFechamento).getHours();
        acc[hora] = (acc[hora] || 0) + item.quantidade;
        return acc;
    }, {});

    const labels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
    const dados = labels.map((_, i) => movimentacaoHoraria[i] || 0);

    return {
        labels: labels,
        datasets: [{
            label: 'Total de Itens Vendidos',
            data: dados,
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
            fill: false,
            tension: 0.1
        }],
        dadosTabela: labels.map((hora, index) => ({
            hora: hora,
            itensVendidos: dados[index]
        })).filter(d => d.itensVendidos > 0)
    };
}


// =========================================================
// NOVAS FUNÇÕES DE PROCESSAMENTO DE DADOS (COMPRAS)
// =========================================================

/**
 * NOVO: Calcula o total gasto em compras no período.
 */
function processarTotalCompras(compras) {
    // CORREÇÃO: Usando 'compra.total'
    const valorTotal = compras.reduce((acc, compra) => acc + (parseFloat(compra.total) || 0), 0);

    const dadosTabela = [{
        descricao: 'Valor Total de Compras',
        valor: valorTotal
    }];
    
    // Para renderizar no gráfico como uma barra ou rótulo grande
    return {
        labels: ['Compras'],
        datasets: [{
            label: 'Valor Total (R$)',
            data: [valorTotal],
            backgroundColor: 'rgba(255, 99, 132, 0.7)'
        }],
        dadosTabela: dadosTabela
    };
}

/**
 * NOVO: Agrupa e soma o valor das compras por fornecedor.
 */
function processarComprasPorFornecedor(compras) {
    const comprasPorFornecedor = compras.reduce((acc, compra) => {
        
        // 1. Mapeia o ID para o Nome (usando o ID como fallback)
        const chaveFornecedor = mapearNomeFornecedor(compra.fornecedorId); 
        
        const valor = parseFloat(compra.total) || 0; 
        
        // Se o nome do fornecedor (chaveFornecedor) já existe, soma o valor total
        if (acc[chaveFornecedor]) {
            acc[chaveFornecedor].valorTotal += valor;
        } else {
            // Se for a primeira vez, inicializa.
            acc[chaveFornecedor] = {
                valorTotal: valor
            };
        }

        return acc;
    }, {});

    // Converte o objeto de volta para um array para ordenação e tabela
    const itensArray = Object.keys(comprasPorFornecedor).map(nome => ({
        fornecedor: nome, // É o Nome ou 'ID XXXXX'
        valorTotal: comprasPorFornecedor[nome].valorTotal
    }));

    // Ordena por valor total
    itensArray.sort((a, b) => b.valorTotal - a.valorTotal);
    
    // Configuração para o Gráfico
    const labels = itensArray.map(item => item.fornecedor);
    const valoresOrdenados = itensArray.map(item => item.valorTotal);

    return {
        labels: labels,
        datasets: [{
            label: 'Gastos por Fornecedor (R$)',
            data: valoresOrdenados,
            backgroundColor: gerarCoresAleatorias(itensArray.length)
        }],
        dadosTabela: itensArray
    };
}


// =========================================================
// RENDERIZAÇÃO E EXPORTAÇÃO
// =========================================================

function destruirGrafico() {
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
}

// renderizarGrafico ATUALIZADA
function renderizarGrafico(resultado, tipo) {
    destruirGrafico();
    
    let config = {};
    const labels = resultado.labels;
    const datasets = resultado.datasets;
    const titulo = tipoRelatorio.options[tipoRelatorio.selectedIndex].text;

    if (tipo === 'vendas_categoria') {
        config = {
            type: 'pie', data: { labels, datasets },
            options: { responsive: true, plugins: { legend: { position: 'top' }, title: { display: true, text: titulo } } }
        };
    } else if (tipo === 'top_itens_vendidos') {
        config = {
            type: 'bar', data: { labels, datasets },
            options: { responsive: true, plugins: { legend: { display: false }, title: { display: true, text: titulo } },
                scales: { y: { beginAtZero: true, title: { display: true, text: 'Quantidade' } } }
            }
        };
    } else if (tipo === 'movimentacao_horaria') {
         config = {
            type: 'line', data: { labels, datasets },
            options: { responsive: true, plugins: { legend: { display: false }, title: { display: true, text: titulo } },
                scales: { y: { beginAtZero: true, title: { display: true, text: 'Itens Vendidos' } }, x: { title: { display: true, text: 'Hora do Dia' } } }
            }
        };
    } else if (tipo === 'compras_total') { // NOVO
        // Gráfico de barra simples para o total
        config = {
            type: 'bar', data: { labels, datasets },
            options: { responsive: true, plugins: { legend: { display: false }, title: { display: true, text: titulo } },
                scales: { y: { beginAtZero: true, title: { display: true, text: 'Valor (R$)' } } }
            }
        };
    } else if (tipo === 'compras_por_fornecedor') { // NOVO
        // Gráfico de barras para gastos por fornecedor
        config = {
            type: 'bar', data: { labels, datasets },
            options: { responsive: true, plugins: { legend: { display: false }, title: { display: true, text: titulo } },
                scales: { y: { beginAtZero: true, title: { display: true, text: 'Valor Gasto (R$)' } } }
            }
        };
    }

    if (chartCanvas) {
        const ctx = chartCanvas.getContext('2d');
        chartInstance = new Chart(ctx, config);
    }
}


// renderizarTabela ATUALIZADA
function renderizarTabela(dados, tipo) {
    const tabelaContainer = document.getElementById('tabela-dados-brutos');
    if (!tabelaContainer) {
        console.error("Contêiner da tabela de dados brutos não encontrado.");
        return;
    }
    tabelaContainer.innerHTML = '';

    if (dados.length === 0) {
        tabelaContainer.innerHTML = '<p style="text-align: center; margin-top: 20px;">Nenhum dado detalhado para exibir.</p>';
        return;
    }
    
    let htmlTabela = '<table id="tabelaRelatorio" class="tabela-relatorio" style="width: 100%; border-collapse: collapse;">';
    
    // Configurações do cabeçalho da tabela
    let headersConfig = [];
    if (tipo === 'vendas_categoria') {
        headersConfig = [
            { text: 'Categoria', width: '40%', align: 'left' },
            { text: 'Faturamento (R$)', width: '30%', align: 'right' },
            { text: 'Participação (%)', width: '30%', align: 'right' }
        ];
    } else if (tipo === 'top_itens_vendidos') {
        headersConfig = [
            { text: 'Item', width: '45%', align: 'left' },
            { text: 'Qtd. Vendida', width: '15%', align: 'right' },
            { text: 'Faturamento Total (R$)', width: '20%', align: 'right' },
            { text: 'Preço Unitário (R$)', width: '20%', align: 'right' }
        ];
    } else if (tipo === 'movimentacao_horaria') {
        headersConfig = [
            { text: 'Hora', width: '50%', align: 'left' },
            { text: 'Itens Vendidos', width: '50%', align: 'right' }
        ];
    } else if (tipo === 'compras_total') { // NOVO
        headersConfig = [
            { text: 'Descrição', width: '60%', align: 'left' },
            { text: 'Valor (R$)', width: '40%', align: 'right' }
        ];
    } else if (tipo === 'compras_por_fornecedor') { // NOVO
        headersConfig = [
            { text: 'Fornecedor', width: '60%', align: 'left' },
            { text: 'Valor Gasto (R$)', width: '40%', align: 'right' }
        ];
    }
    
    // Constrói o cabeçalho
    htmlTabela += '<thead><tr>' + headersConfig.map(h => 
        `<th style="width: ${h.width}; text-align: ${h.align}; padding: 10px 15px;">${h.text}</th>`
    ).join('') + '</tr></thead>';
    htmlTabela += '<tbody>';
    
    // Configurações das linhas
    dados.forEach(item => {
        let linha = '<tr>';
        
        if (tipo === 'vendas_categoria') {
            linha += `<td style="text-align: left; padding: 10px 15px;">${item.categoria}</td>`;
            linha += `<td style="text-align: right; padding: 10px 15px;">${item.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>`;
            linha += `<td style="text-align: right; padding: 10px 15px;">${item.percentual.toFixed(2)}%</td>`;
        } else if (tipo === 'top_itens_vendidos') {
            linha += `<td style="text-align: left; padding: 10px 15px;">${item.nomeItem}</td>`;
            linha += `<td style="text-align: right; padding: 10px 15px;">${item.quantidade}</td>`;
            linha += `<td style="text-align: right; padding: 10px 15px;">${item.faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>`;
            linha += `<td style="text-align: right; padding: 10px 15px;">${item.precoUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>`;
        } else if (tipo === 'movimentacao_horaria') {
            linha += `<td style="text-align: left; padding: 10px 15px;">${item.hora}</td>`;
            linha += `<td style="text-align: right; padding: 10px 15px;">${item.itensVendidos}</td>`;
        } else if (tipo === 'compras_total') { // NOVO
            linha += `<td style="text-align: left; padding: 10px 15px; font-weight: bold;">${item.descricao}</td>`;
            linha += `<td style="text-align: right; padding: 10px 15px; font-weight: bold;">${item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>`;
        } else if (tipo === 'compras_por_fornecedor') { // NOVO
            linha += `<td style="text-align: left; padding: 10px 15px;">${item.fornecedor}</td>`;
            linha += `<td style="text-align: right; padding: 10px 15px;">${item.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>`;
        }
        
        linha += '</tr>';
        htmlTabela += linha;
    });
    
    htmlTabela += '</tbody></table>';
    tabelaContainer.innerHTML = htmlTabela;
}


// exportarCSV ATUALIZADA
function exportarCSV() {
    if (dadosAtuaisRelatorio.length === 0) {
        alert("Nenhum dado para exportar. Gere o relatório primeiro.");
        return;
    }
    
    const tipo = tipoRelatorio.value;
    let headers = [];
    let lines = [];
    let filename = '';
    const formatCurrency = (val) => val.toFixed(2).replace('.', ',');

    if (tipo === 'vendas_categoria') {
        headers = ['Categoria', 'Faturamento', 'Participacao(%)'];
        lines = dadosAtuaisRelatorio.map(item => 
            [item.categoria, formatCurrency(item.valorTotal), formatCurrency(item.percentual)].join(';')
        );
        filename = 'Vendas_Por_Categoria';
    } else if (tipo === 'top_itens_vendidos') {
        headers = ['Item', 'QuantidadeVendida', 'FaturamentoTotal', 'PrecoUnitario'];
        lines = dadosAtuaisRelatorio.map(item => 
            [item.nomeItem, item.quantidade, formatCurrency(item.faturamento), formatCurrency(item.precoUnitario)].join(';')
        );
        filename = 'Top_Itens_Vendidos';
    } else if (tipo === 'movimentacao_horaria') {
        headers = ['Hora', 'ItensVendidos'];
        lines = dadosAtuaisRelatorio.map(item => [item.hora, item.itensVendidos].join(';'));
        filename = 'Movimentacao_Horaria';
    } else if (tipo === 'compras_total') { // NOVO
        headers = ['Descricao', 'Valor'];
        lines = dadosAtuaisRelatorio.map(item => [item.descricao, formatCurrency(item.valor)].join(';'));
        filename = 'Total_Compras';
    } else if (tipo === 'compras_por_fornecedor') { // NOVO
        headers = ['Fornecedor', 'ValorGasto'];
        lines = dadosAtuaisRelatorio.map(item => [item.fornecedor, formatCurrency(item.valorTotal)].join(';'));
        filename = 'Compras_Por_Fornecedor';
    }
    
    const csvContent = headers.join(';') + '\n' + lines.join('\n');
    
    const blob = new Blob(["\ufeff", csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


// =========================================================
// UTILS (Mantidas)
// =========================================================

/**
 * Gera cores aleatórias para gráficos (melhora a visualização de pizza/barra).
 */
function gerarCoresAleatorias(num) {
    const cores = [];
    for (let i = 0; i < num; i++) {
        // Gera uma cor RGBA mais clara
        const r = Math.floor(Math.random() * 200) + 50; 
        const g = Math.floor(Math.random() * 200) + 50;
        const b = Math.floor(Math.random() * 200) + 50;
        cores.push(`rgba(${r}, ${g}, ${b}, 0.7)`);
    }
    return cores;
}

function mapearNomeFornecedor(id) {
    // Procura o fornecedor pelo ID. Assume que fornecedoresCache tem {id: ..., nome: ...}
    const fornecedor = fornecedoresCache.find(f => f.id === id);
    // Retorna o nome ou o ID formatado se o nome não for encontrado.
    return fornecedor?.nome || `ID ${id}`;
}