/**
 * 🔴 THE YOUTUBE PILOT CHANNELS (the owner's decision of 12 Oct 2026, YouTube INCLUDED; RR-303 D, the handles given by the owner on
 * 21 Oct 2026). Read by the app's YouTube settings (desktop/main.mjs) as the suggested channels. Each is read ONLY through the YouTube Data
 * API with the owner's own key, named YOUTUBE_API_KEY — never a youtube.com page. No derived score; raw data kept 30 days, never in git.
 */
export const PILOT_CHANNELS = Object.freeze([
  Object.freeze({ tier: "T1", name: "Dhanak Ki Duniya", handle: "@dhanakkiduniya" }),
  Object.freeze({ tier: "T2", name: "AlmiWorld", handle: "@Almiworld-world" }),
]);
export const YOUTUBE_RAW_DAYS = 30;
/** The YouTube Data API's own default daily quota is 10,000 units; one channel read costs 3 (channels, playlistItems, videos — 1 each). */
export const QUOTA = Object.freeze({ dailyUnits: 10000, unitsPerChannelRead: 3, source: "YouTube Data API v3 quota costs (list = 1 unit), read 21 Oct 2026" });
