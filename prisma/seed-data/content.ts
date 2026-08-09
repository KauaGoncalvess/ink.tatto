/**
 * Conteúdo público de demonstração: clientes, galeria e depoimentos.
 * Todos os nomes são fictícios; telefones usam a faixa 9xxxx reservada dos
 * exemplos e não correspondem a linhas reais.
 */

export type ClientSeed = {
  name: string;
  phone: string;
  email: string;
  notes?: string;
};

export const CLIENT_SEED: ClientSeed[] = [
  { name: "Rafael Soares", phone: "11991000101", email: "rafael.soares@exemplo.com.br", notes: "Alergia a esparadrapo comum — usar fita hipoalergênica." },
  { name: "Juliana Menezes", phone: "11991000102", email: "juliana.menezes@exemplo.com.br" },
  { name: "Lucas Pereira", phone: "11991000103", email: "lucas.pereira@exemplo.com.br", notes: "Projeto de braço fechado em andamento." },
  { name: "Camila Duarte", phone: "11991000104", email: "camila.duarte@exemplo.com.br" },
  { name: "Thiago Nakamura", phone: "11991000105", email: "thiago.nakamura@exemplo.com.br" },
  { name: "Beatriz Lopes", phone: "11991000106", email: "beatriz.lopes@exemplo.com.br", notes: "Primeira tatuagem — atendimento com calma." },
  { name: "Gustavo Ribeiro", phone: "11991000107", email: "gustavo.ribeiro@exemplo.com.br" },
  { name: "Larissa Fontes", phone: "11991000108", email: "larissa.fontes@exemplo.com.br" },
  { name: "Pedro Antunes", phone: "11991000109", email: "pedro.antunes@exemplo.com.br" },
  { name: "Mariana Castro", phone: "11991000110", email: "mariana.castro@exemplo.com.br", notes: "Prefere sessões pela manhã." },
  { name: "Diego Almeida", phone: "11991000111", email: "diego.almeida@exemplo.com.br" },
  { name: "Fernanda Braga", phone: "11991000112", email: "fernanda.braga@exemplo.com.br" },
  { name: "Vinícius Prado", phone: "11991000113", email: "vinicius.prado@exemplo.com.br" },
  { name: "Aline Moretti", phone: "11991000114", email: "aline.moretti@exemplo.com.br" },
  { name: "Henrique Vasco", phone: "11991000115", email: "henrique.vasco@exemplo.com.br" },
  { name: "Patrícia Nunes", phone: "11991000116", email: "patricia.nunes@exemplo.com.br" },
  { name: "Rodrigo Salles", phone: "11991000117", email: "rodrigo.salles@exemplo.com.br", notes: "Cobertura de tatuagem antiga no antebraço." },
  { name: "Isabela Cunha", phone: "11991000118", email: "isabela.cunha@exemplo.com.br" },
  { name: "Marcelo Tavares", phone: "11991000119", email: "marcelo.tavares@exemplo.com.br" },
  { name: "Natália Ferraz", phone: "11991000120", email: "natalia.ferraz@exemplo.com.br" },
];

export const TATTOO_STYLES = [
  "Realismo",
  "Blackwork",
  "Fine Line",
  "Old School",
  "Neo Traditional",
  "Oriental",
] as const;

export type GallerySeed = {
  title: string;
  style: (typeof TATTOO_STYLES)[number];
  alt: string;
  description: string;
  bodyPart: string;
  /** Slug do artista responsável. */
  artistSlug: string;
  isFeatured: boolean;
};

