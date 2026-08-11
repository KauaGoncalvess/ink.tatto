import { z } from "zod";

/**
 * Troca de senha do próprio usuário.
 *
 * O mínimo de 12 caracteres vale para senha de painel administrativo e é o
 * mesmo exigido por `npm run admin:create` — não adiantaria o script ser
 * rigoroso se a tela aceitasse quatro letras logo depois.
 *
 * Deliberadamente não há regra de "uma maiúscula, um número, um símbolo":
 * comprimento é o que resiste a força bruta, e composição obrigatória empurra
 * as pessoas para variações previsíveis do mesmo padrão.
 */

export const MIN_PASSWORD_LENGTH = 12;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe sua senha atual."),
    newPassword: z
      .string()
      .min(
        MIN_PASSWORD_LENGTH,
        `A nova senha precisa de pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      )
      .max(200, "Senha longa demais."),
    confirmPassword: z.string().min(1, "Repita a nova senha."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não conferem.",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "A nova senha precisa ser diferente da atual.",
    path: ["newPassword"],
  });

export type ChangePasswordInput = z.input<typeof changePasswordSchema>;
