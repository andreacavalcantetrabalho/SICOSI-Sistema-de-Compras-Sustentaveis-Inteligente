// Script para configurar o proxy após deploy
async function setupProxy() {
  const proxyUrl = prompt('Cole a URL do seu deploy Vercel (ex: https://sicosi-abc123.vercel.app):');
  
  if (!proxyUrl) return;
  
  const proxySettings = {
    grokProxyUrl: `${proxyUrl}/api/grok-proxy`,
    configuredAt: new Date().toISOString()
  };
  
  await chrome.storage.sync.set({ proxySettings });
  
  // Testar conexão
  const testResponse = await fetch(`${proxyUrl}/api/grok-proxy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productInfo: { description: 'teste de conexão' }
    })
  });
  
  if (testResponse.ok) {
    alert('✅ Proxy configurado com sucesso!');
  } else {
    alert('❌ Erro ao conectar com proxy. Verifique a URL e a API key.');
  }
}

// Executar ao abrir página de opções
if (window.location.pathname.includes('options.html')) {
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.createElement('button');
    btn.textContent = '🔧 Configurar Proxy Vercel';
    btn.onclick = setupProxy;
    document.body.appendChild(btn);
  });
}