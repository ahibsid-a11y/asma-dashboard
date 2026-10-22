import { describe, expect, it, vi } from "vitest";
import { resolveReportSignatures } from "./report-signatures";

describe("report signer reads", () => {
  it("uses the student's scoped lookup and returns the assigned homeroom and principal", async () => {
    const signatures = {
      homeroomTeacherName: "Gusti Randa, S.Pd", homeroomTeacherNiy: "24.07.05.021",
      headmasterName: "Faiz Abdullah", headmasterNiy: "23.07.05.003",
      headOfKesantrianName: "Khairul Anwar, S.Pd", headOfKesantrianNiy: "NIP1005",
    };
    const rpc = vi.fn().mockResolvedValue({ data: signatures, error: null });
    expect(await resolveReportSignatures({ rpc }, "student-8a")).toEqual(signatures);
    expect(rpc).toHaveBeenCalledWith("get_report_signatures", { _student_id: "student-8a" });
  });
  it("does not hide denied access behind placeholder names", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "Tidak berwenang" } });
    await expect(resolveReportSignatures({ rpc }, "another-student")).rejects.toThrow("Tidak berwenang");
  });
});