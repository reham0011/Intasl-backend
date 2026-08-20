import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

export async function htmlToPdfBuffer(htmlContent) {
  const executablePath = await chromium.executablePath();

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: chromium.headless,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      width: "820px",
      height: "420px",
      printBackground: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}