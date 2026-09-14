import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Eye, EyeOff, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { MemberImportDialog } from "@/components/member-import-dialog";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { deleteMember, listMembers, saveMember, setMemberStatus } from "@/lib/members.functions";
import { listOrgData } from "@/lib/org.functions";
import {
  ACCOUNT_TYPE_LABELS,
  CATEGORY_POSITIONS,
  MEMBER_CATEGORIES,
  MEMBER_CATEGORY_LABELS,
  categoryOf,
  isMemberAdmin,
  type AccountType,
  type MemberCategory,
} from "@/lib/roles";


export const Route = createFileRoute("/_authenticated/anggota")({
  head: () => ({
    meta: [
      { title: "Manajemen Anggota | SIM-AHIBS" },
      {
        name: "description",
        content: "Kelola data guru, tendik, dan santri SMPIT Putra Al-Hanif dalam satu tempat.",
      },
      { property: "og:title", content: "Manajemen Anggota | SIM-AHIBS" },
      {
        property: "og:description",
        content: "Kelola data guru, tendik, dan santri SMPIT Putra Al-Hanif dalam satu tempat.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MembersPage,
});

type Member = {
  id: string;
  name: string | null;
  display_name: string | null;
  password_hint?: string | null;
  email: string | null;
  phone: string | null;
  gender: "L" | "P" | null;
  status: "Aktif" | "Nonaktif";
  account_type: AccountType | null;
  category: MemberCategory | null;
  positions: AccountType[];
  class: string | null;
  dorm: string | null;
  halaqoh: string | null;
  nis_nip: string | null;
  rfid_card: string | null;
  avatar: string | null;
};

type FormState = {
  id?: string;
  name: string;
  display_name: string;
  email: string;
  password: string;
  password_hint?: string;
  phone: string;
  gender: "L" | "P" | "";
  status: "Aktif" | "Nonaktif";
  category: MemberCategory;
  positions: AccountType[];
  class: string;
  dorm: string;
  halaqoh: string;
  nis_nip: string;
  rfid_card: string;
  avatar: string;
};

const emptyForm: FormState = {
  name: "",
  display_name: "",
  email: "",
  password: "",
  phone: "",
  gender: "",
  status: "Aktif",
  category: "siswa",
  positions: [],
  class: "",
  dorm: "",
  halaqoh: "",
  nis_nip: "",
  rfid_card: "",
  avatar: "",
};

const NONE = "__none__";


function MembersPage() {
  const profileQuery = useCurrentProfile();
  const accountType = profileQuery.data?.account_type ?? null;
  const allowed = isMemberAdmin(accountType);

  const queryClient = useQueryClient();
  const fetchMembers = useServerFn(listMembers);
  const submitMember = useServerFn(saveMember);
  const changeStatus = useServerFn(setMemberStatus);
  const removeMember = useServerFn(deleteMember);
  const fetchOrg = useServerFn(listOrgData);

  const [filter, setFilter] = useState<"all" | MemberCategory>("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [toDelete, setToDelete] = useState<Member | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  const orgQuery = useQuery({
    queryKey: ["org-data"],
    queryFn: () => fetchOrg({}) as Promise<any>,
    enabled: allowed,
  });
  const classOptions: { id: string; name: string }[] = orgQuery.data?.classes ?? [];
  const dormOptions: { id: string; name: string }[] = orgQuery.data?.dorms ?? [];
  const halaqohOptions: { id: string; name: string }[] = orgQuery.data?.halaqohs ?? [];

  const membersQuery = useQuery({
    queryKey: ["members"],
    queryFn: () => fetchMembers({}) as Promise<Member[]>,
    enabled: allowed,

  });

  const saveMutation = useMutation({
    mutationFn: (values: FormState) => {
      const payload: Record<string, unknown> = { ...values };
      if (!values.password) delete payload["password"];
      if (!values.id) delete payload["id"];
      return submitMember({ data: payload });
    },
    onSuccess: async () => {
      toast.success("Data anggota tersimpan");
      setOpen(false);
      setForm(emptyForm);
      await queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const statusMutation = useMutation({
    mutationFn: (values: { id: string; status: "Aktif" | "Nonaktif" }) =>
      changeStatus({ data: values }),
    onSuccess: async () => {
      toast.success("Status akun diperbarui");
      await queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeMember({ data: { id } }),
    onSuccess: async () => {
      toast.success("Akun anggota dihapus permanen");
      setToDelete(null);
      await queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const rows = useMemo(() => {
    const list = membersQuery.data ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((m) => {
      const cat = m.category ?? categoryOf(m.account_type);
      if (filter !== "all" && cat !== filter) return false;
      if (!q) return true;
      return [m.name, m.display_name, m.email, m.nis_nip, m.class, m.dorm, m.halaqoh]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [membersQuery.data, filter, search]);

  function openCreate() {
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(member: Member) {
    const category = member.category ?? categoryOf(member.account_type);
    setForm({
      id: member.id,
      name: member.name ?? "",
      display_name: member.display_name ?? "",
      email: member.email ?? "",
      password: "",
      password_hint: member.password_hint ?? "",
      phone: member.phone ?? "",
      gender: member.gender ?? "",
      status: member.status,
      category,
      positions: (member.positions ?? []).filter((p) =>
        CATEGORY_POSITIONS[category].includes(p),
      ),
      class: member.class ?? "",
      dorm: member.dorm ?? "",
      halaqoh: member.halaqoh ?? "",
      nis_nip: member.nis_nip ?? "",
      rfid_card: member.rfid_card ?? "",
      avatar: member.avatar ?? "",
    });
    setOpen(true);
  }

  function togglePosition(position: AccountType) {
    setForm((f) => ({
      ...f,
      positions: f.positions.includes(position)
        ? f.positions.filter((p) => p !== position)
        : [...f.positions, position],
    }));
  }

  const isSantri = form.category === "siswa";


  return (
    <AppShell accountType={accountType}>
      <div className="border-b border-border pb-5">
        <p className="mb-1 text-xs font-bold uppercase text-accent">Data Induk</p>
        <h1 className="text-2xl font-extrabold text-foreground">Manajemen Anggota</h1>
      </div>

      {profileQuery.isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Memuat…</p>
      ) : !allowed ? (
        <p className="mt-6 rounded-xl border border-border bg-card p-6 text-sm font-medium text-muted-foreground">
          Halaman ini hanya dapat diakses oleh Super Admin, Mudir, Kepala Sekolah, dan Kepala Tata Usaha.
        </p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="relative min-w-52 flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Cari nama, email, nomor induk…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Cari anggota"
              />
            </div>
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="w-56" aria-label="Filter kategori akun">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua kategori</SelectItem>
                {MEMBER_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {MEMBER_CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <MemberImportDialog existing={membersQuery.data ?? []} />
            <Button type="button" onClick={openCreate}>
              <Plus /> Tambah Anggota
            </Button>
          </div>

          <div className="mt-5 overflow-x-auto rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Jabatan</TableHead>
                  <TableHead>NIS/NIY</TableHead>
                  <TableHead>Kelas/Asrama</TableHead>
                  <TableHead>Password</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {membersQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Memuat data…
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Belum ada anggota yang cocok.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="font-bold text-foreground">{m.name ?? "-"}</div>
                        {m.display_name && m.display_name !== m.name && (
                          <div className="text-xs font-medium text-accent">Panggilan: {m.display_name}</div>
                        )}
                        <div className="text-xs text-muted-foreground">{m.email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold">
                          {MEMBER_CATEGORY_LABELS[m.category ?? categoryOf(m.account_type)]}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {(m.positions ?? [])
                            .map((p) => ACCOUNT_TYPE_LABELS[p])
                            .join(", ") || "-"}
                        </div>
                      </TableCell>

                      <TableCell>{m.nis_nip ?? "-"}</TableCell>
                      <TableCell className="text-sm">
                        {m.account_type === "santri" ? (
                          <>
                            <div>{m.class ?? "-"}</div>
                            <div className="text-xs text-muted-foreground">{m.dorm ?? "-"}</div>
                          </>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <span>
                            {revealedPasswords[m.id]
                              ? m.password_hint || "(Belum dicatat)"
                              : "••••••••"}
                          </span>
                          {m.password_hint && (
                            <button
                              type="button"
                              onClick={() =>
                                setRevealedPasswords((prev) => ({
                                  ...prev,
                                  [m.id]: !prev[m.id],
                                }))
                              }
                              aria-label={
                                revealedPasswords[m.id]
                                  ? "Sembunyikan password"
                                  : "Lihat password"
                              }
                              className="text-muted-foreground hover:text-foreground"
                            >
                              {revealedPasswords[m.id] ? (
                                <EyeOff className="size-3.5" />
                              ) : (
                                <Eye className="size-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={m.status === "Aktif" ? "default" : "secondary"}>
                          {m.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(m)}>
                          Ubah
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={m.status === "Aktif" ? "text-destructive" : ""}
                          disabled={statusMutation.isPending}
                          onClick={() =>
                            statusMutation.mutate({
                              id: m.id,
                              status: m.status === "Aktif" ? "Nonaktif" : "Aktif",
                            })
                          }
                        >
                          {m.status === "Aktif" ? "Nonaktifkan" : "Aktifkan"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => setToDelete(m)}
                        >
                          Hapus
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Ubah Anggota" : "Tambah Anggota"}</DialogTitle>
            <DialogDescription>
              Isi data anggota. Kolom kelas, asrama, dan halaqoh hanya untuk santri.
            </DialogDescription>
          </DialogHeader>

          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate(form);
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="category">Kategori Akun</Label>
              <Select
                value={form.category}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, category: v as MemberCategory, positions: [] }))
                }
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEMBER_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {MEMBER_CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {CATEGORY_POSITIONS[form.category].length > 0 && (
              <div className="grid gap-2">
                <Label>Jabatan (boleh lebih dari satu)</Label>
                <div className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-2">
                  {CATEGORY_POSITIONS[form.category].map((p) => (
                    <label key={p} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={form.positions.includes(p)}
                        onCheckedChange={() => togglePosition(p)}
                      />
                      {ACCOUNT_TYPE_LABELS[p]}
                    </label>
                  ))}
                </div>
              </div>
            )}


            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Nama lengkap"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="display_name">Nama Panggilan (opsional)</Label>
                <Input
                  id="display_name"
                  value={form.display_name}
                  onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                  placeholder="Bisa dipakai untuk login"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="email">Email (opsional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Kosongkan bila tidak ada"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">
                  {form.id ? "Password Baru (opsional)" : "Password"}
                  {form.password_hint && (
                    <span className="ms-1.5 text-xs font-normal text-muted-foreground">
                      (Saat ini: <span className="font-mono">{form.password_hint}</span>)
                    </span>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="pr-10"
                    required={!form.id}
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder={form.id ? "Kosongkan jika tidak diubah" : "Password akun"}
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="nis_nip">Nomor Induk (NIS/NIY) — opsional</Label>
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="gender">Jenis Kelamin</Label>
                <Select
                  value={form.gender}
                  onValueChange={(v) => setForm((f) => ({ ...f, gender: v as "L" | "P" }))}
                >
                  <SelectTrigger id="gender">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">Laki-laki</SelectItem>
                    <SelectItem value="P">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status Akun</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, status: v as "Aktif" | "Nonaktif" }))
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aktif">Aktif</SelectItem>
                    <SelectItem value="Nonaktif">Nonaktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isSantri && (
              <div className="grid gap-4">
                {(
                  [
                    ["class", "Kelas", classOptions],
                    ["dorm", "Asrama", dormOptions],
                    ["halaqoh", "Halaqoh", halaqohOptions],
                  ] as const
                ).map(([field, label, options]) => (
                  <div key={field} className="grid gap-2">
                    <Label htmlFor={field}>{label} (opsional)</Label>
                    <Select
                      value={form[field] || NONE}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, [field]: v === NONE ? "" : v }))
                      }
                    >
                      <SelectTrigger id={field}>
                        <SelectValue placeholder={`Pilih ${label.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Belum ditentukan</SelectItem>
                        {options.map((o) => (
                          <SelectItem key={o.id} value={o.name}>
                            {o.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}


            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="rfid_card">Kartu RFID</Label>
                <Input
                  id="rfid_card"
                  value={form.rfid_card}
                  onChange={(e) => setForm((f) => ({ ...f, rfid_card: e.target.value }))}
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Menyimpan…" : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={toDelete !== null} onOpenChange={(v) => !v && setToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus akun anggota?</DialogTitle>
            <DialogDescription>
              Akun <strong>{toDelete?.name ?? "-"}</strong> beserta seluruh riwayat presensi dan
              pelanggarannya akan dihapus permanen dan tidak dapat dipulihkan. Bila hanya ingin
              menghentikan akses, gunakan tombol Nonaktifkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setToDelete(null)}>
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => toDelete && deleteMutation.mutate(toDelete.id)}
            >
              {deleteMutation.isPending ? "Menghapus…" : "Hapus Permanen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
