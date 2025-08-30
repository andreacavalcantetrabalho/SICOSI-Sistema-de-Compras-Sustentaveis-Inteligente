// api/grok-proxy.js
// Vercel Function - Proxy seguro para API do Grok (X.AI)
export default async function handler(request, response) {
  // Configura headers de CORS para permitir que a extensão acesse a API
  response.setHeader("Access-Control-Allow-Origin", "*"); // Para desenvolvimento. Em produção, restrinja para o ID da sua extensão.
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
    const { productInfo } = request.body;

    // Validação do corpo da requisição
    if (!productInfo || !productInfo.description) {
      return response.status(400).json({
        error: "productInfo.description is required",
      });
    }

    // Pega a chave de API da Groq da variável de ambiente (seguro)
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      console.error(
        "GROQ_API_KEY não foi configurada no ambiente do servidor."
      );
      return response
        .status(500)
        .json({ error: "API Key not configured on the server." });
    }

    // Monta o prompt otimizado para a Groq
    const prompt = `
      Aja como um especialista em compras públicas sustentáveis e análise de ciclo de vida de produtos. Sua missão é avaliar um item de licitação do governo brasileiro e fornecer alternativas ecológicas viáveis.

      **Contexto:** O item está sendo cadastrado no sistema ComprasNet do Brasil. As alternativas devem ser práticas e encontráveis no mercado brasileiro.

      **Análise do Item:**
      - **Produto:** "${productInfo.description}"
      - **Material Informado:** "${productInfo.material || "Não especificado"}"
      - **Características Adicionais:** "${
        productInfo.characteristics || "Nenhuma"
      }"

      **Sua Tarefa:**
      Analise o item e responda EXCLUSIVAMENTE em formato JSON, seguindo rigorosamente a estrutura abaixo:

      {
        "isSustainable": boolean,
        "reason": "uma breve justificativa em português explicando se o item é ou não sustentável (máximo 20 palavras)",
        "sustainabilityScore": "um número de 1 a 10, onde 1 é muito poluente e 10 é totalmente sustentável",
        "alternatives": [
          {
            "name": "Nome claro e comercial da alternativa 1",
            "description": "Descrição curta da alternativa 1 para um comprador do governo",
            "benefits": "O principal benefício ambiental da alternativa 1",
            "searchTerms": ["termo de busca 1", "termo 2"]
          }
        ]
      }

      **Instruções Adicionais:**
      - Se "isSustainable" for true (score >= 7), o array "alternatives" deve ser vazio ([]).
      - Se "isSustainable" for false (score < 7), forneça de 2 a 3 alternativas no array.
      `;

    // Faz a chamada para a API da Groq
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        model: "llama3-8b-8192", // Modelo rápido e eficiente da Groq
        response_format: { type: "json_object" }, // Força a resposta em JSON
      }),
    });

    if (!groqResponse.ok) {
      const errorBody = await groqResponse.text();
      console.error("Erro da API da Groq:", errorBody);
      throw new Error(`Groq API responded with status: ${groqResponse.status}`);
    }

    const groqData = await groqResponse.json();
    const analysisResultText = groqData.choices[0]?.message?.content || "{}";

    // Envia a resposta de volta para a extensão
    return response.status(200).json(JSON.parse(analysisResultText));
  } catch (error) {
    console.error("Erro no proxy da Vercel:", error);
    return response
      .status(500)
      .json({ error: "Failed to fetch analysis from Groq API." });
  }
}