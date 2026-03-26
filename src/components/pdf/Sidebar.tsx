import { useRef } from "react";
import Icon from "@/components/ui/icon";
import {
  ExtractedImage,
  HistoryEntry,
  PageSize,
  Orientation,
  FitMode,
  COLS_OPTIONS,
} from "./types";

interface SidebarProps {
  activeTab: "images" | "settings" | "history";
  onTabChange: (tab: "images" | "settings" | "history") => void;
  images: ExtractedImage[];
  onToggleImage: (id: string) => void;
  onReorder: (fromId: string, toId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  selectedCount: number;
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
}

export default function Sidebar({
  activeTab,
  onTabChange,
  images,
  onToggleImage,
  onReorder,
  onSelectAll,
  onDeselectAll,
  selectedCount,
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
}: SidebarProps) {
  const dragId = useRef<string | null>(null);
  const dragOverId = useRef<string | null>(null);

  const handleDragStart = (id: string) => {
    dragId.current = id;
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    dragOverId.current = id;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragId.current && dragOverId.current && dragId.current !== dragOverId.current) {
      onReorder(dragId.current, dragOverId.current);
    }
    dragId.current = null;
    dragOverId.current = null;
  };

  return (
    <aside className="w-72 border-r border-border bg-card flex flex-col flex-shrink-0">
      <div className="flex border-b border-border">
        {(["images", "settings", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
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
          <p className="text-[10px] text-muted-foreground/60 px-1 mb-2 flex items-center gap-1">
            <Icon name="GripHorizontal" size={10} />
            Перетащите для изменения порядка
          </p>
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs text-muted-foreground">
              {selectedCount} из {images.length}
            </span>
            <div className="flex gap-2">
              <button
                onClick={onSelectAll}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Все
              </button>
              <span className="text-muted-foreground/30">|</span>
              <button
                onClick={onDeselectAll}
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
                draggable
                onDragStart={() => handleDragStart(img.id)}
                onDragOver={(e) => handleDragOver(e, img.id)}
                onDrop={handleDrop}
                className={`relative rounded-md overflow-hidden border-2 transition-all duration-150 select-none ${
                  img.selected ? "border-foreground" : "border-transparent opacity-40"
                }`}
                style={{ animationDelay: `${idx * 40}ms`, cursor: "grab" }}
              >
                <img
                  src={img.dataUrl}
                  alt={img.label}
                  className="w-full aspect-[3/4] object-cover pointer-events-none"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent flex items-end p-1.5">
                  <span className="text-white text-[10px] font-mono">{img.label}</span>
                </div>
                {/* Кнопка выбора отдельно от drag-зоны */}
                <button
                  onClick={() => onToggleImage(img.id)}
                  className="absolute inset-0 w-full h-full"
                  style={{ cursor: "inherit" }}
                />
                {img.selected && (
                  <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-foreground rounded-sm flex items-center justify-center pointer-events-none">
                    <Icon name="Check" size={10} className="text-background" />
                  </div>
                )}
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 pointer-events-none">
                  <Icon name="GripHorizontal" size={12} className="text-white/60" />
                </div>
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
                  onClick={() => onPageSizeChange(s)}
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
                  onClick={() => onOrientationChange(val)}
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
                  onClick={() => onColumnsChange(c)}
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
                  onClick={() => onFitModeChange(val)}
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
              onChange={(e) => onMarginChange(Number(e.target.value))}
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
  );
}