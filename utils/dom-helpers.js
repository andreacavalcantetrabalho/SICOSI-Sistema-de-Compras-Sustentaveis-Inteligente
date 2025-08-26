/**
 * DOM Helpers - SICOSI  
 * Funções auxiliares para manipulação e análise do DOM
 */

class DOMHelpers {
  constructor() {
    this.observedElements = new WeakSet();
    this.eventListeners = new Map();
  }

  /**
   * Encontra elementos usando múltiplos seletores com fallbacks
   * @param {Array|string} selectors - Lista de seletores CSS ou seletor único
   * @param {Element} context - Contexto de busca (padrão: document)
   * @returns {Array} Array de elementos encontrados
   */
  findElements(selectors, context = document) {
    const selectorArray = Array.isArray(selectors) ? selectors : [selectors];
    const elements = [];

    selectorArray.forEach(selector => {
      try {
        if (selector.includes(':contains(')) {
          // Seletor customizado com :contains
          const containsMatch = selector.match(/:contains\(['"]?([^'"]+)['"]?\)/);
          if (containsMatch) {
            const text = containsMatch[1];
            const baseSelector = selector.split(':contains(')[0] || '*';
            const candidates = context.querySelectorAll(baseSelector);
            
            candidates.forEach(el => {
              if (el.textContent && el.textContent.toLowerCase().includes(text.toLowerCase())) {
                elements.push(el);
              }
            });
          }
        } else {
          // Seletor CSS padrão
          const found = context.querySelectorAll(selector);
          elements.push(...Array.from(found));
        }
      } catch (error) {
        console.warn('DOM Helper: Seletor inválido ignorado:', selector, error);
      }
    });

    // Remover duplicatas mantendo ordem
    return elements.filter((el, index, arr) => arr.indexOf(el) === index);
  }

  /**
   * Encontra o primeiro elemento usando múltiplos seletores
   * @param {Array|string} selectors - Lista de seletores CSS
   * @param {Element} context - Contexto de busca
   * @returns {Element|null} Primeiro elemento encontrado ou null
   */
  findFirstElement(selectors, context = document) {
    const elements = this.findElements(selectors, context);
    return elements.length > 0 ? elements[0] : null;
  }

  /**
   * Extrai texto limpo de um elemento
   * @param {Element} element - Elemento DOM
   * @param {boolean} preserveSpaces - Preservar espaços múltiplos
   * @returns {string} Texto limpo
   */
  extractCleanText(element, preserveSpaces = false) {
    if (!element) return '';
    
    const text = element.textContent || element.innerText || '';
    return preserveSpaces ? 
      text.trim() : 
      text.replace(/\s+/g, ' ').trim();
  }

  /**
   * Verifica se um elemento está visível na viewport
   * @param {Element} element - Elemento a verificar
   * @param {number} threshold - Porcentagem mínima visível (0-1)
   * @returns {boolean} True se visível
   */
  isElementVisible(element, threshold = 0.1) {
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const windowWidth = window.innerWidth || document.documentElement.clientWidth;

    // Verificar se está na viewport
    const inViewport = rect.top < windowHeight && 
                      rect.bottom > 0 && 
                      rect.left < windowWidth && 
                      rect.right > 0;

    if (!inViewport) return false;

    // Verificar porcentagem visível
    const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
    const visibleWidth = Math.min(rect.right, windowWidth) - Math.max(rect.left, 0);
    const visibleArea = visibleHeight * visibleWidth;
    const totalArea = rect.height * rect.width;

    return totalArea > 0 ? (visibleArea / totalArea) >= threshold : false;
  }

