import { describe, expect, it } from "vitest";

import {
  computeSlots,
  hasConflict,
  isSlotAvailable,
  workingWindows,
  type SlotQuery,
  type StudioHours,
  type WeeklySchedule,
} from "@/lib/availability";
import { zonedDateTimeToUtc } from "@/lib/datetime";

/**
 * O motor de disponibilidade é a peça onde um bug custa caro: gera
 * agendamento duplicado, horário fora do expediente ou cliente que aparece e
 * não é atendido. Por isso é testado isolado, com o "agora" injetado.
 */

const TZ = "America/Sao_Paulo";

// 2026-08-14 é uma sexta-feira; 2026-08-15, um sábado; 2026-08-16, domingo.
const FRIDAY = "2026-08-14";
const SATURDAY = "2026-08-15";
const SUNDAY = "2026-08-16";

/** "Agora" fixo: muito antes das datas de teste, para o lead time não interferir. */
const NOW = new Date("2026-08-01T12:00:00Z");

const studioOpenAllWeek: StudioHours[] = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
  dayOfWeek,
  isOpen: dayOfWeek !== 0, // domingo fechado
  opensAt: "09:00",
  closesAt: "20:00",
}));

/** Sexta 10:00–18:00 com pausa 13:00–14:00; sábado 09:00–14:00. */
const schedule: WeeklySchedule[] = [
  { dayOfWeek: 5, startTime: "10:00", endTime: "18:00", breakStart: "13:00", breakEnd: "14:00" },
  { dayOfWeek: 6, startTime: "09:00", endTime: "14:00" },
];

function query(overrides: Partial<SlotQuery> = {}): SlotQuery {
  return {
    dateISO: FRIDAY,
    durationMin: 60,
    bufferMin: 0,
    schedule,
    studioHours: studioOpenAllWeek,
    busy: [],
    rules: { slotStepMin: 30, minLeadTimeHours: 0, timezone: TZ },
    now: NOW,
    ...overrides,
  };
}

const at = (dateISO: string, time: string) => zonedDateTimeToUtc(dateISO, time, TZ);

describe("workingWindows", () => {
  it("intersecta a grade do artista com o funcionamento do estúdio", () => {
    const windows = workingWindows({
      dayOfWeek: 6,
      schedule: [{ dayOfWeek: 6, startTime: "07:00", endTime: "22:00" }],
      studioHours: studioOpenAllWeek,
    });
    // O estúdio abre 09:00 e fecha 20:00, então a grade 07:00–22:00 é recortada.
    expect(windows).toEqual([{ start: 9 * 60, end: 20 * 60 }]);
  });

  it("divide a janela em duas quando há intervalo", () => {
    const windows = workingWindows({ dayOfWeek: 5, schedule, studioHours: studioOpenAllWeek });
    expect(windows).toEqual([
      { start: 10 * 60, end: 13 * 60 },
      { start: 14 * 60, end: 18 * 60 },
    ]);
  });

  it("devolve vazio em dia sem grade cadastrada", () => {
    expect(
      workingWindows({ dayOfWeek: 1, schedule, studioHours: studioOpenAllWeek }),
    ).toEqual([]);
  });

  it("devolve vazio quando o estúdio está fechado, mesmo com grade do artista", () => {
    expect(
      workingWindows({
        dayOfWeek: 0,
        schedule: [{ dayOfWeek: 0, startTime: "10:00", endTime: "18:00" }],
        studioHours: studioOpenAllWeek,
      }),
    ).toEqual([]);
  });

  it("trata dia sem configuração de estúdio como fechado (falha segura)", () => {
    expect(
      workingWindows({
        dayOfWeek: 3,
        schedule: [{ dayOfWeek: 3, startTime: "10:00", endTime: "18:00" }],
        studioHours: [],
      }),
    ).toEqual([]);
  });

  it("ignora grade marcada como inativa", () => {
    expect(
      workingWindows({
        dayOfWeek: 5,
        schedule: [{ dayOfWeek: 5, startTime: "10:00", endTime: "18:00", isActive: false }],
        studioHours: studioOpenAllWeek,
      }),
    ).toEqual([]);
  });
});

