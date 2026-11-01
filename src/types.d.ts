export interface DisplayInfo { id: number; label: string; width: number; height: number; primary: boolean }
export interface Status {
  internetOnline: boolean;
  displays: DisplayInfo[];
  approvedRemotes: number;
  dataFolder: string;
  schemaVersion: number;
  appVersion: string;
}
export interface Book { id: number; name: string; chapters: number }
export interface Translation { id: string; name: string; language: string | null; license: string | null; verseCount: number }
export interface Verse { book: number; chapter: number; verse: number; text: string }
export interface Reference { book: number; chapter: number | null; verseStart: number | null; verseEnd: number | null }
export interface LiveContent { title: string; body: string }
export interface LiveState { audienceOpen: boolean; blanked: boolean; content: LiveContent | null }
export type Settings = Record<string, unknown> & { theme?: "dark" | "light" };

declare global {
  interface Window {
    churchai: {
      getSettings(): Promise<Settings>;
      setSetting(key: string, value: unknown): Promise<Settings>;
      getStatus(): Promise<Status>;
      checkIntegrity(): Promise<{ ok: boolean; messages: string[] }>;
      backupNow(): Promise<string>;
      exportData(): Promise<string | null>;
      bibleBooks(): Promise<Book[]>;
      parseReference(text: string): Promise<Reference | null>;
      translations(): Promise<Translation[]>;
      chapter(tid: string, book: number, chapter: number): Promise<Verse[]>;
      searchBible(tid: string, query: string): Promise<Verse[]>;
      removeTranslation(tid: string): Promise<Translation[]>;
      importBible(meta: { id: string; name: string; language?: string; license?: string }): Promise<{ imported: number; skipped: number; translations: Translation[] } | null>;
      getLive(): Promise<LiveState>;
      showLive(content: LiveContent): Promise<void>;
      setBlank(blanked: boolean): Promise<void>;
      openAudience(): Promise<void>;
      closeAudience(): Promise<void>;
      onLiveState(cb: (s: LiveState) => void): () => void;
    };
  }
}
