"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveSession } from "../../../lib/auth-client";

export default function GoogleCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accessToken = searchParams.get("accessToken");
  const refreshToken = searchParams.get("refreshToken");
  const hasTokens = Boolean(accessToken && refreshToken);

  useEffect(() => {
    if (accessToken && refreshToken) {
      saveSession(accessToken, refreshToken);
      router.replace("/");
      return;
    }

    router.replace("/login");
  }, [accessToken, refreshToken, router]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center p-4">
      <section className="w-full rounded-3xl border bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
          YouTube OAuth
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">
          Finalizando conexao
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {hasTokens
            ? "Conta conectada com sucesso. Redirecionando..."
            : "Nao foi possivel concluir o login do Google. Redirecionando..."}
        </p>
      </section>
    </main>
  );
}