describe("computeSlots", () => {
  it("gera a grade completa do dia respeitando a pausa", () => {
    const slots = computeSlots(query());
    // 10:00–13:00 comporta 10:00, 10:30, 11:00, 11:30, 12:00 (sessão de 60min).
    // 14:00–18:00 comporta 14:00 ... 17:00.
    expect(slots.map((s) => s.time)).toEqual([
      "10:00", "10:30", "11:00", "11:30", "12:00",
      "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00",
    ]);
  });

  it("não oferece horário em dia sem expediente do artista", () => {
    expect(computeSlots(query({ dateISO: SUNDAY }))).toEqual([]);
  });

  it("exige que duração + buffer caibam inteiros na janela", () => {
    // Sábado 09:00–14:00 = exatamente 300 minutos.
    // Uma sessão de 330min não cabe em lugar nenhum.
    expect(computeSlots(query({ dateISO: SATURDAY, durationMin: 330 }))).toEqual([]);

    // 300min cabe só às 09:00, terminando cravado no fim do expediente.
    expect(
      computeSlots(query({ dateISO: SATURDAY, durationMin: 300 })).map((s) => s.time),
    ).toEqual(["09:00"]);

    // 240min cabe às 09:00 (termina 13:00), 09:30 e 10:00 (termina 14:00).
    const slots = computeSlots(query({ dateISO: SATURDAY, durationMin: 240 }));
    expect(slots.map((s) => s.time)).toEqual(["09:00", "09:30", "10:00"]);
  });

  it("o buffer conta para caber na janela, não só para bloquear a agenda", () => {
    // 280min de sessão + 30min de buffer = 310min > 300min disponíveis.
    expect(
      computeSlots(query({ dateISO: SATURDAY, durationMin: 280, bufferMin: 30 })),
    ).toEqual([]);
  });

  it("reserva o buffer junto com a sessão", () => {
    // 60min de sessão + 30min de buffer = 90min ocupados.
    const slots = computeSlots(query({ dateISO: SATURDAY, durationMin: 60, bufferMin: 30 }));
    expect(slots.at(-1)!.time).toBe("12:30"); // 12:30 + 90min = 14:00, o limite.

    const first = slots[0]!;
    expect(first.endsAt.getTime() - first.startsAt.getTime()).toBe(90 * 60_000);
  });

  it("remove horários que conflitam com um agendamento existente", () => {
    const slots = computeSlots(
      query({ busy: [{ startsAt: at(FRIDAY, "11:00"), endsAt: at(FRIDAY, "12:00") }] }),
    );
    const times = slots.map((s) => s.time);
    // 10:30 começaria às 10:30 e terminaria 11:30 — colide.
    expect(times).not.toContain("10:30");
    expect(times).not.toContain("11:00");
    expect(times).not.toContain("11:30");
    // 10:00 termina exatamente às 11:00: encosta, mas não sobrepõe.
    expect(times).toContain("10:00");
    expect(times).toContain("12:00");
  });

  it("remove horários cobertos por bloqueio (folga/férias)", () => {
    const slots = computeSlots(
      query({ busy: [{ startsAt: at(FRIDAY, "00:00"), endsAt: at(FRIDAY, "23:59") }] }),
    );
    expect(slots).toEqual([]);
  });

  it("recorta bloqueio que invade o dia vindo do dia anterior", () => {
    const slots = computeSlots(
      query({
        busy: [{ startsAt: at("2026-08-13", "20:00"), endsAt: at(FRIDAY, "11:00") }],
      }),
    );
    const times = slots.map((s) => s.time);
    expect(times).not.toContain("10:00");
    expect(times).not.toContain("10:30");
    expect(times[0]).toBe("11:00");
  });

  it("aplica a antecedência mínima", () => {
    // Agora = sexta 08:00 local (11:00 UTC), com 4h de antecedência mínima:
    // o primeiro horário possível é 12:00.
    const slots = computeSlots(
      query({
        now: at(FRIDAY, "08:00"),
        rules: { slotStepMin: 30, minLeadTimeHours: 4, timezone: TZ },
      }),
    );
    expect(slots[0]!.time).toBe("12:00");
  });

  it("respeita o passo configurado da grade", () => {
    const slots = computeSlots(
      query({
        dateISO: SATURDAY,
        rules: { slotStepMin: 60, minLeadTimeHours: 0, timezone: TZ },
      }),
    );
    expect(slots.map((s) => s.time)).toEqual(["09:00", "10:00", "11:00", "12:00", "13:00"]);
  });

  it("alinha os horários à grade do dia mesmo após uma pausa quebrada", () => {
    const slots = computeSlots(
      query({
        schedule: [
          { dayOfWeek: 5, startTime: "10:00", endTime: "18:00", breakStart: "13:20", breakEnd: "14:10" },
        ],
      }),
    );
    // Depois da pausa o próximo múltiplo de 30 é 14:30, não 14:10.
    expect(slots).toContainEqual(expect.objectContaining({ time: "14:30" }));
    expect(slots.map((s) => s.time)).not.toContain("14:10");
  });

  it("converte para UTC usando o fuso do estúdio", () => {
    const slot = computeSlots(query())[0]!;
    // São Paulo é UTC-3 em agosto: 10:00 local = 13:00Z.
    expect(slot.startsAt.toISOString()).toBe("2026-08-14T13:00:00.000Z");
  });

  it("devolve vazio para duração inválida", () => {
    expect(computeSlots(query({ durationMin: 0 }))).toEqual([]);
    expect(computeSlots(query({ durationMin: -30 }))).toEqual([]);
  });

  it("não repete horários quando janelas se tocam", () => {
    const slots = computeSlots(query());
    const times = slots.map((s) => s.time);
    expect(new Set(times).size).toBe(times.length);
  });
});

