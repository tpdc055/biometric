import { useState, useEffect, type ReactNode } from "react";
import { LanguageContext, type Language, translations } from "@/lib/i18n";
import { getAppSetting, setAppSetting } from "@/lib/db";

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    loadLanguage();
  }, []);

  async function loadLanguage() {
    try {
      const savedLang = await getAppSetting("app_language");
      if (savedLang === "tpi" || savedLang === "en") {
        setLanguageState(savedLang as Language);
      }
    } catch (error) {
      console.error("Failed to load language setting:", error);
      // Default to English if there's an error
      setLanguageState("en");
    }
  }

  async function setLanguage(lang: Language) {
    setLanguageState(lang);
    try {
      await setAppSetting("app_language", lang);
    } catch (error) {
      console.error("Failed to save language setting:", error);
    }
  }

  function t(key: keyof typeof translations.en): string {
    return translations[language][key];
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
