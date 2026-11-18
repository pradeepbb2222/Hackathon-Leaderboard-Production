import { redirect } from "next/navigation";
import { TopShell } from "@/components/shells";
import { getSession, homeFor } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/account/password");
  if (user.role !== "TEAM") redirect(homeFor(user.role));
  return (
    <TopShell eyebrow="Squad floor" title={user.displayName} user={user.username}>
      {children}
    </TopShell>
  );
}
