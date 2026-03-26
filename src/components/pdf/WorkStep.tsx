import Icon from "@/components/ui/icon";
import { ExtractedImage, PageSize, Orientation, FitMode, PAGE_SIZES } from "./types";
import Sidebar from "./Sidebar";
import { HistoryEntry } from "./types";

interface WorkStepProps {
  activeTab: "images" | "settings" | "history";
  onTabChange: (tab: "images" | "settings" | "history") => void;
  images: ExtractedImage[];
  onToggleImage: (id: string) => void;
  onReorder: (fromId: string, toId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  selectedImages: ExtractedImage[];
  pageSize: PageSize;
  onPageSizeChange: (v: PageSize) => void;
  orientation: Orientation;
  onOrientationChange: (v: Orientation) => void;
  columns: number;
  onColumnsChange: (v: number) => void;
  fitMode: FitMode;
  onFitModeChange: (v: FitMode) => void;
  margin: number;
  onMarginChange: (v: number) => void;
  history: HistoryEntry[];
  exporting: boolean;
  onExport: () => void;
}

export default function WorkStep({
  activeTab,
  onTabChange,
  images,
  onToggleImage,
  onReorder,
  onSelectAll,
  onDeselectAll,
  selectedImages,
  pageSize,
  onPageSizeChange,
  orientation,
  onOrientationChange,
  columns,
  onColumnsChange,
  fitMode,
  onFitModeChange,
  margin,
  onMarginChange,
  history,
  exporting,
  onExport,
}: WorkStepProps) {
  const size = PAGE_SIZES[pageSize];
  const pageW = orientation === "portrait" ? size.w : size.h;
  const pageH = orientation === "portrait" ? size.h : size.w;

  return (
    <main className="flex-1 flex overflow-hidden" style={{ height: "calc(100vh - 56px)" }}>
      <Sidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        images={images}
        onToggleImage={onToggleImage}
        onReorder={onReorder}
        onSelectAll={onSelectAll}
        onDeselectAll={onDeselectAll}
        selectedCount={selectedImages.length}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
        orientation={orientation}
        onOrientationChange={onOrientationChange}
        columns={columns}
        onColumnsChange={onColumnsChange}
        fitMode={fitMode}
        onFitModeChange={onFitModeChange}
        margin={margin}
        onMarginChange={onMarginChange}
        history={history}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="h-12 border-b border-border bg-card flex items-center justify-between px-5 flex-shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">Предпросмотр</span>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
              <span>{pageW}×{pageH} мм</span>
              <span className="opacity-40">·</span>
              <span>{columns} кол.</span>
              <span className="opacity-40">·</span>
              <span>{selectedImages.length} стр.</span>
            </div>
          </div>
          <button
            onClick={onExport}
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
                  aspectRatio: `${pageW} / ${pageH}`,
                }}
              >
                <div
                  className="h-full"
                  style={{
                    padding: `${(margin / pageH) * 100}%`,
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
  );
}