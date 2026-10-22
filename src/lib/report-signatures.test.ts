import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveReportSignatures } from "./report-signatures";

describe("report signer reads", () => {
  it("uses the student's scoped lookup and returns the assigned homeroom and principal", async () => {
    const signatures = {
      homeroomTeacherName: "Gusti Randa, S.Pd", homeroomTeacherNiy: "24.07.05.021",
      headmasterName: "Faiz Abdullah", headmasterNiy: "23.07.05.003",
      headOfKesantrianName: "Khairul Anwar, S.Pd", headOfKesantrianNiy: "NIP1005",
    };
    const rpc = async (name: string, args: { _student_id: string }) => {
      assert.equal(name, "get_report_signatures");
      assert.deepEqual(args, { _student_id: "student-8a" });
      return { data: signatures, error: null };
    };
    assert.deepEqual(await resolveReportSignatures({ rpc }, "student-8a"), signatures);
  });
  it("does not hide denied access behind placeholder names", async () => {
    const rpc = async () => ({ data: null, error: { message: "Tidak berwenang" } });
    await assert.rejects(resolveReportSignatures({ rpc }, "another-student"), /Tidak berwenang/);
  });
});