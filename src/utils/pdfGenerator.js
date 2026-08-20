import puppeteer from "puppeteer";

export async function htmlToPdfBuffer(htmlContent) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",   // critical fix — Render এর limited /dev/shm bypass করে
      "--single-process",           // কম memory তে সাহায্য করে
      "--no-zygote",
    ],
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