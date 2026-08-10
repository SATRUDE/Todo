import { useEffect } from "react";
import { useTheme } from "next-themes";

/**
 * Keeps the browser chrome in step with the app's own theme switch.
 *
 * `<meta name="theme-color">` is what colours the address bar on Android
 * Chrome, the tab strip on desktop, and the top strip in mobile Safari. It was
 * hardcoded to the dark value in index.html and nothing ever changed it, so in
 * light mode a near-black bar sat directly against a white app all day.
 *
 * The values are the two `--background` tokens from index.css, resolved:
 * white in light, zinc-950 in dark. Keep them in step with those tokens.
 *
 * The same pair is duplicated in the inline bootstrap script in index.html, so
 * the very first paint is already correct before React mounts. Change one,
 * change the other.
 */
export const THEME_COLORS = {
  light: "#ffffff",
  dark: "#09090b",
} as const;

export function useThemeColorMeta() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const color = resolvedTheme === "light" ? THEME_COLORS.light : THEME_COLORS.dark;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = color;
  }, [resolvedTheme]);
}
