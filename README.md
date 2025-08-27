# 🌱 SICOSI - Sistema de Compras Sustentáveis Inteligente

> Extensão de navegador que promove compras públicas sustentáveis sugerindo alternativas ecológicas durante o cadastro de itens no ComprasNet

[![Status](https://img.shields.io/badge/Status-Em%20Desenvolvimento-yellow)](https://github.com/toticavalcanti/SICOSI-Sistema-de-Compras-Sustentaveis-Inteligente)
[![Versão](https://img.shields.io/badge/Versão-1.0.0-blue)](https://github.com/toticavalcanti/SICOSI-Sistema-de-Compras-Sustentaveis-Inteligente/releases)
[![Licença](https://img.shields.io/badge/Licença-MIT-green)](LICENSE)
[![Chrome](https://img.shields.io/badge/Chrome-Compatível-red)](https://chrome.google.com/webstore)
[![Firefox](https://img.shields.io/badge/Firefox-Em%20Breve-orange)](https://addons.mozilla.org)

## 📖 Sobre o Projeto

O **SICOSI** é uma extensão de navegador que atua como um "lembrete amigável" para servidores públicos durante o processo de compras governamentais. Quando um servidor está cadastrando um item não-sustentável no ComprasNet (como "copo descartável de plástico"), a extensão sugere automaticamente alternativas mais ecológicas.

### 🎯 Problema que Resolve

- **Falta de consciência** sobre alternativas sustentáveis durante compras públicas
- **Catálogo limitado** - servidores não conhecem todas as opções disponíveis
- **Processo manual** - buscar alternativas sustentáveis demanda tempo extra
- **Impacto ambiental** - governo brasileiro gasta bilhões em produtos não-sustentáveis

### 💡 Nossa Solução

Um "cutucão sustentável" **no momento certo** - quando o servidor já escolheu o produto, mas ainda pode reconsiderar com informações relevantes sobre alternativas ecológicas.

---

## 🚀 Funcionalidades

### ✅ **Implementado**

- 🤖 **Análise Inteligente**: Detecção aprimorada que identifica se um produto **JÁ É** sustentável (ex: "copo de bagaço de cana") e evita sugestões desnecessárias.
- 💡 **Sugestões Dinâmicas**: Oferece alternativas contextuais baseadas em análise local ou via LLMs (Grok, GPT, Claude, etc.).
- 🌐 **Busca de Fornecedores Reais**: Integração opcional com Google Custom Search ou SerpAPI para encontrar fornecedores de produtos sustentáveis.
- 📝 **Modal Aprimorado**: Interface mais clara e informativa com benefícios e nível de impacto.
- ⚙️ **Configurações Flexíveis**: Funciona 100% offline com análise local, com a opção de adicionar chaves de API para turbinar a inteligência.

### 🔄 **Em Desenvolvimento**

- 🔍 **Busca automática** por alternativas no próprio catálogo ComprasNet
- 🌐 **Pesquisa externa** quando não há alternativas internas disponíveis
- 📊 **Dashboard** com estatísticas de impacto ambiental
- 📈 **Relatórios** de adoção de práticas sustentáveis

### 🎪 **Roadmap Futuro**

- 🤖 **IA para análise** de sustentabilidade mais sofisticada
- 📱 **App mobile** para acompanhamento
- 🏛️ **Integração** com outros sistemas de compras públicas
- 🌍 **Expansão internacional** para outros países

---

## 🖥️ Como Funciona

### 📋 **Fluxo de Uso Inteligente**

1.  **Servidor acessa** o ComprasNet normalmente.
2.  **Busca e seleciona** um item (ex: "copo descartável").
3.  **⚡ Análise Inteligente da Extensão**:
    - **Com LLM configurada**: A descrição do item é enviada para uma análise de IA profunda para entender o contexto e a real necessidade.
    - **Sem LLM**: A extensão usa sua lógica local aprimorada para analisar o item.
4.  **🌱 Decisão Inteligente**:
    - Se o item já é sustentável (ex: "copo de bagaço de cana biodegradável"), a extensão **não interfere**.
    - Se o item é problemático (ex: "copo plástico comum"), um modal aparece com **sugestões específicas e dinâmicas**.
5.  **Servidor escolhe:**
    - **Buscar Alternativas**: Inicia uma busca por fornecedores reais (se a API de busca estiver configurada).
    - **Continuar com original**: Fecha o modal e permite que o usuário prossiga.

### 🎯 **Momento da Intervenção**

A extensão atua especificamente na **tela de seleção de itens** - após o servidor encontrar o produto desejado, mas antes de adicioná-lo ao carrinho de compras.

**Por que esse momento?**

- ✅ Servidor já tem **contexto completo** sobre o produto
- ✅ **Timing perfeito** para reconsiderar sem atrapalhar o fluxo
- ✅ Informações técnicas **já estão visíveis** (material, especificações)
- ✅ **Baixa fricção** - fácil aceitar ou dispensar a sugestão

---

## 🛠️ Instalação

### 📦 **Para Usuários Finais**

#### Chrome/Edge:

1. Acesse a [Chrome Web Store](https://chrome.google.com/webstore)
2. Busque por "SICOSI"
3. Clique em "Adicionar ao Chrome"

#### Firefox:

1. Acesse o [Firefox Add-ons](https://addons.mozilla.org)
2. Busque por "SICOSI"
3. Clique em "Adicionar ao Firefox"

### 👨‍💻 **Para Desenvolvedores**

#### Pré-requisitos

- Chrome 88+ ou Firefox 78+
- Git instalado

#### Instalação Local

```bash
# Clone o repositório
git clone https://github.com/toticavalcanti/SICOSI-Sistema-de-Compras-Sustentaveis-Inteligente.git

# Entre na pasta do projeto
cd SICOSI-Sistema-de-Compras-Sustentaveis-Inteligente

# Instale no Chrome
# 1. Abra chrome://extensions/
# 2. Ative "Modo do desenvolvedor"
# 3. Clique "Carregar sem compactação"
# 4. Selecione a pasta do projeto
```

#### Testando

```bash
# Acesse o ComprasNet
# https://compras.gov.br

# Faça uma busca por item não-sustentável
# Ex: "copo descartável", "papel sulfite"

# A extensão deve mostrar sugestões automaticamente
```

### 🔧 **Configurando as APIs (Opcional, mas Recomendado)**

A extensão funciona perfeitamente sem chaves de API, usando sua lógica interna. Para habilitar a análise por IA e a busca na web, siga os passos abaixo.

**1. Crie e edite o arquivo `config/api-keys.js`**

Adicione o seguinte conteúdo ao arquivo e preencha com suas chaves.

**2. Escolha uma LLM para Análise Inteligente (Recomendado: Grok)**

```javascript
// config/api-keys.js
window.SICOSI_API_KEYS = {
  GROK: {
    enabled: true, // Mude para true
    key: 'xai-sua-chave-aqui', // Obtenha em [https://x.ai/api](https://x.ai/api)
  },
  OPENAI: {
    enabled: false,
    key: 'sk-sua-chave-openai', // Obtenha em [https://platform.openai.com](https://platform.openai.com)
  },
  // ... outras LLMs
```

**3. Configure uma API de Busca Web**

```javascript
// continuação de config/api-keys.js
  GOOGLE_SEARCH: {
    enabled: true,
    key: 'AIza...', // Sua API key do Google Cloud
    cx: '123456...', // Seu Search Engine ID do Google CSE
  },
  SERPAPI: {
    enabled: false,
    key: 'sua-chave-serpapi', // Obtenha em [https://serpapi.com](https://serpapi.com)
  }
};
```

---

## 🏗️ Arquitetura

### 📁 **Estrutura do Projeto**

```
SICOSI-Sistema-de-Compras-Sustentaveis-Inteligente/
├── 📄 manifest.json                     # Configuração da extensão
├── 📄 .gitignore                        # Ignora arquivos no Git
├── 📄 README.md                         # Documentação do projeto
├── 📁 .qodo/                            # Configurações de ambiente (extensão/IDE)
├── 📁 assets/                           # Recursos visuais e sons
│   ├── 📁 icons/                        # Ícones da extensão
│   ├── 📁 images/                       # Imagens usadas
│   └── 📁 sounds/                       # Sons usados
├── 📁 scripts/
│   ├── background.js                    # Buscas e APIs
│   ├── content-script.js                # Lógica principal
│   ├── popup.js                         # Interface do popup
│   ├── options.js                       # Script da página de opções
│   └── welcome.js                       # Script da página de boas-vindas
├── 📁 styles/
│   ├── common.css                       # Estilos compartilhados
│   ├── content-modal.css                # Visual do modal
│   ├── options.css                      # Estilos da página de opções
│   └── popup.css                        # Estilos do popup
├── 📁 pages/
│   ├── options.html                     # Página de configurações
│   ├── popup.html                       # Popup da extensão
│   └── welcome.html                     # Página de boas-vindas
├── 📁 database/
│   ├── keywords-mapping.json            # Palavras-chave
│   ├── suppliers-database.json          # Base de fornecedores
│   └── sustainable-alternatives.json    # Alternativas sustentáveis
└── 📁 utils/
    ├── api-client.js                    # Cliente de APIs externas
    ├── data-converter.js                # Converte dados para uso interno
    ├── catalog-analyzer.js              # Análise do catálogo
    ├── dom-helper.js                    # Funções auxiliares de DOM
    ├── storage-manager.js               # Gerenciamento de dados
    └── web-search.js                    # Buscas externas

```

### 🔧 **Tecnologias**

| Componente   | Tecnologia         | Por quê?                                  |
| ------------ | ------------------ | ----------------------------------------- |
| **Frontend** | Vanilla JavaScript | Zero dependências, máxima compatibilidade |
| **Styling**  | CSS3 Puro          | Performance e simplicidade                |
| **Storage**  | Chrome Storage API | Sincronização entre dispositivos          |
| **Manifest** | Manifest V3        | Padrão mais recente e seguro              |
| **APIs**     | Fetch API nativo   | Sem bibliotecas externas                  |

### ⚡ **Performance**

- **< 50KB** tamanho total da extensão
- **< 100ms** tempo de carregamento
- **Zero impacto** na performance do ComprasNet
- **Cache inteligente** para reduzir requisições

---

## 🎯 Público-Alvo

### 🏛️ **Instituições**

- **Universidades públicas** (foco inicial)
- **Órgãos federais, estaduais e municipais**
- **Empresas públicas e autarquias**
- **Fundações e institutos governamentais**

### 👥 **Usuários**

- **Servidores** responsáveis por compras e licitações
- **Gestores** de sustentabilidade em órgãos públicos
- **Coordenadores** de compras institucionais
- **Qualquer pessoa** envolvida em compras públicas

### 📊 **Números Potenciais**

- **🏫 5.000+** instituições públicas no Brasil
- **👨‍💼 50.000+** servidores envolvidos em compras
- **💰 R$ 500 bilhões** em compras públicas anuais
- **🌱 15-30%** potencial de itens substituíveis por alternativas sustentáveis

---

## 🌍 Impacto Esperado

### 📈 **Cenários de Adoção**

#### Conservador (Ano 1)

- **50 universidades** adotam a extensão
- **10%** dos servidores instalam
- **20%** das sugestões são aceitas
- **📊 Resultado:** 15.000+ itens sustentáveis/ano

#### Otimista (Ano 3)

- **500 órgãos** usam a extensão
- **30%** dos servidores adotam
- **40%** das sugestões aceitas
- **📊 Resultado:** 200.000+ itens sustentáveis/ano

### 🌱 **Benefícios Ambientais**

- ♻️ **Redução de plásticos** em órgãos públicos
- 🌳 **Menos papel** de fontes não-sustentáveis
- 🧪 **Produtos menos tóxicos** para limpeza
- ⚡ **Equipamentos** mais eficientes energeticamente

### 💰 **Benefícios Econômicos**

- 📉 **Economia** a longo prazo com produtos duráveis
- 📈 **Fortalecimento** do mercado de fornecedores sustentáveis
- 🏆 **Liderança** do governo em sustentabilidade
- 🌍 **Exemplo** para setor privado

---

## 🤝 Contribuindo

Contribuições são muito bem-vindas! Este projeto visa impacto social e ambiental máximo.

### 🎯 **Como Contribuir**

#### 🐛 **Reportar Bugs**

1. Verifique se o bug já foi reportado
2. Crie uma [nova issue](https://github.com/toticavalcanti/SICOSI-Sistema-de-Compras-Sustentaveis-Inteligente/issues)
3. Descreva o problema detalhadamente
4. Inclua screenshots se possível

#### 💡 **Sugerir Funcionalidades**

1. Verifique se já não foi sugerido
2. Abra uma [feature request](https://github.com/toticavalcanti/SICOSI-Sistema-de-Compras-Sustentaveis-Inteligente/issues)
3. Descreva o caso de uso
4. Explique o impacto esperado

#### 🔧 **Contribuir com Código**

1. **Fork** o repositório
2. **Crie** uma branch: `git checkout -b feature/nova-funcionalidade`
3. **Commit** suas mudanças: `git commit -m 'Adiciona nova funcionalidade'`
4. **Push** para a branch: `git push origin feature/nova-funcionalidade`
5. **Abra** um Pull Request

#### 📚 **Melhorar Documentação**

- Corrigir typos no README
- Adicionar exemplos de uso
- Traduzir para outros idiomas
- Criar tutoriais em vídeo

### 🎨 **Áreas que Precisam de Ajuda**

- 🎨 **Design UX/UI** - melhorar interface do modal
- 🔍 **Base de dados** - adicionar mais alternativas sustentáveis
- 🌐 **APIs externas** - integrar com fornecedores
- 📊 **Analytics** - implementar métricas de impacto
- 🧪 **Testes** - criar suíte de testes automatizados

---

## 📄 Licença

Este projeto está licenciado sob a **MIT License** - veja o arquivo [LICENSE](LICENSE) para detalhes.

### 🤝 **Por que MIT?**

- ✅ **Uso livre** para qualquer finalidade
- ✅ **Modificações** permitidas
- ✅ **Distribuição comercial** permitida
- ✅ **Máximo impacto social** possível

---

## 👥 Autores e Agradecimentos

### 👨‍💻 **Equipe Principal**

- **[@toticavalcanti](https://github.com/toticavalcanti)** - _Idealizador e Desenvolvedor Principal_
- **Dea Cavalcanti** - _Product Owner e Especialista em Compras Públicas_

### 🙏 **Agradecimentos Especiais**

- **Servidores públicos** que validaram a necessidade
- **Especialistas em sustentabilidade** que auxiliaram na curadoria
- **Comunidade open source** de extensões Chrome
- **Universidades públicas** que apoiaram o projeto

### 💝 **Apoiadores**

Este projeto é mantido voluntariamente. Se você ou sua organização se beneficiam desta extensão, considere:

- ⭐ **Dar uma estrela** no GitHub
- 🐛 **Reportar bugs** e **sugerir melhorias**
- 💬 **Compartilhar** com colegas do setor público
- 📈 **Contribuir** com código ou documentação

---

## 📞 Contato e Suporte

### 💬 **Comunidade**

- **GitHub Issues:** [Reportar problemas ou sugestões](https://github.com/toticavalcanti/SICOSI-Sistema-de-Compras-Sustentaveis-Inteligente/issues)
- **GitHub Discussions:** [Discussões e perguntas](https://github.com/toticavalcanti/SICOSI-Sistema-de-Compras-Sustentaveis-Inteligente/discussions)

### 📧 **Contato Direto**

- **Email:** [seu-email@exemplo.com](mailto:seu-email@exemplo.com)
- **LinkedIn:** [Seu perfil LinkedIn](https://linkedin.com/in/seu-perfil)

### 📊 **Status do Projeto**

- **🔄 Desenvolvimento Ativo** - Novas funcionalidades sendo adicionadas
- **🐛 Issues Abertas** - [Ver problemas conhecidos](https://github.com/toticavalcanti/SICOSI-Sistema-de-Compras-Sustentaveis-Inteligente/issues)
- **📋 Roadmap** - [Ver próximas funcionalidades](https://github.com/toticavalcanti/SICOSI-Sistema-de-Compras-Sustentaveis-Inteligente/projects)

---

<div align="center">

**🌱 Construído com ❤️ para um governo mais sustentável**

_Se este projeto te ajudou, considere dar uma ⭐ para apoiar o desenvolvimento!_

[![GitHub stars](https://img.shields.io/github/stars/toticavalcanti/SICOSI-Sistema-de-Compras-Sustentaveis-Inteligente?style=social)](https://github.com/toticavalcanti/SICOSI-Sistema-de-Compras-Sustentaveis-Inteligente/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/toticavalcanti/SICOSI-Sistema-de-Compras-Sustentaveis-Inteligente?style=social)](https://github.com/toticavalcanti/SICOSI-Sistema-de-Compras-Sustentaveis-Inteligente/network)

</div>
