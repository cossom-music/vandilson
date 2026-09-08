import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/supabase-server";
import LoginForm from "./login-form";

export const metadata = { title: "Entrar — Admin" };

export default async function LoginPage() {
  const user = await getAdminUser();
  if (user) redirect("/admin");

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-sm flex-col justify-center px-6">
      <p className="text-[10px] uppercase tracking-[0.3em] text-silver-600">
        Vandilson Neto
      </p>
      <h1 className="mt-2 font-display text-3xl text-cream">Admin</h1>
      <p className="mt-2 text-sm text-mist">
        Entre para editar o conteúdo do site. O acesso é reservado ao gestor.
      </p>
      <div className="mt-8">
        <LoginForm />
      </div>
    </div>
  );
}
