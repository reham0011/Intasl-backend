import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_APP_PASSWORD,
  },
});

export async function sendOTPEmail(toEmail, otp, userName = "") {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #0f172a;">Login Verification Code</h2>
      <p>Hi ${userName || "there"},</p>
      <p>Use the following code to verify this login. This code expires in <b>5 minutes</b>.</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; background: #f1f5f9; padding: 16px; text-align: center; border-radius: 6px; margin: 16px 0;">
        ${otp}
      </div>
      <p>If you didn't try to log in, you can safely ignore this email.</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"INTASL" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `Your login code: ${otp}`,
    html,
  });
}