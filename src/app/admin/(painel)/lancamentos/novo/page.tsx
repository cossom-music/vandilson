import { ReleaseEditor } from "../release-editor";

export const metadata = { title: "Novo lançamento" };

export default function NovoReleasePage() {
  return <ReleaseEditor release={null} />;
}
