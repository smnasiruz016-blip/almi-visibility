# AlmiVisibility — evidence export

**Generated:** 2026-09-12T00:19:12.260Z

## What this covers
- Search Console measurements already in the evidence store
- the estate hostname table, with every hostname in exactly one state
- no crawl run is present in this store

## 🔴 What this does NOT cover
- 🔴 anything not in the evidence store — this is an export, not a measurement
- 🔴 query text: it is deliberately never stored, so it cannot be exported
- 🔴 issues: no detector exists (C5), so there are no issues to export
- 🔴 any page not fetched: a crawled inventory is not the site, and a fetched URL is not an indexed URL

## State of the inputs

| input | state |
|---|---|
| searchAnalytics:by-page | **COMPLETE** |
| searchAnalytics:aggregate | **COMPLETE** |
| control (403 expected) | **FORBIDDEN** |
| crawl inventory | **NOT_QUERIED** |

## Bounds that shaped this export (LAW-BOUND-1)

| bound | value |
|---|---|
| `searchAnalytics.rowLimitPerRequest` | 25000 |
| `searchAnalytics.maxRequests` | 20 |
| `window.startDate` | 2026-08-15 |
| `window.endDate` | 2026-09-12 |
| `estate.hostnamesInCensus` | 27 |

## Estate hostnames

🔴 `—` means **null**, not zero. A FORBIDDEN or NOT_QUERIED row has no count because nothing was measured for it.

| hostname | state | rowCount | clicks | impressions |
|---|---|---|---|---|
| almicv.almiworld.com | ROWS | 482 | 1 | 885 |
| almipte.almiworld.com | ROWS | 381 | 1 | 862 |
| almiworld.com | ROWS | 30 | 15 | 451 |
| almiitalian.almiworld.com | ROWS | 294 | 4 | 422 |
| almioet.almiworld.com | ROWS | 103 | 0 | 147 |
| almistudy.almiworld.com | ROWS | 58 | 0 | 93 |
| almidutch.almiworld.com | ROWS | 42 | 0 | 85 |
| almitoefl.almiworld.com | ROWS | 27 | 0 | 39 |
| almidet.almiworld.com | ROWS | 17 | 0 | 35 |
| almijob.almiworld.com | ROWS | 19 | 0 | 38 |
| almispanish.almiworld.com | ROWS | 19 | 0 | 36 |
| almiportuguese.almiworld.com | ROWS | 9 | 0 | 23 |
| almidanish.almiworld.com | ROWS | 1 | 0 | 16 |
| almigoethe.almiworld.com | ROWS | 1 | 0 | 12 |
| almisalary.almiworld.com | ROWS | 7 | 0 | 12 |
| almiswiss.almiworld.com | ROWS | 1 | 0 | 4 |
| world.almiworld.com | ROWS | 4 | 0 | 4 |
| alminorwegian.almiworld.com | ROWS | 1 | 0 | 3 |
| almiicelandic.almiworld.com | ROWS | 1 | 0 | 1 |
| almiprep.almiworld.com | ZERO | 0 | 0 | 0 |
| almicelpip.almiworld.com | ZERO | 0 | 0 | 0 |
| almifrench.almiworld.com | ZERO | 0 | 0 | 0 |
| almijapanese.almiworld.com | ZERO | 0 | 0 | 0 |
| almikorean.almiworld.com | ZERO | 0 | 0 | 0 |
| almiswedish.almiworld.com | ZERO | 0 | 0 | 0 |
| almiarchitect.almiworld.com | ZERO | 0 | 0 | 0 |
| almipathway.almiworld.com | ZERO | 0 | 0 | 0 |

## Measurements in the store

| observation_id | measurement_key | method | observed_at |
|---|---|---|---|
| b53d43fb020c3daa | — | gsc.sites.list | 2026-09-11T22:58:51.912Z |
| bb607c41cf0a2ce5 | — | gsc.searchAnalytics.query:aggregate | 2026-09-11T22:58:52.117Z |
| aba4aff1b049b881 | — | gsc.searchAnalytics.query:control | 2026-09-11T22:58:52.483Z |
| c1ade75f5707bbb8 | — | gsc.searchAnalytics.query:by-page | 2026-09-11T22:58:52.489Z |
| df1e5200b1dc6fab | 06c6954f76fe6fef | gsc.sites.list | 2026-09-12T00:15:14.660Z |
| f294cb34162421cc | 5eab63386d677025 | gsc.searchAnalytics.query:aggregate | 2026-09-12T00:15:14.861Z |
| f2afedb7e11260a4 | 617df2237d933ef1 | gsc.searchAnalytics.query:control | 2026-09-12T00:15:15.168Z |
| 73eadc8e01cd287b | d4572d7287be082d | gsc.searchAnalytics.query:by-page | 2026-09-12T00:15:15.175Z |
| 1e2d5ec690b30bae | f0366ae3909fc1ce | gsc.sites.list | 2026-09-12T00:15:15.685Z |
| e9fcace3798fffbf | 1a359a0ef216104b | gsc.sites.list | 2026-09-12T00:16:19.426Z |

## Re-sightings

A re-sighting is not a measurement. It records that we looked again and nothing had changed.

| observation_id | seen_at |
|---|---|
| f294cb34162421cc | 2026-09-12T00:15:15.892Z |
| f2afedb7e11260a4 | 2026-09-12T00:15:16.164Z |
| 73eadc8e01cd287b | 2026-09-12T00:15:16.173Z |
| f294cb34162421cc | 2026-09-12T00:16:19.718Z |
| f2afedb7e11260a4 | 2026-09-12T00:16:20.027Z |
| 73eadc8e01cd287b | 2026-09-12T00:16:20.036Z |
| e9fcace3798fffbf | 2026-09-12T00:16:20.518Z |
| f294cb34162421cc | 2026-09-12T00:16:20.730Z |
| f2afedb7e11260a4 | 2026-09-12T00:16:20.994Z |
| 73eadc8e01cd287b | 2026-09-12T00:16:21.003Z |
