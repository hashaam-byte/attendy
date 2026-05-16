"use client";
// src/app/[slug]/(dashboard)/qr-cards/student-selector.tsx

type Student = {
  id: string;
  full_name: string;
  class_name: string | null;
};

interface Props {
  students: Student[];
  selectedId: string;
}

export function StudentSelector({ students, selectedId }: Props) {
  return (
    <select
      className="input-base max-w-xs"
      value={selectedId}
      onChange={(e) => {
        const url = new URL(window.location.href);
        url.searchParams.set("id", e.target.value);
        window.location.href = url.toString();
      }}
    >
      {students.map((s) => (
        <option key={s.id} value={s.id}>
          {s.full_name} {s.class_name ? `· ${s.class_name}` : ""}
        </option>
      ))}
    </select>
  );
}