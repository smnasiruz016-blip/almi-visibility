/**
 * 🔴 THE CLIENT'S COMPANY AND ITS PRODUCTS (RR-299 C; owner decision 3: the first screen is the client's company with its products, like
 * almiworld.com and its product subdomains). Each product's data lives in ITS OWN folder (<data>/products/<id>/) and is read and written
 * only through its own id — one product never reads or writes another's (tenant isolation). An id is checked by shape AND by where it
 * resolves: an id that would leave the products folder ("..", a path, a drive) is refused. Nothing is ever deleted here.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";

export const PRODUCT_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
/** The second guard: a resolved folder is a product folder only when it lies INSIDE the products folder (never the folder itself, never above). */
export const insideProducts = (root, d) => d.startsWith(root + sep) && d.length > root.length + 1;
const slug = (s) => String(s ?? "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "product";
const atomic = (file, obj) => { writeFileSync(`${file}.tmp`, JSON.stringify(obj, null, 1)); renameSync(`${file}.tmp`, file); };

export function productStore(dataDir) {
  const root = resolve(dataDir, "products");
  mkdirSync(root, { recursive: true });
  /** The one folder of one product — refused unless the id has the shape and stays inside the products folder. */
  const dirOf = (id) => {
    if (typeof id !== "string" || !PRODUCT_ID.test(id)) throw Object.assign(new Error(`not a product id: ${JSON.stringify(String(id).slice(0, 40))}`), { code: "NOT_A_PRODUCT_ID" });
    const d = resolve(root, id);
    if (!insideProducts(root, d)) throw Object.assign(new Error("a product id must stay inside the products folder"), { code: "NOT_A_PRODUCT_ID" });
    return d;
  };
  const stateFile = (id) => join(dirOf(id), "state.json");
  const read = (id) => { const f = stateFile(id); if (!existsSync(f)) throw Object.assign(new Error(`no product ${id}`), { code: "NO_SUCH_PRODUCT" }); return JSON.parse(readFileSync(f, "utf8")); };
  const write = (id, state) => atomic(stateFile(id), { ...state, id });
  const list = () => readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory() && PRODUCT_ID.test(e.name) && existsSync(join(root, e.name, "state.json"))).map((e) => read(e.name)).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0) || String(a.created).localeCompare(String(b.created)));
  const create = ({ name, site }) => {
    let id = slug(name), n = 2;
    while (existsSync(join(root, id))) id = `${slug(name)}-${n++}`;
    mkdirSync(dirOf(id));
    const state = { id, seq: list().reduce((m, p) => Math.max(m, p.seq ?? 0), 0) + 1, product: { name, site }, setup: { product: { name, site, what: "" } }, started: false, created: new Date().toISOString(), preview: [], approvals: [], reports: [] };
    write(id, state);
    return state;
  };
  const companyFile = join(resolve(dataDir), "company.json");
  return Object.freeze({
    root, dirOf, read, write, list, create,
    company: () => (existsSync(companyFile) ? JSON.parse(readFileSync(companyFile, "utf8")) : null),
    setCompany: (c) => atomic(companyFile, c),
  });
}

/** One product as the home screen shows it: its name, its own address, and its state in plain words. */
export const productCard = (s) => Object.freeze({
  id: s.id, name: s.product.name, site: s.product.site,
  state: s.started ? "Set up — working" : `Setting up (${Object.keys(s.setup ?? {}).length} of 6 steps answered)`,
  pages: (s.preview ?? []).filter((p) => p.kind !== "ARTICLE").length, articles: (s.preview ?? []).filter((p) => p.kind === "ARTICLE").length,
  lastReport: (s.reports ?? []).at(-1)?.on ?? "none yet",
});