export const GALLERY_SEED: GallerySeed[] = [
  { title: "Leão em preto e cinza", style: "Realismo", alt: "Tatuagem realista de um leão em preto e cinza no braço", description: "Retrato construído em três sessões, com foco na textura da juba e no contraste dos olhos.", bodyPart: "Braço", artistSlug: "marina-vasquez", isFeatured: true },
  { title: "Retrato clássico", style: "Realismo", alt: "Tatuagem realista de um retrato feminino no antebraço", description: "Estudo de luz suave sobre pele clara, com degradê construído em camadas finas.", bodyPart: "Antebraço", artistSlug: "marina-vasquez", isFeatured: true },
  { title: "Mão e relógio", style: "Realismo", alt: "Tatuagem realista de uma mão segurando um relógio de bolso", description: "Peça sobre tempo e memória, feita em duas sessões longas.", bodyPart: "Panturrilha", artistSlug: "marina-vasquez", isFeatured: false },
  { title: "Olhar", style: "Realismo", alt: "Tatuagem realista em close de um olho com detalhes de cílios", description: "Microdetalhe de íris com preto sólido e cinzas muito abertos.", bodyPart: "Braço interno", artistSlug: "marina-vasquez", isFeatured: false },
  { title: "Armadura ornamental", style: "Blackwork", alt: "Tatuagem blackwork ornamental cobrindo o ombro e o peitoral", description: "Composição simétrica desenhada sobre o corpo, acompanhando o deltoide.", bodyPart: "Ombro e peitoral", artistSlug: "caio-ferrante", isFeatured: true },
  { title: "Mandala geométrica", style: "Blackwork", alt: "Tatuagem blackwork de mandala geométrica nas costas", description: "Grade construída ponto a ponto, com preto sólido e negativos calculados.", bodyPart: "Costas", artistSlug: "caio-ferrante", isFeatured: true },
  { title: "Faixa sólida", style: "Blackwork", alt: "Tatuagem blackwork de faixa preta sólida no antebraço", description: "Peça minimalista de preto pleno, com transição em degradê pontilhado.", bodyPart: "Antebraço", artistSlug: "caio-ferrante", isFeatured: false },
  { title: "Serpente ornamental", style: "Blackwork", alt: "Tatuagem blackwork de serpente ornamental na coxa", description: "Fluxo desenhado para acompanhar a curva da perna em movimento.", bodyPart: "Coxa", artistSlug: "caio-ferrante", isFeatured: false },
  { title: "Ramo de oliveira", style: "Fine Line", alt: "Tatuagem fine line de um ramo de oliveira na costela", description: "Traço de 0,25mm com folhas em pontilhismo aberto.", bodyPart: "Costela", artistSlug: "juliana-reis", isFeatured: true },
  { title: "Constelação", style: "Fine Line", alt: "Tatuagem fine line de constelação com pontos e linhas finas no ombro", description: "Mapa estelar da data escolhida pela cliente, em escala reduzida.", bodyPart: "Ombro", artistSlug: "juliana-reis", isFeatured: false },
  { title: "Borboleta micro", style: "Fine Line", alt: "Tatuagem microrrealista de borboleta no pulso", description: "Microrrealismo de dois centímetros com sombreado em cinza diluído.", bodyPart: "Pulso", artistSlug: "juliana-reis", isFeatured: true },
  { title: "Assinatura", style: "Fine Line", alt: "Tatuagem fine line reproduzindo uma assinatura manuscrita no braço", description: "Reprodução fiel de uma caligrafia de família.", bodyPart: "Braço", artistSlug: "juliana-reis", isFeatured: false },
  { title: "Carpa e ondas", style: "Oriental", alt: "Tatuagem oriental colorida de carpa entre ondas no braço", description: "Carpa subindo a correnteza, com ondas em preto e vermelho tradicional.", bodyPart: "Braço fechado", artistSlug: "rafael-okada", isFeatured: true },
  { title: "Máscara Hannya", style: "Oriental", alt: "Tatuagem oriental de máscara Hannya na coxa", description: "Máscara clássica com fundo de nuvens e folhas de bordo.", bodyPart: "Coxa", artistSlug: "rafael-okada", isFeatured: true },
  { title: "Dragão em costas", style: "Oriental", alt: "Tatuagem oriental de dragão cobrindo as costas inteiras", description: "Projeto de temporada, fechado em nove sessões ao longo de sete meses.", bodyPart: "Costas", artistSlug: "rafael-okada", isFeatured: false },
  { title: "Tigre neo traditional", style: "Neo Traditional", alt: "Tatuagem neo traditional de tigre com cores densas no antebraço", description: "Contorno firme e paleta reduzida a três cores, pensada para envelhecer bem.", bodyPart: "Antebraço", artistSlug: "rafael-okada", isFeatured: false },
  { title: "Âncora tradicional", style: "Old School", alt: "Tatuagem old school de âncora com faixa no antebraço", description: "Old school clássico com contorno pesado e cor chapada.", bodyPart: "Antebraço", artistSlug: "bruno-cardoso", isFeatured: true },
  { title: "Rosa e adaga", style: "Old School", alt: "Tatuagem old school de rosa atravessada por uma adaga no braço", description: "Combinação tradicional com sombreado sólido e vermelho saturado.", bodyPart: "Braço", artistSlug: "bruno-cardoso", isFeatured: false },
  { title: "Lettering manuscrito", style: "Old School", alt: "Tatuagem de lettering manuscrito no antebraço", description: "Frase em caligrafia autoral, desenhada à mão sobre a pele antes do stencil.", bodyPart: "Antebraço", artistSlug: "bruno-cardoso", isFeatured: false },
  { title: "Andorinha", style: "Old School", alt: "Tatuagem old school de andorinha em voo no peito", description: "Peça pequena de repertório tradicional, resolvida em sessão única.", bodyPart: "Peito", artistSlug: "bruno-cardoso", isFeatured: true },
];

