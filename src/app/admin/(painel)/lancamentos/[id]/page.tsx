import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminRelease } from "@/lib/admin-releases";
import { ReleaseEditor } from "../release-editor";

export const metadata = { title: "Editar lançamento" };

export default async function EditarReleasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const release = await getAdminRelease(id);
  if (!release) notFound();

  return (
    <>
      <Link
        href="/admin/lancamentos"
        className="text-sm text-mist transition-colors hover:text-cream"
      >
        ← Voltar aos lançamentos
      </Link>
      <div className="mt-4">
        <ReleaseEditor release={release} />
      </div>
    </>
  );
}
