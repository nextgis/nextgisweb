const YANDEX_LOCALES: Record<string, string> = {
  ru: "ru_RU",
  en: "en_US",
  tr: "tr_TR",
  uk: "uk_UA",
};

let scriptPromise: Promise<void> | null = null;

export function loadYandexMaps(apiKey: string): Promise<void> {
  if (scriptPromise) return scriptPromise;
  if (window.ymaps) return Promise.resolve();

  const lang = YANDEX_LOCALES[ngwConfig.locale] ?? "en_US";

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apiKey)}&lang=${lang}`;
    script.onload = () => window.ymaps.ready(() => resolve());
    script.onerror = () => {
      scriptPromise = null;
      script.remove();
      reject(new Error("Failed to load Yandex Maps API"));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}
