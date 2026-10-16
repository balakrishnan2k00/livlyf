import { useTheme } from "../hooks/useTheme";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      className={`btn btn-ghost theme-toggle ${className ?? ""}`}
      onClick={toggleTheme}
      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      title={theme === "light" ? "Dark mode" : "Light mode"}
    >
      <span className="theme-toggle__icon" aria-hidden="true">{theme === "light" ? "◐" : "◑"}</span>
      <span className="theme-toggle__label">{theme === "light" ? "Dark" : "Light"}</span>
    </button>
  );
}
