import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from "react";
import { useLocales } from "expo-localization";
import { languageFromLocale, type AppLanguage } from "./system-language";
import {
  readLanguagePreference,
  writeLanguagePreference,
  type LanguagePreference
} from "./language-preference";

type LanguageState = {
  language: AppLanguage;
  preference: LanguagePreference;
  ready: boolean;
  loadError: boolean;
  saving: boolean;
  retry: () => void;
  select: (value: LanguagePreference) => Promise<void>;
};
const LanguageContext = createContext<LanguageState | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const locales = useLocales();
  const [preference, setPreference] = useState<LanguagePreference>("system");
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const savingRef = useRef(false);
  useEffect(() => {
    let active = true;
    setReady(false);
    setLoadError(false);
    void readLanguagePreference()
      .then((value) => {
        if (active) setPreference(value);
      })
      .catch(() => {
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  const select = useCallback(async (value: LanguagePreference) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await writeLanguagePreference(value);
      setPreference(value);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, []);
  const language =
    preference === "system"
      ? languageFromLocale(locales[0]?.languageCode ?? "en")
      : preference;
  return (
    <LanguageContext.Provider
      value={{
        language,
        preference,
        ready,
        loadError,
        saving,
        select,
        retry: () => setAttempt((value) => value + 1)
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}
export function useAppLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useAppLanguage requires LanguageProvider");
  return value;
}
