import { sendMail } from "../utils/mailer.js";

// POST /api/id-cards/email
// Body: { pdfBase64, recipientEmail, employeeName, filename }
// The PDF is generated entirely on the frontend (html2canvas + jsPDF).
// This endpoint's only job is to attach it and send it via Resend —
// no Puppeteer, no Chrome, no server-side rendering at all anymore.
export async function emailIdCardPdf(req, res) {
  try {
    const { pdfBase64, recipientEmail, employeeName, filename } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({ error: "PDF data is required" });
    }
    if (!recipientEmail) {
      return res.status(400).json({ error: "Recipient email is required" });
    }

    const pdfBuffer = Buffer.from(pdfBase64, "base64");

    await sendMail({
      to: recipientEmail,
      subject: `Your ID Card${employeeName ? ` - ${employeeName}` : ""}`,
      text: `Hi ${employeeName || ""},\n\nPlease find your ID card attached.\n\nRegards`,
      attachments: [
        {
          filename: filename || "id-card.pdf",
          content: pdfBuffer,
        },
      ],
    });

    return res.json({ success: true, message: "ID card emailed successfully" });
  } catch (err) {
    console.error("EMAIL ID CARD ERROR:", err);
    return res.status(500).json({ error: err.message || "Failed to email ID card" });
  }
}