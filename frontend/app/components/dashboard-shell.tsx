"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearSession, getSession } from "../lib/auth-client";
import {
    API_BASE_URL,
    disconnectYoutubeConnection,
    getYoutubeConnectionStatus,
} from "../lib/api";

const navItems = [
    { href: "/", label: "Visao Geral" },
    { href: "/auth", label: "Auth" },
    { href: "/users", label: "Usuário" },
    { href: "/niches", label: "Nichos" },
    { href: "/posts", label: "Postagens" },
];

type DashboardShellProps = {
    children: ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
    const pathname = usePathname();
    const router = useRouter();
    const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/cadastro");
    const [youtubeConnected, setYoutubeConnected] = useState(false);
    const [youtubeLoading, setYoutubeLoading] = useState(true);
    const [youtubeActionLoading, setYoutubeActionLoading] = useState(false);

    useEffect(() => {
        async function loadYoutubeStatus() {
            if (isAuthPage) {
                setYoutubeLoading(false);
                return;
            }

            setYoutubeLoading(true);
            const session = getSession();

            if (!session.accessToken || !session.userId) {
                setYoutubeConnected(false);
                setYoutubeLoading(false);
                return;
            }

            try {
                const result = await getYoutubeConnectionStatus(
                    session.userId,
                    session.accessToken,
                );
                setYoutubeConnected(result.connected);
            } catch {
                setYoutubeConnected(false);
            } finally {
                setYoutubeLoading(false);
            }
        }

        void loadYoutubeStatus();
    }, [isAuthPage, pathname]);

    if (isAuthPage) {
        return <div className="min-h-screen w-full">{children}</div>;
    }

    function handleLogout() {
        clearSession();
        setYoutubeConnected(false);
        setYoutubeLoading(false);
        router.push("/login");
    }

    function handleConnectYouTube() {
        window.location.assign(`${API_BASE_URL}/auth/google`);
    }

    async function handleDisconnectYouTube() {
        const session = getSession();

        if (!session.accessToken || !session.userId) {
            return;
        }

        setYoutubeActionLoading(true);
        try {
            await disconnectYoutubeConnection(session.userId, session.accessToken);
            setYoutubeConnected(false);
        } finally {
            setYoutubeActionLoading(false);
        }
    }

    return (
        <div className="min-h-screen w-full p-2 md:p-3">
            <div className="grid min-h-[calc(100vh-1rem)] w-full grid-cols-1 gap-3 md:grid-cols-[260px_1fr]">
                <aside className="rounded-3xl border bg-panel p-4 shadow-sm md:p-6">
                    <div className="mb-6 rounded-2xl bg-panel-strong p-4 text-white">
                        <p className="text-xs uppercase tracking-[0.2em] text-cyan-100">
                            {/* SocialMediaAutoPublisher */}
                        </p>
                        <h1 className="mt-2 text-lg font-semibold leading-tight text-center">
                            Dashboard
                        </h1>
                    </div>

                    <nav className="grid grid-cols-2 gap-2 md:grid-cols-1">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="rounded-xl border bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-50"
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    {youtubeConnected ? (
                        <button
                            type="button"
                            onClick={() => void handleDisconnectYouTube()}
                            disabled={youtubeActionLoading}
                            className="mt-3 w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-60 cursor-pointer"
                        >
                            {youtubeActionLoading
                                ? "Desconectando..."
                                : "Desconectar conta YouTube"}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleConnectYouTube}
                            disabled={youtubeLoading}
                            className="mt-3 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                        >
                            {youtubeLoading ? "Verificando conexao..." : "Conectar YouTube"}
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="mt-3 w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 cursor-pointer"
                    >
                        Sair
                    </button>
                </aside>

                <main className="rounded-3xl border bg-panel p-4 shadow-sm md:p-8">
                    {!youtubeLoading && !youtubeConnected ? (
                        <section className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                            <h2 className="text-base font-semibold text-amber-900">
                                Conexao com YouTube pendente
                            </h2>
                            <p className="mt-1 text-sm text-amber-800">
                                Voce pode navegar normalmente. Conecte o YouTube para habilitar
                                recursos que dependem da conta da plataforma.
                            </p>
                            <button
                                type="button"
                                onClick={handleConnectYouTube}
                                className="mt-3 rounded-lg border border-emerald-300 bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-200"
                            >
                                Conectar YouTube agora
                            </button>
                        </section>
                    ) : null}

                    {children}
                </main>
            </div>
        </div>
    );
}
