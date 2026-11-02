export const exportElementToPdf = async (el: HTMLElement, fileName: string) => {
  const [{ toCanvas }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
  const canvas = await toCanvas(el, {
    pixelRatio: 2,
    backgroundColor: "#ffffff",
    cacheBust: true,
    filter: (node) => !(node instanceof HTMLElement && node.dataset.pdfHide !== undefined),
  });

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const imgW = pageW - margin * 2;
  const pxPerMm = canvas.width / imgW;
  const sliceH = Math.floor((pageH - margin * 2) * pxPerMm);

  const blocks = Array.from(el.querySelectorAll<HTMLElement>("[data-pdf-block]"));
  const top = el.getBoundingClientRect().top;
  const scale = canvas.width / el.getBoundingClientRect().width;
  const breaks = blocks.map((b) => Math.round((b.getBoundingClientRect().top - top) * scale)).filter((y) => y > 0);

  let y = 0;
  let first = true;
  while (y < canvas.height) {
    let end = Math.min(y + sliceH, canvas.height);
    if (end < canvas.height) {
      const fit = breaks.filter((b) => b > y + sliceH * 0.3 && b <= end).pop();
      if (fit) end = fit;
    }
    const h = end - y;
    const page = document.createElement("canvas");
    page.width = canvas.width;
    page.height = h;
    const ctx = page.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, page.width, page.height);
    ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
    if (!first) pdf.addPage();
    pdf.addImage(page.toDataURL("image/jpeg", 0.92), "JPEG", margin, margin, imgW, h / pxPerMm);
    first = false;
    y = end;
  }
  pdf.save(fileName);
};