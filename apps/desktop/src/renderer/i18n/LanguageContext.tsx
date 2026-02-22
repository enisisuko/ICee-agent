/**
 * Omega 语言上下文
 * 提供全局 locale 状态，支持中文/英文切换，偏好存入 localStorage
 */
import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { translations } from "./translations.js";
import type { Locale, Translations } from "./translations.js";

/** localStorage 存储键 */
const STORAGE_KEY = "Omega-locale";

/** 从 localStorage 读取初始语言，默认中文 */
function getInitialLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "zh" || stored === "en") return stored;
  } catch {
    // SSR 或隐私模式下 localStorage 可能不可用
  }
  return "zh";
}

// ────────────────────────────────────────────────────────────
// Context 类型定义
// ────────────────────────────────────────────────────────────

interface LanguageContextValue {
  /** 当前语言代码：zh | en */
  locale: Locale;
  /** 切换语言，调用后立即生效并写入 localStorage */
  setLocale: (l: Locale) => void;
  /** 当前语言对应的翻译字典，直接取 t.xxx 使用 */
  t: Translations;
}

// ────────────────────────────────────────────────────────────
// Context 创建（带默认值，防止 Provider 缺失时报错）
// ────────────────────────────────────────────────────────────

const LanguageContext = createContext<LanguageContextValue>({
  locale: "zh",
  setLocale: () => {},
  // 类型断言：默认值与 zh 分支结构一致，但 TypeScript 无法直接收窄联合
  t: translations["zh"] as Translations,
});

// ────────────────────────────────────────────────────────────
// Provider 组件
// ────────────────────────────────────────────────────────────

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    // 持久化到 localStorage，下次启动保持选择
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // 忽略写入失败
    }
  }, []);

  // 当前语言对应的翻译字典（断言为宽类型 Translations，避免联合类型报错）
  const t = translations[locale] as Translations;

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// ────────────────────────────────────────────────────────────
// Hook — 在组件内使用：const { t, locale, setLocale } = useLanguage()
// ────────────────────────────────────────────────────────────

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}

