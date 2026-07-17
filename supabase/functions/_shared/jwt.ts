type AuthClaims = {
  email?: string;
  sub?: string;
  user_metadata?: {
    first_name?: string;
    full_name?: string;
    name?: string;
  };
};

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "="
  );

  return atob(padded);
}

export function getAuthClaims(req: Request): AuthClaims | null {
  const authorization = req.headers.get("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length);
  const [, payload] = token.split(".");

  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(decodeBase64Url(payload)) as AuthClaims;
  } catch {
    return null;
  }
}
