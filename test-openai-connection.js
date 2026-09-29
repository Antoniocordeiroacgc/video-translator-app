// Script de diagnóstico: testa se o Node.js consegue conectar na API da OpenAI
async function testConnection() {
  const apiKey = process.env.OPENAI_API_KEY;
  console.log("Chave carregada:", apiKey ? `${apiKey.slice(0, 10)}...` : "AUSENTE");

  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    console.log("SUCESSO - Status:", response.status);
  } catch (err) {
    console.log("FALHOU - Tipo de erro:", err.constructor.name);
    console.log("Mensagem:", err.message);
    console.log("Causa:", err.cause);
  }
}

testConnection();