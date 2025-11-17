// js/config.js (VERSÃO COMPLETA E ATUALIZADA)

export const API_PORT = 5001; // PORTA DO BEAUTYHUB PADRAO 5000
//export const IP = '172.16.103.153' // IP DA CISS
export const IP = '192.168.1.17' // IP DE CASA 
//export const IP = '172.30.4.49' // IP DA UTF

export const BASE_URL = `http://${IP}:${API_PORT}`; // URL BASE DA API

// Rotas da API - Mantidas no plural para LISTAGEM
const URL_API_COMANDAS = `${BASE_URL}/api/comandas`; 
const URL_API_CARDAPIO = `${BASE_URL}/api/cardapio`; 
const URL_API_MOVIMENTACOES = `${BASE_URL}/api/movimentacoes`; 
const RELATORIOS_API_URL = `${BASE_URL}/api/relatorios/itens-vendidos`; 

const URL_API_FORNECEDORES = `${BASE_URL}/api/fornecedores`; 
// URL DE COMPRAS MANTIDA NO PLURAL PARA A FUNÇÃO DE LISTAGEM (carregarTransacoes)
const URL_API_COMPRAS = `${BASE_URL}/api/compras`; 

// EXPORTAÇÃO CORRIGIDA: Inclui todas as constantes necessárias nos módulos
export { 
    URL_API_COMANDAS, 
    URL_API_CARDAPIO,
    URL_API_MOVIMENTACOES,
    RELATORIOS_API_URL, 
    URL_API_FORNECEDORES, 
    URL_API_COMPRAS 
};