export async function extractDocumentText(file: File, maxPages = 60) {
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    let content = "";
    if (["txt", "md", "markdown", "csv"].includes(extension)) {
        content = await file.text();
    }
    else if (extension === "docx") {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({
            arrayBuffer: await file.arrayBuffer(),
        });
        content = result.value;
    }
    else if (extension === "pdf") {
        const [pdfjs, worker] = await Promise.all([
            import("pdfjs-dist"),
            import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
        ]);
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        const document = await pdfjs.getDocument({
            data: new Uint8Array(await file.arrayBuffer()),
        }).promise;
        const pages: string[] = [];
        for (let pageNumber = 1; pageNumber <= Math.min(document.numPages, maxPages); pageNumber += 1) {
            const page = await document.getPage(pageNumber);
            const textContent = await page.getTextContent();
            pages.push(textContent.items
                .map((item) => ("str" in item ? item.str : ""))
                .join(" "));
        }
        content = pages.join("\n");
    }
    else {
        throw new Error("目前支持 PDF、DOCX、TXT、Markdown 和 CSV 文档");
    }
    return content
        .replace(/\u0000/g, "")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
        .slice(0, 120000);
}
