// api/grok-proxy.js
// Vercel Function - Proxy seguro para API do Grok (X.AI)

export default async function handler(req, res) {
  // Configurar CORS para extensão
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Só aceitar POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { productInfo, analysisType = 'sustainability' } = req.body;

    // Validar input
    if (!productInfo || !productInfo.description) {
      return res.status(400).json({ 
        error: 'Product description is required' 
      });
    }

    // Chave segura vem do ambiente
    const GROK_API_KEY = process.env.GROK_API_KEY;
    if (!GROK_API_KEY) {
      console.error('GROK_API_KEY não configurada');
      return res.status(500).json({ error: 'API configuration error' });
    }

    // Prompt para análise de sustentabilidade
    const systemPrompt = `Você é um especialista em sustentabilidade e compras públicas brasileiras.
Analise produtos para determinar se são sustentáveis e sugira alternativas quando necessário.

Responda SEMPRE em JSON válido com esta estrutura:
{
  "isSustainable": boolean,
  "sustainabilityScore": number (0-10),
  "reason": "explicação clara",
  "alternatives": [
    {
      "name": "nome da alternativa",
      "description": "descrição detalhada", 
      "benefits": "benefícios ambientais",
      "searchTerms": ["termo1", "termo2", "termo3"],
      "estimatedCost": "comparação de custo"
    }
  ],
  "needsAlternatives": boolean,
  "analysisMethod": "llm_grok",
  "category": "categoria do produto"
}`;

    const userPrompt = `Analise este produto: "${productInfo.description}"
${productInfo.material ? `Material: ${productInfo.material}` : ''}
${productInfo.characteristics ? `Características: ${productInfo.characteristics}` : ''}

Se NÃO for sustentável, sugira até 3 alternativas sustentáveis disponíveis no mercado brasileiro.`;

    // Chamar API do Grok
    const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-beta',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1500
      })
    });

    if (!grokResponse.ok) {
      const errorText = await grokResponse.text();
      console.error('Erro Grok API:', grokResponse.status, errorText);
      return res.status(502).json({ 
        error: 'External API error',
        details: grokResponse.status 
      });
    }

    const grokData = await grokResponse.json();
    
    if (!grokData.choices || !grokData.choices[0]) {
      return res.status(502).json({ 
        error: 'Invalid response from Grok API' 
      });
    }

    // Processar resposta JSON do Grok
    let analysisResult;
    try {
      const content = grokData.choices[0].message.content;
      analysisResult = JSON.parse(content);
      
      // Adicionar metadados
      analysisResult.timestamp = Date.now();
      analysisResult.analysisMethod = 'llm_grok';
      
    } catch (parseError) {
      console.error('Erro ao parsear Grok:', parseError);
      
      // Fallback se JSON inválido
      analysisResult = {
        isSustainable: false,
        sustainabilityScore: 3,
        reason: 'Produto convencional, considere alternativas sustentáveis',
        alternatives: [],
        needsAlternatives: true,
        analysisMethod: 'llm_grok_fallback',
        category: 'geral',
        timestamp: Date.now()
      };
    }

    // Log para monitoramento (sem dados sensíveis)
    console.log(`Grok: Análise para "${productInfo.description.substring(0, 30)}..." - Score: ${analysisResult.sustainabilityScore}`);

    return res.status(200).json(analysisResult);

  } catch (error) {
    console.error('Erro interno grok-proxy:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
}