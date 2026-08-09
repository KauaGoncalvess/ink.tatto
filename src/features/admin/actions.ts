"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import type { z } from "zod";

import { prisma } from "@/lib/prisma";
import { AuthorizationError, requireAdmin, requireUser } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit";
import type { SessionPayload } from "@/lib/auth/session";
import { slugify } from "@/lib/utils";
import {
  artistSchema,
  clientSchema,
  galleryItemSchema,
  serviceSchema,
  studioSettingsSchema,
  testimonialSchema,
} from "@/schemas/admin";

/**
 * CRUDs do painel.
 *
 * Padrão comum a todas as ações:
 *   1. autoriza (requireUser / requireAdmin, dependendo do impacto);
 *   2. valida com Zod — o formulário do cliente é conveniência, não garantia;
 *   3. escreve;
 *   4. revalida as rotas afetadas, inclusive as páginas públicas.
 */

export type CrudResult =
  | { ok: true; id?: string; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

type Guard = "user" | "admin";

async function guarded(
  guard: Guard,
  run: (actor: SessionPayload) => Promise<CrudResult>,
): Promise<CrudResult> {
  try {
    const actor = guard === "admin" ? await requireAdmin() : await requireUser();
    return await run(actor);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { ok: false, error: error.message };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const target = (error.meta?.target as string[] | undefined)?.join(", ");
        return {
          ok: false,
          error: `Já existe um registro com este valor${target ? ` (${target})` : ""}.`,
        };
      }
      if (error.code === "P2025") {
        return { ok: false, error: "Registro não encontrado." };
      }
      if (error.code === "P2003") {
        return {
          ok: false,
          error:
            "Não é possível excluir: existem registros vinculados. Desative em vez de excluir.",
        };
      }
    }
    console.error("[admin] ação falhou", error);
    return { ok: false, error: "Não foi possível concluir a operação." };
  }
}

/** Converte os erros do Zod no formato que os formulários consomem. */
function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    result[issue.path.join(".")] ??= issue.message;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

export async function saveClient(input: unknown): Promise<CrudResult> {
  return guarded("user", async (actor) => {
    const parsed = clientSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Confira os dados do formulário.",
        fieldErrors: fieldErrorsFrom(parsed.error),
      };
    }

    const { id, ...data } = parsed.data;

    const client = id
      ? await prisma.client.update({ where: { id }, data })
      : await prisma.client.create({ data });

    revalidatePath("/admin/clientes");
    if (id) revalidatePath(`/admin/clientes/${id}`);

    await recordAudit({
      actor,
      action: id ? "UPDATE" : "CREATE",
      entity: "Client",
      entityId: client.id,
      summary: `${id ? "Editou" : "Cadastrou"} o cliente ${client.name}.`,
    });

    return { ok: true, id: client.id, message: "Cliente salvo." };
  });
}

export async function deleteClient(id: string): Promise<CrudResult> {
  return guarded("admin", async (actor) => {
    const appointments = await prisma.appointment.count({ where: { clientId: id } });
    if (appointments > 0) {
      return {
        ok: false,
        error: `Este cliente tem ${appointments} agendamento(s) no histórico. Exclua-os antes ou apenas bloqueie o cliente.`,
      };
    }

    const removed = await prisma.client.delete({ where: { id } });

    await recordAudit({
      actor,
      action: "DELETE",
      entity: "Client",
      entityId: id,
      summary: `Excluiu o cliente ${removed.name}.`,
    });

    revalidatePath("/admin/clientes");
    return { ok: true, message: "Cliente excluído." };
  });
}

// ---------------------------------------------------------------------------
// Artistas
// ---------------------------------------------------------------------------

