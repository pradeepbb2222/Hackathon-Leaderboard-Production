import { getBoard, toPublicBoard } from "@/lib/board";
import { api, json } from "@/lib/http";
import { startLiveLoop } from "@/lib/live";

export const dynamic = "force-dynamic";

export const GET = api(async () => {
  startLiveLoop();
  return json(toPublicBoard(await getBoard()));
});
