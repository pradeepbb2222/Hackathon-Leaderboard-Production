import { sessionFromRequest } from "@/lib/auth";
import { api, fail, json } from "@/lib/http";

export const GET = api(async (req) => {
  const user = await sessionFromRequest(req);
  if (!user) return fail("Sign in required.", 401);
  return json({ user });
});
