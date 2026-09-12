/**
 * WHICH USER-AGENT GROUP APPLIES, AND THEREFORE WHO IS BLOCKED.
 *
 * ── 🔴 THE QUESTION THIS ANSWERS, AND WHY IT IS NOT THE OBVIOUS ONE ─────────
 *
 * The first crawl found 106 of our 500 best-performing URLs disallowed by our
 * own robots.txt. That is **not automatically a defect**: our crawler is
 * `AlmiVisibilityBot`, and a robots.txt may lawfully block us while allowing
 * Googlebot. Those two outcomes have completely different consequences:
 *
 *   · the rule sits in a group Googlebot also obeys → pages with impressions
 *     are being blocked from Google. A real product defect, and severe.
 *   · a Googlebot-specific group permits it → only crawlers like ours are
 *     blocked. Our inventory is incomplete. A far smaller, different fact.
 *
 * So the check must resolve GROUP SELECTION, not merely "does any rule match".
 *
 * ── GUIDANCE, RE-READ AT IMPLEMENTATION TIME (§832) ─────────────────────────
 *
 * `https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt`
 * — read 12 September 2026. Verbatim:
 *
 *   · "Google's crawlers determine the correct group of rules by finding in the
 *      robots.txt file the group with the most specific user agent that matches
 *      the crawler's user agent."
 *   · "User agent specific groups and global groups (`*`) are not combined."
 *   · "Only one group is valid for a particular crawler."
 *   · "When matching robots.txt rules to URLs, crawlers use the most specific
 *      rule based on the length of the rule path."
 *   · "In case of conflicting rules, including those with wildcards, Google uses
 *      the least restrictive rule."
 *
 * 🔴 The second line is the one that decides this whole question. A specific
 * group does NOT inherit the wildcard group's rules — so a Googlebot group that
 * omits a Disallow would permit the path, and a Googlebot group that repeats it
 * blocks Googlebot exactly as it blocks us.
 */

/** The parsed groups of a robots.txt, in file order. */
export function parseGroups(body) {
  const groups = [];
  let current = null;
  let lastWasAgent = false;

  for (const raw of String(body).split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    if (line === "") continue;
    const i = line.indexOf(":");
    if (i === -1) continue;
    const field = line.slice(0, i).trim().toLowerCase();
    const value = line.slice(i + 1).trim();

    if (field === "user-agent") {
      // Consecutive user-agent lines share ONE group.
      if (!lastWasAgent || current === null) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (field === "allow" || field === "disallow") {
      if (current) current.rules.push({ type: field, path: value });
    }
  }
  return groups;
}

/**
 * Select the ONE group that applies to `userAgentToken`.
 *
 * 🔴 Specific beats `*`, and they are NOT combined. Where several specific
 * groups name the same agent, their rules merge — per the guidance quoted above.
 */
export function selectGroup(groups, userAgentToken) {
  const token = String(userAgentToken).toLowerCase();

  const specific = groups.filter((g) =>
    g.agents.some((a) => a !== "*" && (token === a || token.startsWith(a) || a.startsWith(token))),
  );
  if (specific.length > 0) {
    return {
      matchedBy: "SPECIFIC",
      agents: [...new Set(specific.flatMap((g) => g.agents))],
      rules: specific.flatMap((g) => g.rules),
    };
  }

  const wildcard = groups.filter((g) => g.agents.includes("*"));
  if (wildcard.length > 0) {
    return { matchedBy: "WILDCARD", agents: ["*"], rules: wildcard.flatMap((g) => g.rules) };
  }
  // 🔴 No group at all is not "blocked" and not "allowed" — it is no rules.
  return { matchedBy: "NO_GROUP", agents: [], rules: [] };
}

/** Does a rule path match a URL path? Honours `*` and `$`. */
export function ruleMatches(rulePath, pathname) {
  if (rulePath === "") return false;
  let re = "";
  for (const ch of rulePath) {
    if (ch === "*") re += ".*";
    else if (ch === "$") re += "$";
    else re += ch.replace(/[.+^${}()|[\]\\?]/g, "\\$&");
  }
  return new RegExp("^" + re).test(pathname);
}

/**
 * Decide one URL against one group.
 *
 * Longest rule path wins; on an equal-length tie the LEAST RESTRICTIVE rule
 * wins, i.e. Allow.
 */
export function decide(group, url) {
  const pathname = new URL(url).pathname;
  let best = null;
  for (const rule of group.rules) {
    if (!ruleMatches(rule.path, pathname)) continue;
    const len = rule.path.length;
    if (best === null || len > best.len || (len === best.len && rule.type === "allow")) {
      best = { len, type: rule.type, path: rule.path };
    }
  }
  if (best === null) return { allowed: true, rule: null, because: "no rule in the applicable group matches this path" };
  return {
    allowed: best.type === "allow",
    rule: best,
    because: `${best.type}: ${best.path} (longest match, ${best.len} chars)`,
  };
}

/**
 * The whole question, for one URL and two agents.
 *
 * Returns which group each agent lands in, whether each is allowed, and the
 * verdict that matters: is GOOGLEBOT blocked?
 */
export function assessUrl({ body, url, ourAgent = "AlmiVisibilityBot", searchAgent = "Googlebot" }) {
  const groups = parseGroups(body);
  const ours = selectGroup(groups, ourAgent);
  const theirs = selectGroup(groups, searchAgent);
  const usDecision = decide(ours, url);
  const themDecision = decide(theirs, url);

  return {
    url,
    us: { group: ours.matchedBy, agents: ours.agents, ...usDecision },
    googlebot: { group: theirs.matchedBy, agents: theirs.agents, ...themDecision },
    /* 🔴 THE VERDICT. Only a Googlebot block is a product defect; a block that
     * applies to us alone makes our INVENTORY incomplete and nothing more. */
    verdict: themDecision.allowed
      ? usDecision.allowed
        ? "ALLOWED_FOR_BOTH"
        : "BLOCKED_FOR_US_ONLY"
      : "BLOCKED_FOR_GOOGLEBOT",
  };
}
