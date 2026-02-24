import React, { useState } from "react";
import { ChevronLeft, Plus, CheckCircle2, Inbox, Users } from "lucide-react";
import svgPaths from "../imports/svg-4ile2zv366";
import completedSvgPaths from "../imports/svg-qfhtru23ul";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { AddListModal } from "./AddListModal";
import { AddListOrFolderModal } from "./AddListOrFolderModal";
import { AddFolderModal } from "./AddFolderModal";

interface ListFolder {
  id: number;
  name: string;
  sort_order: number;
}

interface ListItem {
  id: number;
  name: string;
  color: string;
  count: number;
  isShared: boolean;
  folderId?: number | null;
}

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  time?: string;
  group?: string;
  listId?: number;
  description?: string | null;
}

const COMPLETED_LIST_ID = -1;
const ALL_TASKS_LIST_ID = -2;

interface ListsProps {
  onSelectList: (list: ListItem) => void;
  todos: Todo[];
  lists: ListItem[];
  folders: ListFolder[];
  onAddList: (listName: string, isShared: boolean, color: string, folderId?: number | null) => void;
  onUpdateList: (listId: number, listName: string, isShared: boolean, color: string, folderId?: number | null) => void;
  onDeleteList: (listId: number) => void;
  onAddFolder: (folderName: string) => void;
  onUpdateFolder: (folderId: number, folderName: string) => void;
  onDeleteFolder: (folderId: number) => void;
  onBack?: () => void;
}

