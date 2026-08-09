import { describe, expect, it } from "vitest";

import {
  clientSchema,
  galleryItemSchema,
  serviceSchema,
  studioSettingsSchema,
  testimonialSchema,
  artistSchema,
} from "@/schemas/admin";
import { clientDetailsSchema, createAppointmentSchema } from "@/schemas/booking";
import {
  adminCreateAppointmentSchema,
  parsePriceToCents,
} from "@/schemas/appointment-admin";

/**
 * Os schemas são a fronteira de confiança do servidor: toda Server Action
 * valida por aqui antes de escrever. Um buraco aqui é um buraco na aplicação
 * inteira, por isso os casos maliciosos são testados junto com os felizes.
 */

const weekSchedule = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  isActive: dayOfWeek >= 1 && dayOfWeek <= 5,
  startTime: "09:00",
  endTime: "18:00",
  breakStart: "",
  breakEnd: "",
}));

describe("clientDetailsSchema (agendamento público)", () => {
  const valid = {
    name: "Marina Vásquez",
    phone: "(11) 98765-4321",
    email: "marina@exemplo.com.br",
  };

  it("normaliza o telefone para apenas dígitos", () => {
    const parsed = clientDetailsSchema.parse(valid);
    expect(parsed.phone).toBe("11987654321");
  });

  it("remove o DDI 55 para deduplicar o cadastro", () => {
    const parsed = clientDetailsSchema.parse({ ...valid, phone: "5511987654321" });
    expect(parsed.phone).toBe("11987654321");
  });

  it("aceita telefone fixo de 10 dígitos", () => {
    expect(clientDetailsSchema.parse({ ...valid, phone: "1133334444" }).phone).toBe(
      "1133334444",
    );
  });

  it("rejeita telefone com dígitos de menos", () => {
    expect(clientDetailsSchema.safeParse({ ...valid, phone: "1198765" }).success).toBe(
      false,
    );
  });

  it("rejeita nome com link — o campo não pode virar vetor de spam", () => {
    const result = clientDetailsSchema.safeParse({
      ...valid,
      name: "Compre aqui https://spam.example",
    });
    expect(result.success).toBe(false);
  });

  it("trata e-mail vazio como ausente, não como inválido", () => {
    expect(clientDetailsSchema.parse({ ...valid, email: "" }).email).toBeUndefined();
  });

  it("só aceita imagem de referência gerada pelo próprio upload", () => {
    expect(
      clientDetailsSchema.safeParse({
        ...valid,
        referenceImage: "/uploads/abc123.jpg",
      }).success,
    ).toBe(true);

    // URL externa arbitrária não pode ser gravada no banco.
    expect(
      clientDetailsSchema.safeParse({
        ...valid,
        referenceImage: "https://malicioso.example/x.jpg",
      }).success,
    ).toBe(false);

    // Path traversal.
    expect(
      clientDetailsSchema.safeParse({
        ...valid,
        referenceImage: "/uploads/../../etc/passwd",
      }).success,
    ).toBe(false);
  });
});

describe("createAppointmentSchema", () => {
  const base = {
    serviceId: "svc_1",
    artistId: "art_1",
    dateISO: "2026-08-14",
    time: "14:30",
    name: "Cliente Teste",
    phone: "11987654321",
  };

  it("aceita uma reserva válida", () => {
    expect(createAppointmentSchema.safeParse(base).success).toBe(true);
  });

  it("rejeita data que não existe no calendário", () => {
    expect(
      createAppointmentSchema.safeParse({ ...base, dateISO: "2026-02-30" }).success,
    ).toBe(false);
  });

  it("rejeita horário fora de 24h", () => {
    expect(createAppointmentSchema.safeParse({ ...base, time: "25:00" }).success).toBe(
      false,
    );
  });

  it("rejeita formato de data não ISO", () => {
    expect(
      createAppointmentSchema.safeParse({ ...base, dateISO: "14/08/2026" }).success,
    ).toBe(false);
  });
});

describe("clientSchema (painel)", () => {
  it("normaliza telefone e mantém observações", () => {
    const parsed = clientSchema.parse({
      name: "Rafael Soares",
      phone: "(11) 99100-0101",
      notes: "Alergia a esparadrapo",
      isBlocked: false,
    });
    expect(parsed.phone).toBe("11991000101");
    expect(parsed.notes).toBe("Alergia a esparadrapo");
  });

  it("exige nome com pelo menos três caracteres", () => {
    expect(
      clientSchema.safeParse({ name: "Jo", phone: "11991000101", isBlocked: false })
        .success,
    ).toBe(false);
  });
});

