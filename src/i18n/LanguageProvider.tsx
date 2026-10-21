import { createContext, useContext, useEffect, type ReactNode } from "react";

export type TranslationValues = Record<string, string | number>;

function englishText(key: string, values?: TranslationValues) {
  return values
    ? key.replace(/\{(\w+)\}/g, (match, name: string) =>
        String(values[name] ?? match),
      )
    : key;
}

const language = { t: englishText };
const LanguageContext = createContext(language);

export function LanguageProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = "en";
  }, []);

  return (
    <LanguageContext.Provider value={language}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
