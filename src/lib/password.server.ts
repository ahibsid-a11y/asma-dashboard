/**
 * Menyimpan password tanpa batas minimal panjang.
 * Mencoba jalur standar Auth lebih dulu; bila ditolak karena aturan
 * panjang/kekuatan password, gunakan fungsi database admin_set_password
 * (hanya bisa dijalankan service_role).
 */
export async function setUserPassword(
  supabaseAdmin: any,
  userId: string,
  password: string,
): Promise<void> {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
  if (!error) return;
  const { error: rpcError } = await supabaseAdmin.rpc("admin_set_password", {
    _user_id: userId,
    _password: password,
  });
  if (rpcError) throw new Error(rpcError.message);
}

/** Buat akun Auth; bila password pendek ditolak, buat dengan password sementara lalu timpa. */
export async function createAuthUser(
  supabaseAdmin: any,
  params: { email: string; password: string; user_metadata: Record<string, unknown> },
) {
  const first = await supabaseAdmin.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true,
    user_metadata: params.user_metadata,
  });
  if (!first.error && first.data?.user) return first.data.user;

  const msg = (first.error?.message ?? "").toLowerCase();
  if (!msg.includes("password")) {
    throw new Error(first.error?.message ?? "Gagal membuat akun");
  }
  const tempPassword = `Tmp${crypto.randomUUID()}Aa1!`;
  const second = await supabaseAdmin.auth.admin.createUser({
    email: params.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: params.user_metadata,
  });
  if (second.error || !second.data?.user) {
    throw new Error(second.error?.message ?? "Gagal membuat akun");
  }
  await setUserPassword(supabaseAdmin, second.data.user.id, params.password);
  return second.data.user;
}