describe("artistSchema", () => {
  const base = {
    name: "Marina Vásquez",
    shortBio: "Realismo em preto e cinza.",
    bio: "Bio longa o suficiente para passar na validação mínima do schema.",
    specialties: ["Realismo"],
    yearsOfExp: "11",
    schedule: weekSchedule,
    serviceIds: [],
  };

  it("aceita um artista completo", () => {
    expect(artistSchema.safeParse(base).success).toBe(true);
  });

  it("exige ao menos uma especialidade", () => {
    expect(artistSchema.safeParse({ ...base, specialties: [] }).success).toBe(false);
  });

  it("rejeita expediente que termina antes de começar", () => {
    const broken = weekSchedule.map((day, index) =>
      index === 1 ? { ...day, startTime: "18:00", endTime: "09:00" } : day,
    );
    expect(artistSchema.safeParse({ ...base, schedule: broken }).success).toBe(false);
  });

  it("rejeita intervalo fora do expediente", () => {
    const broken = weekSchedule.map((day, index) =>
      index === 1 ? { ...day, breakStart: "20:00", breakEnd: "21:00" } : day,
    );
    expect(artistSchema.safeParse({ ...base, schedule: broken }).success).toBe(false);
  });

  it("rejeita intervalo com só uma das pontas preenchida", () => {
    const broken = weekSchedule.map((day, index) =>
      index === 1 ? { ...day, breakStart: "13:00", breakEnd: "" } : day,
    );
    expect(artistSchema.safeParse({ ...base, schedule: broken }).success).toBe(false);
  });

  it("exige os sete dias da semana", () => {
    expect(
      artistSchema.safeParse({ ...base, schedule: weekSchedule.slice(0, 5) }).success,
    ).toBe(false);
  });

  it("rejeita URL de Instagram malformada", () => {
    expect(artistSchema.safeParse({ ...base, instagram: "instagram.com/x" }).success).toBe(
      false,
    );
  });
});

describe("serviceSchema", () => {
  const base = {
    name: "Tatuagem personalizada",
    shortDescription: "Projeto exclusivo para a sua ideia.",
    description: "Descrição longa o suficiente para o schema aceitar sem reclamar.",
    durationMin: "120",
    bufferMin: "20",
    priceFrom: "350",
  };

  it("converte o preço de reais para centavos", () => {
    expect(serviceSchema.parse(base).priceFrom).toBe(35000);
  });

  it("aceita preço zero para serviços gratuitos", () => {
    expect(serviceSchema.parse({ ...base, priceFrom: "0" }).priceFrom).toBe(0);
  });

  it("rejeita duração menor que o mínimo praticável", () => {
    expect(serviceSchema.safeParse({ ...base, durationMin: "5" }).success).toBe(false);
  });

  it("rejeita preço negativo", () => {
    expect(serviceSchema.safeParse({ ...base, priceFrom: "-100" }).success).toBe(false);
  });
});

describe("galleryItemSchema", () => {
  const base = {
    title: "Leão em preto e cinza",
    style: "Realismo",
    imageUrl: "/images/gallery/work-01.jpg",
    alt: "Tatuagem realista de um leão no braço",
  };

  it("aceita um item válido", () => {
    expect(galleryItemSchema.safeParse(base).success).toBe(true);
  });

  it("exige texto alternativo descritivo — acessibilidade não é opcional", () => {
    expect(galleryItemSchema.safeParse({ ...base, alt: "foto" }).success).toBe(false);
  });

  it("aceita URL absoluta (bucket de storage)", () => {
    expect(
      galleryItemSchema.safeParse({
        ...base,
        imageUrl: "https://cdn.exemplo.com/gallery/x.jpg",
      }).success,
    ).toBe(true);
  });

  it("rejeita caminho fora das pastas gerenciadas", () => {
    expect(
      galleryItemSchema.safeParse({ ...base, imageUrl: "/etc/passwd" }).success,
    ).toBe(false);
  });
});

