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

  // Sesuaikan style elemen untuk kompatibilitas Microsoft Word / WPS
  const tables = clone.querySelectorAll("table");
  tables.forEach((t) => {
    t.setAttribute("border", "1");
    t.setAttribute("cellspacing", "0");
    t.setAttribute("cellpadding", "4");
    t.style.borderCollapse = "collapse";
    t.style.width = "100%";
    t.style.marginBottom = "10pt";
    t.style.borderColor = "#000000";
  });

  const cells = clone.querySelectorAll("td, th");
  cells.forEach((c) => {
    (c as HTMLElement).style.borderColor = "#000000";
    (c as HTMLElement).style.padding = "4pt 6pt";
  });

  const paperConfig =
    options.paperSize === "A4"
      ? { width: "210mm", height: "297mm", margin: "15mm 20mm 15mm 20mm" }
      : { width: "215mm", height: "330mm", margin: "12mm 15mm 12mm 15mm" }; // F4 Folio

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
      font-size: 10pt;
      line-height: 1.25;
      color: #000000;
      background: #ffffff;
    }
    h1, h2, h3, h4, p {
      margin: 0 0 4pt 0;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 8pt;
    }
    th, td {
      border: 1px solid #000000;
      padding: 4pt 5pt;
      font-size: 9pt;
      color: #000000;
    }
    th {
      background-color: #f1f5f9;
      font-weight: bold;
    }
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
