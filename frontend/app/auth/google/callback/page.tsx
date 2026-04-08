import GoogleCallbackClient from "./callback-client";

type GoogleCallbackPageProps = {
  searchParams: Promise<{
    accessToken?: string | string[];
    refreshToken?: string | string[];
  }>;
};

export default async function GoogleCallbackPage({
  searchParams,
}: GoogleCallbackPageProps) {
  const params = await searchParams;

  const accessToken = Array.isArray(params.accessToken)
    ? params.accessToken[0] ?? ""
    : params.accessToken ?? "";

  const refreshToken = Array.isArray(params.refreshToken)
    ? params.refreshToken[0] ?? ""
    : params.refreshToken ?? "";

  return (
    <GoogleCallbackClient
      accessToken={accessToken}
      refreshToken={refreshToken}
    />
  );
}
