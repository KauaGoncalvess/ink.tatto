import "server-only";

import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Armazenamento de arquivos enviados.
 *
 * Duas implementações, escolhidas por variável de ambiente:
 *
 *   local (padrão)  grava em /public/uploads. Simples, zero configuração,
 *                   perfeito em VPS/container com volume persistente.
 *   s3              qualquer bucket compatível com S3 (AWS, Cloudflare R2,
 *                   Backblaze B2, MinIO). Necessário em plataformas
 *                   serverless, onde o disco é efêmero e as imagens somem
 *                   no próximo deploy.
 *
 * Defina STORAGE_DRIVER=s3 e as credenciais do bucket para trocar. Nenhum
 * outro arquivo do projeto muda.
 */

export type StoredFile = {
  /** URL pública da imagem (caminho relativo no driver local). */
  path: string;
};

/** Pastas permitidas. Restringe onde um upload pode aterrissar. */
export const UPLOAD_FOLDERS = [
  "uploads",
  "gallery",
  "artists",
  "services",
  "testimonials",
  "studio",
] as const;

export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

export type StorageAdapter = {
  save(buffer: Buffer, folder: UploadFolder): Promise<StoredFile>;
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
 * real evita servir conteúdo executável a partir do diretório público.
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

/** Nome gerado no servidor: o nome original do cliente nunca toca o disco,
 *  o que elimina path traversal e colisão de uma vez. */
function generateName(mime: string): string {
  return `${Date.now().toString(36)}-${randomBytes(8).toString("hex")}.${EXTENSIONS[mime]}`;
}

// ---------------------------------------------------------------------------
// Driver local
// ---------------------------------------------------------------------------

/**
 * Plataformas com disco efêmero e somente leitura no runtime.
 *
 * Gravar em `public/` ali falha com `EROFS: read-only file system` — um erro
 * que não diz a ninguém qual variável está errada. Pior: em algumas
 * configurações a escrita passa, o arquivo existe pelo resto da requisição e
 * some no próximo deploy, o que dá um bug que só aparece dias depois.
 */
function ephemeralFilesystem(): string | null {
  if (process.env.VERCEL) return "Vercel";
  if (process.env.K_SERVICE) return "Cloud Run";
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) return "AWS Lambda";
  return null;
}

const localAdapter: StorageAdapter = {
  async save(buffer, folder) {
    const platform = ephemeralFilesystem();
    if (platform) {
      throw new Error(
        `Upload em disco local não funciona na ${platform}: o sistema de ` +
          `arquivos é efêmero e as imagens somem no próximo deploy. ` +
          `Defina STORAGE_DRIVER="s3" e as variáveis S3_* (veja .env.example).`,
      );
    }

    const detected = sniffImageType(buffer);
    if (!detected) throw new Error("Formato de imagem não reconhecido.");

    // `uploads` fica na raiz de /public; as demais pastas convivem com as
    // imagens versionadas do site, em /public/images.
    const segments =
      folder === "uploads" ? ["uploads"] : ["images", folder];

    const directory = join(process.cwd(), "public", ...segments);
    await mkdir(directory, { recursive: true });

    const name = generateName(detected);
    await writeFile(join(directory, name), buffer);

    return { path: `/${segments.join("/")}/${name}` };
  },
};

// ---------------------------------------------------------------------------
// Driver S3 (compatível com AWS S3, Cloudflare R2, Backblaze B2, MinIO)
// ---------------------------------------------------------------------------

/**
 * Implementado com `fetch` e assinatura AWS SigV4 calculada à mão, em vez de
 * trazer o `@aws-sdk/client-s3` (~2 MB) para o bundle do servidor por causa de
 * uma única operação PUT.
 */
async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(data: Uint8Array | string): Promise<string> {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  return toHex(await crypto.subtle.digest("SHA-256", bytes as BufferSource));
}

const s3Adapter: StorageAdapter = {
  async save(buffer, folder) {
    const detected = sniffImageType(buffer);
    if (!detected) throw new Error("Formato de imagem não reconhecido.");

    const bucket = requireEnv("S3_BUCKET");
    const region = process.env.S3_REGION ?? "auto";
    const accessKey = requireEnv("S3_ACCESS_KEY_ID");
    const secretKey = requireEnv("S3_SECRET_ACCESS_KEY");
    // Endpoint próprio para R2/B2/MinIO; vazio usa o da AWS.
    const endpoint =
      process.env.S3_ENDPOINT ?? `https://s3.${region}.amazonaws.com`;
    // URL pública de leitura (CDN ou domínio do bucket).
    const publicBase = requireEnv("S3_PUBLIC_URL").replace(/\/$/, "");

    const key = `${folder}/${generateName(detected)}`;
    const url = new URL(`${endpoint.replace(/\/$/, "")}/${bucket}/${key}`);

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = await sha256Hex(new Uint8Array(buffer));

    const headers: Record<string, string> = {
      host: url.host,
      "content-type": detected,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    };

    const signedHeaders = Object.keys(headers).sort().join(";");
    const canonicalHeaders = Object.keys(headers)
      .sort()
      .map((name) => `${name}:${headers[name]}\n`)
      .join("");

    const canonicalRequest = [
      "PUT",
      url.pathname,
      "",
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const scope = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      scope,
      await sha256Hex(canonicalRequest),
    ].join("\n");

    let signingKey = await hmac(
      new TextEncoder().encode(`AWS4${secretKey}`),
      dateStamp,
    );
    for (const part of [region, "s3", "aws4_request"]) {
      signingKey = await hmac(signingKey, part);
    }
    const signature = toHex(await hmac(signingKey, stringToSign));

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        ...headers,
        Authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      },
      body: new Uint8Array(buffer),
    });

    if (!response.ok) {
      throw new Error(
        `Falha ao enviar para o bucket (HTTP ${response.status}). Confira as credenciais e a política do bucket.`,
      );
    }

    return { path: `${publicBase}/${key}` };
  },
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} não definida. Necessária quando STORAGE_DRIVER=s3 (ver .env.example).`,
    );
  }
  return value;
}

// ---------------------------------------------------------------------------

export const storageDriver = process.env.STORAGE_DRIVER === "s3" ? "s3" : "local";

export const storage: StorageAdapter =
  storageDriver === "s3" ? s3Adapter : localAdapter;

/** Um caminho é uma imagem enviada (e não uma URL externa arbitrária)? */
export function isManagedImagePath(value: string): boolean {
  if (value.startsWith("/uploads/") || value.startsWith("/images/")) return true;

  const publicBase = process.env.S3_PUBLIC_URL;
  return Boolean(publicBase && value.startsWith(publicBase.replace(/\/$/, "")));
}
