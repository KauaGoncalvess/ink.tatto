"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { saveOpeningHours } from "@/features/admin/hours-actions";
import { WEEKDAY_LABELS } from "@/lib/datetime";
import { cn } from "@/lib/utils";

export type OpeningHourRow = {
  dayOfWeek: number;
  isOpen: boolean;
  opensAt: string;
  closesAt: string;
};

/**
 * Funcionamento semanal do estúdio.
 *
 * Editado isoladamente das demais configurações porque é o que muda com mais
 * frequência (feriado, horário de verão de fim de ano) e não deveria exigir
 * reenviar o formulário inteiro de dados do estúdio.
 */
export function OpeningHoursForm({ initial }: { initial: OpeningHourRow[] }) {
  const router = useRouter();
  const [rows, setRows] = React.useState(initial);
  const [pending, setPending] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const dirty = React.useMemo(
    () => JSON.stringify(rows) !== JSON.stringify(initial),
    [rows, initial],
  );

  function patchDay(dayOfWeek: number, values: Partial<OpeningHourRow>) {
    setRows((current) =>
      current.map((row) => (row.dayOfWeek === dayOfWeek ? { ...row, ...values } : row)),
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setErrors({});

    try {
      const result = await saveOpeningHours(rows);
      if (result.ok) {
        toast.success(result.message ?? "Horários salvos.");
        router.refresh();
      } else {
        toast.error(result.error);
        if (result.fieldErrors) setErrors(result.fieldErrors);
      }
    } catch {
      toast.error("Falha de conexão. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <ul className="space-y-2">
        {rows.map((row, index) => (
          <li
            key={row.dayOfWeek}
            className={cn(
              "border px-3 py-3 transition-colors",
              row.isOpen ? "border-hairline-strong" : "border-hairline opacity-60",
            )}
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <label className="flex w-32 shrink-0 cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={row.isOpen}
                  disabled={pending}
                  onChange={(event) =>
                    patchDay(row.dayOfWeek, { isOpen: event.target.checked })
                  }
                  className="size-4 accent-[#c8102e]"
                />
                <span className={row.isOpen ? "text-bone-100" : "text-ash-500"}>
                  {WEEKDAY_LABELS[row.dayOfWeek]}
                </span>
              </label>

              <div className="flex items-center gap-2 text-xs">
                <input
                  type="time"
                  aria-label={`Abertura de ${WEEKDAY_LABELS[row.dayOfWeek]}`}
                  value={row.opensAt}
                  disabled={pending || !row.isOpen}
                  onChange={(event) =>
                    patchDay(row.dayOfWeek, { opensAt: event.target.value })
                  }
                  className="h-9 w-28 border border-hairline bg-ink-850 px-2 text-xs text-bone-100 focus:border-blood-500 focus:outline-none disabled:opacity-40"
                />
                <span className="text-ash-600">até</span>
                <input
                  type="time"
                  aria-label={`Fechamento de ${WEEKDAY_LABELS[row.dayOfWeek]}`}
                  value={row.closesAt}
                  disabled={pending || !row.isOpen}
                  onChange={(event) =>
                    patchDay(row.dayOfWeek, { closesAt: event.target.value })
                  }
                  className="h-9 w-28 border border-hairline bg-ink-850 px-2 text-xs text-bone-100 focus:border-blood-500 focus:outline-none disabled:opacity-40"
                />
              </div>
            </div>

            <FieldError>
              {errors[`${index}.closesAt`] ?? errors[`${index}.opensAt`]}
            </FieldError>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex justify-end">
        <Button type="submit" size="sm" isLoading={pending} disabled={!dirty}>
          Salvar horários
          <Save aria-hidden="true" />
        </Button>
      </div>
    </form>
  );
}
