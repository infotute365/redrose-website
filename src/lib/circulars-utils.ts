import type { Circular } from "@/src/lib/circulars";

export function sortCirculars(circulars: Circular[]) {
  return circulars.sort(
    (a, b) =>
      (b.priority ?? 0) - (a.priority ?? 0) ||
      b.noticeDate.localeCompare(a.noticeDate) ||
      b.uploadedAt.localeCompare(a.uploadedAt),
  );
}
