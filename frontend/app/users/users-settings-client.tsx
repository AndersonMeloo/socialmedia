"use client";

import { FormEvent, useState } from "react";
import {
  deleteUserById,
  getUserById,
  type UserProfile,
  updateUserById,
} from "../lib/api";
import { getSession } from "../lib/auth-client";
import { useEffect } from "react";

export function UsersSettingsClient() {
  const [token, setToken] = useState("");
  const [userId, setUserId] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function loadProfile(nextToken: string, nextUserId: string) {
    if (!nextToken || !nextUserId) {
      setFeedback("Sessao incompleta. Faca login novamente.");
      return;
    }

    setLoading(true);
    setFeedback("");

    try {
      const result = await getUserById(nextUserId, nextToken);
      setProfile(result);
      setName(result.name ?? "");
      setEmail(result.email ?? "");
      setPassword("");
      setFeedback("Perfil carregado com sucesso.");
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Erro ao carregar perfil.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const session = getSession();
    if (!session.accessToken || !session.userId) {
      setFeedback("Não foi encontrada sessão ativa. Faça login antes de acessar Users.");
      return;
    }

    setToken(session.accessToken);
    setUserId(session.userId);
    void loadProfile(session.accessToken, session.userId);
  }, []);

  async function onLoadProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !userId) {
      setFeedback("Informe token JWT e userId para carregar o perfil.");
      return;
    }

    await loadProfile(token, userId);
  }

  async function onSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !userId) {
      setFeedback("Informe token JWT e userId para salvar alterações.");
      return;
    }

    setLoading(true);
    setFeedback("");

    try {
      const result = await updateUserById(userId, token, {
        name: name || undefined,
        email: email || undefined,
        password: password || undefined,
      });
      setProfile(result);
      setPassword("");
      setFeedback("Perfil atualizado com sucesso.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro ao salvar perfil.");
    } finally {
      setLoading(false);
    }
  }

  async function onDeleteProfile() {
    if (!token || !userId) {
      setFeedback("Informe token JWT e userId para deletar.");
      return;
    }

    const confirmed = window.confirm(
      "Tem certeza que deseja deletar este usuario? Esta ação não pode ser desfeita.",
    );
    if (!confirmed) return;

    setLoading(true);
    setFeedback("");

    try {
      const result = await deleteUserById(userId, token);
      setFeedback(result.message || "Usuario removido.");
      setProfile(null);
      setName("");
      setEmail("");
      setPassword("");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro ao deletar usuario.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border bg-slate-50 p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Users</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">
          Perfil, Configurações e Conta
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Tela conectada ao backend para buscar, editar e deletar usuario.
        </p>
      </header>

      <form onSubmit={onLoadProfile} className="rounded-xl border bg-white p-4">
        <h3 className="text-base font-semibold text-slate-900">Autenticação da tela</h3>
        <p className="mt-1 text-sm text-slate-600">
          Token e userId são preenchidos automaticamente após login.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <label className="grid gap-1 text-sm text-slate-700">
            JWT Token
            <input
              value={token}
              onChange={(event) => setToken(event.target.value)}
              className="rounded-lg border bg-slate-50 px-3 py-2"
              placeholder="Bearer token sem o prefixo"
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-700">
            User ID
            <input
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              className="rounded-lg border bg-slate-50 px-3 py-2"
              placeholder="UUID do usuario"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-4 rounded-lg border bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 cursor-pointer"
        >
          {loading ? "Carregando..." : "Carregar perfil"}
        </button>
      </form>

      <form onSubmit={onSaveProfile} className="rounded-xl border bg-white p-4">
        <h3 className="text-base font-semibold text-slate-900">Editar dados do perfil</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <label className="grid gap-1 text-sm text-slate-700">
            Nome
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-lg border bg-slate-50 px-3 py-2"
              placeholder="Nome do usuario"
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-700">
            E-mail
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-lg border bg-slate-50 px-3 py-2"
              placeholder="email@dominio.com"
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-700">
            Nova senha
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-lg border bg-slate-50 px-3 py-2"
              type="password"
              placeholder="Opcional"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg border bg-cyan-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 cursor-pointer"
          >
            Salvar alterações
          </button>
          <button
            type="button"
            onClick={onDeleteProfile}
            disabled={loading}
            className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-60 cursor-pointer"
          >
            Deletar conta
          </button>
        </div>
      </form>

      <section className="rounded-xl border bg-white p-4">
        <h3 className="text-base font-semibold text-slate-900">Dados atuais</h3>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
          {JSON.stringify(profile, null, 2)}
        </pre>
      </section>

      {feedback ? (
        <p className="rounded-lg border bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {feedback}
        </p>
      ) : null}
    </section>
  );
}
