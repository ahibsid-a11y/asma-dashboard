import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { getMyProfile, updateMyProfile } from "@/lib/profile.functions";
import { ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/profil")({
  head: () => ({
    meta: [
      { title: "Profil Saya | SIM-AHIBS" },
      {
        name: "description",
        content: "Lihat dan perbarui data pribadi Anda di SIM-AHIBS SMPIT Putra Al-Hanif.",
      },
      { property: "og:title", content: "Profil Saya | SIM-AHIBS" },
      {
        property: "og:description",
        content: "Lihat dan perbarui data pribadi Anda di SIM-AHIBS SMPIT Putra Al-Hanif.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

type ProfileRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  gender: "L" | "P" | null;
  status: "Aktif" | "Nonaktif";
  account_type: AccountType | null;
  class: string | null;
  dorm: string | null;
  halaqoh: string | null;
  nis_nip: string | null;
  rfid_card: string | null;
  avatar: string | null;
};

type FormState = {
  name: string;
  email: string;
  password: string;
  phone: string;
  gender: "" | "L" | "P";
  class: string;
  dorm: string;
  halaqoh: string;
  nis_nip: string;
  rfid_card: string;
  avatar: string;
};

const emptyForm: FormState = {
  name: "",
  email: "",
  password: "",
  phone: "",
  gender: "",
  class: "",
  dorm: "",
  halaqoh: "",
  nis_nip: "",
  rfid_card: "",
  avatar: "",
};

function ProfilePage() {
  const currentProfile = useCurrentProfile();
  const queryClient = useQueryClient();
  const fetchProfile = useServerFn(getMyProfile);
  const saveProfile = useServerFn(updateMyProfile);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [showPassword, setShowPassword] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile({}) as Promise<ProfileRow | null>,
  });

  const data = profileQuery.data ?? null;

  useEffect(() => {
    if (!data) return;
    setForm({
      name: data.name ?? "",
      email: data.email ?? "",
      password: "",
      phone: data.phone ?? "",
      gender: data.gender ?? "",
      class: data.class ?? "",
      dorm: data.dorm ?? "",
      halaqoh: data.halaqoh ?? "",
      nis_nip: data.nis_nip ?? "",
      rfid_card: data.rfid_card ?? "",
      avatar: data.avatar ?? "",
    });
  }, [data]);

  const mutation = useMutation({
    mutationFn: (values: FormState) => {
      const payload: Record<string, unknown> = { ...values };
      if (!values.password) delete payload["password"];
      if (!values.gender) delete payload["gender"];
      return saveProfile({ data: payload });
    },
    onSuccess: async () => {
      toast.success("Profil berhasil diperbarui");
      setForm((f) => ({ ...f, password: "" }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["my-profile"] }),
        queryClient.invalidateQueries({ queryKey: ["current-profile"] }),
      ]);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const isSantri = data?.account_type === "santri";

  return (
    <AppShell accountType={currentProfile.data?.account_type ?? null}>
      <div className="border-b border-border pb-5">
        <p className="mb-1 text-xs font-bold uppercase text-accent">Akun Saya</p>
        <h1 className="text-2xl font-extrabold text-foreground">Profil Saya</h1>
      </div>

      {profileQuery.isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Memuat…</p>
      ) : !data ? (
        <p className="mt-6 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Data profil belum tersedia.
        </p>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-border bg-card p-6 text-center">
            {form.avatar ? (
              <img
                src={form.avatar}
                alt={`Foto ${form.name || "anggota"}`}
                className="mx-auto size-24 rounded-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="mx-auto grid size-24 place-items-center rounded-full bg-primary text-3xl font-extrabold text-primary-foreground">
                {(form.name || "A").charAt(0).toUpperCase()}
              </div>
            )}
            <p className="mt-4 text-lg font-extrabold text-foreground">{form.name || "-"}</p>
            <p className="text-sm text-muted-foreground">
              {data.account_type ? ACCOUNT_TYPE_LABELS[data.account_type] : "-"}
            </p>
            <Badge className="mt-3" variant={data.status === "Aktif" ? "default" : "secondary"}>
              {data.status}
            </Badge>
            <p className="mt-4 text-xs text-muted-foreground">
              Jenis akun dan status hanya dapat diubah oleh admin.
            </p>
          </aside>

          <form
            className="grid gap-5 rounded-2xl border border-border bg-card p-6"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate(form);
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="name">Nama Lengkap</Label>
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="email">Email (opsional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password Baru (opsional)</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="pr-10"
                    placeholder="Kosongkan bila tidak diubah"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="nis_nip">Nomor Induk (NIS/NIY)</Label>
                <Input
                  id="nis_nip"
                  value={form.nis_nip}
                  onChange={(e) => setForm((f) => ({ ...f, nis_nip: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">No. HP</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="gender">Jenis Kelamin</Label>
                <Select
                  {...(form.gender ? { value: form.gender } : {})}
                  onValueChange={(v) => setForm((f) => ({ ...f, gender: v as "L" | "P" }))}
                >
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Pilih" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">Laki-laki</SelectItem>
                    <SelectItem value="P">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rfid_card">Kartu RFID</Label>
                <Input
                  id="rfid_card"
                  value={form.rfid_card}
                  onChange={(e) => setForm((f) => ({ ...f, rfid_card: e.target.value }))}
                />
              </div>
            </div>

            {isSantri && (
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="class">Kelas</Label>
                  <Input
                    id="class"
                    value={form.class}
                    onChange={(e) => setForm((f) => ({ ...f, class: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dorm">Asrama</Label>
                  <Input
                    id="dorm"
                    value={form.dorm}
                    onChange={(e) => setForm((f) => ({ ...f, dorm: e.target.value }))}
                  />
                </div>
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="halaqoh">Halaqoh</Label>
                <Input
                  id="halaqoh"
                  value={form.halaqoh}
                  onChange={(e) => setForm((f) => ({ ...f, halaqoh: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="avatar">URL Foto</Label>
                <Input
                  id="avatar"
                  value={form.avatar}
                  onChange={(e) => setForm((f) => ({ ...f, avatar: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Menyimpan…" : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
