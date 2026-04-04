type LoginJson = Record<string, unknown>;

function readMessage(body: LoginJson): string | undefined {
  const m = body.message ?? body.error ?? body.detail;
  return typeof m === 'string' ? m : undefined;
}

/**
 * POST JSON `{ email, password }` to `VITE_AUTH_LOGIN_URL`.
 * On success, optional `{ token }` is stored in sessionStorage for report requests.
 */
export async function loginWithApi(
  email: string,
  password: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const url = (import.meta.env.VITE_AUTH_LOGIN_URL as string | undefined)?.trim();
  if (!url) {
    const fe = (import.meta.env.VITE_FALLBACK_LOGIN_EMAIL as string | undefined)?.trim();
    const fp = import.meta.env.VITE_FALLBACK_LOGIN_PASSWORD as string | undefined;
    if (fe && fp !== undefined && email.trim() === fe && password === fp) {
      sessionStorage.removeItem('authToken');
      return { ok: true };
    }
    return {
      ok: false,
      message:
        'Set VITE_AUTH_LOGIN_URL (POST JSON: email, password), or for local-only demo set VITE_FALLBACK_LOGIN_EMAIL and VITE_FALLBACK_LOGIN_PASSWORD in .env — never commit .env.',
    };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
    });

    if (res.ok) {
      try {
        const data = (await res.json()) as LoginJson;
        const token = data.token ?? data.accessToken ?? data.access_token;
        if (typeof token === 'string' && token) {
          sessionStorage.setItem('authToken', token);
        } else {
          sessionStorage.removeItem('authToken');
        }
      } catch {
        sessionStorage.removeItem('authToken');
      }
      return { ok: true };
    }

    let message = `Sign-in failed (${res.status})`;
    try {
      const data = (await res.json()) as LoginJson;
      const m = readMessage(data);
      if (m) message = m;
    } catch {
      /* ignore */
    }
    return { ok: false, message };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'Network error during sign-in.',
    };
  }
}
