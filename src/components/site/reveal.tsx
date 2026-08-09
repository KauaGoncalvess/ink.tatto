"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Reveal on scroll sem biblioteca de animação.
 *
 * Um único IntersectionObserver compartilhado por todos os elementos da
 * página, em vez de um por componente. O estado visual mora no CSS
 * (`[data-reveal]` em globals.css), que já respeita prefers-reduced-motion —
 * aqui só alternamos o atributo.
 */

type RevealVariant = "up" | "fade" | "scale";

let sharedObserver: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver | null {
  if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
    return null;
  }

  sharedObserver ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.setAttribute("data-revealed", "true");
        // Reveal acontece uma vez só: nada de reanimar ao rolar de volta.
        sharedObserver?.unobserve(entry.target);
      }
    },
    // Dispara um pouco antes de entrar na tela, para o movimento terminar
    // enquanto o elemento ainda está subindo.
    { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
  );

  return sharedObserver;
}

/** Tags permitidas — restrito para não perder a semântica em listas e seções. */
type RevealTag = "div" | "section" | "article" | "li" | "span" | "header" | "figure";

export type RevealProps = Omit<React.ComponentProps<"div">, "ref"> & {
  /** Atraso em ms, para escalonar itens de uma lista. */
  delay?: number;
  variant?: RevealVariant;
  as?: RevealTag;
};

export function Reveal({
  children,
  className,
  delay = 0,
  variant = "up",
  as = "div",
  style,
  ...props
}: RevealProps) {
  const ref = React.useRef<HTMLElement | null>(null);

  // O cast é necessário porque cada tag tem um tipo de elemento diferente e o
  // TS não consegue unificar as assinaturas de `ref` entre elas. O componente
  // só lê `ref.current` como HTMLElement, então é seguro.
  const Tag = as as React.ElementType;

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = getObserver();
    if (!observer) {
      // Sem IntersectionObserver (navegador muito antigo), mostra direto —
      // conteúdo nunca fica invisível por falha de progressive enhancement.
      node.setAttribute("data-revealed", "true");
      return;
    }

    observer.observe(node);
    return () => observer.unobserve(node);
  }, []);

  return (
    <Tag
      ref={ref}
      data-reveal={variant}
      style={{ ...style, "--reveal-delay": `${delay}ms` } as React.CSSProperties}
      className={cn(className)}
      {...props}
    >
      {children}
    </Tag>
  );
}
