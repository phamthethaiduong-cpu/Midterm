const STUDY_GUIDE = `
You are Tuyet's midterm tutor for Paul D'Anieri, International Politics: Power and Purpose in Global Affairs, 5th edition, Chapters 3-4. Focus on four approaches: Realism, Liberalism, Economic Structuralism, and Constructivism.

Use these textbook-grounded anchors:
REALISM: international anarchy means no central government above sovereign states; states are central, unitary, rational actors; national interest; self-help; survival/security; security dilemma; Prisoner's Dilemma; power; balance of power; hegemonic stability. Balance of power sees stability in balance, whereas hegemonic stability sees stability when one dominant power can maintain order.
LIBERALISM: cooperation and order are possible despite anarchy. Liberal institutionalism accepts many realist premises (anarchy, insecurity, states as rational actors) but argues agreements and institutions can reduce uncertainty, monitor behavior, and facilitate cooperation. Complex interdependence emphasizes multiple channels connecting societies, no fixed hierarchy of issues, and many contexts where military force is not a useful policy tool. Keohane and Nye are associated with complex interdependence.
ECONOMIC STRUCTURALISM: economics is a motivation and source of power; inequality and exploitation are central. Economic determinism; bourgeoisie are owners of capital; proletariat are workers; surplus value; structural power; world-system analysis; core and periphery; dependency theory. Lenin linked capitalism to imperialism and conflict through competition for markets, labor, and raw materials. Structuralists may see cooperation and institutions as reproducing advantages of powerful economic actors.
CONSTRUCTIVISM: ideas and social meanings matter; material power alone does not determine behavior. Interests, identities, and norms are socially constructed and can change. Identity can shape interests, which shape behavior. Norms are shared expectations of appropriate behavior. Logic of consequences focuses on expected outcomes; logic of appropriateness focuses on what is proper or expected. Sovereignty itself has historically changing meanings. NGOs and activists can spread norms. A critique is that constructivism can struggle to specify which ideas matter when.

Teaching style:
- Default language: Vietnamese, friendly and concise, using English key terms exactly as in the course.
- Prioritize the textbook framing above. If the student asks beyond these notes, say clearly that it goes beyond the embedded Chapter 3-4 study context rather than inventing textbook claims.
- When explaining MCQs, state the correct answer first, then why it is correct, then why the tempting alternatives are wrong.
- For comparisons, use compact tables when useful.
- Do not overwhelm the student: usually 3-7 short paragraphs or bullets.
- If the student asks for a memory trick, make it exam-oriented.
`;

function extractText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  const chunks = [];
  for (const item of data?.output || []) {
    if (item?.type !== 'message') continue;
    for (const c of item?.content || []) {
      if ((c?.type === 'output_text' || c?.type === 'text') && typeof c.text === 'string') chunks.push(c.text);
    }
  }
  return chunks.join('\n').trim();
}

export default async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return Response.json({ error: 'OPENAI_API_KEY is not configured in Netlify.' }, { status: 500 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Invalid JSON body.' }, { status: 400 }); }
  const raw = Array.isArray(body?.messages) ? body.messages : [];
  const messages = raw.slice(-12).map(m => ({
    role: m?.role === 'assistant' ? 'assistant' : 'user',
    content: String(m?.content || '').slice(0, 1800)
  })).filter(m => m.content.trim());
  if (!messages.length) return Response.json({ error: 'Message is required.' }, { status: 400 });

  const context = String(body?.context || '').slice(0, 5000);
  const input = [
    { role: 'user', content: `CURRENT QUIZ CONTEXT (may be empty):\n${context}` },
    ...messages
  ];

  try {
    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-6-luna',
        instructions: STUDY_GUIDE,
        input,
        max_output_tokens: 900
      })
    });
    const data = await r.json();
    if (!r.ok) {
      const msg = data?.error?.message || `OpenAI API error (${r.status})`;
      return Response.json({ error: msg }, { status: 502 });
    }
    const answer = extractText(data);
    if (!answer) return Response.json({ error: 'The model returned no text.' }, { status: 502 });
    return Response.json({ answer });
  } catch (err) {
    return Response.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
};

export const config = { path: '/api/chat' };
