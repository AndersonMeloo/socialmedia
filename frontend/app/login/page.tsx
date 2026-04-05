"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser } from "../lib/api";
import { saveSession } from "../lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const tokens = await loginUser({ email, password });
      saveSession(tokens.accessToken, tokens.refreshToken);
      router.push("/");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Falha ao realizar login.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center p-4">
      <section className="grid w-full max-w-4xl gap-4 rounded-3xl border bg-white p-4 shadow-sm md:grid-cols-2 md:p-8">
        <article className="rounded-2xl bg-panel-strong p-6 text-white">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">SocialMediaAutoPublisher</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight">Entre na sua dashboard</h1>
          <p className="mt-3 text-sm text-cyan-100">
            Login necessario para acessar visao geral, posts, usuarios e configuracoes.
          </p>
        </article>

        <form onSubmit={onSubmit} className="rounded-2xl border bg-slate-50 p-5">
          <h2 className="text-xl font-semibold text-slate-900">Login</h2>

          <label className="mt-4 grid gap-1 text-sm text-slate-700">
            E-mail
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
              className="rounded-lg border bg-white px-3 py-2"
              placeholder="email@dominio.com"
            />
          </label>

          <label className="mt-3 grid gap-1 text-sm text-slate-700">
            Senha
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
              className="rounded-lg border bg-white px-3 py-2"
              placeholder="Sua senha"
            />
          </label>

          {errorMessage ? (
            <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-lg border bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <p className="mt-3 text-sm text-slate-600">
            Nao tem conta?{" "}
            <Link href="/cadastro" className="font-semibold text-cyan-700">
              Criar cadastro
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
