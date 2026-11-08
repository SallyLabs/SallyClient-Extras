// Checks everything in servers/. Same rules as the Sally server, so if this passes it shows up in the client.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SIZES = ["480x232", "960x464"];
const MAX_BANNER = 300 * 1024;
const FIELDS = ["name", "address", "description", "languages", "featured"];

let errors = 0;
const fail = (id, msg) => {
  errors++;
  console.log(`servers/${id}: ${msg}`);
};

function imageSize(b) {
  if (b.length >= 24 && b.readUInt32BE(0) === 0x89504e47 && b.toString("ascii", 12, 16) === "IHDR") {
    return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`;
  }
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const m = b[i + 1];
    if (m === 0xff) { i++; continue; }
    if (m === 0x01 || (m >= 0xd0 && m <= 0xd8)) { i += 2; continue; }
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return `${b.readUInt16BE(i + 7)}x${b.readUInt16BE(i + 5)}`;
    }
    i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
}

function validAddress(address) {
  let host = address;
  const colon = address.lastIndexOf(":");
  if (colon !== -1) {
    host = address.slice(0, colon);
    const port = Number(address.slice(colon + 1));
    if (!Number.isInteger(port) || port < 1 || port > 65535) return false;
  }
  return host.length <= 253 && host.includes(".") &&
    host.split(".").every(l => /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(l));
}

const addresses = new Map();
for (const id of readdirSync("servers").sort()) {
  const dir = join("servers", id);
  if (!statSync(dir).isDirectory()) {
    fail(id, "only folders go in servers/");
    continue;
  }
  if (!/^[a-z0-9][a-z0-9-]{0,31}$/.test(id)) fail(id, "folder name has to be lowercase letters, numbers and -");

  const files = readdirSync(dir);
  for (const f of files) {
    if (!["server.json", "banner.jpg", "banner.png"].includes(f)) fail(id, `${f} doesn't belong here`);
  }
  if (files.includes("banner.jpg") && files.includes("banner.png")) fail(id, "only one banner please");

  let s;
  try {
    const raw = readFileSync(join(dir, "server.json"));
    if (raw.length > 8 * 1024) fail(id, "server.json is way too big");
    s = JSON.parse(raw);
  } catch (e) {
    fail(id, `server.json: ${e.code === "ENOENT" ? "missing" : e.message}`);
    continue;
  }
  for (const key of Object.keys(s)) {
    if (!FIELDS.includes(key)) fail(id, `unknown field "${key}"`);
  }
  if (typeof s.name !== "string" || !s.name.trim() || [...s.name.trim()].length > 32) fail(id, "name needs 1-32 chars");
  if (typeof s.address !== "string" || !validAddress(s.address.trim().toLowerCase())) {
    fail(id, `address "${s.address}" doesn't look right`);
  } else {
    const a = s.address.trim().toLowerCase();
    if (addresses.has(a)) fail(id, `same address as ${addresses.get(a)}`);
    addresses.set(a, id);
  }
  if (s.description !== undefined && (typeof s.description !== "string" || [...s.description.trim()].length > 120)) {
    fail(id, "description max 120 chars");
  }
  if (s.languages !== undefined && (!Array.isArray(s.languages) || s.languages.length > 8 ||
      s.languages.some(l => typeof l !== "string" || !/^[a-z]{2}$/.test(l)))) {
    fail(id, 'languages are two letter codes like ["de", "en"]');
  }
  if (s.featured !== undefined && typeof s.featured !== "boolean") fail(id, "featured is true or false");

  const banner = files.find(f => f.startsWith("banner."));
  if (!banner) {
    console.log(`servers/${id}: no banner (works, but looks way better with one)`);
    continue;
  }
  const b = readFileSync(join(dir, banner));
  if (b.length > MAX_BANNER) fail(id, `banner is ${Math.round(b.length / 1024)} KB, max is 300`);
  const size = imageSize(b);
  if (!size) fail(id, `${banner} isn't a real ${banner.endsWith("png") ? "PNG" : "JPG"}`);
  else if (!SIZES.includes(size)) fail(id, `banner is ${size}, has to be 480x232 or 960x464`);
}

if (errors) {
  console.log(`\n${errors} problem${errors === 1 ? "" : "s"}`);
  process.exit(1);
}
console.log(`all good, ${addresses.size} servers`);
