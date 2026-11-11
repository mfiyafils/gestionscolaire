import type { Level, Student } from "@/db/schema";
import { SubmitButton } from "@/components/client";
import { Field } from "@/components/ui";
import { LEVELS, LEVEL_INFO } from "@/lib/constants";
import type { ClassRow } from "@/lib/data";

export function StudentForm({
  action,
  classes,
  allowedLevels,
  student,
  defaultClassId,
  lockClass = false,
  redirectTo,
  errorTo,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  classes: ClassRow[];
  allowedLevels: Level[];
  student?: Student;
  defaultClassId?: number;
  lockClass?: boolean;
  redirectTo?: string;
  errorTo?: string;
  submitLabel?: string;
}) {
  const available = classes.filter((c) => allowedLevels.includes(c.level));
  const selectedClassId = student?.classId ?? defaultClassId ?? available[0]?.id;
  const lockedClass = lockClass ? available.find((c) => c.id === selectedClassId) : undefined;

  return (
    <form action={action} className="space-y-5">
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
      {errorTo && <input type="hidden" name="errorTo" value={errorTo} />}

      {lockedClass ? (
        <div>
          <input type="hidden" name="classId" value={lockedClass.id} />
          <p className="label">Classe</p>
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200">
            {LEVEL_INFO[lockedClass.level].emoji} {lockedClass.name} · {LEVEL_INFO[lockedClass.level].label}
          </p>
        </div>
      ) : (
        <Field label="Classe *" hint="L'élève est automatiquement intégré dans la liste de sa classe et de son bloc.">
          <select name="classId" required defaultValue={selectedClassId ?? ""} className="input">
            <option value="" disabled>
              Choisir une classe…
            </option>
            {LEVELS.filter((l) => allowedLevels.includes(l)).map((level) => (
              <optgroup key={level} label={`${LEVEL_INFO[level].emoji} ${LEVEL_INFO[level].label}`}>
                {available
                  .filter((c) => c.level === level)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </Field>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Nom *">
          <input name="lastName" required defaultValue={student?.lastName ?? ""} placeholder="MFIYA" className="input" />
        </Field>
        <Field label="Post-nom">
          <input name="middleName" defaultValue={student?.middleName ?? ""} placeholder="KABONGO" className="input" />
        </Field>
        <Field label="Prénom *">
          <input name="firstName" required defaultValue={student?.firstName ?? ""} placeholder="Grâce" className="input" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Sexe">
          <div className="flex gap-4 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="gender" value="M" defaultChecked={(student?.gender ?? "M") === "M"} /> Garçon
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="gender" value="F" defaultChecked={student?.gender === "F"} /> Fille
            </label>
          </div>
        </Field>
        <Field label="Date de naissance">
          <input type="date" name="birthDate" defaultValue={student?.birthDate ?? ""} className="input" />
        </Field>
        <Field label="Lieu de naissance">
          <input name="birthPlace" defaultValue={student?.birthPlace ?? ""} placeholder="Kinshasa" className="input" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Parent / Tuteur">
          <input name="parentName" defaultValue={student?.parentName ?? ""} placeholder="Nom du parent" className="input" />
        </Field>
        <Field label="Téléphone WhatsApp du parent" hint="Ex. 0812345678 ou +243812345678">
          <input name="parentPhone" defaultValue={student?.parentPhone ?? ""} placeholder="0812345678" className="input" />
        </Field>
        <Field label="Adresse">
          <input name="address" defaultValue={student?.address ?? ""} placeholder="Quartier, commune" className="input" />
        </Field>
      </div>

      {student && (
        <Field label="Statut">
          <select name="status" defaultValue={student.status} className="input sm:max-w-xs">
            <option value="actif">Actif</option>
            <option value="inactif">Inactif (a quitté l&apos;école)</option>
          </select>
        </Field>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
        <SubmitButton className="btn-school" pendingText="Enregistrement…">
          {submitLabel ?? (student ? "💾 Enregistrer les modifications" : "➕ Enregistrer l'élève")}
        </SubmitButton>
        {!student && (
          <p className="text-xs text-slate-500">
            Le numéro officiel est attribué automatiquement et ajouté au registre des numéros officiels.
          </p>
        )}
      </div>
    </form>
  );
}