describe("testimonialSchema", () => {
  const base = {
    clientName: "Rafael S.",
    rating: "5",
    content: "Atendimento impecável do começo ao fim, recomendo demais.",
  };

  it("aceita um depoimento válido", () => {
    expect(testimonialSchema.safeParse(base).success).toBe(true);
  });

  it("limita a nota ao intervalo de 1 a 5", () => {
    expect(testimonialSchema.safeParse({ ...base, rating: "6" }).success).toBe(false);
    expect(testimonialSchema.safeParse({ ...base, rating: "0" }).success).toBe(false);
  });
});

describe("studioSettingsSchema", () => {
  const base = {
    name: "Ink House",
    tagline: "Tattoo Studio",
    description: "Estúdio de tatuagem autoral em São Paulo, com artistas especializados.",
    phone: "(11) 98765-4321",
    whatsapp: "5511987654321",
    email: "contato@inkhouse.studio",
    address: "Rua das Tatuagens, 123",
    city: "São Paulo",
    state: "SP",
    zip: "05435-000",
    timezone: "America/Sao_Paulo",
    slotStepMin: "30",
    minLeadTimeHours: "12",
    maxAdvanceDays: "90",
    openingHours: Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      isOpen: dayOfWeek !== 0,
      opensAt: "09:00",
      closesAt: "20:00",
    })),
  };

  it("aceita configuração completa", () => {
    expect(studioSettingsSchema.safeParse(base).success).toBe(true);
  });

  it("exige WhatsApp somente com dígitos", () => {
    expect(
      studioSettingsSchema.safeParse({ ...base, whatsapp: "(11) 98765-4321" }).success,
    ).toBe(false);
  });

  it("exige UF com duas letras", () => {
    expect(studioSettingsSchema.safeParse({ ...base, state: "São Paulo" }).success).toBe(
      false,
    );
  });

  it("rejeita fechamento antes da abertura", () => {
    const broken = base.openingHours.map((day, index) =>
      index === 1 ? { ...day, opensAt: "20:00", closesAt: "09:00" } : day,
    );
    expect(
      studioSettingsSchema.safeParse({ ...base, openingHours: broken }).success,
    ).toBe(false);
  });

  it("rejeita passo de grade absurdo", () => {
    expect(studioSettingsSchema.safeParse({ ...base, slotStepMin: "1" }).success).toBe(
      false,
    );
  });
});

describe("adminCreateAppointmentSchema", () => {
  const session = {
    serviceId: "svc_1",
    artistId: "art_1",
    dateISO: "2026-08-14",
    time: "14:30",
  };

  it("aceita cliente já cadastrado", () => {
    const result = adminCreateAppointmentSchema.safeParse({
      ...session,
      client: { mode: "existing", clientId: "cli_1" },
    });
    expect(result.success).toBe(true);
  });

  it("aceita cliente novo com telefone normalizado", () => {
    const result = adminCreateAppointmentSchema.parse({
      ...session,
      client: { mode: "new", name: "Cliente Novo", phone: "(11) 98765-4321" },
    });
    expect(result.client).toMatchObject({ mode: "new", phone: "11987654321" });
  });

  it("rejeita cliente novo sem telefone", () => {
    expect(
      adminCreateAppointmentSchema.safeParse({
        ...session,
        client: { mode: "new", name: "Cliente Novo", phone: "" },
      }).success,
    ).toBe(false);
  });

  it("assume confirmado e sem encaixe por padrão", () => {
    const parsed = adminCreateAppointmentSchema.parse({
      ...session,
      client: { mode: "existing", clientId: "cli_1" },
    });
    expect(parsed.status).toBe("CONFIRMED");
    expect(parsed.allowOutsideSchedule).toBe(false);
  });
});

describe("parsePriceToCents", () => {
  it("aceita inteiro", () => {
    expect(parsePriceToCents("350")).toBe(35000);
  });

  it("aceita vírgula decimal (formato brasileiro)", () => {
    expect(parsePriceToCents("350,50")).toBe(35050);
  });

  it("aceita separador de milhar", () => {
    expect(parsePriceToCents("1.250,00")).toBe(125000);
  });

  it("devolve null para entrada inválida", () => {
    expect(parsePriceToCents("abc")).toBeNull();
    expect(parsePriceToCents("-10")).toBeNull();
  });

  it("devolve null para vazio — o chamador usa o preço padrão", () => {
    expect(parsePriceToCents("")).toBeNull();
    expect(parsePriceToCents(undefined)).toBeNull();
  });
});
