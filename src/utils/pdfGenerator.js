import puppeteer from "puppeteer";

// Converts an HTML string into a PDF buffer.
// Reused for both "download" and "email" flows.
export async function htmlToPdfBuffer(htmlContent) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"], // needed on most servers/hosting
  });

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      width: "820px",
      height: "420px",
      printBackground: true, // must be true, otherwise colors/gradients won't show
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
    });

    return pdfBuffer;
  } finally {
    await browser.close(); // always close, even if error happens
  }
}