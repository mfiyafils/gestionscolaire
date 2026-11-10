"use client";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { bulletinHTML, bulletinMessage } from "@/lib/docs";
import { waLink } from "@/lib/core";
import { DocPreview, Seg } from "@/components/ui";

export function BulletinModal({ studentId, open, onClose, initialTerm = 1 }: {
  studentId: string | null; open: boolean; onClose: () => void; initialTerm?: number;
}) {
  const { data } = useApp();
  const { t, locale } = useI18n();
  const [term, setTerm] = useState(initialTerm);
  useEffect(() => { if (open) setTerm(initialTerm); }, [open, initialTerm]);
  const student = data?.students.find((s) => s.id === studentId);
  const html = useMemo(() => {
    if (!data || !studentId || !open) return "";
    return bulletinHTML(data, studentId, term, locale);
  }, [data, studentId, term, locale, open]);
  if (!data || !student) return null;
  return (
    <DocPreview open={open} onClose={onClose} html={html}
      filename={`bulletin-${student.matricule}-T${term}`}
      title={`${t("reg.bulletin")} — ${student.lastName.toUpperCase()} ${student.firstName}`}
      extra={
        <Seg options={[{ id: "1", label: t("gr.term1") }, { id: "2", label: t("gr.term2") }, { id: "3", label: t("gr.term3") }]}
          value={String(term) as "1"} onChange={(v) => setTerm(Number(v))} />
      }
      onWhatsApp={student.whatsapp ? () => window.open(waLink(student.whatsapp, bulletinMessage(data, student, term, locale)), "_blank") : undefined}
    />
  );
}