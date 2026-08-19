import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOTPEmail(toEmail, otp, userName = "") {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #0f172a;">Login Verification Code</h2>
      <p>Hi ${userName || "there"},</p>
      <p>Use the following code to verify. This code expires in <b>5 minutes</b>.</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; background: #f1f5f9; padding: 16px; text-align: center; border-radius: 6px; margin: 16px 0;">
        ${otp}
      </div>
      <p>If you didn't try to log in, you can safely ignore this email.</p>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: "INTASL <onboarding@resend.dev>",
      to: toEmail,
      subject: `Your verification code: ${otp}`,
      html,
    });

    if (error) {
      console.error("sendMail failed:", error.message || error);
      throw new Error(error.message || "Failed to send email");
    }

    console.log("OTP email sent:", data.id);
    return data;
  } catch (err) {
    console.error("sendMail failed:", err.message);
    throw err;
  }
}