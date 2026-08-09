"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { markNotificationsRead } from "@/features/appointments/actions";

/** Marca todas as notificações como lidas e zera o badge do menu. */
export function MarkAllReadButton({ count }: { count: number }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  return (
    <Button
      size="sm"
      variant="outline"
      isLoading={pending}
      onClick={async () => {
        setPending(true);
        try {
          const result = await markNotificationsRead();
          if (result.ok) {
            toast.success("Notificações marcadas como lidas.");
            router.refresh();
          } else {
            toast.error(result.error);
          }
        } catch {
          toast.error("Falha de conexão. Tente novamente.");
        } finally {
          setPending(false);
        }
      }}
    >
      Marcar {count} como {count === 1 ? "lida" : "lidas"}
      <CheckCheck aria-hidden="true" />
    </Button>
  );
}