export async function saveArtist(input: unknown): Promise<CrudResult> {
  return guarded("admin", async (actor) => {
    const parsed = artistSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Confira os dados do formulário.",
        fieldErrors: fieldErrorsFrom(parsed.error),
      };
    }

    const { id, serviceIds, schedule, ...data } = parsed.data;

    // Slug estável: gerado uma vez na criação e nunca mais alterado, para não
    // quebrar as URLs públicas já indexadas dos artistas.
    const artistId = await prisma.$transaction(async (tx) => {
      let currentId = id;

      if (currentId) {
        await tx.artist.update({ where: { id: currentId }, data });
      } else {
        const base = slugify(data.name) || "artista";
        let slug = base;
        let suffix = 2;
        while (await tx.artist.findUnique({ where: { slug }, select: { id: true } })) {
          slug = `${base}-${suffix}`;
          suffix += 1;
        }
        const created = await tx.artist.create({ data: { ...data, slug } });
        currentId = created.id;
      }

      // Vínculos de serviço: substitui o conjunto inteiro.
      await tx.artistService.deleteMany({ where: { artistId: currentId } });
      if (serviceIds.length > 0) {
        await tx.artistService.createMany({
          data: serviceIds.map((serviceId) => ({ artistId: currentId!, serviceId })),
          skipDuplicates: true,
        });
      }

      // Grade semanal: só os dias ativos viram linha. Um dia sem linha é um
      // dia sem atendimento — é assim que o motor de disponibilidade lê.
      await tx.availability.deleteMany({ where: { artistId: currentId } });
      const activeDays = schedule.filter((day) => day.isActive);
      if (activeDays.length > 0) {
        await tx.availability.createMany({
          data: activeDays.map((day) => ({
            artistId: currentId!,
            dayOfWeek: day.dayOfWeek,
            startTime: day.startTime,
            endTime: day.endTime,
            breakStart: day.breakStart ?? null,
            breakEnd: day.breakEnd ?? null,
          })),
        });
      }

      return currentId!;
    });

    revalidatePath("/admin/artistas");
    revalidatePath("/artistas");
    revalidatePath("/agendamento");
    revalidatePath("/");

    await recordAudit({
      actor,
      action: id ? "UPDATE" : "CREATE",
      entity: "Artist",
      entityId: artistId,
      summary: `${id ? "Editou" : "Cadastrou"} o artista ${data.name}.`,
    });

    return { ok: true, id: artistId, message: "Artista salvo." };
  });
}

export async function deleteArtist(id: string): Promise<CrudResult> {
  return guarded("admin", async (actor) => {
    const appointments = await prisma.appointment.count({ where: { artistId: id } });
    if (appointments > 0) {
      return {
        ok: false,
        error: `Este artista tem ${appointments} agendamento(s). Desative o perfil em vez de excluir, para preservar o histórico.`,
      };
    }

    const removed = await prisma.artist.delete({ where: { id } });

    await recordAudit({
      actor,
      action: "DELETE",
      entity: "Artist",
      entityId: id,
      summary: `Excluiu o artista ${removed.name}.`,
    });

    revalidatePath("/admin/artistas");
    revalidatePath("/artistas");
    return { ok: true, message: "Artista excluído." };
  });
}

// ---------------------------------------------------------------------------
// Serviços
// ---------------------------------------------------------------------------

export async function saveService(input: unknown): Promise<CrudResult> {
  return guarded("admin", async (actor) => {
    const parsed = serviceSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Confira os dados do formulário.",
        fieldErrors: fieldErrorsFrom(parsed.error),
      };
    }

    const { id, ...data } = parsed.data;

    let service;
    if (id) {
      service = await prisma.service.update({ where: { id }, data });
    } else {
      const base = slugify(data.name) || "servico";
      let slug = base;
      let suffix = 2;
      while (await prisma.service.findUnique({ where: { slug }, select: { id: true } })) {
        slug = `${base}-${suffix}`;
        suffix += 1;
      }
      service = await prisma.service.create({ data: { ...data, slug } });
    }

    revalidatePath("/admin/servicos");
    revalidatePath("/servicos");
    revalidatePath("/agendamento");
    revalidatePath("/");

    await recordAudit({
      actor,
      action: id ? "UPDATE" : "CREATE",
      entity: "Service",
      entityId: service.id,
      summary: `${id ? "Editou" : "Cadastrou"} o serviço ${service.name}.`,
    });

    return { ok: true, id: service.id, message: "Serviço salvo." };
  });
}

