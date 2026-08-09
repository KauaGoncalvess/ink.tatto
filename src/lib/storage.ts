import "server-only";

import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Armazenamento de arquivos enviados pelos clientes.
 *
 * Implementação local (grava em /public/uploads), atrás de uma interface
 * pequena para trocar por S3/R2/UploadThing sem tocar em quem chama.
 *
 * ATENÇÃO PARA DEPLOY: em plataformas serverless (Vercel, Lambda) o sistema de
 * arquivos é efêmero e as imagens somem no próximo deploy ou cold start. Para
 * produção, implemente `StorageAdapter` com um bucket e troque a constante
 * `storage` abaixo — nenhuma outra linha do projeto muda.
 */

export type StoredFile = {
  /** Caminho público, servido pelo Next. */
  path: string;
};

export type StorageAdapter = {
  save(file: File, buffer: Buffer): Promise<StoredFile>;
};

/** Tipos aceitos, verificados também pela assinatura binária. */
export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Confere os magic bytes do arquivo.
 *
 * O `Content-Type` do multipart é escolhido pelo cliente e pode mentir — um
 * .html renomeado para .jpg passaria na checagem de mime. Ler a assinatura
 * real evita servir conteúdo executável a partir de /uploads.
 */
export function sniffImageType(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  // WEBP: "RIFF" .... "WEBP"
  if (
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

const localAdapter: StorageAdapter = {
  async save(_file, buffer) {
    const detected = sniffImageType(buffer);
    if (!detected) throw new Error("Formato de imagem não reconhecido.");

    const directory = join(process.cwd(), "public", "uploads");
    await mkdir(directory, { recursive: true });

    // Nome gerado no servidor: o nome original do cliente nunca toca o disco,
    // o que elimina path traversal e colisão de nomes de uma vez.
    const name = `${Date.now().toString(36)}-${randomBytes(8).toString("hex")}.${EXTENSIONS[detected]}`;

    await writeFile(join(directory, name), buffer);
    return { path: `/uploads/${name}` };
  },
};

export const storage: StorageAdapter = localAdapter;
