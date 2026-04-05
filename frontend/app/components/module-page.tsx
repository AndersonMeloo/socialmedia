import { BackendModule, methodStyles } from "../lib/backend-routes";

type ModulePageProps = {
  moduleData: BackendModule;
};

export function ModulePage({ moduleData }: ModulePageProps) {
  return (
    <section className="space-y-6">
      <header className="rounded-2xl border bg-slate-50 p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Modulo</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">{moduleData.title}</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">{moduleData.description}</p>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-lg border bg-white px-3 py-1 font-mono text-slate-800">
            Base: {moduleData.basePath}
          </span>
          <span className="rounded-lg border bg-white px-3 py-1 text-slate-700">
            Endpoints: {moduleData.endpoints.length}
          </span>
        </div>
      </header>

      <div className="grid gap-3">
        {moduleData.endpoints.map((endpoint) => (
          <article
            key={`${moduleData.slug}-${endpoint.method}-${endpoint.path}`}
            className="rounded-xl border bg-white p-4"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${methodStyles[endpoint.method]}`}
                  >
                    {endpoint.method}
                  </span>
                  <span className="font-mono text-sm text-slate-900">{endpoint.path}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{endpoint.note}</p>
              </div>

              <span className="w-fit rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs uppercase tracking-[0.14em] text-slate-600">
                {endpoint.access}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
