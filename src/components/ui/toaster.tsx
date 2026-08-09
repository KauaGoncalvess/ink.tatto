"use client";

import { Toaster as Sonner } from "sonner";

/**
 * Feedback transitório (sucesso/erro de ações do admin e do agendamento).
 * Estilizado com os tokens do projeto — o tema padrão do sonner é claro e
 * arredondado, o oposto da linguagem do site.
 */
export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      offset={20}
      toastOptions={{
        classNames: {
          toast:
            "!bg-ink-800 !border !border-hairline-strong !rounded-none !text-bone-100 !font-sans !shadow-none",
          title: "!text-sm !font-semibold",
          description: "!text-ash-400 !text-xs",
          actionButton: "!bg-blood-500 !text-bone-100 !rounded-none",
          cancelButton: "!bg-ink-700 !text-ash-300 !rounded-none",
          error: "!border-l-2 !border-l-blood-500",
          success: "!border-l-2 !border-l-status-confirmed",
        },
      }}
    />
  );
}
