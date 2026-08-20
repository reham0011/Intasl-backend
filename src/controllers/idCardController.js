import { generateIdCardHTML } from "../templates/idCardTemplate.js";
import { htmlToPdfBuffer } from "../utils/pdfGenerator.js";
import { sendMail } from "../utils/mailer.js"; // আপনার existing mailer.js

// POST /api/id-cards/generate
// Body: { name, designation, fathersName, nationalId, bloodGroup, photoBase64 }
// Returns the PDF as a downloadable file
export async function generateIdCardPDF(req, res) {
  try {
    const data = req.body;

    if (!data.name || !data.nationalId) {
      return res.status(400).json({ error: "Name and National ID are required" });
    }

    const html = generateIdCardHTML(data);
    const pdfBuffer = await htmlToPdfBuffer(html);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="id-card-${data.name.replace(/\s+/g, "-")}.pdf"`,
    });
    return res.send(pdfBuffer);
  } catch (err) {
    console.error("ID CARD PDF ERROR:", err);
    return res.status(500).json({ error: "Failed to generate ID card" });
  }
}

// POST /api/id-cards/email
// Body: { name, designation, fathersName, nationalId, bloodGroup, photoBase64, recipientEmail }
export async function emailIdCard(req, res) {
  try {
    const data = req.body;

    if (!data.recipientEmail) {
      return res.status(400).json({ error: "Recipient email is required" });
    }
    if (!data.name || !data.nationalId) {
      return res.status(400).json({ error: "Name and National ID are required" });
    }

    const html = generateIdCardHTML(data);
    const pdfBuffer = await htmlToPdfBuffer(html);

    await sendMail({
      to: data.recipientEmail,
      subject: `Your ID Card - ${data.name}`,
      text: `Hi ${data.name},\n\nPlease find your ID card attached.\n\nRegards,\nFnF Online`,
      attachments: [
        {
          filename: `id-card-${data.name.replace(/\s+/g, "-")}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    return res.json({ success: true, message: "ID card emailed successfully" });
  } catch (err) {
    console.error("EMAIL ID CARD ERROR:", err);
    return res.status(500).json({ error: "Failed to email ID card" });
  }
}