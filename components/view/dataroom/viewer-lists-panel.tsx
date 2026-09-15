import { useState } from "react";

import {
  Bookmark,
  Check,
  ListPlus,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { TViewerList } from "@/lib/swr/use-viewer-bookmarks";

export default function ViewerListsPanel({
  lists,
  bookmarksCount,
  activeFilter,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onRemoveItem,
  onAddVisible,
  visibleCount,
  docName,
}: {
  lists: TViewerList[];
  bookmarksCount: number;
  activeFilter: string | null;
  onSelect: (filter: string | null) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onRemoveItem: (listId: string, documentId: string) => void;
  onAddVisible: (listId: string) => void;
  visibleCount: number;
  docName: (documentId: string) => string;
}) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const submitCreate = () => {
    if (!newName.trim()) return;
    onCreate(newName.trim());
    setNewName("");
    setCreating(false);
  };

  const submitRename = (id: string) => {
    if (!editName.trim()) return;
    onRename(id, editName.trim());
    setEditingId(null);
  };

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-secondary">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-foreground">My lists</div>
        {!creating && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setCreating(true)}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            New list
          </Button>
        )}
      </div>

      {creating && (
        <div className="mt-2 flex items-center gap-x-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="List name"
            className="h-8 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") submitCreate();
              if (e.key === "Escape") setCreating(false);
            }}
            autoFocus
          />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={submitCreate}>
            <Check className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCreating(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="mt-2 space-y-1">
        <button
          onClick={() => onSelect(activeFilter === "bookmarked" ? null : "bookmarked")}
          className={cn(
            "flex w-full items-center gap-x-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
            activeFilter === "bookmarked" && "bg-muted text-foreground",
          )}
        >
          <Bookmark className="h-4 w-4" />
          Bookmarked
          <span className="ml-auto text-xs">{bookmarksCount}</span>
        </button>

        {lists.map((list) => (
          <div key={list.id} className="rounded-md">
            <div
              className={cn(
                "flex w-full items-center gap-x-1 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                activeFilter === list.id && "bg-muted text-foreground",
              )}
            >
              <button
                className="flex min-w-0 flex-1 items-center gap-x-2"
                onClick={() =>
                  onSelect(activeFilter === list.id ? null : list.id)
                }
              >
                <ListPlus className="h-4 w-4 shrink-0" />
                {editingId === list.id ? (
                  <span
                    className="flex min-w-0 flex-1 items-center gap-x-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-7 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitRename(list.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => submitRename(list.id)}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  </span>
                ) : (
                  <>
                    <span className="truncate">{list.name}</span>
                    <span className="ml-auto text-xs">{list.items.length}</span>
                  </>
                )}
              </button>
              {editingId !== list.id && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Add visible documents"
                    onClick={() => onAddVisible(list.id)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Rename"
                    onClick={() => {
                      setEditingId(list.id);
                      setEditName(list.name);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {confirmDeleteId === list.id ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-destructive"
                      onClick={() => {
                        onDelete(list.id);
                        setConfirmDeleteId(null);
                      }}
                    >
                      Confirm
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Delete"
                      onClick={() => setConfirmDeleteId(list.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </>
              )}
            </div>

            {list.items.length > 0 && (
              <button
                className="ml-8 text-xs text-muted-foreground hover:text-foreground"
                onClick={() =>
                  setExpandedId(expandedId === list.id ? null : list.id)
                }
              >
                {expandedId === list.id ? "Hide items" : "Show items"}
              </button>
            )}
            {expandedId === list.id && (
              <ul className="ml-8 space-y-0.5 pb-1">
                {list.items.map((documentId) => (
                  <li
                    key={documentId}
                    className="flex items-center gap-x-1 text-xs text-muted-foreground"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {docName(documentId)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      title="Remove"
                      onClick={() => onRemoveItem(list.id, documentId)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}

        {lists.length === 0 && bookmarksCount === 0 && !creating && (
          <p className="px-2 py-1 text-xs text-muted-foreground">
            Bookmark documents or create a list to organize them.
          </p>
        )}
      </div>

      {activeFilter && activeFilter !== "bookmarked" && (
        <p className="mt-2 px-2 text-xs text-muted-foreground">
          Filtering by list — {visibleCount} document
          {visibleCount !== 1 ? "s" : ""}. Click the list again to clear.
        </p>
      )}
    </div>
  );
}
