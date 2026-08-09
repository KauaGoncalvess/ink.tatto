"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AppointmentStatus } from "@prisma/client";
import {
  Ban,
  Check,
  CheckCheck,
  Eye,
  MessageCircle,
  MoreHorizontal,
  Trash2,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Label, Textarea } from "@/components/ui/field";
import {
  deleteAppointment,
  updateAppointmentStatus,
} from "@/features/appointments/actions";
import { whatsappLink } from "@/config/site";

/**
 * Ações por agendamento.
 *
 * Confirmar/concluir são de um clique; cancelar e excluir passam por um
 * diálogo de confirmação, porque cancelar dispara notificação ao cliente e
 * excluir é irreversível.
 */
export function AppointmentActions({
  id,
  status,
  clientName,
  clientPhone,
}: {
  id: string;
  status: AppointmentStatus;
  clientName: string;
  clientPhone: string;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");

  async function run(action: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    setPending(true);
    try {
      const result = await action();
      if (result.ok) {
        toast.success(result.message ?? "Operação concluída.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Não foi possível concluir.");
      }
    } catch {
      toast.error("Falha de conexão. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={pending}
            className="grid size-9 place-items-center border border-hairline text-ash-400 transition-colors hover:border-hairline-strong hover:bg-ink-800 hover:text-bone-100 disabled:opacity-50"
          >
            <MoreHorizontal className="size-4" aria-hidden="true" />
            <span className="sr-only">Ações para o agendamento de {clientName}</span>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/admin/agendamentos/${id}`}>
              <Eye className="size-4" aria-hidden="true" />
              Ver detalhes
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <a
              href={whatsappLink(
                `Olá, ${clientName.split(" ")[0]}! Aqui é do Ink House, sobre o seu agendamento.`,
                clientPhone,
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              Responder no WhatsApp
            </a>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {status !== "CONFIRMED" && status !== "COMPLETED" ? (
            <DropdownMenuItem
              onSelect={() => run(() => updateAppointmentStatus(id, "CONFIRMED"))}
            >
              <Check className="size-4 text-status-confirmed" aria-hidden="true" />
              Confirmar
            </DropdownMenuItem>
          ) : null}

          {status !== "COMPLETED" ? (
            <DropdownMenuItem
              onSelect={() => run(() => updateAppointmentStatus(id, "COMPLETED"))}
            >
              <CheckCheck className="size-4 text-status-completed" aria-hidden="true" />
              Marcar como concluído
            </DropdownMenuItem>
          ) : null}

          {status !== "NO_SHOW" ? (
            <DropdownMenuItem
              onSelect={() => run(() => updateAppointmentStatus(id, "NO_SHOW"))}
            >
              <UserX className="size-4 text-status-noshow" aria-hidden="true" />
              Não compareceu
            </DropdownMenuItem>
          ) : null}

          {status !== "CANCELLED" ? (
            <DropdownMenuItem onSelect={() => setCancelOpen(true)}>
              <Ban className="size-4 text-status-cancelled" aria-hidden="true" />
              Cancelar
            </DropdownMenuItem>
          ) : null}

          <DropdownMenuSeparator />

          <DropdownMenuItem variant="danger" onSelect={() => setDeleteOpen(true)}>
            <Trash2 className="size-4" aria-hidden="true" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Cancelamento */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar agendamento</DialogTitle>
            <DialogDescription>
              O horário volta a ficar disponível na agenda de {clientName}. Registre
              o motivo para o histórico do estúdio.
            </DialogDescription>
          </DialogHeader>

          <Field>
            <Label htmlFor={`cancel-reason-${id}`}>Motivo (opcional)</Label>
            <Textarea
              id={`cancel-reason-${id}`}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Cliente pediu para remarcar, imprevisto do artista…"
              maxLength={300}
            />
          </Field>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelOpen(false)} disabled={pending}>
              Voltar
            </Button>
            <Button
              variant="danger"
              isLoading={pending}
              onClick={async () => {
                await run(() => updateAppointmentStatus(id, "CANCELLED", reason));
                setCancelOpen(false);
                setReason("");
              }}
            >
              Confirmar cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exclusão */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir agendamento</DialogTitle>
            <DialogDescription>
              Esta ação é permanente e remove o registro do histórico. Para apenas
              liberar o horário, prefira cancelar.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)} disabled={pending}>
              Voltar
            </Button>
            <Button
              variant="danger"
              isLoading={pending}
              onClick={async () => {
                await run(() => deleteAppointment(id));
                setDeleteOpen(false);
              }}
            >
              Excluir definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