export function Lists({ onSelectList, todos, lists, folders, onAddList, onUpdateList, onDeleteList, onAddFolder, onUpdateFolder, onDeleteFolder, onBack }: ListsProps) {
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
  const [isAddFolderModalOpen, setIsAddFolderModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<ListItem | null>(null);

  const handleAddList = (listName: string, isShared: boolean, color: string, folderId?: number | null) => {
    onAddList(listName, isShared, color, folderId);
    setIsModalOpen(false);
  };

  const handleUpdateList = (listId: number, listName: string, isShared: boolean, color: string, folderId?: number | null) => {
    onUpdateList(listId, listName, isShared, color, folderId);
    setEditingList(null);
    setIsModalOpen(false);
  };

  const handleDeleteList = (listId: number) => {
    onDeleteList(listId);
    setEditingList(null);
    setIsModalOpen(false);
  };

  const handleEditList = (list: ListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingList(list);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingList(null);
  };

  const handleAddFolderFromModal = (folderName: string) => {
    onAddFolder(folderName);
    setIsAddFolderModalOpen(false);
  };

  // Calculate task counts for each list
  const getListCount = (listId: number) => {
    return todos.filter(todo => todo.listId === listId && !todo.completed).length;
  };

  const completedCount = todos.filter(todo => todo.listId === COMPLETED_LIST_ID).length;
  const allTasksCount = todos.filter(todo => !todo.completed).length;

  // All tasks list
  const allTasksList: ListItem = {
    id: ALL_TASKS_LIST_ID,
    name: "All tasks",
    color: "#FF6D00",
    count: allTasksCount,
    isShared: false,
  };

  // Completed tasks list
  const completedList: ListItem = {
    id: COMPLETED_LIST_ID,
    name: "Completed list",
    color: "#00C853",
    count: completedCount,
    isShared: false,
  };

  // User-created lists only (exclude virtual lists)
  const userLists = lists.filter(l => l.id !== ALL_TASKS_LIST_ID && l.id !== COMPLETED_LIST_ID);
  // Group by folder: first by folder order, then uncategorized
  const listsByFolder = (() => {
    const byFolder = new Map<number | null, ListItem[]>();
    byFolder.set(null, []);
    folders.forEach(f => byFolder.set(f.id, []));
    userLists.forEach(list => {
      const key = list.folderId ?? null;
      const arr = byFolder.get(key) ?? [];
      arr.push(list);
      byFolder.set(key, arr);
    });
    return byFolder;
  })();

  const renderListRow = (list: ListItem) => {
    const taskCount = getListCount(list.id);
    return (
      <Card
        key={list.id}
        className="w-full cursor-pointer rounded-lg border border-border bg-card px-4 py-3 transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-violet-500/30"
        onClick={() => onSelectList(list)}
      >
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex gap-3 items-center min-w-0 flex-1">
            <div className="shrink-0 size-6 text-foreground" style={{ color: list.color }}>
              <svg className="block size-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d={svgPaths.p1c6a4380} />
              </svg>
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <p className="text-lg font-normal text-foreground tracking-tight break-words truncate">{list.name}</p>
              {list.isShared && (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users className="size-4 shrink-0" />
                  Shared
                </span>
              )}
            </div>
          </div>
          <span className="shrink-0 text-lg font-normal text-muted-foreground tabular-nums">{taskCount}</span>
        </div>
      </Card>
    );
  };

  return (
    <>
    <div className="relative w-full min-w-0 overflow-x-hidden">
      <div className="flex flex-col gap-8 px-5 pt-0 pb-[150px] w-full">
        {/* Header */}
        <div className="flex items-center justify-between w-full">
          <div className="flex gap-4 items-center min-w-0 flex-1">
            {onBack && (
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
            )}
            <h1 className="text-2xl font-medium text-foreground tracking-tight truncate">Lists</h1>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setIsChoiceModalOpen(true)}
            className="shrink-0 size-8 text-foreground hover:bg-accent/50 focus-visible:ring-violet-500/30"
            aria-label="Add list or folder"
          >
            <Plus className="size-6" strokeWidth={2} />
          </Button>
        </div>

        {/* List items grouped by folder */}
        <div className="flex flex-col gap-6 w-full">
          {folders.map((folder) => {
            const folderLists = listsByFolder.get(folder.id) ?? [];
            if (folderLists.length === 0) return null;
            return (
              <section key={folder.id} className="flex flex-col gap-3 w-full">
                <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {folder.name}
                </h2>
                <div className="flex flex-col gap-2 w-full">
                  {folderLists.map((list) => renderListRow(list))}
                </div>
              </section>
            );
          })}
          {((listsByFolder.get(null) ?? []).length > 0) && (
            <section className="flex flex-col gap-3 w-full">
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                No folder
              </h2>
              <div className="flex flex-col gap-2 w-full">
                {(listsByFolder.get(null) ?? []).map((list) => renderListRow(list))}
              </div>
            </section>
          )}

          {/* All tasks */}
          <Card
            className="w-full cursor-pointer rounded-lg border border-border bg-card px-4 py-3 transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-violet-500/30"
            onClick={() => onSelectList(allTasksList)}
          >
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex gap-3 items-center min-w-0 flex-1">
                <Inbox className="size-6 shrink-0 text-orange-500" strokeWidth={1.5} />
                <p className="text-lg font-normal text-foreground tracking-tight truncate">{allTasksList.name}</p>
              </div>
              <span className="shrink-0 text-lg font-normal text-muted-foreground tabular-nums">{allTasksList.count}</span>
            </div>
          </Card>

          {/* Completed list */}
          <Card
            className="w-full cursor-pointer rounded-lg border border-border bg-card px-4 py-3 transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-violet-500/30"
            onClick={() => onSelectList(completedList)}
          >
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex gap-3 items-center min-w-0 flex-1">
                <CheckCircle2 className="size-6 shrink-0 text-emerald-600" strokeWidth={1.5} />
                <p className="text-lg font-normal text-foreground tracking-tight truncate">{completedList.name}</p>
              </div>
              <span className="shrink-0 text-lg font-normal text-muted-foreground tabular-nums">{completedList.count}</span>
            </div>
          </Card>
        </div>
      </div>
    </div>

    <AddListOrFolderModal
      isOpen={isChoiceModalOpen}
      onClose={() => setIsChoiceModalOpen(false)}
      onAddList={() => {
        setIsChoiceModalOpen(false);
        setEditingList(null);
        setIsModalOpen(true);
      }}
      onAddFolder={() => {
        setIsChoiceModalOpen(false);
        setIsAddFolderModalOpen(true);
      }}
    />

    <AddFolderModal
      isOpen={isAddFolderModalOpen}
      onClose={() => setIsAddFolderModalOpen(false)}
      onAddFolder={handleAddFolderFromModal}
    />

    <AddListModal
      isOpen={isModalOpen}
      onClose={handleCloseModal}
      onAddList={handleAddList}
      onUpdateList={handleUpdateList}
      onDeleteList={handleDeleteList}
      editingList={editingList}
      folders={folders}
      onUpdateFolder={onUpdateFolder}
      onDeleteFolder={onDeleteFolder}
    />
    </>
  );
}
