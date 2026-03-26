import { useState, useRef, useCallback } from "react";
import * as pdfjs from "pdfjs-dist";
import { jsPDF } from "jspdf";
import Icon from "@/components/ui/icon";

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type PageSize = "A4" | "A3" | "Letter";
type Orientation = "portrait" | "landscape";
type FitMode = "contain" | "fill";

interface ExtractedImage {
  id: string;
  dataUrl: string;
  width: number;
  height: number;
  selected: boolean;
  label: string;
}

interface HistoryEntry {
  id: string;
  filename: string;
  date: string;
  imageCount: number;
}

const PAGE_SIZES: Record<PageSize, { w: number; h: number }> = {
  A4: { w: 210, h: 297 },
  A3: { w: 297, h: 420 },
  Letter: { w: 216, h: 279 },
};

const COLS_OPTIONS = [1, 2, 3, 4];

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
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      alert("Пожалуйста, загрузите PDF файл.");
      return;
    }
    extractImages(file);
  }, [extractImages]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

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

      {/* Upload Step */}
      {step === "upload" && (
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-xl animate-fade-in">
            <div className="text-center mb-10">
              <h1 className="text-3xl font-light tracking-tight text-foreground mb-3">
                Извлечение изображений из PDF
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Загрузите PDF — каждая страница станет изображением.<br />
                Выберите нужные и сохраните в новый PDF.
              </p>
            </div>

            <div
              className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? "bg-blue-50 border-blue-400"
                  : "border-border hover:border-foreground/30 hover:bg-secondary/40"
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => fileInputRef.current?.click()}
            >
              {loading ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-10 h-10 rounded-full border-2 border-foreground/15 border-t-foreground animate-spin" />
                  <div className="text-sm text-muted-foreground">
                    Обработка страниц... {loadingProgress}%
                  </div>
                  <div className="w-48 h-0.5 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-foreground transition-all duration-300 rounded-full"
                      style={{ width: `${loadingProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-5">
                    <Icon name="Upload" size={22} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1.5">
                    Перетащите PDF сюда или нажмите для выбора
                  </p>
                  <p className="text-xs text-muted-foreground">Поддерживаются любые PDF файлы</p>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />

            {history.length > 0 && (
              <div className="mt-8">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Недавние файлы
                </p>
                <div className="space-y-0.5">
                  {history.slice(0, 5).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-secondary/60 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon name="FileText" size={13} className="text-muted-foreground flex-shrink-0" />
                        <span className="text-sm text-foreground truncate">{entry.filename}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                        <span className="text-xs text-muted-foreground font-mono">{entry.imageCount} стр.</span>
                        <span className="text-xs text-muted-foreground">{entry.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      )}

      {/* Work Step */}
      {step === "work" && (
        <main className="flex-1 flex overflow-hidden" style={{ height: "calc(100vh - 56px)" }}>
          {/* Sidebar */}
          <aside className="w-72 border-r border-border bg-card flex flex-col flex-shrink-0">
            <div className="flex border-b border-border">
              {(["images", "settings", "history"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 text-[11px] font-medium transition-colors ${
                    activeTab === tab
                      ? "text-foreground border-b-2 border-foreground -mb-px"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "images" ? "Изображения" : tab === "settings" ? "Настройки" : "История"}
                </button>
              ))}
            </div>

            {/* Images Tab */}
            {activeTab === "images" && (
              <div className="flex-1 overflow-y-auto p-3">
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-xs text-muted-foreground">
                    {selectedImages.length} из {images.length}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setImages((p) => p.map((i) => ({ ...i, selected: true })))}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Все
                    </button>
                    <span className="text-muted-foreground/30">|</span>
                    <button
                      onClick={() => setImages((p) => p.map((i) => ({ ...i, selected: false })))}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Снять
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {images.map((img, idx) => (
                    <div
                      key={img.id}
                      className={`relative rounded-md overflow-hidden cursor-pointer border-2 transition-all duration-150 ${
                        img.selected ? "border-foreground" : "border-transparent opacity-40"
                      }`}
                      onClick={() => toggleImageSelection(img.id)}
                      style={{ animationDelay: `${idx * 40}ms` }}
                    >
                      <img
                        src={img.dataUrl}
                        alt={img.label}
                        className="w-full aspect-[3/4] object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent flex items-end p-1.5">
                        <span className="text-white text-[10px] font-mono">{img.label}</span>
                      </div>
                      {img.selected && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-foreground rounded-sm flex items-center justify-center">
                          <Icon name="Check" size={10} className="text-background" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === "settings" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block mb-2.5">
                    Размер страницы
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["A4", "A3", "Letter"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setPageSize(s)}
                        className={`py-2 text-xs rounded-md font-medium transition-colors ${
                          pageSize === s
                            ? "bg-foreground text-background"
                            : "bg-secondary text-foreground hover:bg-secondary/60"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block mb-2.5">
                    Ориентация
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {([["portrait", "Книжная"], ["landscape", "Альбомная"]] as const).map(([val, label]) => (
                      <button
                        key={val}
                        onClick={() => setOrientation(val)}
                        className={`py-2 text-xs rounded-md font-medium transition-colors ${
                          orientation === val
                            ? "bg-foreground text-background"
                            : "bg-secondary text-foreground hover:bg-secondary/60"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block mb-2.5">
                    Колонок на странице
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {COLS_OPTIONS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setColumns(c)}
                        className={`py-2 text-xs rounded-md font-medium transition-colors ${
                          columns === c
                            ? "bg-foreground text-background"
                            : "bg-secondary text-foreground hover:bg-secondary/60"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block mb-2.5">
                    Масштабирование
                  </label>
                  <div className="space-y-1.5">
                    {([
                      ["contain", "По ширине (без искажений)"],
                      ["fill", "Заполнить ячейку"],
                    ] as const).map(([val, label]) => (
                      <button
                        key={val}
                        onClick={() => setFitMode(val)}
                        className={`w-full py-2 px-3 text-xs rounded-md text-left font-medium transition-colors ${
                          fitMode === val
                            ? "bg-foreground text-background"
                            : "bg-secondary text-foreground hover:bg-secondary/60"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block mb-2.5">
                    Отступы: <span className="font-mono normal-case">{margin} мм</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={30}
                    value={margin}
                    onChange={(e) => setMargin(Number(e.target.value))}
                    className="w-full accent-foreground h-1"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground font-mono">0</span>
                    <span className="text-[10px] text-muted-foreground font-mono">30</span>
                  </div>
                </div>
              </div>
            )}

            {/* History Tab */}
            {activeTab === "history" && (
              <div className="flex-1 overflow-y-auto p-4">
                {history.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">История пуста</p>
                ) : (
                  <div className="space-y-2">
                    {history.map((entry) => (
                      <div key={entry.id} className="p-3 rounded-lg bg-secondary/50">
                        <div className="flex items-start gap-2">
                          <Icon name="FileText" size={13} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{entry.filename}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-muted-foreground font-mono">{entry.imageCount} стр.</span>
                              <span className="text-[10px] text-muted-foreground">{entry.date}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </aside>

          {/* Main Preview Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="h-12 border-b border-border bg-card flex items-center justify-between px-5 flex-shrink-0">
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground">Предпросмотр</span>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                  <span>{PAGE_SIZES[pageSize][orientation === "portrait" ? "w" : "h"]}×{PAGE_SIZES[pageSize][orientation === "portrait" ? "h" : "w"]} мм</span>
                  <span className="opacity-40">·</span>
                  <span>{columns} кол.</span>
                  <span className="opacity-40">·</span>
                  <span>{selectedImages.length} стр.</span>
                </div>
              </div>
              <button
                onClick={exportToPDF}
                disabled={selectedImages.length === 0 || exporting}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                  selectedImages.length === 0 || exporting
                    ? "bg-secondary text-muted-foreground cursor-not-allowed"
                    : "bg-foreground text-background hover:opacity-80"
                }`}
              >
                {exporting ? (
                  <>
                    <div className="w-3 h-3 rounded-full border border-background/30 border-t-background animate-spin" />
                    Экспорт...
                  </>
                ) : (
                  <>
                    <Icon name="Download" size={12} />
                    Сохранить PDF
                  </>
                )}
              </button>
            </div>

            {/* Preview */}
            <div className="flex-1 overflow-y-auto p-8 bg-muted/30">
              {selectedImages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Icon name="ImageOff" size={32} className="text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Выберите изображения для предпросмотра</p>
                  </div>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto">
                  <div
                    className="bg-white rounded shadow-lg mx-auto overflow-hidden"
                    style={{
                      aspectRatio: orientation === "portrait"
                        ? `${PAGE_SIZES[pageSize].w} / ${PAGE_SIZES[pageSize].h}`
                        : `${PAGE_SIZES[pageSize].h} / ${PAGE_SIZES[pageSize].w}`,
                    }}
                  >
                    <div
                      className="h-full"
                      style={{
                        padding: `${(margin / (orientation === "portrait" ? PAGE_SIZES[pageSize].h : PAGE_SIZES[pageSize].w)) * 100}%`,
                      }}
                    >
                      <div
                        className="grid h-full gap-[2%]"
                        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
                      >
                        {selectedImages.map((img, i) => (
                          <div
                            key={img.id}
                            className="overflow-hidden rounded-sm"
                            style={{
                              animation: `scale-in 0.25s ease-out ${i * 30}ms both`,
                            }}
                          >
                            <img
                              src={img.dataUrl}
                              alt={img.label}
                              className="w-full h-full"
                              style={{ objectFit: fitMode === "fill" ? "cover" : "contain" }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-center mt-4 text-xs text-muted-foreground font-mono">
                    {pageSize} · {orientation === "portrait" ? "Книжная" : "Альбомная"} · {margin} мм отступы
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