export async function deleteService(id: string): Promise<CrudResult> {
  return guarded("admin", async (actor) => {
    const appointments = await prisma.appointment.count({ where: { serviceId: id } });
    if (appointments > 0) {
      return {
        ok: false,
        error: `Este serviço tem ${appointments} agendamento(s). Desative-o em vez de excluir.`,
      };
    }

    const removed = await prisma.service.delete({ where: { id } });

    await recordAudit({
      actor,
      action: "DELETE",
      entity: "Service",
      entityId: id,
      summary: `Excluiu o serviço ${removed.name}.`,
    });

    revalidatePath("/admin/servicos");
    revalidatePath("/servicos");
    return { ok: true, message: "Serviço excluído." };
  });
}

// ---------------------------------------------------------------------------
// Galeria
// ---------------------------------------------------------------------------

export async function saveGalleryItem(input: unknown): Promise<CrudResult> {
  return guarded("user", async () => {
    const parsed = galleryItemSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Confira os dados do formulário.",
        fieldErrors: fieldErrorsFrom(parsed.error),
      };
    }

    const { id, artistId, ...data } = parsed.data;
    const payload = { ...data, artistId: artistId ?? null };

    const item = id
      ? await prisma.galleryItem.update({ where: { id }, data: payload })
      : await prisma.galleryItem.create({ data: payload });

    revalidatePath("/admin/galeria");
    revalidatePath("/galeria");
    revalidatePath("/");

    return { ok: true, id: item.id, message: "Trabalho salvo." };
  });
}

export async function deleteGalleryItem(id: string): Promise<CrudResult> {
  return guarded("user", async () => {
    await prisma.galleryItem.delete({ where: { id } });
    revalidatePath("/admin/galeria");
    revalidatePath("/galeria");
    return { ok: true, message: "Trabalho excluído." };
  });
}

// ---------------------------------------------------------------------------
// Depoimentos
// ---------------------------------------------------------------------------

export async function saveTestimonial(input: unknown): Promise<CrudResult> {
  return guarded("user", async () => {
    const parsed = testimonialSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Confira os dados do formulário.",
        fieldErrors: fieldErrorsFrom(parsed.error),
      };
    }

    const { id, artistId, ...data } = parsed.data;
    const payload = { ...data, artistId: artistId ?? null };

    const item = id
      ? await prisma.testimonial.update({ where: { id }, data: payload })
      : await prisma.testimonial.create({ data: payload });

    revalidatePath("/admin/depoimentos");
    revalidatePath("/");

    return { ok: true, id: item.id, message: "Depoimento salvo." };
  });
}

export async function deleteTestimonial(id: string): Promise<CrudResult> {
  return guarded("user", async () => {
    await prisma.testimonial.delete({ where: { id } });
    revalidatePath("/admin/depoimentos");
    revalidatePath("/");
    return { ok: true, message: "Depoimento excluído." };
  });
}

// ---------------------------------------------------------------------------
// Configurações do estúdio
// ---------------------------------------------------------------------------

export async function saveStudioSettings(input: unknown): Promise<CrudResult> {
  return guarded("admin", async (actor) => {
    const parsed = studioSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Confira os dados do formulário.",
        fieldErrors: fieldErrorsFrom(parsed.error),
      };
    }

    const { openingHours, ...data } = parsed.data;

    await prisma.$transaction(async (tx) => {
      await tx.studioSettings.upsert({
        where: { id: "studio" },
        create: { id: "studio", ...data },
        update: data,
      });

      for (const day of openingHours) {
        await tx.openingHour.upsert({
          where: { dayOfWeek: day.dayOfWeek },
          create: { ...day, settingsId: "studio" },
          update: {
            isOpen: day.isOpen,
            opensAt: day.opensAt,
            closesAt: day.closesAt,
          },
        });
      }
    });

    await recordAudit({
      actor,
      action: "UPDATE",
      entity: "StudioSettings",
      entityId: "studio",
      summary: "Alterou as configurações do estúdio.",
    });

    // O funcionamento afeta a disponibilidade em todo o site.
    revalidatePath("/", "layout");

    return { ok: true, message: "Configurações salvas." };
  });
}
