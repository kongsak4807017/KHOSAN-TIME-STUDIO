#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const registry = JSON.parse(fs.readFileSync(path.join(root, "config/asset-providers.json"), "utf8"));

const rows = registry.providers.map(p => {
  const secret = p.auth_env ? (process.env[p.auth_env] ? "configured" : "missing") : "n/a";
  return {id:p.id, kind:p.kind, status:p.status, auth:secret, capabilities:p.capabilities?.join(",") || ""};
});
console.table(rows);
const cloud = rows.filter(x => x.kind === "cloud");
const configured = cloud.filter(x => x.auth === "configured").length;
console.log(JSON.stringify({
  ok:true,
  providers:rows.length,
  cloud_providers:cloud.length,
  cloud_credentials_configured:configured,
  policy:registry.policy,
  note:"Doctor never prints API keys and does not spend credits or call paid generation endpoints."
}, null, 2));
