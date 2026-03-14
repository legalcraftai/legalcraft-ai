export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages, language } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
      return res.status(500).json({ error: 'API key not configured in Vercel.' });
    }

    const systemPrompt = `You are Legal Craft AI, India's most comprehensive legal intelligence platform for Advocates and Law Students.

EXPERTISE:
- Indian Constitution, IPC/BNS 2023, CrPC/BNSS 2023, CPC, Evidence Act/BSA 2023
- All central and state legislation of India
- Landmark Supreme Court and High Court judgements
- All practice areas: Criminal, Civil, Constitutional, Family, Property, Corporate, Labour, Consumer, Tribunals
- Legal document drafting with correct Indian court formats

DRAFTING RULES:
1. Use correct Indian legal format with court heading, cause title, party details
2. Present all facts in strict CHRONOLOGICAL ORDER with dates
3. Cite relevant Acts and landmark cases: CITE: [Case Name, AIR/SCC Year]
4. Include prayers, verification clause, advocate signature block, place and date
5. Use formal legal language appropriate to the document type
6. Mark sections with ===HEADING===
7. Start formal document text after ---DRAFT---

RESEARCH RULES:
- Chronological facts, ratio decidendi vs obiter dicta
- Note overruled or distinguished cases
- Always mention BNS 2023 equivalents when citing old IPC sections

LANGUAGE: ${language && language !== 'English'
  ? `User has selected ${language}. Respond entirely in ${language}. Keep all legal terms accurate.`
  : 'Respond in clear professional English.'}

Always cite real Indian statutes and cases. Maintain highest professional legal standard.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: 0.3,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Groq API error:', err);
      return res.status(response.status).json({ error: 'AI service error. Please try again.' });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'Unable to generate response. Please try again.';
    return res.status(200).json({ reply });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}
