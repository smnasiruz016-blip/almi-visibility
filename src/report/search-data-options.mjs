/**
 * 🔴 THE CLIENT'S SEARCH-DATA OPTIONS, SHOWN AT SETUP (owner decisions 1 and 3 of RR-292; beta-g decision B).
 *
 * Visibility never sends an automated search to a search engine, and robots are obeyed (owner decision 1). The way to search data is the
 * client's own choice, among three options, each shown in plain words with what it gives, what it costs and its limits. The client may pick
 * one or more and change at any time. With none chosen the product still runs, and search discovery reads NOT CONNECTED — never zero demand.
 *   (1) a search API key of the client's own — its cost per 1,000 searches read from that provider's price page ON THE DAY, with the date;
 *       when no price was read, "price not measured" — never a guess;
 *   (2) the client's own Google Search Console — CONNECTED only when the client's own export is stored, with its date and window;
 *   (3) the client's own AI search account — CONNECTED only by the client's own connection record (src/research/ai-connection.mjs).
 * Pure: it reads what it is handed and fetches nothing. Generic: it names no client, product or host.
 */
export const STATE = Object.freeze({ CONNECTED: "CONNECTED", NOT_CONNECTED: "NOT CONNECTED" });
export const PRICE_NOT_MEASURED = "price not measured";

/**
 * The three options for one client. `apiKey`: { connected, provider } or null; `price`: { perThousand, currency, readOn, source } or null —
 * only a price read from the provider's own page that day; `searchConsole`: the client's latest stored export record, or null;
 * `aiSearch`: { state } from the client's own connection store, or null.
 */
export function searchDataOptions({ apiKey = null, price = null, searchConsole = null, aiSearch = null } = {}) {
  const cost = price && typeof price.perThousand === "number" && /^\d{4}-\d{2}-\d{2}$/.test(price.readOn ?? "")
    ? `${price.perThousand} ${price.currency ?? ""} per 1,000 searches (read from the provider's own price page on ${price.readOn})`.replace(/\s+/g, " ")
    : `${PRICE_NOT_MEASURED} — Visibility reads the provider's price on the day you connect; it never guesses`;
  const gsc = searchConsole?.exportedOn
    ? `${STATE.CONNECTED} — your export of ${searchConsole.exportedOn}${searchConsole.window ? ` (data ${searchConsole.window.from} to ${searchConsole.window.to})` : ""}`
    : STATE.NOT_CONNECTED;
  const options = [
    Object.freeze({
      id: 1, name: "Search API key (your own key)",
      gives: "Fast, wide search data: the results people see for your topics, and who else is in them.",
      cost,
      limits: "You pay the provider for each search, on your own account. Visibility uses only your key and only within the budget you set.",
      state: apiKey?.connected === true ? STATE.CONNECTED : STATE.NOT_CONNECTED,
    }),
    Object.freeze({
      id: 2, name: "Google Search Console (your own connection)",
      gives: "Your own real search queries and your pages' positions in Google.",
      cost: "Free.",
      limits: "The data is a few days old. It covers your own site only — it shows no competitors.",
      state: gsc,
    }),
    Object.freeze({
      id: 3, name: "Your AI search (your own AI account, e.g. ChatGPT or Claude web search)",
      gives: "The questions people ask about your topics, and the competitors the answers name.",
      cost: "Paid by your own AI plan — Visibility adds no charge.",
      limits: "AI answers can change from one day to the next. Every address an answer names is checked before it counts.",
      state: aiSearch?.state === "CONNECTED" ? STATE.CONNECTED : STATE.NOT_CONNECTED,
    }),
  ];
  const any = options.some((o) => o.state.startsWith(STATE.CONNECTED));
  return Object.freeze({
    options: Object.freeze(options),
    discovery: any ? STATE.CONNECTED : STATE.NOT_CONNECTED,
    note: "Pick one or more. You can change your choice at any time. With none chosen, Visibility still works on your own site and files; search discovery then shows NOT CONNECTED — that is not zero demand.",
  });
}

/** The screen as plain lines, exactly as the client reads it. */
export function optionsLines(o) {
  return [
    "How should Visibility get search data for you?",
    ...o.options.flatMap((x) => [`(${x.id}) ${x.name} — ${x.state}`, `    What it gives: ${x.gives}`, `    Cost: ${x.cost}`, `    Limits: ${x.limits}`]),
    o.note,
    `Search discovery: ${o.discovery}`,
  ];
}
