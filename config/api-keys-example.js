/**
 * SICOSI - Exemplo de Configuração de APIs
 *
 * Este é um arquivo de exemplo. Para habilitar as funcionalidades de IA e busca web,
 * copie este arquivo para 'config/api-keys.js' e preencha com suas chaves de API.
 *
 * IMPORTANTE: O arquivo 'config/api-keys.js' já está no .gitignore e não deve
 * ser enviado para o repositório.
 */

window.SICOSI_API_KEYS = {
  /**
   * Modelos de Linguagem (LLMs) para Análise Inteligente de Produtos
   * Escolha APENAS UMA das opções, mudando 'enabled' para true.
   */
  GROK: {
    enabled: false,
    key: 'xai-sua-chave-aqui',
    model: 'grok-1.5-sonnet',
    baseURL: 'https://api.x.ai/v1'
  },
  OPENAI: {
    enabled: false,
    key: 'sk-sua-chave-openai',
    model: 'gpt-4-turbo-preview',
    baseURL: 'https://api.openai.com/v1'
  },
  ANTHROPIC: {
    enabled: false,
    key: 'sk-ant-sua-chave-aqui',
    model: 'claude-3-opus-20240229',
    baseURL: 'https://api.anthropic.com/v1'
  },

  /**
   * APIs de Busca Web para Encontrar Fornecedores Reais
   * Configure uma das opções abaixo.
   */
  GOOGLE_SEARCH: {
    enabled: false,
    key: 'AIza-sua-chave-google-cloud',
    cx: 'seu-search-engine-id',
    baseURL: 'https://www.googleapis.com/customsearch/v1'
  },
  SERPAPI: {
    enabled: false,
    key: 'sua-chave-serpapi',
    baseURL: 'https://serpapi.com/search'
  }
};