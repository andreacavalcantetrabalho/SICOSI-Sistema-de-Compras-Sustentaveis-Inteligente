// api/groq-proxy.js
// Vercel Function - Proxy seguro para Groq API com prompts melhorados

export default async function handler(request, response) {
  // Configura headers de CORS para permitir que a extensão acesse a API
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Responde a requisições OPTIONS (preflight de CORS)
  if (request.method === "OPTIONS") {
    return response.status(200).end();
  }

  // Garante que o método é POST
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { requestType, productInfo, alternatives } = request.body;
    const groqApiKey = process.env.GROQ_API_KEY;

    if (!groqApiKey) {
      console.error("GROQ_API_KEY não foi configurada no ambiente do servidor.");
      return response
        .status(500)
        .json({ error: "API Key not configured on the server." });
    }

    let prompt;

    // LÓGICA PARA ESCOLHER O PROMPT CORRETO
    if (requestType === "find_suppliers") {
      // PROMPT MELHORADO - Fornecedores sem URLs inventadas
      if (!alternatives || !Array.isArray(alternatives) || alternatives.length === 0) {
        return response.status(400).json({
          error: 'O campo "alternatives" (array) é necessário para buscar fornecedores.',
        });
      }

      prompt = `
        Aja como um especialista em fornecedores sustentáveis do Brasil.
        
        IMPORTANTE: 
        - NÃO invente URLs ou websites
        - Só forneça nomes de empresas que você tem CERTEZA que existem
        - Se não tiver certeza, retorne array vazio
        - NÃO forneça links/websites pois você não pode verificar se estão corretos
        
        Para cada item na lista a seguir, sugira até 2 nomes de fornecedores brasileiros REAIS que vendem esses produtos.
        Se não souber fornecedores reais, retorne array vazio.
        
        Itens: ${alternatives.join(", ")}

        Responda EXCLUSIVAMENTE em formato JSON:
        {
          "Nome da Alternativa 1": [
            { "name": "Nome da Empresa Real 1", "website": "" },
            { "name": "Nome da Empresa Real 2", "website": "" }
          ],
          "Nome da Alternativa 2": []
        }
        
        LEMBRE-SE: deixe "website" sempre vazio ("") para evitar links quebrados.
      `;
    } else if (requestType === 'find_real_web_alternatives') {
      const { product, searchTerms, category } = request.body;

      prompt = `
        Você é um especialista em encontrar produtos sustentáveis REAIS no Brasil.

        Produto original: "${product}"
        Categoria: ${category}
        Termos de busca: ${searchTerms.join(', ')}

        INSTRUÇÕES CRÍTICAS:
        1. Liste APENAS produtos que EXISTEM e podem ser comprados HOJE
        2. Forneça o nome REAL e COMPLETO do fornecedor/empresa
        3. Indique onde comprar (Mercado Livre, site oficial, loja física)
        4. NÃO invente produtos, marcas ou fornecedores
        5. Se não souber com certeza, retorne array vazio

        Responda APENAS em JSON:
        {
          "alternatives": [
            {
              "productName": "Nome exato do produto",
              "supplier": "Nome real da empresa",
              "whereToFind": "Mercado Livre/Site oficial/Loja",
              "estimatedPrice": "R$ XX,XX se souber",
              "searchQuery": "termo exato para buscar no Google"
            }
          ]
        }

        Se não encontrar produtos REAIS, retorne:
        { "alternatives": [] }
      `;
    } else {
      // PROMPT PARA ANÁLISE DE PRODUTO - Melhorado
      if (!productInfo || !productInfo.description) {
        return response.status(400).json({
          error: "productInfo.description is required para 'analyze_product'",
        });
      }

      prompt = `
        Você é um especialista em compras públicas sustentáveis do Brasil.
        
        ANALISE este item: "${productInfo.description}"
        ${productInfo.material ? `Material: ${productInfo.material}` : ''}
        
        TAREFA: Determine se o produto é sustentável e sugira alternativas se necessário.
        
        CRITÉRIOS DE SUSTENTABILIDADE:
        - Biodegradável/compostável = sustentável (score 7-10)
        - Reciclado/reciclável = sustentável (score 6-8)
        - Certificado (FSC, Energy Star) = sustentável (score 7-9)
        - Plástico comum/descartável = não sustentável (score 1-4)
        - Isopor/poliestireno = não sustentável (score 1-3)
        
        RESPONDA APENAS em JSON:
        {
          "isSustainable": boolean,
          "reason": "explicação breve em português (máx 20 palavras)",
          "sustainabilityScore": número de 1 a 10,
          "alternatives": [
            {
              "name": "Nome comercial da alternativa",
              "description": "Descrição objetiva para comprador público",
              "benefits": "Principal benefício ambiental",
              "searchTerms": ["termo para buscar no catálogo", "outro termo"]
            }
          ]
        }
        
        REGRAS:
        - Se isSustainable = true (score >= 7): alternatives = []
        - Se isSustainable = false: forneça 2-3 alternativas realistas
        - searchTerms devem ser termos que funcionam em catálogos de compras
        - NÃO invente marcas ou fornecedores específicos
        - Foque em TIPOS de produtos, não marcas
        
        EXEMPLOS de boas alternativas:
        - "Copo biodegradável PLA" (não "Copo EcoBrand")
        - "Papel reciclado certificado" (não "Papel Suzano Reciclado")
        - "Detergente biodegradável concentrado" (não "Detergente Ypê Eco")
      `;
    }

    // Chamada para a API da Groq
    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: "Você é um assistente especializado em sustentabilidade. Sempre responda em JSON válido. NUNCA invente URLs ou websites que você não pode verificar."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          model: "llama-3.3-70b-versatile",
          response_format: { type: "json_object" },
          temperature: 0.3, // Reduzido para menos "criatividade" (menos alucinações)
          max_tokens: 1000
        }),
      }
    );

    if (!groqResponse.ok) {
      const errorBody = await groqResponse.text();
      console.error("Erro da API da Groq:", errorBody);
      
      // Fallback para resposta genérica em caso de erro
      return response.status(200).json({
        isSustainable: false,
        reason: "Análise indisponível temporariamente",
        sustainabilityScore: 5,
        alternatives: [
          {
            name: "Alternativa biodegradável",
            description: "Busque por opções biodegradáveis ou compostáveis",
            benefits: "Menor impacto ambiental",
            searchTerms: ["biodegradável", "compostável", "ecológico"]
          }
        ]
      });
    }

    const groqData = await groqResponse.json();
    const analysisResultText = groqData.choices[0]?.message?.content || "{}";
    
    // Parse e validação da resposta
    let result;
    try {
      result = JSON.parse(analysisResultText);
      
      // Limpar websites dos fornecedores se existirem
      if (requestType === "find_suppliers") {
        Object.keys(result).forEach(key => {
          if (Array.isArray(result[key])) {
            result[key] = result[key].map(supplier => ({
              ...supplier,
              website: "" // Sempre remover websites para evitar links quebrados
            }));
          }
        });
      }
      
    } catch (parseError) {
      console.error("Erro ao parsear resposta da IA:", parseError);
      return response.status(200).json({
        isSustainable: false,
        reason: "Erro ao processar análise",
        sustainabilityScore: 5,
        alternatives: []
      });
    }

    return response.status(200).json(result);
    
  } catch (error) {
    console.error("Erro no proxy da Vercel:", error);
    return response.status(500).json({ 
      error: "Failed to fetch analysis from Groq API.",
      details: error.message 
    });
  }
}