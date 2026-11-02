/* RR-365 (moved here in RR-366, so the answer ladder and the plan share it): a price with its US price beside it: a page about the US says the US price, every other page the other, never "in the US" on a page about Nepal */
export const priceHere = (text, country) => String(text).replace(/AU\$\d[\d,]* \(US\$(\d[\d,]*) in the US\)/g, (all, us) => (country === "United States" ? `US$${us}` : all.split(" (")[0]));
/* RR-366 Part 4: "in all regions but India and the Philippines" is what the rule says; a page about one other country says only what applies there (a country page never names another's) */
export const placeHere = (text, country) => (country && !/^(?:India|Philippines)$/.test(country) ? String(text).replace(/,? in all regions but India and the Philippines/, "") : String(text));
