import Link from "next/link";
import { cookies } from "next/headers";
import { getPostsOverview } from "./lib/api";
import { ACCESS_TOKEN_COOKIE } from "./lib/auth-client";
import { backendModules } from "./lib/backend-routes";

export default async function Home() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? "";

  const totalEndpoints = backendModules.reduce(
    (acc, moduleItem) => acc + moduleItem.endpoints.length,
    0,
  );

  let overview:
    | {
        date: string;
        totalsForDay: {
          views: number;
          likes: number;
          comments: number;
        };
        totalViewsAllVideos: number;
        postedToday: { id: string }[];
      }
    | null = null;

  try {
    if (accessToken) {
      overview = await getPostsOverview(accessToken);
    }
  } catch {
    overview = null;
  }

  const metrics = [
    { label: "Views", value: overview?.totalsForDay.views ?? 0, tone: "bg-cyan-500" },
    { label: "Curtidas", value: overview?.totalsForDay.likes ?? 0, tone: "bg-emerald-500" },
    {
      label: "Comentarios",
      value: overview?.totalsForDay.comments ?? 0,
      tone: "bg-amber-500",
    },
  ];

  const maxMetric = Math.max(...metrics.map((item) => item.value), 1);

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border bg-panel-strong p-6 text-white">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Visão geral</p>
        <h2 className="mt-2 text-3xl font-semibold">Painel das Rotas do Backend</h2>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="rounded-xl border bg-white p-4">
          <p className="text-sm text-slate-500">Modulos mapeados</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{backendModules.length}</p>
        </article>
        <article className="rounded-xl border bg-white p-4">
          <p className="text-sm text-slate-500">Views no dia</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {overview?.totalsForDay.views ?? 0}
          </p>
        </article>
        <article className="rounded-xl border bg-accent-soft p-4">
          <p className="text-sm text-slate-700">Views totais dos videos</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {overview?.totalViewsAllVideos ?? 0}
          </p>
        </article>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="rounded-xl border bg-white p-4">
          <p className="text-sm text-slate-500">Curtidas no dia</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {overview?.totalsForDay.likes ?? 0}
          </p>
        </article>
        <article className="rounded-xl border bg-white p-4">
          <p className="text-sm text-slate-500">Comentarios no dia</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {overview?.totalsForDay.comments ?? 0}
          </p>
        </article>
        <article className="rounded-xl border bg-white p-4">
          <p className="text-sm text-slate-500">Videos postados hoje</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {overview?.postedToday.length ?? 0}
          </p>
        </article>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {backendModules.map((moduleItem) => (
          <Link
            key={moduleItem.slug}
            href={`/${moduleItem.slug}`}
            className="rounded-2xl border bg-white p-4 transition hover:-translate-y-0.5 hover:border-cyan-300"
          >
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{moduleItem.basePath}</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">{moduleItem.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{moduleItem.description}</p>
            <p className="mt-3 text-sm font-medium text-cyan-700">
              {moduleItem.endpoints.length} endpoint(s)
            </p>
          </Link>
        ))}
      </div>

      <section className="rounded-xl border bg-white p-4">
        <h3 className="text-lg font-semibold text-slate-900">Resumo da integracao</h3>
        <p className="mt-2 text-sm text-slate-600">
          {overview
            ? `Dados de ${overview.date} carregados do backend. Endpoints mapeados: ${totalEndpoints}.`
            : "Backend indisponivel agora. Quando subir a API, essa tela exibe metricas reais automaticamente."}
        </p>
      </section>

      <section className="rounded-xl border bg-white p-4">
        <h3 className="text-lg font-semibold text-slate-900">Grafico diario</h3>
        <p className="mt-1 text-sm text-slate-600">
          Comparativo de views, curtidas e comentarios no dia selecionado pelo backend.
        </p>

        <div className="mt-4 grid gap-3">
          {metrics.map((metric) => (
            <article key={metric.label} className="rounded-lg border bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between text-sm">
                <p className="font-medium text-slate-800">{metric.label}</p>
                <p className="font-semibold text-slate-900">{metric.value}</p>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full ${metric.tone}`}
                  style={{ width: `${(metric.value / maxMetric) * 100}%` }}
                />
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