describe("isSlotAvailable", () => {
  it("aceita um horário que está na grade", () => {
    expect(isSlotAvailable({ ...query(), time: "10:00" })).toBe(true);
  });

  it("rejeita horário fora da grade", () => {
    expect(isSlotAvailable({ ...query(), time: "13:00" })).toBe(false);
    expect(isSlotAvailable({ ...query(), time: "09:15" })).toBe(false);
  });

  it("rejeita horário já ocupado", () => {
    expect(
      isSlotAvailable({
        ...query({ busy: [{ startsAt: at(FRIDAY, "10:00"), endsAt: at(FRIDAY, "11:00") }] }),
        time: "10:00",
      }),
    ).toBe(false);
  });
});

describe("hasConflict", () => {
  const candidate = {
    startsAt: at(FRIDAY, "14:00"),
    endsAt: at(FRIDAY, "15:00"),
  };

  it("detecta sobreposição parcial", () => {
    expect(
      hasConflict(candidate, [{ startsAt: at(FRIDAY, "14:30"), endsAt: at(FRIDAY, "15:30") }]),
    ).toBe(true);
  });

  it("detecta intervalo contido", () => {
    expect(
      hasConflict(candidate, [{ startsAt: at(FRIDAY, "14:10"), endsAt: at(FRIDAY, "14:20") }]),
    ).toBe(true);
  });

  it("aceita intervalos que apenas encostam", () => {
    expect(
      hasConflict(candidate, [
        { startsAt: at(FRIDAY, "13:00"), endsAt: at(FRIDAY, "14:00") },
        { startsAt: at(FRIDAY, "15:00"), endsAt: at(FRIDAY, "16:00") },
      ]),
    ).toBe(false);
  });

  it("aceita lista vazia", () => {
    expect(hasConflict(candidate, [])).toBe(false);
  });
});
