import { redirect } from "next/navigation";
import { AdminShell } from "@/components/shells";
import { getSession, homeFor } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/account/password");
  if (user.role !== "ADMIN") redirect(homeFor(user.role));
  return <AdminShell user={{ name: user.displayName, username: user.username }}>{children}</AdminShell>;
}
