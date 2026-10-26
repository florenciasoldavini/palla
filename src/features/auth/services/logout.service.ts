interface AccountAuth {
  signOut: (options: { scope: "local" }) => Promise<{ error: unknown }>;
  getSession: () => Promise<{
    data: { session: unknown | null };
    error: unknown;
  }>;
}

export async function endAccountSession(
  auth: AccountAuth,
  unregisterPush: () => Promise<void>
) {
  // Device revocation is best effort offline. Its persistent retry marker is
  // consumed before the installation can register for notifications again.
  await unregisterPush().catch(() => undefined);
  const { error } = await auth.signOut({ scope: "local" });
  if (!error) return;
  // The installed SDK clears local credentials even if remote revocation fails.
  // Verify that outcome rather than keeping the UI logged in on a network error.
  const current = await auth.getSession();
  if (current.error || current.data.session) throw error;
}
