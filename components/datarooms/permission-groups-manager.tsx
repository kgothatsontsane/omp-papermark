"use client";

import { useState } from "react";

import { useTeam } from "@/context/team-context";
import { PermissionGroup, PermissionGroupAccessControls } from "@prisma/client";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
import z from "zod";

import useDataroomPermissionGroups from "@/lib/swr/use-dataroom-permission-groups";
import { fetcher } from "@/lib/utils";

import { PermissionsSheet } from "@/ee/features/permissions/components/permissions-sheet";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Group = PermissionGroup & {
  accessControls: PermissionGroupAccessControls[];
  links: { id: string; name: string | null }[];
  _count: { links: number; accessControls: number };
};

export default function PermissionGroupsManager({
  dataroomId,
}: {
  dataroomId: string;
}) {
  const { currentTeamId: teamId } = useTeam();
  const { permissionGroups, mutate: mutateGroups } = useDataroomPermissionGroups();
  const groups = (permissionGroups as Group[] | undefined) ?? [];

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [pendingName, setPendingName] = useState<string | null>(null);
  const [showPerms, setShowPerms] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleCreate = async (permissions: any) => {
    if (!teamId || !dataroomId) return;
    const name = pendingName?.trim() || `Permission group ${Date.now()}`;
    try {
      const res = await fetch(
        `/api/teams/${teamId}/datarooms/${dataroomId}/permission-groups`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permissions, name }),
        },
      );
      if (!res.ok) throw new Error("Failed to create permission group");
      toast.success("Permission group created");
      mutateGroups();
    } catch (e) {
      toast.error("Failed to create permission group");
    } finally {
      setShowPerms(false);
      setPendingName(null);
      setNewName("");
    }
  };

  const handleRename = async (id: string) => {
    if (!teamId || !dataroomId) return;
    const name = editingName.trim();
    if (!name) {
      setEditingId(null);
      return;
    }
    try {
      const res = await fetch(
        `/api/teams/${teamId}/datarooms/${dataroomId}/permission-groups/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        },
      );
      if (!res.ok) throw new Error("Failed");
      toast.success("Renamed");
      mutateGroups();
    } catch {
      toast.error("Failed to rename");
    } finally {
      setEditingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!teamId || !dataroomId) return;
    if (!confirm("Delete this permission group? Links using it will lose custom permissions.")) return;
    try {
      const res = await fetch(
        `/api/teams/${teamId}/datarooms/${dataroomId}/permission-groups/${id}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Failed");
      toast.success("Deleted");
      mutateGroups();
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Permission groups</h3>
          <p className="text-sm text-muted-foreground">
            Reusable permission sets. Apply one to multiple links at once.
          </p>
        </div>
        <Button
          onClick={() => {
            setNewName("");
            setCreateOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Create
        </Button>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New permission group</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Group name (e.g. Investors, Internal)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <DialogFooter>
            <Button
              onClick={() => {
                setPendingName(newName.trim() || `Permission group`);
                setCreateOpen(false);
                setShowPerms(true);
              }}
            >
              Continue to permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PermissionsSheet
        isOpen={showPerms}
        setIsOpen={(open) => {
          setShowPerms(open);
          if (!open) {
            setPendingName(null);
          }
        }}
        dataroomId={dataroomId}
        onSave={handleCreate}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Links using</TableHead>
            <TableHead>Rules</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                No permission groups yet.
              </TableCell>
            </TableRow>
          )}
          {groups.map((g) => (
            <TableRow key={g.id}>
              <TableCell>
                {editingId === g.id ? (
                  <Input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => handleRename(g.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(g.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                ) : (
                  <span
                    className="cursor-pointer font-medium hover:underline"
                    onClick={() => {
                      setEditingId(g.id);
                      setEditingName(g.name);
                    }}
                  >
                    {g.name}
                  </span>
                )}
              </TableCell>
              <TableCell>{g._count.links}</TableCell>
              <TableCell>{g._count.accessControls}</TableCell>
              <TableCell className="text-right space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingId(g.id);
                    setEditingName(g.name);
                  }}
                  title="Rename"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(g.id)}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
