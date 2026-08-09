/**
 * Elenco fictício do estúdio.
 *
 * Nomes, bios e redes são inventados — nenhum dado de pessoa real. Os handles
 * de Instagram apontam para contas propositalmente inexistentes sob o domínio
 * do estúdio de exemplo.
 */

export type ArtistSeed = {
  slug: string;
  name: string;
  handle: string;
  shortBio: string;
  bio: string;
  specialties: string[];
  yearsOfExp: number;
  instagram: string;
  displayOrder: number;
  /** Slugs dos serviços que este artista executa. */
  services: string[];
  /** Grade semanal: 0 = domingo ... 6 = sábado. */
  schedule: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    breakStart?: string;
    breakEnd?: string;
  }[];
};

export const ARTIST_SEED: ArtistSeed[] = [
  {
    slug: "marina-vasquez",
    name: "Marina Vásquez",
    handle: "Nina",
    shortBio: "Realismo em preto e cinza com obsessão por textura de pele.",
    bio: "Marina começou desenhando retratos a grafite antes de encostar em uma máquina, e é isso que se vê no trabalho dela: obsessão por textura, luz e o jeito como a pele reage. Especializada em realismo preto e cinza de grande formato, prefere projetos longos, construídos em várias sessões, em que cada camada de sombra é planejada com antecedência. Atende com estudo prévio e maquete digital antes da primeira agulha.",
    specialties: ["Realismo", "Preto e Cinza", "Retrato"],
    yearsOfExp: 11,
    instagram: "https://instagram.com/nina.inkhouse",
    displayOrder: 1,
    services: [
      "tatuagem-personalizada",
      "cobertura",
      "reforma",
      "consultoria-de-projeto",
      "sessao-de-fechamento",
    ],
    schedule: [
      { dayOfWeek: 2, startTime: "10:00", endTime: "19:00", breakStart: "13:00", breakEnd: "14:00" },
      { dayOfWeek: 3, startTime: "10:00", endTime: "19:00", breakStart: "13:00", breakEnd: "14:00" },
      { dayOfWeek: 4, startTime: "10:00", endTime: "19:00", breakStart: "13:00", breakEnd: "14:00" },
      { dayOfWeek: 5, startTime: "12:00", endTime: "20:00" },
      { dayOfWeek: 6, startTime: "10:00", endTime: "16:00" },
    ],
  },
  {
    slug: "caio-ferrante",
    name: "Caio Ferrante",
    handle: "Ferra",
    shortBio: "Blackwork pesado, ornamental e geometria que acompanha o corpo.",
    bio: "Caio trabalha com preto sólido e composições ornamentais que seguem a anatomia — braços fechados, peitorais e costas inteiras que parecem armaduras. Vem do design gráfico e leva para a pele o rigor de grade, simetria e contraste. Gosta de projetos autorais em que o cliente traz um tema e deixa a composição por conta dele.",
    specialties: ["Blackwork", "Ornamental", "Geométrico"],
    yearsOfExp: 9,
    instagram: "https://instagram.com/ferra.inkhouse",
    displayOrder: 2,
    services: [
      "tatuagem-personalizada",
      "cobertura",
      "sessao-de-fechamento",
      "consultoria-de-projeto",
    ],
    schedule: [
      { dayOfWeek: 1, startTime: "13:00", endTime: "21:00" },
      { dayOfWeek: 2, startTime: "13:00", endTime: "21:00" },
      { dayOfWeek: 4, startTime: "10:00", endTime: "19:00", breakStart: "14:00", breakEnd: "15:00" },
      { dayOfWeek: 5, startTime: "10:00", endTime: "19:00", breakStart: "14:00", breakEnd: "15:00" },
      { dayOfWeek: 6, startTime: "09:00", endTime: "17:00" },
    ],
  },
  {
    slug: "juliana-reis",
    name: "Juliana Reis",
    handle: "Ju",
    shortBio: "Fine line e microrrealismo — traço mínimo, precisão máxima.",
    bio: "Juliana faz o tipo de tatuagem que se descobre de perto: linhas finíssimas, pontilhismo delicado e peças pequenas com uma quantidade absurda de informação. Atende muito primeira tatuagem e trabalha com bastante cuidado no acolhimento — explica cada etapa antes de começar. Também é a referência do estúdio em cicatrização de traço fino.",
    specialties: ["Fine Line", "Microrrealismo", "Minimalista"],
    yearsOfExp: 6,
    instagram: "https://instagram.com/ju.inkhouse",
    displayOrder: 3,
    services: [
      "tatuagem-personalizada",
      "fine-line",
      "reforma",
      "consultoria-de-projeto",
      "cuidados-pos-tattoo",
    ],
    schedule: [
      { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", breakStart: "12:30", breakEnd: "13:30" },
      { dayOfWeek: 2, startTime: "09:00", endTime: "17:00", breakStart: "12:30", breakEnd: "13:30" },
      { dayOfWeek: 3, startTime: "09:00", endTime: "17:00", breakStart: "12:30", breakEnd: "13:30" },
      { dayOfWeek: 4, startTime: "09:00", endTime: "17:00", breakStart: "12:30", breakEnd: "13:30" },
      { dayOfWeek: 5, startTime: "09:00", endTime: "15:00" },
    ],
  },
  {
    slug: "rafael-okada",
    name: "Rafael Okada",
    handle: "Okada",
    shortBio: "Oriental tradicional e neo tradicional com paleta autoral.",
    bio: "Rafael estudou por anos a gramática da tatuagem japonesa — o fluxo das ondas, a leitura das nuvens, a hierarquia dos elementos — e aplica isso mesmo em peças que não são clássicas. É o artista do estúdio para quem quer cor densa que envelheça bem. Trabalha muito com braços e costas fechadas em temporadas de sessões.",
    specialties: ["Oriental", "Neo Traditional", "Colorido"],
    yearsOfExp: 14,
    instagram: "https://instagram.com/okada.inkhouse",
    displayOrder: 4,
    services: [
      "tatuagem-personalizada",
      "sessao-de-fechamento",
      "cobertura",
      "consultoria-de-projeto",
    ],
    schedule: [
      { dayOfWeek: 3, startTime: "11:00", endTime: "20:00", breakStart: "15:00", breakEnd: "16:00" },
      { dayOfWeek: 4, startTime: "11:00", endTime: "20:00", breakStart: "15:00", breakEnd: "16:00" },
      { dayOfWeek: 5, startTime: "11:00", endTime: "20:00", breakStart: "15:00", breakEnd: "16:00" },
      { dayOfWeek: 6, startTime: "10:00", endTime: "18:00" },
    ],
  },
  {
    slug: "bruno-cardoso",
    name: "Bruno Cardoso",
    handle: "Cardo",
    shortBio: "Old school, lettering e piercing com técnica limpa.",
    bio: "Bruno é o clássico do estúdio: contorno firme, cor chapada e aquele repertório de old school que nunca sai de moda. Também é o responsável pelos piercings, com protocolo de esterilização próprio e material descartável em toda aplicação. Direto no atendimento, resolve peça pequena no mesmo dia quando a agenda permite.",
    specialties: ["Old School", "Lettering", "Piercing"],
    yearsOfExp: 8,
    instagram: "https://instagram.com/cardo.inkhouse",
    displayOrder: 5,
    services: [
      "tatuagem-personalizada",
      "piercing",
      "reforma",
      "cuidados-pos-tattoo",
      "fine-line",
    ],
    schedule: [
      { dayOfWeek: 1, startTime: "10:00", endTime: "19:00", breakStart: "13:00", breakEnd: "14:00" },
      { dayOfWeek: 2, startTime: "10:00", endTime: "19:00", breakStart: "13:00", breakEnd: "14:00" },
      { dayOfWeek: 3, startTime: "10:00", endTime: "19:00", breakStart: "13:00", breakEnd: "14:00" },
      { dayOfWeek: 5, startTime: "12:00", endTime: "20:00" },
      { dayOfWeek: 6, startTime: "09:00", endTime: "16:00" },
    ],
  },
];
