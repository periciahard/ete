// Backend/proxy de IA para Vercel.
// Configure a variável de ambiente OPENAI_API_KEY no painel da Vercel.
// O site pode chamar este endpoint em: https://SEU-PROJETO.vercel.app/api/openai

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY não configurada no backend.' });

  try {
    const { prompt, model = 'gpt-4.1-mini', max_output_tokens = 4500 } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Campo prompt obrigatório.' });

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: prompt,
        temperature: 0.7,
        max_output_tokens,
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);

    const text = data.output_text || (data.output || [])
      .flatMap(item => item.content || [])
      .map(content => content.text || '')
      .join('\n');

    return res.status(200).json({ text, raw: data });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Erro interno.' });
  }
}
