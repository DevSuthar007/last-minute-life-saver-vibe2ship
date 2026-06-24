const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `You are Veronica — a brilliant, warm, and proactive AI productivity companion. You help users plan tasks, prioritize ruthlessly, and complete goals before deadlines slip.

Your personality: confident but kind, slightly witty, deeply empathetic about productivity struggles. You never just remind — you help users take real action.

Rules:
- Respond in 2-3 short paragraphs max. Be specific and actionable.
- When tasks are suggested, format them as bullet points starting with "→ " (arrow space)
- When you detect urgency, say [MOOD:urgent] at the very end
- When user is doing great, say [MOOD:motivated] at the very end  
- When user needs calm, say [MOOD:calm] at the very end
- Otherwise say [MOOD:focused] at the very end
- Be conversational, like a smart friend who happens to be an expert in productivity`;

export async function askGemini(messages) {
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: 600,
        topP: 0.95,
      }
    })
  });

  if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm thinking... try again!";
}

export function extractMood(text) {
  const match = text.match(/\[MOOD:(focused|motivated|calm|urgent)\]/);
  return match ? match[1] : 'focused';
}

export function cleanText(text) {
  return text.replace(/\[MOOD:\w+\]/g, '').trim();
}

export function extractTasks(text) {
  const matches = text.match(/→ (.+)/g) || [];
  return matches.map(t => t.replace('→ ', '').trim());
}
