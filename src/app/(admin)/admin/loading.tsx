/**
 * Esqueleto das rotas do painel.
 *
 * Aqui vale um esqueleto detalhado (ao contrário do site): as páginas do admin
 * são sempre dinâmicas e consultam o banco, então a espera é real e o
 * operador se beneficia de ver a estrutura chegando.
 */
export default function AdminLoading() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Carregando…</span>

      {/* Cabeçalho */}
      <div className="mb-8 space-y-3">
        <div className="skeleton h-9 w-64" />
        <div className="skeleton h-4 w-full max-w-md" />
      </div>

      {/* Métricas */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="skeleton h-32" />
        ))}
      </div>

      {/* Conteúdo */}
      <div className="mt-6 space-y-3">
        <div className="skeleton h-64" />
        <div className="grid gap-3 xl:grid-cols-2">
          <div className="skeleton h-56" />
          <div className="skeleton h-56" />
        </div>
      </div>
    </div>
  );
}
