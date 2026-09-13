import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Pencil, Plus, Save, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { deleteGroup, listOrgData, saveGroup, setGroupMembers } from "@/lib/org.functions";
import { ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/roles";

type Kind = "class" | "dorm" | "halaqoh";

type Group = {
  id: string;
  name: string;
  grade?: number;
  homeroom_teacher_id?: string | null;
  musyrif_id?: string | null;
};

type Person = {
  id: string;
  name: string | null;
  nis_nip: string | null;
  account_type: AccountType | null;
  class: string | null;
  dorm: string | null;
  halaqoh: string | null;
};

const NONE = "__none__";
const GRADES = [7, 8, 9, 10, 11, 12];

export function OrgManager({
  kind,
  title,
  description,
  leaderLabel,
}: {
  kind: Kind;
  title: string;
  description: string;
  leaderLabel: string;
}) {
  const queryClient = useQueryClient();
  const fetchOrg = useServerFn(listOrgData);
  const submitGroup = useServerFn(saveGroup);
  const removeGroup = useServerFn(deleteGroup);
  const assignMembers = useServerFn(setGroupMembers);

  const [form, setForm] = useState<{ id?: string; name: string; grade: number; leaderId: string }>({
    name: "",
    grade: 7,
    leaderId: NONE,
  });
  const [openForm, setOpenForm] = useState(false);
  const [memberTarget, setMemberTarget] = useState<Group | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const orgQuery = useQuery({
    queryKey: ["org-data"],
    queryFn: () => fetchOrg({}) as Promise<any>,
  });

  const groups: Group[] = useMemo(() => {
    const data = orgQuery.data;
    if (!data) return [];
    return kind === "class" ? data.classes : kind === "dorm" ? data.dorms : data.halaqohs;
  }, [orgQuery.data, kind]);

  const students: Person[] = orgQuery.data?.students ?? [];
  const staff: Person[] = orgQuery.data?.staff ?? [];
  const field = kind === "class" ? "class" : kind === "dorm" ? "dorm" : "halaqoh";

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["org-data"] });

  const saveMutation = useMutation({
    mutationFn: () =>
      submitGroup({
        data: {
          kind,
          ...(form.id ? { id: form.id } : {}),
          name: form.name,
          ...(kind === "class" ? { grade: form.grade } : {}),
          leaderId: form.leaderId === NONE ? null : form.leaderId,
        },
      }),
    onSuccess: async () => {
      toast.success("Data tersimpan");
      setOpenForm(false);
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeGroup({ data: { kind, id } }),
    onSuccess: async () => {
      toast.success("Data dihapus");
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const membersMutation = useMutation({
    mutationFn: () => {
      const name = memberTarget?.name ?? "";
      const current = students.filter((s) => s[field] === name).map((s) => s.id);
      const removed = current.filter((id) => !selected.includes(id));
      const added = selected.filter((id) => !current.includes(id));
      return Promise.all([
        added.length ? assignMembers({ data: { kind, name, memberIds: added } }) : null,
        removed.length ? assignMembers({ data: { kind, name: null, memberIds: removed } }) : null,
      ]);
    },
    onSuccess: async () => {
      toast.success("Anggota diperbarui");
      setMemberTarget(null);
      await invalidate();
      await queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openCreate() {
    setForm({ name: "", grade: 7, leaderId: NONE });
    setOpenForm(true);
  }

  function openEdit(group: Group) {
    setForm({
      id: group.id,
      name: group.name,
      grade: group.grade ?? 7,
      leaderId: (kind === "class" ? group.homeroom_teacher_id : group.musyrif_id) ?? NONE,
    });
    setOpenForm(true);
  }

  function openMembers(group: Group) {
    setMemberTarget(group);
    setSearch("");
    setSelected(students.filter((s) => s[field] === group.name).map((s) => s.id));
  }

  const filteredStudents = students.filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [s.name, s.nis_nip].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
  });

  const leaderName = (id?: string | null) =>
    staff.find((p) => p.id === id)?.name ?? "Belum ditentukan";

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus /> Tambah
        </Button>
      </div>

      {orgQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat data…</p>
      ) : groups.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Belum ada data. Tekan Tambah untuk membuat yang pertama.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => {
            const members = students.filter((s) => s[field] === group.name);
            return (
              <article
                key={group.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-sm"
              >
                <h2 className="text-lg font-bold text-foreground">{group.name}</h2>
                {kind === "class" && (
                  <p className="text-xs font-semibold text-primary">Kelas {group.grade}</p>
                )}
                <p className="mt-2 text-sm text-muted-foreground">
                  {leaderLabel}: {leaderName(kind === "class" ? group.homeroom_teacher_id : group.musyrif_id)}
                </p>
                <p className="text-sm text-muted-foreground">Jumlah siswa: {members.length}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => openMembers(group)}>
                    <Users /> Anggota
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => openEdit(group)}>
                    <Pencil /> Ubah
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm(`Hapus ${group.name}?`)) deleteMutation.mutate(group.id);
                    }}
                  >
                    <Trash2 /> Hapus
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Ubah Data" : "Tambah Data"}</DialogTitle>
            <DialogDescription>Lengkapi nama dan penanggung jawab.</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
          >
            {kind === "class" && (
              <div className="grid gap-2">
                <Label htmlFor="grade">Tingkat Kelas</Label>
                <Select
                  value={String(form.grade)}
                  onValueChange={(v) => setForm((f) => ({ ...f, grade: Number(v) }))}
                >
                  <SelectTrigger id="grade">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADES.map((g) => (
                      <SelectItem key={g} value={String(g)}>
                        Kelas {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="group-name">Nama</Label>
              <Input
                id="group-name"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="leader">{leaderLabel}</Label>
              <Select
                value={form.leaderId}
                onValueChange={(v) => setForm((f) => ({ ...f, leaderId: v }))}
              >
                <SelectTrigger id="leader">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Belum ditentukan</SelectItem>
                  {staff.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.account_type ? `— ${ACCOUNT_TYPE_LABELS[p.account_type]}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenForm(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                <Save /> Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={memberTarget !== null} onOpenChange={(v) => !v && setMemberTarget(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Anggota {memberTarget?.name}</DialogTitle>
            <DialogDescription>
              Centang siswa yang termasuk. Menghilangkan centang akan mengeluarkan siswa tersebut.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Cari nama atau nomor induk…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-80 space-y-1 overflow-y-auto rounded-xl border border-border p-3">
            {filteredStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada siswa yang cocok.</p>
            ) : (
              filteredStudents.map((s) => (
                <label key={s.id} className="flex items-center gap-3 rounded-lg p-2 text-sm hover:bg-muted">
                  <Checkbox
                    checked={selected.includes(s.id)}
                    onCheckedChange={() =>
                      setSelected((prev) =>
                        prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id],
                      )
                    }
                  />
                  <span className="font-semibold">{s.name}</span>
                  <span className="text-xs text-muted-foreground">{s.nis_nip ?? "-"}</span>
                  {s[field] && s[field] !== memberTarget?.name && (
                    <span className="ml-auto text-xs text-muted-foreground">{s[field]}</span>
                  )}
                </label>
              ))
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMemberTarget(null)}>
              Batal
            </Button>
            <Button
              type="button"
              disabled={membersMutation.isPending}
              onClick={() => membersMutation.mutate()}
            >
              Simpan Anggota ({selected.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
