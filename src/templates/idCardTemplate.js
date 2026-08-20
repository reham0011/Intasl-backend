// Generates the raw HTML string that Puppeteer will render into a PDF.
// Keeping this separate from the controller keeps the design logic isolated.
// Enhanced with a modern, premium design while keeping all original functionality.

export function generateIdCardHTML(data) {
  const {
    name,
    designation,
    fathersName,
    nationalId,
    bloodGroup,
    photoBase64, // data URI, e.g. "data:image/jpeg;base64,....."
    companyName = "INTASL Logistics Ltd.",
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
      /* ===== RESET & BASE ===== */
      * { 
        margin: 0; 
        padding: 0; 
        box-sizing: border-box; 
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      }

      body {
        background: #f0f4f8;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        padding: 30px;
      }

      /* ===== CARD WRAPPER ===== */
      .card-wrapper {
        width: 840px;
        height: 440px;
        display: flex;
        border-radius: 28px;
        box-shadow: 0 25px 50px -12px rgba(0, 20, 10, 0.35), 0 0 0 1px rgba(0,0,0,0.03);
        overflow: hidden;
        background: #ffffff;
        transition: all 0.2s;
      }

      /* ===== FRONT SIDE ===== */
      .front {
        width: 420px;
        height: 100%;
        position: relative;
        background: #ffffff;
        overflow: hidden;
        border-right: 2px solid rgba(26, 122, 60, 0.15);
        flex-shrink: 0;
      }

      /* Gradient bars - more refined */
      .front-top-bar, .front-bottom-bar {
        position: absolute;
        left: 0;
        right: 0;
        height: 8px;
        background: linear-gradient(90deg, #0b5e2a, #1f8f3f, #34b85a, #1f8f3f, #0b5e2a);
        background-size: 200% 100%;
        z-index: 10;
        box-shadow: 0 2px 8px rgba(0, 40, 0, 0.08);
      }
      .front-top-bar { top: 0; }
      .front-bottom-bar { bottom: 0; }

      /* Decorative diagonal - more elegant */
      .diagonal-shape {
        position: absolute;
        top: -20px;
        right: -80px;
        width: 200px;
        height: 120%;
        background: linear-gradient(135deg, #1565C0 0%, #1e88e5 50%, #42a5f5 100%);
        transform: skewX(-14deg) rotate(2deg);
        z-index: 1;
        opacity: 0.9;
        box-shadow: -8px 0 30px rgba(21, 101, 192, 0.15);
      }

      /* Small accent circle on diagonal */
      .diagonal-shape::after {
        content: '';
        position: absolute;
        top: 60px;
        right: 40px;
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: rgba(255,255,255,0.06);
        border: 2px solid rgba(255,255,255,0.08);
      }

      .front-content {
        position: relative;
        z-index: 2;
        padding: 30px 28px 18px;
        text-align: center;
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      /* Header section */
      .id-card-title {
        color: #0d47a1;
        font-size: 18px;
        font-weight: 700;
        letter-spacing: 3.5px;
        text-transform: uppercase;
        margin-bottom: 2px;
        opacity: 0.85;
      }

      .logo-text {
        font-size: 28px;
        font-weight: 800;
        color: #0b5e2a;
        margin-top: 2px;
        letter-spacing: -0.5px;
      }
      .logo-text span { 
        color: #1f8f3f; 
        font-weight: 700;
      }

      .company-tagline {
        font-size: 11px;
        color: #2d3748;
        margin-top: 4px;
        font-weight: 500;
        letter-spacing: 0.3px;
        background: rgba(26, 122, 60, 0.06);
        display: inline-block;
        padding: 2px 16px;
        border-radius: 20px;
        align-self: center;
      }
      .company-website {
        font-size: 10px;
        color: #1a7a3c;
        margin-top: 3px;
        font-weight: 500;
        letter-spacing: 0.5px;
        opacity: 0.8;
      }

      /* Photo - enhanced with ring */
      .photo-circle {
        width: 110px;
        height: 110px;
        border-radius: 50%;
        background: #edf2f7;
        border: 4px solid #1a7a3c;
        margin: 14px auto 12px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        box-shadow: 0 6px 20px rgba(26, 122, 60, 0.15), inset 0 2px 4px rgba(255,255,255,0.8);
        position: relative;
      }
      .photo-circle::after {
        content: '';
        position: absolute;
        inset: -6px;
        border-radius: 50%;
        border: 2px solid rgba(26, 122, 60, 0.15);
      }
      .photo-circle img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      /* Info block - cleaner */
      .info-block {
        text-align: left;
        font-size: 12.5px;
        line-height: 2.1;
        padding: 4px 4px 0;
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .info-block .label {
        display: inline-block;
        width: 110px;
        font-weight: 600;
        color: #1a202c;
        font-size: 12px;
        letter-spacing: 0.2px;
        opacity: 0.7;
      }
      .info-block .value {
        font-weight: 500;
        color: #1a202c;
      }
      .value.red { 
        color: #c62828; 
        font-weight: 600;
        background: rgba(198, 40, 40, 0.06);
        padding: 0 6px;
        border-radius: 4px;
      }

      /* ===== BACK SIDE ===== */
      .back {
        width: 420px;
        height: 100%;
        position: relative;
        background: #ffffff;
        text-align: center;
        padding: 34px 32px 0;
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .back-top-bar, .back-bottom-bar {
        position: absolute;
        left: 0;
        right: 0;
        height: 8px;
        background: linear-gradient(90deg, #0b5e2a, #1f8f3f, #34b85a, #1f8f3f, #0b5e2a);
        background-size: 200% 100%;
        z-index: 10;
        box-shadow: 0 2px 8px rgba(0, 40, 0, 0.08);
      }
      .back-top-bar { top: 0; }
      .back-bottom-bar { bottom: 0; }

      .back .logo-text { 
        font-size: 26px; 
        margin-top: 16px; 
        margin-bottom: 4px;
      }

      .return-text {
        font-style: italic;
        font-size: 15px;
        margin-top: 22px;
        color: #1a202c;
        font-weight: 400;
        letter-spacing: 0.3px;
        opacity: 0.8;
      }

      .return-icon {
        font-size: 28px;
        margin-top: 6px;
        opacity: 0.5;
      }

      .office-label {
        color: #0b5e2a;
        font-weight: 700;
        font-size: 14px;
        margin-top: 22px;
        letter-spacing: 1px;
        text-transform: uppercase;
        opacity: 0.9;
        position: relative;
      }
      .office-label::after {
        content: '';
        position: absolute;
        bottom: -6px;
        left: 50%;
        transform: translateX(-50%);
        width: 40px;
        height: 2px;
        background: linear-gradient(90deg, transparent, #1a7a3c, transparent);
        border-radius: 2px;
      }

      .office-address {
        font-size: 13.5px;
        margin-top: 14px;
        line-height: 1.7;
        color: #2d3748;
        max-width: 280px;
        font-weight: 450;
      }

      .phone-row {
        margin-top: 16px;
        font-size: 14px;
        font-weight: 600;
        color: #0b5e2a;
        background: rgba(26, 122, 60, 0.06);
        padding: 6px 24px;
        border-radius: 30px;
        display: inline-block;
        letter-spacing: 0.5px;
      }

      /* Decorative back shape */
      .back-shape {
        position: absolute;
        bottom: 40px;
        right: -30px;
        width: 140px;
        height: 140px;
        border-radius: 50%;
        background: rgba(26, 122, 60, 0.03);
        z-index: 0;
      }
      .back-shape-2 {
        position: absolute;
        top: 60px;
        left: -40px;
        width: 100px;
        height: 100px;
        border-radius: 50%;
        background: rgba(21, 101, 192, 0.03);
        z-index: 0;
      }

      .back > *:not(.back-top-bar):not(.back-bottom-bar):not(.back-shape):not(.back-shape-2) {
        position: relative;
        z-index: 1;
      }

      /* ===== RESPONSIVE FINE-TUNE ===== */
      @media print {
        body { background: white; padding: 0; }
        .card-wrapper { box-shadow: none; border-radius: 0; }
      }

      /* subtle animation for the gradient bars */
      @keyframes shimmer {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      .front-top-bar, .front-bottom-bar,
      .back-top-bar, .back-bottom-bar {
        animation: shimmer 6s ease-in-out infinite;
      }
    </style>
  </head>
  <body>
    <div class="card-wrapper">

      <!-- ====== FRONT ====== -->
      <div class="front">
        <div class="front-top-bar"></div>
        <div class="diagonal-shape"></div>
        <div class="front-content">
          <div class="id-card-title">ID CARD</div>
          <div class="logo-text">FnF <span>Online</span></div>
          <div class="company-tagline">${tagline}</div>
          <div class="company-website">${website}</div>

          <div class="photo-circle">
            ${photoBase64 ? `<img src="${photoBase64}" alt="Photo" />` : ''}
          </div>

          <div class="info-block">
            <div><span class="label">Name</span> <span class="value">${name || ''}</span></div>
            <div><span class="label">Designation</span> <span class="value">${designation || ''}</span></div>
            <div><span class="label">Father's Name</span> <span class="value">${fathersName || ''}</span></div>
            <div><span class="label">National ID No.</span> <span class="value red">${nationalId || ''}</span></div>
            <div><span class="label">Blood Group</span> <span class="value red">${bloodGroup || ''}</span></div>
          </div>
        </div>
        <div class="front-bottom-bar"></div>
      </div>

      <!-- ====== BACK ====== -->
      <div class="back">
        <div class="back-top-bar"></div>
        <div class="back-shape"></div>
        <div class="back-shape-2"></div>
        
        <div class="logo-text">FnF <span>Online</span></div>
        <div class="return-text">If found please return to :</div>
        <div class="return-icon">↻</div>
        
        <div class="office-label">Office</div>
        <div class="office-address">${officeAddress}</div>
        <div class="phone-row">📞 ${phone}</div>
        
        <div class="back-bottom-bar"></div>
      </div>

    </div>
  </body>
  </html>
  `;
}