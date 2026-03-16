import { useState } from "react";
import { ChevronLeft, Plus, BookOpen } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { AddNotebookBookModal } from "./AddNotebookBookModal";
import type { NotebookBook } from "../lib/database";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  listId?: number;
}

interface NotebooksProps {
  onBack: () => void;
  onSelectBook: (book: NotebookBook) => void;
  books: NotebookBook[];
  todos: Todo[];
  onAddBook: (name: string, color?: string) => void;
  onUpdateBook: (id: number, name: string, color?: string) => void;
  onDeleteBook: (id: number) => void;
}

export function Notebooks({
  onBack,
  onSelectBook,
  books,
  todos,
  onAddBook,
  onUpdateBook,
  onDeleteBook,
}: NotebooksProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<NotebookBook | null>(null);

  const getBookTaskCount = (listId: number) => {
    return todos.filter((t) => t.listId === listId && !t.completed).length;
  };

  const handleAddBook = (name: string, color?: string) => {
    onAddBook(name, color);
    setIsModalOpen(false);
  };

  const handleUpdateBook = (id: number, name: string, color?: string) => {
    onUpdateBook(id, name, color);
    setEditingBook(null);
    setIsModalOpen(false);
  };

  const handleEditBook = (book: NotebookBook, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingBook(book);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="relative w-full min-w-0 overflow-x-hidden">
        <div className="flex flex-col gap-8 px-5 pt-0 pb-[150px] w-full">
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-4 items-center min-w-0 flex-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="shrink-0 size-8 text-foreground hover:bg-accent/50 focus-visible:ring-violet-500/30"
                aria-label="Back"
              >
                <ChevronLeft className="size-6" strokeWidth={2} />
              </Button>
              <h1 className="text-2xl font-medium text-foreground tracking-tight truncate">
                Notebook
              </h1>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                setEditingBook(null);
                setIsModalOpen(true);
              }}
              className="shrink-0 size-8 text-foreground hover:bg-accent/50 focus-visible:ring-violet-500/30"
              aria-label="Add book"
            >
              <Plus className="size-6" strokeWidth={2} />
            </Button>
          </div>

          <p className="text-muted-foreground text-sm -mt-4">
            Create custom books and add tasks to each. Your notebooks are saved across devices.
          </p>

          <div className="flex flex-col gap-2 w-full">
            {books.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                <BookOpen className="size-16 text-muted-foreground/50" strokeWidth={1} />
                <p className="text-muted-foreground">
                  No books yet. Create your first book to get started.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(true)}
                  className="mt-2"
                >
                  <Plus className="size-4 mr-2" />
                  Create book
                </Button>
              </div>
            ) : (
              books.map((book) => {
                const count = getBookTaskCount(book.list_id);
                return (
                  <Card
                    key={book.id}
                    className="w-full cursor-pointer rounded-lg border border-border bg-card px-4 py-3 transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-violet-500/30"
                    onClick={() => onSelectBook(book)}
                  >
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="flex gap-3 items-center min-w-0 flex-1">
                        <div
                          className="shrink-0 size-6"
                          style={{ color: book.color }}
                        >
                          <BookOpen
                            className="size-full"
                            strokeWidth={1.5}
                          />
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                          <p className="text-lg font-normal text-foreground tracking-tight break-words truncate">
                            {book.name}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleEditBook(book, e)}
                          className="shrink-0 p-1 rounded hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                          aria-label="Edit book"
                        >
                          <svg
                            className="size-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                            />
                          </svg>
                        </button>
                      </div>
                      <span className="shrink-0 text-lg font-normal text-muted-foreground tabular-nums">
                        {count}
                      </span>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>

      <AddNotebookBookModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingBook(null);
        }}
        onAddBook={handleAddBook}
        onUpdateBook={editingBook ? handleUpdateBook : undefined}
        onDeleteBook={editingBook ? onDeleteBook : undefined}
        editingBook={editingBook}
      />
    </>
  );
}
