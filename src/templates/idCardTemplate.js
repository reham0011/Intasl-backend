// Generates the raw HTML string that Puppeteer will render into a PDF.
// Keeping this separate from the controller keeps the design logic isolated.

export function generateIdCardHTML(data) {
  const {
    name,
    designation,
    fathersName,
    nationalId,
    bloodGroup,
    photoBase64, // data URI, e.g. "data:image/jpeg;base64,....."
    companyName = "FnF Online",
    tagline = "Broadband@Home n Office",
    website = "www.fnfbd.net",
    officeAddress = "Mannan Bhabon, Love Lane, Chattogram.",
    phone = "+8801798-578319",
  } = data;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Poppins', Arial, sans-serif; }

      .card-wrapper {
        width: 800px;
        height: 400px;
        display: flex;
      }

      /* ---------- LEFT SIDE (Front) ---------- */
      .front {
        width: 400px;
        height: 400px;
        position: relative;
        background: #ffffff;
        overflow: hidden;
        border-right: 4px solid #0a3d2e;
      }

      .front-top-bar, .front-bottom-bar {
        position: absolute;
        left: 0; right: 0;
        height: 14px;
        background: linear-gradient(90deg, #1a7a3c, #2fa84f);
      }
      .front-top-bar { top: 0; }
      .front-bottom-bar { bottom: 0; }

      .diagonal-shape {
        position: absolute;
        top: 0; right: -60px;
        width: 180px;
        height: 100%;
        background: #1e88e5;
        transform: skewX(-12deg);
        z-index: 1;
      }

      .front-content {
        position: relative;
        z-index: 2;
        padding: 28px 24px 16px;
        text-align: center;
      }

      .id-card-title {
        color: #1a56c4;
        font-size: 20px;
        font-weight: 700;
        letter-spacing: 2px;
        margin-bottom: 6px;
      }

      .logo-text {
        font-size: 26px;
        font-weight: 800;
        color: #1a7a3c;
        margin-top: 6px;
      }
      .logo-text span { color: #2fa84f; }

      .company-tagline {
        font-size: 10px;
        color: #333;
        margin-top: 2px;
      }
      .company-website {
        font-size: 10px;
        color: #1a7a3c;
        margin-top: 1px;
      }

      .photo-circle {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        background: #d9d9d9;
        border: 3px solid #1a7a3c;
        margin: 16px auto 12px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .photo-circle img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .info-block {
        text-align: left;
        font-size: 12px;
        line-height: 1.9;
        padding: 0 8px;
      }
      .info-block .label {
        display: inline-block;
        width: 108px;
        font-weight: 600;
        color: #111;
      }
      .info-block .value {
        font-weight: 500;
      }
      .value.red { color: #d32f2f; font-weight: 600; }

      /* ---------- RIGHT SIDE (Back) ---------- */
      .back {
        width: 400px;
        height: 400px;
        position: relative;
        background: #ffffff;
        text-align: center;
        padding: 30px 30px 0;
      }
      .back-top-bar, .back-bottom-bar {
        position: absolute;
        left: 0; right: 0;
        height: 14px;
        background: linear-gradient(90deg, #1a7a3c, #2fa84f);
      }
      .back-top-bar { top: 0; }
      .back-bottom-bar { bottom: 0; }

      .back .logo-text { font-size: 24px; margin-top: 20px; }

      .return-text {
        font-style: italic;
        font-size: 15px;
        margin-top: 26px;
        color: #111;
      }

      .office-label {
        color: #1a7a3c;
        font-weight: 700;
        font-size: 14px;
        margin-top: 18px;
      }
      .office-address {
        font-size: 13px;
        margin-top: 4px;
        line-height: 1.5;
      }
      .phone-row {
        margin-top: 10px;
        font-size: 13px;
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <div class="card-wrapper">

      <!-- FRONT -->
      <div class="front">
        <div class="front-top-bar"></div>
        <div class="diagonal-shape"></div>
        <div class="front-content">
          <div class="id-card-title">ID CARD</div>
          <div class="logo-text">FnF <span>Online</span></div>
          <div class="company-tagline">${tagline}</div>
          <div class="company-website">${website}</div>

          <div class="photo-circle">
            ${photoBase64 ? `<img src="${photoBase64}" />` : ""}
          </div>

          <div class="info-block">
            <div><span class="label">Name</span>: <span class="value">${name || ""}</span></div>
            <div><span class="label">Designation</span>: <span class="value">${designation || ""}</span></div>
            <div><span class="label">Fathers Name</span>: <span class="value">${fathersName || ""}</span></div>
            <div><span class="label">National ID No.</span>: <span class="value red">${nationalId || ""}</span></div>
            <div><span class="label">Blood Group</span>: <span class="value red">${bloodGroup || ""}</span></div>
          </div>
        </div>
        <div class="front-bottom-bar"></div>
      </div>

      <!-- BACK -->
      <div class="back">
        <div class="back-top-bar"></div>
        <div class="logo-text">FnF <span>Online</span></div>
        <div class="return-text">If found please return to :</div>
        <div class="office-label">Office :</div>
        <div class="office-address">${officeAddress}</div>
        <div class="phone-row">📞 ${phone}</div>
        <div class="back-bottom-bar"></div>
      </div>

    </div>
  </body>
  </html>
  `;
}