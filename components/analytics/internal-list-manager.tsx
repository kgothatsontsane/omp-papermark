import { useState } from "react";

import { useTeam } from "@/context/team-context";
import { XIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useInternalList } from "@/lib/swr/use-insights";

export default function InternalListManager({
  links,
}: {
  links: { id: string; name: string | null }[];
}) {
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;
  const { list, loading, mutate } = useInternalList();
  const [email, setEmail] = useState("");
  const [linkId, setLinkId] = useState("");

  if (loading || !list) {
    return null;
  }

  const post = async (body: { email?: string; linkId?: string }) => {
    const res = await fetch(`/api/teams/${teamId}/internal-list`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      toast.error("Failed to update internal list");
      return;
    }
    mutate();
  };

  const remove = async (query: string) => {
    const res = await fetch(`/api/teams/${teamId}/internal-list?${query}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Failed to update internal list");
      return;
    }
    mutate();
  };

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div>
        <p className="text-sm font-medium">Internal list</p>
        <p className="text-xs text-muted-foreground">
          Excluded alongside team members when internal visits are hidden
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex flex-1 gap-2">
          <Input
            placeholder="Email to exclude"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={!email}
            onClick={() => {
              post({ email });
              setEmail("");
            }}
          >
            Add
          </Button>
        </div>
        <div className="flex flex-1 gap-2">
          <Input
            placeholder="Pick a link to exclude"
            list="internal-link-picker"
            value={linkId}
            onChange={(e) => setLinkId(e.target.value)}
          />
          <datalist id="internal-link-picker">
            {links.map((link) => (
              <option key={link.id} value={link.id}>
                {link.name ?? link.id}
              </option>
            ))}
          </datalist>
          <Button
            variant="outline"
            size="sm"
            disabled={!linkId}
            onClick={() => {
              post({ linkId });
              setLinkId("");
            }}
          >
            Add
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {list.excludedEmails.map((e) => (
          <span
            key={e}
            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs"
          >
            {e}
            <button onClick={() => remove(`email=${encodeURIComponent(e)}`)}>
              <XIcon className="h-3 w-3" />
            </button>
          </span>
        ))}
        {list.excludedLinkIds.map((l) => (
          <span
            key={l}
            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs"
          >
            {links.find((link) => link.id === l)?.name ?? l}
            <button onClick={() => remove(`linkId=${encodeURIComponent(l)}`)}>
              <XIcon className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
