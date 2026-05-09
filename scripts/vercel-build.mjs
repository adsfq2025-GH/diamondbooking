import { spawnSync } from "node:child_process";

function run(cmd, args) {
  const res = spawnSync(cmd, args, { stdio: "inherit", shell: true });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

run("npx", ["prisma", "generate"]);

if (process.env.VERCEL_ENV === "production") {
  run("npx", ["prisma", "migrate", "deploy"]);
}

run("npx", ["next", "build"]);

