import { Router, Request, Response } from "express";

export const healthRouter = Router();

healthRouter.get("/health", (_req: Request, res: Response) => {
  res.type("text/plain").send("ok");
});

// keep root path for browsers (don’t use it as health on Render)
healthRouter.get("/", (_req: Request, res: Response) => {
  res.type("text/plain").send("OK");
});
