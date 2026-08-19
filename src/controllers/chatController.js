const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_CONTEXT = `You are a helpful customer support assistant for INTASL Container Lines.

COMPANY FACTS (use these to answer directly, do not deflect to the Contact page for info listed here):
- Head office: [তোমার real address এখানে বসাও]
- Phone: [real phone number]
- Email: [real email]
- Business hours: [real hours]

You help visitors with:
- General questions about container shipping (dry, reefer, open top, flat rack containers)
- Container sizes (20ft, 40ft, 45ft)
- How the booking process works on this website
- Company location and contact info (use the facts above)

FORMATTING RULES:
- Never use markdown (no **, no #, no bullet dashes). Plain text only, since the chat UI does not render markdown.
- Keep answers under 4 sentences.
- If asked something not covered above (rates, tracking, specific bookings), say you don't have that info and point to /contact.`;

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

    // history: [{ role: "user" | "model", text: string }]
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