import { useState, useCallback } from "react";
import * as pdfjs from "pdfjs-dist";
import { jsPDF } from "jspdf";
import Icon from "@/components/ui/icon";
import { ExtractedImage, HistoryEntry, PageSize, Orientation, FitMode, PAGE_SIZES } from "@/components/pdf/types";
import UploadStep from "@/components/pdf/UploadStep";
import WorkStep from "@/components/pdf/WorkStep";

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function Index() {
  const [step, setStep] = useState<"upload" | "work">("upload");
  const [images, setImages] = useState<ExtractedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [filename, setFilename] = useState("");
  const [pageSize, setPageSize] = useState<PageSize>("A4");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [columns, setColumns] = useState(2);
  const [fitMode, setFitMode] = useState<FitMode>("contain");
  const [quality] = useState(0.92);
  const [margin, setMargin] = useState(10);
  const [exporting, setExporting] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("pdf_history") || "[]");
    } catch {
      return [];
    }
  });
  const [activeTab, setActiveTab] = useState<"images" | "settings" | "history">("images");

  const extractImages = useCallback(async (file: File) => {
    setLoading(true);
    setLoadingProgress(0);
    setFilename(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const extracted: ExtractedImage[] = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        setLoadingProgress(Math.round((pageNum / pdf.numPages) * 100));
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        extracted.push({
          id: `page-${pageNum}-${Date.now()}`,
          dataUrl,
          width: viewport.width,
          height: viewport.height,
          selected: true,
          label: `Стр. ${pageNum}`,
        });
      }

      setImages(extracted);

      const entry: HistoryEntry = {
        id: Date.now().toString(),
        filename: file.name,
        date: new Date().toLocaleDateString("ru-RU"),
        imageCount: extracted.length,
      };
      setHistory((prev) => {
        const updated = [entry, ...prev].slice(0, 10);
        localStorage.setItem("pdf_history", JSON.stringify(updated));
        return updated;
      });
      setStep("work");
    } catch {
      alert("Не удалось обработать PDF. Проверьте файл и попробуйте снова.");
    } finally {
      setLoading(false);
      setLoadingProgress(0);
    }
  }, [quality]);

  const toggleImageSelection = (id: string) => {
    setImages((prev) => prev.map((img) => img.id === id ? { ...img, selected: !img.selected } : img));
  };

  const selectedImages = images.filter((img) => img.selected);

  const exportToPDF = async () => {
    if (selectedImages.length === 0) return;
    setExporting(true);

    try {
      const size = PAGE_SIZES[pageSize];
      const isLandscape = orientation === "landscape";
      const pageW = isLandscape ? size.h : size.w;
      const pageH = isLandscape ? size.w : size.h;

      const doc = new jsPDF({
        orientation,
        unit: "mm",
        format: pageSize.toLowerCase() === "letter" ? [pageW, pageH] : pageSize.toLowerCase() as "a4" | "a3",
      });

      const usableW = pageW - margin * 2;
      const cellW = usableW / columns;

      let col = 0;
      let rowY = margin;
      let maxRowH = 0;
      let firstPage = true;

      for (let i = 0; i < selectedImages.length; i++) {
        const img = selectedImages[i];
        const imgRatio = img.width / img.height;
        const drawW = cellW;
        const drawH = cellW / imgRatio;

        if (!firstPage && col === 0 && rowY + drawH > pageH - margin) {
          doc.addPage();
          rowY = margin;
          maxRowH = 0;
        }
        if (firstPage) firstPage = false;

        const cellX = margin + col * cellW;
        const centerX = cellX + (cellW - drawW) / 2;
        doc.addImage(img.dataUrl, "JPEG", centerX, rowY, drawW, drawH);
        maxRowH = Math.max(maxRowH, drawH);
        col++;

        if (col >= columns) {
          col = 0;
          rowY += maxRowH + margin;
          maxRowH = 0;
        }
      }

      doc.save(`pdf-images-${Date.now()}.pdf`);
    } catch {
      alert("Ошибка при экспорте. Попробуйте снова.");
    } finally {
      setExporting(false);
    }
  };

  const reset = () => {
    setStep("upload");
    setImages([]);
    setFilename("");
    setActiveTab("images");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-foreground rounded-sm flex items-center justify-center">
              <Icon name="FileImage" size={14} className="text-background" />
            </div>
            <span className="font-semibold text-sm tracking-tight">PDF Image Extractor</span>
          </div>
          {step === "work" && (
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground font-mono truncate max-w-xs">{filename}</span>
              <button
                onClick={reset}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                <Icon name="RotateCcw" size={12} />
                Новый файл
              </button>
            </div>
          )}
        </div>
      </header>

      {step === "upload" && (
        <UploadStep
          loading={loading}
          loadingProgress={loadingProgress}
          history={history}
          onFile={extractImages}
        />
      )}

      {step === "work" && (
        <WorkStep
          activeTab={activeTab}
          onTabChange={setActiveTab}
          images={images}
          onToggleImage={toggleImageSelection}
          onSelectAll={() => setImages((p) => p.map((i) => ({ ...i, selected: true })))}
          onDeselectAll={() => setImages((p) => p.map((i) => ({ ...i, selected: false })))}
          selectedImages={selectedImages}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          orientation={orientation}
          onOrientationChange={setOrientation}
          columns={columns}
          onColumnsChange={setColumns}
          fitMode={fitMode}
          onFitModeChange={setFitMode}
          margin={margin}
          onMarginChange={setMargin}
          history={history}
          exporting={exporting}
          onExport={exportToPDF}
        />
      )}
    </div>
  );
}
