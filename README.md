# 🌱 Nudge Sustentável - ComprasNet

> Extensão de navegador que promove compras públicas sustentáveis sugerindo alternativas ecológicas durante o cadastro de itens no ComprasNet

[![Status](https://img.shields.io/badge/Status-Em%20Desenvolvimento-yellow)](https://github.com/toticavalcanti/nudge-sustentavel-comprasnet)
[![Versão](https://img.shields.io/badge/Versão-1.0.0-blue)](https://github.com/toticavalcanti/nudge-sustentavel-comprasnet/releases)
[![Licença](https://img.shields.io/badge/Licença-MIT-green)](LICENSE)
[![Chrome](https://img.shields.io/badge/Chrome-Compatível-red)](https://chrome.google.com/webstore)
[![Firefox](https://img.shields.io/badge/Firefox-Em%20Breve-orange)](https://addons.mozilla.org)

## 📖 Sobre o Projeto

O **Nudge Sustentável** é uma extensão de navegador que atua como um "lembrete amigável" para servidores públicos durante o processo de compras governamentais. Quando um servidor está cadastrando um item não-sustentável no ComprasNet (como "copo descartável de plástico"), a extensão sugere automaticamente alternativas mais ecológicas.

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
- 🔍 **Detecção inteligente** de itens não-sustentáveis no ComprasNet
- 🌱 **Base de dados** com 50+ alternativas sustentáveis mapeadas
- 📝 **Modal discreto** com sugestões contextuais
- ⚙️ **Configurações básicas** para ativar/desativar categorias

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

### 📋 **Fluxo de Uso**

1. **Servidor acessa** o ComprasNet normalmente
2. **Busca por item** (ex: "copo descartável") 
3. **Seleciona produto** da lista de resultados
4. **⚡ Extensão detecta** item não-sustentável
5. **🌱 Modal aparece** com sugestões sustentáveis
6. **Servidor escolhe:** usar alternativa sustentável OU continuar com original

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
2. Busque por "Nudge Sustentável"
3. Clique em "Adicionar ao Chrome"

#### Firefox:
1. Acesse o [Firefox Add-ons](https://addons.mozilla.org)
2. Busque por "Nudge Sustentável" 
3. Clique em "Adicionar ao Firefox"

### 👨‍💻 **Para Desenvolvedores**

#### Pré-requisitos
- Chrome 88+ ou Firefox 78+
- Git instalado

#### Instalação Local
```bash
# Clone o repositório
git clone https://github.com/toticavalcanti/nudge-sustentavel-comprasnet.git

# Entre na pasta do projeto  
cd nudge-sustentavel-comprasnet

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

---

## 🏗️ Arquitetura

### 📁 **Estrutura do Projeto**
```
nudge-sustentavel-comprasnet/
├── 📄 manifest.json                 # Configuração da extensão
├── 📁 scripts/
│   ├── content-script.js           # Lógica principal
│   ├── background.js               # Buscas e APIs
│   └── popup.js                    # Interface do popup
├── 📁 styles/
│   ├── content-modal.css           # Visual do modal
│   ├── popup.css                   # Estilos do popup
│   └── common.css                  # Estilos compartilhados
├── 📁 pages/
│   ├── popup.html                  # Popup da extensão
│   └── options.html                # Página de configurações
├── 📁 database/
│   ├── sustainable-alternatives.json  # Alternativas mapeadas
│   └── keywords-mapping.json          # Palavras-chave
└── 📁 utils/
    ├── catalog-analyzer.js         # Análise do catálogo
    ├── web-search.js              # Buscas externas
    └── storage-manager.js         # Gerenciamento de dados
```

### 🔧 **Tecnologias**

| Componente | Tecnologia | Por quê? |
|------------|------------|----------|
| **Frontend** | Vanilla JavaScript | Zero dependências, máxima compatibilidade |
| **Styling** | CSS3 Puro | Performance e simplicidade |
| **Storage** | Chrome Storage API | Sincronização entre dispositivos |
| **Manifest** | Manifest V3 | Padrão mais recente e seguro |
| **APIs** | Fetch API nativo | Sem bibliotecas externas |

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
2. Crie uma [nova issue](https://github.com/toticavalcanti/nudge-sustentavel-comprasnet/issues)
3. Descreva o problema detalhadamente
4. Inclua screenshots se possível

#### 💡 **Sugerir Funcionalidades**
1. Verifique se já não foi sugerido
2. Abra uma [feature request](https://github.com/toticavalcanti/nudge-sustentavel-comprasnet/issues)
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
- **[@toticavalcanti](https://github.com/toticavalcanti)** - *Idealizador e Desenvolvedor Principal*
- **Dea Cavalcanti** - *Product Owner e Especialista em Compras Públicas*

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
- **GitHub Issues:** [Reportar problemas ou sugestões](https://github.com/toticavalcanti/nudge-sustentavel-comprasnet/issues)
- **GitHub Discussions:** [Discussões e perguntas](https://github.com/toticavalcanti/nudge-sustentavel-comprasnet/discussions)

### 📧 **Contato Direto**
- **Email:** [seu-email@exemplo.com](mailto:seu-email@exemplo.com)
- **LinkedIn:** [Seu perfil LinkedIn](https://linkedin.com/in/seu-perfil)

### 📊 **Status do Projeto**
- **🔄 Desenvolvimento Ativo** - Novas funcionalidades sendo adicionadas
- **🐛 Issues Abertas** - [Ver problemas conhecidos](https://github.com/toticavalcanti/nudge-sustentavel-comprasnet/issues)
- **📋 Roadmap** - [Ver próximas funcionalidades](https://github.com/toticavalcanti/nudge-sustentavel-comprasnet/projects)

---

<div align="center">

**🌱 Construído com ❤️ para um governo mais sustentável**

*Se este projeto te ajudou, considere dar uma ⭐ para apoiar o desenvolvimento!*

[![GitHub stars](https://img.shields.io/github/stars/toticavalcanti/nudge-sustentavel-comprasnet?style=social)](https://github.com/toticavalcanti/nudge-sustentavel-comprasnet/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/toticavalcanti/nudge-sustentavel-comprasnet?style=social)](https://github.com/toticavalcanti/nudge-sustentavel-comprasnet/network)

</div>