export type TestimonialSeed = {
  clientName: string;
  rating: number;
  content: string;
  serviceName: string;
  artistSlug: string;
};

export const TESTIMONIAL_SEED: TestimonialSeed[] = [
  {
    clientName: "Rafael S.",
    rating: 5,
    content:
      "Atendimento impecável do começo ao fim. Marina desenhou exatamente o que eu tinha na cabeça e ainda melhorou. O estúdio é limpo, organizado e me senti à vontade nas cinco horas de sessão.",
    serviceName: "Tatuagem personalizada",
    artistSlug: "marina-vasquez",
  },
  {
    clientName: "Juliana M.",
    rating: 5,
    content:
      "Cheguei com uma ideia vaga e saí com um projeto que superou tudo que eu imaginava. A consultoria antes fez toda a diferença — entendi cada etapa antes de fechar.",
    serviceName: "Consultoria de projeto",
    artistSlug: "caio-ferrante",
  },
  {
    clientName: "Beatriz L.",
    rating: 5,
    content:
      "Era minha primeira tatuagem e eu estava apavorada. A Ju explicou tudo com calma, foi no meu ritmo e o resultado ficou delicado exatamente como eu queria. Voltarei.",
    serviceName: "Fine line",
    artistSlug: "juliana-reis",
  },
  {
    clientName: "Lucas P.",
    rating: 5,
    content:
      "Ambiente profissional, material lacrado na minha frente e artistas que realmente escutam. Estou fechando o braço com o Okada e cada sessão é melhor que a anterior.",
    serviceName: "Sessão de fechamento",
    artistSlug: "rafael-okada",
  },
  {
    clientName: "Rodrigo S.",
    rating: 5,
    content:
      "Tinha uma tatuagem de dezoito anos atrás que eu odiava. O Caio cobriu com um ornamental que ficou absurdo — ninguém acredita que tinha algo embaixo.",
    serviceName: "Cobertura",
    artistSlug: "caio-ferrante",
  },
  {
    clientName: "Camila D.",
    rating: 4,
    content:
      "Trabalho lindo e cicatrização perfeita seguindo as orientações. Só achei a espera pela agenda um pouco longa, mas valeu cada semana.",
    serviceName: "Tatuagem personalizada",
    artistSlug: "marina-vasquez",
  },
  {
    clientName: "Thiago N.",
    rating: 5,
    content:
      "Fiz piercing com o Bruno e o cuidado com esterilização é de outro nível. Ele abriu tudo na minha frente e me deu as instruções por escrito.",
    serviceName: "Piercing",
    artistSlug: "bruno-cardoso",
  },
  {
    clientName: "Mariana C.",
    rating: 5,
    content:
      "Levei uma tatuagem antiga de outro estúdio para reforma e voltou a parecer nova. Honestidade total no orçamento e no que dava ou não para recuperar.",
    serviceName: "Reforma e retoque",
    artistSlug: "juliana-reis",
  },
];
