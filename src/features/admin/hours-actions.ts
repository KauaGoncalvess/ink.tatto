"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { AuthorizationError, requireAdmin } from "@/lib/auth/guards";
import { openingHourSchema } from "@/schemas/admin";
import type { CrudResult } from "@/features/admin/actions";

/**
 * Funcionamento do estúdio e remoção de bloqueios.
 *
 * Separado de `admin/actions.ts` para manter aquele arquivo focado nos CRUDs
 * de conteúdo — aqui mexemos em regras de agenda, que afetam a
 * disponibilidade do site inteiro.
 */

const openingHoursSchema = z.array(openingHourSchema).length(7);

export async function saveOpeningHours(input: unknown): Promise<CrudResult> {
  try {
    await requireAdmin();

    const parsed = openingHoursSchema.safeParse(input);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path.join(".")] ??= issue.message;
      }
      return {
        ok: false,
        error: "Confira os horários informados.",
        fieldErrors,
      };
    }

    // Garante a linha de configuração antes de referenciá-la nos horários.
    await prisma.studioSettings.upsert({
      where: { id: "studio" },
      create: {
        id: "studio",
        name: "Ink House",
        tagline: "Tattoo Studio",
        description: "Estúdio de tatuagem autoral.",
        phone: "",
        whatsapp: "",
        email: "",
        address: "",
        city: "",
        state: "",
        zip: "",
      },
      update: {},
    });

    await prisma.$transaction(
      parsed.data.map((day) =>
        prisma.openingHour.upsert({
          where: { dayOfWeek: day.dayOfWeek },
          create: { ...day, settingsId: "studio" },
          update: {
            isOpen: day.isOpen,
            opensAt: day.opensAt,
            closesAt: day.closesAt,
          },
        }),
      ),
    );

    // O funcionamento entra no cálculo de disponibilidade do site todo.
    revalidatePath("/", "layout");

    return { ok: true, message: "Horários de funcionamento salvos." };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { ok: false, error: error.message };
    }
    console.error("[hours] falha ao salvar funcionamento", error);
    return { ok: false, error: "Não foi possível salvar os horários." };
  }
}
