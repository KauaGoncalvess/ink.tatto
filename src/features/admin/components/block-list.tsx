"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { BlockReason } from "@prisma/client";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tag } from "@/components/admin/ui";
import { BlockDialog } from "@/features/appointments/components/block-dialog";
import { deleteBlockedTime } from "@/features/appointments/actions";
import { todayISO } from "@/lib/datetime";

const REASON_LABELS: Record<BlockReason, string> = {
  DAY_OFF: "Folga",
  VACATION: "Férias",
  BREAK: "Pausa",
  APPOINTMENT_HOLD: "Reservado",
  OTHER: "Outro",
};

export type BlockRow = {
  id: string;
  artistName: string | null;
  reason: BlockReason;
  note: string | null;
  startsAtLabel: string;
  endsAtLabel: string;
};

export function BlockList({
  blocks,
  artists,
}: {
  blocks: BlockRow[];
  artists: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  async function handleDelete(id: string) {
    setPendingId(id);
    try {
      const result = await deleteBlockedTime(id);
      if (result.ok) {
        toast.success(result.message ?? "Bloqueio removido.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Falha de conexão. Tente novamente.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <>
      <div className="flex justify-end border-b border-hairline px-5 py-3">
        <Button size="sm" variant="subtle" onClick={() => setDialogOpen(true)}>
          <Plus aria-hidden="true" />
          Novo bloqueio
        </Button>
      </div>

      <ul className="divide-y divide-hairline">
        {blocks.map((block) => (
          <li key={block.id} className="flex items-start gap-3 px-5 py-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Tag className="border-ash-700 text-ash-300">
                  {REASON_LABELS[block.reason]}
                </Tag>
                <span className="text-sm text-bone-100">
                  {block.artistName ?? "Estúdio inteiro"}
                </span>
              </div>

              <p className="mt-1.5 text-xs tabular-nums text-ash-500">
                {block.startsAtLabel} → {block.endsAtLabel}
              </p>

              {block.note ? (
                <p className="mt-1 text-xs text-ash-600">{block.note}</p>
              ) : null}
            </div>

            <button
              type="button"
              disabled={pendingId === block.id}
              onClick={() => handleDelete(block.id)}
              className="grid size-9 shrink-0 place-items-center border border-hairline text-ash-500 transition-colors hover:border-blood-700 hover:text-blood-400 disabled:opacity-40"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              <span className="sr-only">
                Remover bloqueio de {block.artistName ?? "estúdio"}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <BlockDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        artists={artists}
        defaultDateISO={todayISO()}
        defaultTime="09:00"
      />
    </>
  );
}
