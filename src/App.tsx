import { ThemeProvider } from "next-themes";
import { TodoApp } from "./components/TodoApp";
import { Toaster } from "./components/ui/sonner";
import { useThemeColorMeta } from "./hooks/useThemeColorMeta";

// Renders nothing; it exists so the theme-color hook sits inside ThemeProvider.
function ThemeColorMeta() {
  useThemeColorMeta();
  return null;
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="todo-app-theme">
      <ThemeColorMeta />
      <TodoApp />
      <Toaster position="top-center" />
    </ThemeProvider>
  );
}
