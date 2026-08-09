/**
 * Catálogo de serviços do estúdio.
 *
 * `durationMin` e `bufferMin` alimentam diretamente o motor de disponibilidade:
 * um serviço de 120min com buffer de 20min ocupa 140min na agenda do artista.
 * Preços em centavos.
 */

export type ServiceSeed = {
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  /** Nome do ícone lucide (ver src/components/site/service-icon.tsx). */
  icon: string;
  durationMin: number;
  bufferMin: number;
  priceFrom: number;
  isFeatured: boolean;
  displayOrder: number;
};

export const SERVICE_SEED: ServiceSeed[] = [
  {
    slug: "tatuagem-personalizada",
    name: "Tatuagem personalizada",
    shortDescription:
      "Projeto exclusivo, desenhado para a sua ideia, sua anatomia e seu estilo.",
    description:
      "O carro-chefe do estúdio. Você traz a ideia — uma referência, uma história ou só um sentimento — e o artista desenvolve um desenho original a partir dela. Inclui estudo de composição, adaptação ao local do corpo escolhido e ajuste do stencil antes de começar. Peças maiores podem ser divididas em várias sessões, sempre com o projeto completo apresentado antes da primeira agulha.",
    icon: "PenTool",
    durationMin: 120,
    bufferMin: 20,
    priceFrom: 35000,
    isFeatured: true,
    displayOrder: 1,
  },
  {
    slug: "cobertura",
    name: "Cobertura",
    shortDescription:
      "Transformamos uma tatuagem antiga em algo que representa você hoje.",
    description:
      "Cobrir exige planejamento diferente: densidade, contraste e escolha de elementos que escondem o traço antigo sem virar uma mancha. Avaliamos a tatuagem existente, a cicatrização e a saturação da pele para propor um projeto que funcione de verdade — às vezes com uma ou duas sessões de clareamento antes. A avaliação inicial é presencial e sem compromisso.",
    icon: "Layers",
    durationMin: 180,
    bufferMin: 30,
    priceFrom: 55000,
    isFeatured: true,
    displayOrder: 2,
  },
  {
    slug: "reforma",
    name: "Reforma e retoque",
    shortDescription:
      "Recuperação de traço, contraste e cor em tatuagens que perderam definição.",
    description:
      "Com o tempo, sol e cicatrização irregular, o traço abre e a cor desbota. Na reforma reforçamos contornos, recuperamos preto e devolvemos contraste — sem descaracterizar a peça original. Também fazemos retoque de cicatrização das tatuagens feitas aqui, que é gratuito nos primeiros noventa dias.",
    icon: "RefreshCw",
    durationMin: 90,
    bufferMin: 15,
    priceFrom: 22000,
    isFeatured: true,
    displayOrder: 3,
  },
  {
    slug: "fine-line",
    name: "Fine line",
    shortDescription: "Traço fino, delicado e preciso — inclusive para a primeira tattoo.",
    description:
      "Peças pequenas e médias com linhas finas, pontilhismo e microrrealismo. Exige agulha específica, mão firme e um cuidado extra na cicatrização, que explicamos em detalhe no final da sessão. É a porta de entrada mais procurada por quem está fazendo a primeira tatuagem.",
    icon: "Minus",
    durationMin: 60,
    bufferMin: 15,
    priceFrom: 18000,
    isFeatured: true,
    displayOrder: 4,
  },
  {
    slug: "sessao-de-fechamento",
    name: "Sessão de fechamento",
    shortDescription:
      "Braços, pernas e costas fechadas, construídos em temporadas de sessões.",
    description:
      "Para projetos grandes trabalhamos por temporada: sessões longas agendadas com regularidade até a peça fechar. Cada temporada começa com o desenho completo aprovado e um cronograma de sessões, para você saber exatamente quanto tempo e quanto investimento o projeto vai levar.",
    icon: "Frame",
    durationMin: 300,
    bufferMin: 30,
    priceFrom: 120000,
    isFeatured: false,
    displayOrder: 5,
  },
  {
    slug: "piercing",
    name: "Piercing",
    shortDescription:
      "Aplicação profissional com material esterilizado e joia de titânio.",
    description:
      "Aplicação com técnica de agulha (nunca pistola), material descartável e joia de titânio implant grade. Avaliamos a anatomia antes de marcar o ponto e entregamos as orientações de cicatrização por escrito. Troca de joia e revisão inclusas na primeira revisão.",
    icon: "Circle",
    durationMin: 45,
    bufferMin: 15,
    priceFrom: 15000,
    isFeatured: true,
    displayOrder: 6,
  },
  {
    slug: "consultoria-de-projeto",
    name: "Consultoria de projeto",
    shortDescription:
      "Uma conversa para transformar uma ideia solta em um projeto viável.",
    description:
      "Sessão dedicada a discutir referências, local do corpo, estilo, tamanho, número de sessões e orçamento — sem tatuar. Ideal para quem tem uma ideia mas não sabe por onde começar, ou para projetos grandes que precisam de planejamento. O valor é abatido do projeto caso você feche a sessão.",
    icon: "MessagesSquare",
    durationMin: 45,
    bufferMin: 15,
    priceFrom: 8000,
    isFeatured: true,
    displayOrder: 7,
  },
  {
    slug: "cuidados-pos-tattoo",
    name: "Cuidados pós-tattoo",
    shortDescription:
      "Acompanhamento de cicatrização para a sua tattoo fechar perfeita.",
    description:
      "Consulta de acompanhamento para avaliar a cicatrização, tirar dúvidas e corrigir a rotina de cuidados quando algo saiu do previsto. Atendemos também tatuagens feitas em outros estúdios. Se identificarmos necessidade de retoque, ele é agendado na hora.",
    icon: "HeartPulse",
    durationMin: 30,
    bufferMin: 10,
    priceFrom: 0,
    isFeatured: true,
    displayOrder: 8,
  },
];
