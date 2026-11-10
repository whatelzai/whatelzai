export const THEME_STORAGE_KEY = "whatelz-theme-v1";
export function resolveTheme(value: string | null): "light" | "dark" {
  return value === "dark" ? "dark" : "light";
}
// Runs before paint; only an explicit saved choice overrides the light default.
export const THEME_INIT_SCRIPT = `(function(){var t;try{t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})}catch(e){}document.documentElement.dataset.theme=t==='dark'?'dark':'light'})()`;
