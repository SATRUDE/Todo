import { ThemeProvider } from "next-themes";
import { TodoApp } from "./components/TodoApp";

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="todo-app-theme">
      <TodoApp />
    </ThemeProvider>
  );
}
