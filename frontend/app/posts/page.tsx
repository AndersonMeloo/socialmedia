  import { getNiches, getPosts, getPostsOverview } from "../lib/api";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "../lib/auth-client";
import { VideoUploadForm } from "./video-upload-form";

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR");
}

function isYouTubeLink(value: string | null) {
  if (!value) return false;

  return value.includes("youtube.com") || value.includes("youtu.be");
}

type PostsPageProps = {
  searchParams: Promise<{
    date?: string;
  }>;
};

export default async function PostsPage({ searchParams }: PostsPageProps) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? "";

  const resolvedSearchParams = await searchParams;
  const selectedDate = resolvedSearchParams.date;

  let posts = [] as Awaited<ReturnType<typeof getPosts>>;
  let overview = null as Awaited<ReturnType<typeof getPostsOverview>> | null;
  let niches = [] as Awaited<ReturnType<typeof getNiches>>;
  let errorMessage = "";

  try {
    if (!accessToken) {
      errorMessage = "Sessão não encontrada. Faça login novamente.";
    } else {
      const [postsResult, overviewResult, nichesResult] = await Promise.all([
        getPosts(accessToken),
        getPostsOverview(accessToken, selectedDate),
        getNiches(),
      ]);
      posts = postsResult;
      overview = overviewResult;
      niches = nichesResult;
    }
  } catch {
    errorMessage =
      "Não foi possivel carregar dados do backend. Verifique se a API Nest esta rodando na URL configurada.";
  }

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border bg-slate-50 p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Posts</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">Videos e Publicacoes</h2>
        <p className="mt-2 text-sm text-slate-600">
          Lista de videos postados com data/hora e resumo diario de visualizacoes,
          curtidas e comentarios.
        </p>

        <form method="GET" className="mt-4 flex flex-col gap-2 md:flex-row md:items-end">
          <label className="grid gap-1 text-sm text-slate-700">
            Filtrar overview por data
            <input
              type="date"
              name="date"
              defaultValue={selectedDate ?? ""}
              className="rounded-lg border bg-white px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg border bg-slate-900 px-4 py-2 text-sm font-semibold text-white cursor-pointer"
          >
            Aplicar filtro
          </button>
          <a href="/posts" className="rounded-lg border bg-white px-4 py-2 text-sm font-medium text-slate-700">
            Limpar
          </a>
        </form>
      </header>

      {errorMessage ? (
        <article className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {errorMessage}
        </article>
      ) : null}

      {!errorMessage && accessToken ? (
        <VideoUploadForm token={accessToken} niches={niches} />
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <article className="rounded-xl border bg-white p-4">
          <p className="text-sm text-slate-500">Views no dia</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {overview?.totalsForDay.views ?? 0}
          </p>
        </article>
        <article className="rounded-xl border bg-white p-4">
          <p className="text-sm text-slate-500">Curtidas no dia</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {overview?.totalsForDay.likes ?? 0}
          </p>
        </article>
        <article className="rounded-xl border bg-white p-4">
          <p className="text-sm text-slate-500">Comentarios no dia</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {overview?.totalsForDay.comments ?? 0}
          </p>
        </article>
        <article className="rounded-xl border bg-accent-soft p-4">
          <p className="text-sm text-slate-700">Views totais</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {overview?.totalViewsAllVideos ?? 0}
          </p>
        </article>
      </div>

      <section className="rounded-xl border bg-white p-4">
        <h3 className="text-lg font-semibold text-slate-900">Videos postados hoje</h3>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-200 border-collapse text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-slate-600">
                <th className="px-3 py-2">Titulo</th>
                <th className="hidden px-3 py-2 md:table-cell">Plataforma</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Postado em</th>
                <th className="hidden px-3 py-2 lg:table-cell">Agendado em</th>
                <th className="px-3 py-2">Link</th>
                <th className="px-3 py-2">Views</th>
                <th className="hidden px-3 py-2 md:table-cell">Curtidas</th>
                <th className="hidden px-3 py-2 md:table-cell">Comentarios</th>
              </tr>
            </thead>
            <tbody>
              {(overview?.postedToday ?? []).map((post) => (
                <tr key={post.id} className="border-b last:border-none">
                  <td className="px-3 py-2 font-medium text-slate-900">{post.title}</td>
                  <td className="hidden px-3 py-2 text-slate-700 md:table-cell">{post.platform}</td>
                  <td className="px-3 py-2 text-slate-700">{post.status}</td>
                  <td className="px-3 py-2 text-slate-700">{formatDate(post.postedAt)}</td>
                  <td className="hidden px-3 py-2 text-slate-700 lg:table-cell">{formatDate(post.scheduledAt)}</td>
                  <td className="px-3 py-2 text-slate-700">
                    {post.status === "POSTED" && isYouTubeLink(post.videoUrl) ? (
                      <a
                        href={post.videoUrl ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-700 underline decoration-sky-300 underline-offset-2"
                      >
                        Ver no YouTube
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{post.latestAnalytics?.views ?? 0}</td>
                  <td className="hidden px-3 py-2 text-slate-700 md:table-cell">{post.latestAnalytics?.likes ?? 0}</td>
                  <td className="hidden px-3 py-2 text-slate-700 md:table-cell">
                    {post.latestAnalytics?.comments ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-4">
        <h3 className="text-lg font-semibold text-slate-900">Todos os videos</h3>
        <p className="mt-1 text-sm text-slate-600">
          Seus ultimos {posts.length} registros retornados por GET /posts.
        </p>
        <ul className="mt-4 grid gap-3">
          {posts.map((post) => (
            <li key={post.id} className="rounded-lg border bg-slate-50 p-3">
              <p className="font-medium text-slate-900">{post.title}</p>
              <p className="mt-1 text-xs text-slate-600">
                {post.platform} | {post.status} | {formatDate(post.postedAt)}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Nicho: {post.niche?.name ?? "-"} | Views: {post.analytics[0]?.views ?? 0}
              </p>
              {post.status === "POSTED" && isYouTubeLink(post.videoUrl) ? (
                <a
                  href={post.videoUrl ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex text-xs font-medium text-sky-700 underline decoration-sky-300 underline-offset-2"
                >
                  Abrir vídeo no YouTube
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
