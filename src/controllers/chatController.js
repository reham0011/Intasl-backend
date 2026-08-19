const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_CONTEXT = `You are a helpful customer support assistant for INTASL Container Lines, a container shipping and logistics company. 
You help visitors with:
- General questions about container shipping (dry, reefer, open top, flat rack containers)
- Container sizes (20ft, 40ft, 45ft)
- How the booking process works on this website
- General logistics and shipping terminology
- Guiding users to the Booking page (/books) if they want to book a container, or Contact page (/contact) for detailed queries

Keep answers short, friendly, and professional. If you don't know something specific about this company's exact rates or schedules, tell the user to contact support via the Contact page. Do not make up specific prices, dates, or tracking numbers.`;

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