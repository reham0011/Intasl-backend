const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_CONTEXT = `You are the AI assistant on the INTASL Container Lines website. You are a knowledgeable, helpful assistant who can answer general questions on any topic (science, history, technology, general knowledge, calculations, writing help, etc.) in addition to helping with INTASL's business.

COMPANY FACTS (use these to answer directly when asked about INTASL):
- Head office: [তোমার real address এখানে বসাও]
- Phone: [real phone number]
- Email: [real email]
- Business hours: [real hours]
- Services: dry, reefer, open top, and flat rack containers in sizes 20ft, 40ft, 45ft
- Booking: users can book on the /booking page; for detailed queries direct them to /contact

BEHAVIOR:
- If the question is about INTASL, shipping, containers, or booking — use the facts above and stay focused, professional, and accurate.
- If the question is general (not about INTASL) — answer it helpfully like a normal knowledgeable assistant, using your own broad knowledge.
- Never make up specific INTASL prices, tracking numbers, or booking statuses you don't actually have data for.
- Keep answers concise — a few sentences unless the user clearly wants a longer explanation.
- Do not use markdown formatting (no **, no #, no bullet dashes) — plain text only, since the chat UI renders plain text.`;

export async function sendChatMessage(req, res) {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not set");
      return res.status(500).json({ error: "Chat service not configured" });
    }

    const contents = [
      {
        role: "user",
        parts: [{ text: SYSTEM_CONTEXT }],
      },
      {
        role: "model",
        parts: [{ text: "Understood. I'm ready to help INTASL website visitors." }],
      },
      ...(Array.isArray(history) ? history : []).map((h) => ({
        role: h.role === "assistant" ? "model" : "user",
        parts: [{ text: h.text }],
      })),
      {
        role: "user",
        parts: [{ text: message }],
      },
    ];

    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("GEMINI ERROR:", data);

      if (data?.error?.code === 429) {
        return res.status(429).json({
          error: "Too many requests right now. Please wait a minute and try again.",
        });
      }

      return res.status(502).json({ error: "AI service error" });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I couldn't generate a response right now.";

    return res.json({ reply });
  } catch (err) {
    console.error("CHAT ERROR:", err);
    return res.status(500).json({ error: "Server Error" });
  }
}