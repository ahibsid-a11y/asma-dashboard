/**
 * Utilitas untuk mengekspor dokumen rapor ke format Microsoft Word (.doc)
 * dengan pengaturan halaman F4 / Folio (215 mm x 330 mm), tabel rapi,
 * serta gambar/logo yang di-embed secara Base64.
 */

async function convertImagesToBase64(container: HTMLElement): Promise<void> {
  const images = Array.from(container.querySelectorAll("img"));
  await Promise.all(
    images.map(async (img) => {
      if (!img.src || img.src.startsWith("data:")) return;

      try {
        // Coba konversi via canvas terlebih dahulu
        if (img.complete && img.naturalWidth > 0) {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            img.src = canvas.toDataURL("image/png");
            return;
          }
        }

        // Fallback: fetch blob lalu FileReader
        const response = await fetch(img.src);
        const blob = await response.blob();
        await new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === "string") {
              img.src = reader.result;
            }
            resolve();
          };
          reader.onerror = () => resolve();
          reader.readAsDataURL(blob);
        });
      } catch (err) {
        console.warn("Gagal mengonversi gambar ke Base64 untuk Word:", err);
      }
    }),
  );
}

function prepareWordLayout(container: HTMLElement): void {
  container.classList.add("word-report");

  const letterhead = container.querySelector<HTMLElement>(".report-letterhead-row");
  if (letterhead) {
    const children = Array.from(letterhead.children);
    const table = document.createElement("table");
    table.className = "word-letterhead";
    const row = table.insertRow();
    children.forEach((child, index) => {
      const cell = row.insertCell();
      cell.className = index === 1 ? "word-letterhead-center" : "word-letterhead-logo";
      cell.appendChild(child);
    });
    letterhead.replaceWith(table);
  }

  const biodata = container.querySelector<HTMLElement>(".report-biodata");
  if (biodata) {
    const items = Array.from(biodata.children);
    const table = document.createElement("table");
    table.className = "word-biodata";
    for (let index = 0; index < items.length; index += 2) {
      const row = table.insertRow();
      for (let column = 0; column < 2; column += 1) {
        const cell = row.insertCell();
        const item = items[index + column];
        if (item) cell.appendChild(item);
      }
    }
    biodata.replaceWith(table);
  }

  container.querySelectorAll("thead tr").forEach((row) => {
    (row as HTMLElement).style.pageBreakAfter = "avoid";
  });
  container.querySelectorAll("tbody tr").forEach((row) => {
    (row as HTMLElement).style.pageBreakInside = "avoid";
  });
}

export interface ExportWordOptions {
  fileName?: string;
  title?: string;
  paperSize?: "F4" | "A4";
}

export async function exportReportToWord(
  elementId: string,
  options: ExportWordOptions = {},
): Promise<boolean> {
  const sourceEl = document.getElementById(elementId);
  if (!sourceEl) {
    console.error(`Elemen dengan ID '${elementId}' tidak ditemukan.`);
    return false;
  }

  // Kloning elemen agar tidak memanipulasi tampilan DOM asli
  const clone = sourceEl.cloneNode(true) as HTMLElement;

  // Bersihkan elemen yang tidak perlu dicetak
  const noPrintEls = clone.querySelectorAll(".no-print, button, [role='tablist']");
  noPrintEls.forEach((el) => el.remove());

  // Konversi semua logo/gambar ke Base64
  await convertImagesToBase64(clone);
  prepareWordLayout(clone);

  // Sesuaikan style elemen untuk kompatibilitas Microsoft Word / WPS
  const tables = clone.querySelectorAll("table");
  tables.forEach((t) => {
    t.setAttribute("border", "1");
    t.setAttribute("cellspacing", "0");
    t.setAttribute("cellpadding", "4");
    t.style.borderCollapse = "collapse";
    t.style.width = "100%";
    t.style.marginBottom = "8pt";
    t.style.borderColor = "#000000";
  });

  const cells = clone.querySelectorAll("td, th");
  cells.forEach((c) => {
    (c as HTMLElement).style.borderColor = "#000000";
    (c as HTMLElement).style.padding = "4pt 6pt";
  });

  const paperConfig =
    options.paperSize === "A4"
      ? { width: "210mm", height: "297mm", margin: "15mm" }
      : { width: "215mm", height: "330mm", margin: "12mm" }; // F4 Folio

  const title = options.title || "Rapor Santri";
  const fileName = (options.fileName || "Rapor_Santri").endsWith(".doc")
    ? options.fileName || "Rapor_Santri.doc"
    : `${options.fileName || "Rapor_Santri"}.doc`;

  const wordHtml = `
<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>${title}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page Section1 {
      size: ${paperConfig.width} ${paperConfig.height};
      margin: ${paperConfig.margin};
      mso-header-margin: 36pt;
      mso-footer-margin: 36pt;
      mso-paper-source: 0;
    }
    div.Section1 {
      page: Section1;
    }
    body {
      font-family: Arial, 'Segoe UI', Tahoma, sans-serif;
      font-size: 9pt;
      line-height: 1.2;
      color: #000000;
      background: #ffffff;
    }
    h1, h2, h3, h4, p {
      margin: 0 0 3pt 0;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 7pt;
      table-layout: fixed;
    }
    th, td {
      border: 1px solid #000000;
      padding: 3pt 4pt;
      font-size: 8pt;
      color: #000000;
      vertical-align: top;
      overflow-wrap: break-word;
    }
    th {
      background-color: #f1f5f9;
      font-weight: bold;
    }
    thead { display: table-header-group; }
    tbody { display: table-row-group; }
    tr { page-break-inside: avoid; }
    .word-report {
      width: 100%;
      margin: 0;
      padding: 0;
      border: 0;
    }
    .word-letterhead,
    .word-biodata {
      width: 100%;
      border: 0;
      table-layout: fixed;
    }
    .word-letterhead td,
    .word-biodata td {
      border: 0;
      background: #ffffff;
    }
    .word-letterhead-logo { width: 16%; text-align: center; vertical-align: middle; }
    .word-letterhead-logo img { width: 52pt; height: 52pt; object-fit: contain; }
    .word-letterhead-center { width: 68%; text-align: center; vertical-align: middle; }
    .word-letterhead-center h1 { font-size: 14pt; line-height: 1.05; }
    .word-letterhead-center h2 { font-size: 11pt; line-height: 1.05; }
    .word-letterhead-center h3 { font-size: 8pt; }
    .word-letterhead-center p { font-size: 7pt; }
    .word-biodata { margin: 0 0 10pt 0; }
    .word-biodata td { width: 50%; padding: 1.5pt 5pt; font-size: 8pt; }
    .word-biodata td > div { white-space: nowrap; }
    .report-letterhead,
    .report-biodata,
    .report-signatures,
    .print-avoid-break { page-break-inside: avoid; }
    .report-grade-section { page-break-inside: auto; }
    .report-grade-section > div:first-child { page-break-after: avoid; }
    .report-signatures { page-break-before: auto; }
    img { max-width: 100%; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-bold { font-weight: bold; }
    .uppercase { text-transform: uppercase; }
    .underline { text-decoration: underline; }
    .italic { font-style: italic; }
  </style>
</head>
<body>
  <div class="Section1">
    ${clone.innerHTML}
  </div>
</body>
</html>
`;

  const blob = new Blob(["\ufeff" + wordHtml], {
    type: "application/msword;charset=utf-8",
  });

  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return true;
}
