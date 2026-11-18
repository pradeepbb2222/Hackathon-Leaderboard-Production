import { api, fail } from "@/lib/http";

export const POST = api(async () => {
  return fail("Choose the file again. Uploads now go straight to file storage.", 400);
});
