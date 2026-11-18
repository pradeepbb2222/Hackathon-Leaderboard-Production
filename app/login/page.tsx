import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getSession, homeFor } from "@/lib/auth";
import { getBranding } from "@/lib/branding";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ u?: string }> }) {
  const user = await getSession();
  if (user) redirect(homeFor(user.role));
  const params = await searchParams;
  const brand = getBranding();
  return (
    <LoginForm
      presetUser={params.u ?? ""}
      showDemo={brand.demoHints}
      name={brand.name}
      edition={brand.edition}
      venue={brand.venue}
      dates={brand.dates}
      theme={brand.theme}
    />
  );
}