  /**
   * Aguarda elemento aparecer no DOM
   * @param {Array|string} selectors - Seletores para aguardar
   * @param {number} timeout - Timeout em ms (padrão: 5000)
   * @param {Element} context - Contexto de busca
   * @returns {Promise<Element>} Promise que resolve com o elemento
   */
  waitForElement(selectors, timeout = 5000, context = document) {
    return new Promise((resolve, reject) => {
      // Verificar se já existe
      const existing = this.findFirstElement(selectors, context);
      if (existing) {
        resolve(existing);
        return;
      }

      // Configurar observer
      const observer = new MutationObserver(() => {
        const element = this.findFirstElement(selectors, context);
        if (element) {
          observer.disconnect();
          clearTimeout(timeoutId);
          resolve(element);
        }
      });

      // Configurar timeout
      const timeoutId = setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Elemento não encontrado após ${timeout}ms: ${JSON.stringify(selectors)}`));
      }, timeout);

      // Iniciar observação
      observer.observe(context, {
        childList: true,
        subtree: true
      });
    });
  }

  /**
   * Adiciona event listener com cleanup automático
   * @param {Element} element - Elemento target
   * @param {string} event - Nome do evento
   * @param {Function} handler - Function handler
   * @param {Object} options - Opções do addEventListener
   * @returns {Function} Função para remover o listener
   */
  addEventListenerWithCleanup(element, event, handler, options = {}) {
    if (!element || !handler) return () => {};

    element.addEventListener(event, handler, options);
    
    // Registrar para cleanup
    const listenerId = `${element}_${event}_${Date.now()}`;
    this.eventListeners.set(listenerId, { element, event, handler, options });

    // Retornar função de cleanup
    return () => {
      element.removeEventListener(event, handler, options);
      this.eventListeners.delete(listenerId);
    };
  }

  /**
   * Remove todos os event listeners registrados
   */
  cleanupAllEventListeners() {
    this.eventListeners.forEach(({ element, event, handler, options }) => {
      try {
        element.removeEventListener(event, handler, options);
      } catch (error) {
        console.warn('DOM Helper: Erro ao remover listener:', error);
      }
    });
    this.eventListeners.clear();
  }

  /**
   * Simula clique humano em elemento
   * @param {Element} element - Elemento para clicar
   * @param {Object} options - Opções do clique
   */
  humanClick(element, options = {}) {
    if (!element) return;

    const defaultOptions = {
      bubbles: true,
      cancelable: true,
      view: window,
      button: 0,
      buttons: 1,
      clientX: 0,
      clientY: 0
    };

    // Calcular posição do elemento se não especificada
    if (!options.clientX && !options.clientY) {
      const rect = element.getBoundingClientRect();
      defaultOptions.clientX = rect.left + rect.width / 2;
      defaultOptions.clientY = rect.top + rect.height / 2;
    }

    const clickOptions = { ...defaultOptions, ...options };
    
    // Sequência de eventos como clique humano
    const events = ['mousedown', 'mouseup', 'click'];
    
    events.forEach(eventType => {
      const event = new MouseEvent(eventType, clickOptions);
      element.dispatchEvent(event);
    });
  }

  /**
   * Simula digitação humana em campo de input
   * @param {Element} input - Campo de input
   * @param {string} text - Texto para digitar
   * @param {number} delay - Delay entre caracteres em ms
   */
  async humanType(input, text, delay = 50) {
    if (!input || typeof text !== 'string') return;

    // Focar no campo
    input.focus();
    
    // Limpar campo existente
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    // Digitar caractere por caractere
    for (let i = 0; i < text.length; i++) {
      input.value = text.substring(0, i + 1);
      
      // Disparar eventos de input
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('keyup', { bubbles: true, key: text[i] }));
      
      // Delay humano entre caracteres
      if (delay > 0 && i < text.length - 1) {
        await this.sleep(delay + Math.random() * delay);
      }
    }

    // Evento final
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /**
   * Utilitário sleep
   * @param {number} ms - Milissegundos para aguardar
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Encontra elemento pai com classe ou atributo específico
   * @param {Element} element - Elemento inicial
   * @param {string} selector - Seletor CSS para o pai
   * @param {number} maxLevels - Máximo de níveis para subir
   * @returns {Element|null} Elemento pai ou null
   */
  findParentElement(element, selector, maxLevels = 10) {
    if (!element) return null;

    let current = element.parentElement;
    let level = 0;

    while (current && level < maxLevels) {
      if (current.matches && current.matches(selector)) {
        return current;
      }
      current = current.parentElement;
      level++;
    }

    return null;
  }

  /**
   * Extrai dados de tabela HTML
   * @param {Element} table - Elemento da tabela
   * @returns {Array} Array de objetos com dados das linhas
   */
  extractTableData(table) {
    if (!table) return [];

    const headers = [];
    const rows = [];

    // Extrair cabeçalhos
    const headerRow = table.querySelector('thead tr, tr:first-child');
    if (headerRow) {
      const headerCells = headerRow.querySelectorAll('th, td');
      headerCells.forEach(cell => {
        headers.push(this.extractCleanText(cell));
      });
    }

    // Extrair dados das linhas
    const dataRows = table.querySelectorAll('tbody tr, tr:not(:first-child)');
    dataRows.forEach(row => {
      const rowData = {};
      const cells = row.querySelectorAll('td, th');
      
      cells.forEach((cell, index) => {
        const header = headers[index] || `column_${index}`;
        rowData[header] = this.extractCleanText(cell);
      });
      
      if (Object.keys(rowData).length > 0) {
        rows.push(rowData);
      }
    });

    return rows;
  }

  /**
   * Cria elemento com atributos e conteúdo
   * @param {string} tagName - Nome da tag
   * @param {Object} attributes - Atributos do elemento
   * @param {string|Element} content - Conteúdo do elemento
   * @returns {Element} Elemento criado
   */
  createElement(tagName, attributes = {}, content = '') {
    const element = document.createElement(tagName);

    // Definir atributos
    Object.keys(attributes).forEach(key => {
      if (key === 'className') {
        element.className = attributes[key];
      } else if (key === 'style' && typeof attributes[key] === 'object') {
        Object.assign(element.style, attributes[key]);
      } else {
        element.setAttribute(key, attributes[key]);
      }
    });

    // Definir conteúdo
    if (typeof content === 'string') {
      element.innerHTML = content;
    } else if (content instanceof Element) {
      element.appendChild(content);
    } else if (Array.isArray(content)) {
      content.forEach(child => {
        if (child instanceof Element) {
          element.appendChild(child);
        }
      });
    }

    return element;
  }

  /**
   * Monitora mudanças em elemento específico
   * @param {Element} element - Elemento para monitorar
   * @param {Function} callback - Callback para mudanças
   * @param {Object} options - Opções do MutationObserver
   * @returns {MutationObserver} Observer criado
   */
  observeElement(element, callback, options = {}) {
    if (!element || this.observedElements.has(element)) {
      return null;
    }

    const defaultOptions = {
      childList: true,
      attributes: true,
      subtree: true
    };

    const observer = new MutationObserver((mutations) => {
      callback(mutations, element);
    });

    observer.observe(element, { ...defaultOptions, ...options });
    this.observedElements.add(element);

    return observer;
  }

  /**
   * Scroll suave para elemento
   * @param {Element} element - Elemento de destino
   * @param {string} behavior - Comportamento do scroll
   * @param {string} block - Alinhamento vertical
   */
  scrollToElement(element, behavior = 'smooth', block = 'center') {
    if (!element) return;

    element.scrollIntoView({
      behavior,
      block,
      inline: 'nearest'
    });
  }

  /**
   * Verifica se elemento é interativo
   * @param {Element} element - Elemento para verificar
   * @returns {boolean} True se interativo
   */
  isInteractiveElement(element) {
    if (!element) return false;

    const interactiveTags = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'];
    const isInteractiveTag = interactiveTags.includes(element.tagName);
    const hasClickHandler = element.onclick !== null;
    const hasTabIndex = element.tabIndex >= 0;
    const hasRole = ['button', 'link', 'menuitem'].includes(element.getAttribute('role'));

    return isInteractiveTag || hasClickHandler || hasTabIndex || hasRole;
  }

  /**
   * Cleanup geral da classe
   */
  destroy() {
    this.cleanupAllEventListeners();
    this.observedElements = new WeakSet();
    this.eventListeners.clear();
  }
}

// Tornar disponível globalmente
window.SICOSIDOMHelpers = new DOMHelpers();

// Cleanup automático quando página for descarregada
window.addEventListener('beforeunload', () => {
  window.SICOSIDOMHelpers.destroy();
});