import { Router, type IRouter } from "express";

const router: IRouter = Router();

function healthHandler(_req: unknown, res: { json: (body: unknown) => unknown }) {
  return res.json({ status: "ok" });
}

router.get("/healthz", healthHandler);
router.get("/health", healthHandler);

export default router;
