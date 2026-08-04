import { ThemeProvider } from "next-themes";
import { TodoApp } from "./components/TodoApp";
import { Toaster } from "./components/ui/sonner";

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="todo-app-theme">
      <TodoApp />
      <Toaster position="top-center" />
    </ThemeProvider>
  );
}
