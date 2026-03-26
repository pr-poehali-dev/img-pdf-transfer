import { useRef } from "react";
import Icon from "@/components/ui/icon";
import { HistoryEntry } from "./types";

interface UploadStepProps {
  loading: boolean;
  loadingProgress: number;
  history: HistoryEntry[];
  onFile: (file: File) => void;
}

export default function UploadStep({ loading, loadingProgress, history, onFile }: UploadStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDraggingRef = useRef(false);

  const handleFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      alert("Пожалуйста, загрузите PDF файл.");
      return;
    }
    onFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
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
          className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-all duration-200 border-border hover:border-foreground/30 hover:bg-secondary/40`}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("bg-blue-50", "border-blue-400"); }}
          onDragLeave={(e) => { e.currentTarget.classList.remove("bg-blue-50", "border-blue-400"); }}
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
  );
}
