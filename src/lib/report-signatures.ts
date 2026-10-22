export type ReportSignatures = {
  homeroomTeacherName: string;
  homeroomTeacherNiy: string;
  headmasterName: string;
  headmasterNiy: string;
  headOfKesantrianName: string;
  headOfKesantrianNiy: string;
};

/** The database exposes only signers for a student the caller may read. */
export async function resolveReportSignatures(
  client: { rpc: (name: "get_report_signatures", args: { _student_id: string }) => PromiseLike<{ data: unknown; error: { message: string } | null }> },
  studentId: string,
): Promise<ReportSignatures> {
  const { data, error } = await client.rpc("get_report_signatures", { _student_id: studentId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Nama penandatangan rapor belum dapat dimuat");
  return data as ReportSignatures;
}