import "server-only";

import type { AuditAction } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth/session";

/**
 * Registro de auditoria.
 *
 * Guarda o essencial — quem, o quê, sobre qual entidade e um resumo legível —
 * em vez de um diff completo. O objetivo é responder "quem cancelou esse
 * agendamento?" numa equipe com vários artistas, não versionar o banco.
 *
 * Nunca lança: uma falha ao registrar a auditoria não pode derrubar a operação
 * que a originou.
 */
export async function recordAudit({
  actor,
  action,
  entity,
  entityId,
  summary,
}: {
  actor: SessionPayload;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  summary: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId: entityId ?? null,
        summary,
        userId: actor.userId,
        // Copiado no momento da ação para o histórico sobreviver à exclusão
        // do usuário.
        userName: actor.name,
      },
    });
  } catch (error) {
    console.error("[audit] não foi possível registrar", error);
  }
}

export type AuditFilters = {
  entity?: string;
  entityId?: string;
  userId?: string;
  limit?: number;
};

export async function listAudit({
  entity,
  entityId,
  userId,
  limit = 100,
}: AuditFilters = {}) {
  return prisma.auditLog.findMany({
    where: {
      ...(entity ? { entity } : {}),
      ...(entityId ? { entityId } : {}),
      ...(userId ? { userId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 500),
  });
}
