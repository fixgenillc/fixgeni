// src/tools/adminExec.ts
import { exec } from "child_process";

type AllowedCmd = "prisma:deploy" | "prisma:push" | "seed:run";

const ALLOWED: Record<AllowedCmd, string> = {
  "prisma:deploy": "npx prisma migrate deploy",
  "prisma:push"  : "npx prisma db push",
  "seed:run"     : "node dist/src/tools/seed.js",
};

export async function runAllowed(cmd: AllowedCmd): Promise<{stdout: string; stderr: string}> {
  const run = ALLOWED[cmd];
  return new Promise((resolve, reject) => {
    exec(run, { timeout: 120_000 }, (err, stdout, stderr) => {
      if (err) return reject({ err, stdout, stderr });
      resolve({ stdout, stderr });
    });
  });
}

export function getAllowed(): AllowedCmd[] {
  return Object.keys(ALLOWED) as AllowedCmd[];
}
