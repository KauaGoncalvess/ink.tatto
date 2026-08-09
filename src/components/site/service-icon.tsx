import {
  Circle,
  Frame,
  HeartPulse,
  Layers,
  MessagesSquare,
  Minus,
  PenTool,
  RefreshCw,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

/**
 * Mapa nome → ícone.
 *
 * O banco guarda apenas o nome (`Service.icon`), o que permite ao admin trocar
 * o ícone de um serviço sem deploy. Importar por nome dinâmico quebraria o
 * tree-shaking e traria a biblioteca inteira para o bundle — por isso o mapa
 * explícito com só os ícones realmente usados.
 */
const ICONS = {
  PenTool,
  Layers,
  RefreshCw,
  Minus,
  Frame,
  Circle,
  MessagesSquare,
  HeartPulse,
  Sparkles,
} satisfies Record<string, LucideIcon>;

export type ServiceIconName = keyof typeof ICONS;

export function ServiceIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICONS[name as ServiceIconName] ?? Sparkles;
  return <Icon className={className} aria-hidden="true" />;
}
