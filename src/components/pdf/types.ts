export type PageSize = "A4" | "A3" | "Letter";
export type Orientation = "portrait" | "landscape";
export type FitMode = "contain" | "fill";

export interface ExtractedImage {
  id: string;
  dataUrl: string;
  width: number;
  height: number;
  selected: boolean;
  label: string;
}

export interface HistoryEntry {
  id: string;
  filename: string;
  date: string;
  imageCount: number;
}

export const PAGE_SIZES: Record<PageSize, { w: number; h: number }> = {
  A4: { w: 210, h: 297 },
  A3: { w: 297, h: 420 },
  Letter: { w: 216, h: 279 },
};

export const COLS_OPTIONS = [1, 2, 3, 4];
