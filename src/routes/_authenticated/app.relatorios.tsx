import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — VozIA" }] }),
  component: () => (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h2 className="text-2xl font-semibold mb-2">Relatórios</h2>
      <p className="text-muted-foreground">Em breve.</p>
    </div>
  ),
});
