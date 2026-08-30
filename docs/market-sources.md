# Agent-Readiness of the Web — Sourced Fact Sheet (TAM segment)

Compiled 2026-08-30 from primary/high-trust sources via web search + fetch. Every line: number, source URL, date, one-line quote/paraphrase, confidence tag.

Confidence tags: **HIGH** = fetched directly from the primary source; **MED** = primary source confirmed via search snippet or reputable secondary (primary fetch blocked/timed out); **LOW** = vendor blog or unattributed figure — use with a caveat or not at all.

Thesis on the slide: the world's websites fall into three tiers of agent-readiness. Only a sliver is agent-ready today. The vast majority — API-capable-but-human-designed sites and legacy portals patched for humans — can be converted to WebMCP-enabled sites.

---

## 0. The denominator — how big is "the web"?

| # | Metric | Value | Source (URL, date) | Quote / paraphrase | Conf |
|---|--------|-------|--------------------|--------------------|------|
| 0.1 | Total sites (hostnames) responding | **1,494,915,628 sites** across **305,348,459 domains**, 14,772,048 web-facing computers | Netcraft July 2026 Web Server Survey — https://www.netcraft.com/blog/july-2026-web-server-survey (2026-07-27) | "1,494,915,628 sites across 305,348,459 domains" | HIGH |
| 0.2 | Same, prior month | 1,489,396,284 sites / 304,146,307 domains / 14,653,771 computers | Netcraft June 2026 — https://www.netcraft.com/blog/june-2026-web-server-survey (2026-06-09) | "+21.1 million sites, 2.0 million domains" m/m | HIGH |
| 0.3 | **Active** sites (serving distinct content) | **~217.7 M** (217,654,258, June 2026) | Netcraft active-sites series as republished by Siteefy — https://siteefy.com/how-many-websites-are-there/ (June 2026 data) | "there are 217,654,258 active websites" — Netcraft monthly survey cited as primary source; Netcraft's own July post does not print the active figure | MED |
| 0.4 | Registered domain names (all TLDs) | **401.6 M** (Q2 2026) | Verisign / DNIB Q2 2026 — https://investor.verisign.com/news-releases/news-release-details/dnibcom-reports-internet-has-4016-million-domain-name (2026-07-23) | "401.6 million domain name registrations across all TLDs, +8.1% YoY" | HIGH (via press release snippet) |
| 0.5 | Internet Live Stats | ~1.4–1.5 B "websites" (live counter; derived from Netcraft) | https://www.internetlivestats.com/total-number-of-websites/ | Counter is an extrapolation of Netcraft; not independent — cite Netcraft instead | LOW (derivative) |

Notes: Netcraft "domains" (305 M) = domains that answered an HTTP probe; Verisign (401.6 M) = domains registered, many parked. Use **~218 M active sites** as the slide denominator; ~1.5 B "sites" is the hostname count and overstates real websites ~7x.

### Platform concentration (the conversion levers)

| # | Metric | Value | Source (URL, date) | Quote / paraphrase | Conf |
|---|--------|-------|--------------------|--------------------|------|
| 0.6 | WordPress share | **40.7% of all websites; 58.9% of CMS-using sites** | W3Techs — https://w3techs.com/technologies/overview/content_management (2026-08-30; updated daily) | Peaked ~43.6% mid-2025; slight decline as Wix/Shopify grow faster | HIGH (fetched) |
| 0.7 | Other CMSs | Shopify 5.3% (7.7% of CMS), Wix 4.2% (6.1%), Squarespace 2.5% (3.5%), Joomla 1.1% (1.7%), Drupal 0.7% (1.0%); **30.9% use no monitored CMS** | same | W3Techs universe = its own crawl of top sites (Tranco-based); percentages are of that universe, not of Netcraft's 218 M — never multiply the two | HIGH (fetched), universe caveat |
| 0.8 | Cloudflare share of sites | **16.67% of all sites (249.1 M)**; nginx 20.37%, Apache 11.50%, OpenResty 8.02% | Netcraft July 2026 (0.1) | Relevant because Cloudflare's WebMCP switch (4.3) can flip every fronted site without origin changes | HIGH |

Why it matters for the thesis: three levers cover most of the web — Shopify (5.3%, already flipped Aug 5), Cloudflare (16.7% of sites, one-switch preview Aug 6), and WordPress (40.7%, one core/plugin decision away). Platform-level conversion, not site-by-site rebuilds, is how the "sliver" becomes the majority.

---

## Tier 1 — Agent-ready (exposes callable tools to agents today)

| # | Metric | Value | Source (URL, date) | Quote / paraphrase | Conf |
|---|--------|-------|--------------------|--------------------|------|
| 1.1 | Sites listed in the webmcp.com directory | **421 sites** with WebMCP tool implementations | https://webmcp.com/ (fetched 2026-08-30) | "A live directory of websites exposing WebMCP tools to AI agents" — 421 sites; per-site tool counts 1–51 | HIGH (fetched) |
| 1.1b | Same directory, API stats endpoint | 18 sites / 66 tools (3 live, 15 demo) | https://webmcp.com/api-docs (fetched 2026-08-30) | Stats example is stale vs. homepage; maintained by nekuda | MED — internal inconsistency, footnote only |
| 1.1c | Competing directory | **118 sites / 320 tools / 12 categories** | https://webmcpdirectory.com/ (fetched 2026-08-30; © 2026) | "Browse 118 WebMCP-enabled sites and 320 tools an agent can call directly in the page" | HIGH (fetched) |
| 1.2 | Shopify storefronts flipped to WebMCP | **"Every Liquid storefront" + Hydrogen dev preview; "millions" of storefronts** | Shopify dev changelog — https://shopify.dev/changelog/webmcp-liquid-hydrogen (2026-08-05); tool reference https://shopify.dev/docs/api/web-mcp | "There's nothing to install or configure." 8 tools at launch (Catalog 4, Cart 3, Checkout/Orders 2, Policies 1); docs now list 11. "Agent support is currently limited to Chromium-based browsers" (origin trial) | HIGH |
| 1.2b | "Millions" claim (primary voice) | "millions of @Shopify storefronts are live and ready" | Ilya Grigorik (Shopify) on X — https://x.com/igrigorik/status/2092346368438472993 (2026-08-25); echoed in VKTR coverage of OpenAI launch https://www.vktr.com/ai-platforms/openai-adds-webmcp-to-chatgpts-browser/ (2026-08-27): "Millions of Shopify storefronts are already WebMCP-enabled" | Shopify itself gives no count in the changelog | MED |
| 1.3 | How many Shopify stores exist (absolute) | **3,021,959 live Shopify stores** (Store Leads, updated 2026-08-21); other trackers 3.06–5.6 M depending on method | https://storeleads.app/reports/shopify (2026-08-21) | "there are 3,021,959 live stores running on the Shopify platform" (DNS-history heuristic) | MED (third-party crawler; Shopify only says "millions") |
| 1.4 | Shopify share of all sites | **5.3% of all websites; 7.7% of CMS-using sites** | W3Techs — https://w3techs.com/technologies/overview/content_management (2026-08-30) | W3Techs universe is its own crawl of top sites; do NOT multiply this % by Netcraft counts (gives ~11 M, contradicts 1.3) | HIGH (fetched) but universe-mismatch caveat |
| 1.5 | Named enterprise experimenters | Expedia, Instacart, Target "experimenting since Google's May announcement"; Progress (Telerik/Kendo UI) shipped WebMCP in toolkits | VKTR — https://www.vktr.com/ai-platforms/openai-adds-webmcp-to-chatgpts-browser/ (2026-08-27) | Names, not counts | MED |

**Tier-1 derivation:** deliberate, hand-built WebMCP adopters ≈ 421 (webmcp.com) ≈ **0.0002%** of ~218 M active sites. Including Shopify's platform-level flip (~3.0 M storefronts) ≈ **~1.4%** of active sites. The gap between those two numbers is the thesis: one platform decision converted millions of human-designed storefronts overnight — proof that conversion, not rebuilding, is the path.

---

## Tier 2 — API-capable but human-designed (machine-legible data/APIs exist; no agent tool surface)

| # | Metric | Value | Source (URL, date) | Quote / paraphrase | Conf |
|---|--------|-------|--------------------|--------------------|------|
| 2.1 | Domains with any structured data (schema.org markup) | **44% of pay-level domains** — 16,525,070 of 37,447,141 PLDs in the Oct-2024 Common Crawl | Web Data Commons — https://webdatacommons.org/structureddata/ (release 2025-01-10) | 16.5 M of 37.4 M PLDs contain RDFa/Microdata/JSON-LD/Microformats; 15.6 B typed entities; JSON-LD + Microdata dominate | HIGH (fetched) |
| 2.2 | Pages with JSON-LD / any structured data (page-weighted, top sites) | **JSON-LD on 41% of pages** (up from 34% in 2022); Microdata 26%; RDFa 66% (mostly incidental); >66% of pages have at least one format | HTTP Archive Web Almanac 2024, Structured Data chapter — https://almanac.httparchive.org/en/2024/structured-data (2024-11-11) | "JSON-LD … present on 41% of pages" | HIGH (fetched); 2025 chapter URL 404'd on fetch |
| 2.3 | Schema.org usage dataset | "millions of domains" (monthly aggregate term counts, Google + schema.org) | https://blog.schema.org/2026/06/04/announcing-the-schema-org-usage-statistics-dataset/ (2026-06-04) | No headline % given; supports "millions of domains" language | MED |
| 2.4 | API share of dynamic traffic | **"More than half of the dynamic traffic seen by Cloudflare is API related"** and growing; much of it automated | Cloudflare Radar 2025 Year in Review — https://radar.cloudflare.com/year-in-review/2025 (Dec 2025); methodology in changelog https://developers.cloudflare.com/changelog/post/2026-05-20-radar-content-type-and-api-traffic/ (2026-05-20) | API traffic = JSON/XML 200 responses on non-cacheable requests | MED-HIGH (quote confirmed via search of the report; blog fetch didn't surface the line) |
| 2.5 | Organizations that are API-first | **82% adopted some API-first approach; 25% fully API-first; 65% earn revenue from APIs; 24% of devs design APIs for AI agents; 70% aware of MCP, 10% use it regularly** | Postman 2025 State of the API (n>5,700) — https://www.postman.com/state-of-api/2025/ (Oct 2025; press release 2025-10-08) | "API strategy is fast becoming AI strategy" | HIGH (fetched) — ORG-level, not site-level |
| 2.6 | Enterprises using APIs | 82% use APIs internally; 71% use third-party APIs | Gartner Hype Cycle for APIs 2024 (as summarized by Boomi) — https://boomi.com/blog/api-strategy-vs-hype/ (2024) | Gartner survey stat via vendor summary | LOW-MED |
| 2.7 | AI as driver of API demand | ">30% of the increase in demand for APIs will come from AI and tools using LLMs by 2026" | Gartner press release — https://www.gartner.com/en/newsroom/press-releases/2024-03-20-gartner-predicts-more-than-30-percent-of-the-increase-in-demand-for-apis-will-come-from-ai-and-tools-using-llms-by-2026 (2024-03-20) | Headline prediction (page 403'd on fetch; title carries the claim) | MED |
| 2.8 | Public APIs (absolute) | ~24,000 listed on ProgrammableWeb (historical, directory shut 2022); APIhound est. ~50,000 | Nordic APIs — https://nordicapis.com/tracking-the-growth-of-the-api-economy/ | Tiny vs. 218 M sites: public APIs are NOT the API-capable tier; structured data and private/first-party JSON endpoints are | MED (dated) |

**Tier-2 derivation:** Best site-level proxy = WDC **44% of domains carry schema.org-style structured data** (Oct 2024). This is "machine-legible but not agent-callable": a catalog/listing/business is already described in JSON-LD, and the site is served by a JS front end hitting JSON endpoints (Cloudflare: >50% of dynamic traffic is API). Call Tier 2 ≈ **40–50% of active sites**, explicitly proxy-derived. Postman/Gartner figures are org-level colour, not part of the site split.

---

## Tier 3 — Legacy patchwork (portals, PDFs, fax, phone; patched to work for humans)

Numbers here **illustrate the depth** of this tier in regulated verticals; they do not measure its share of the web (that is the residual — see split below).

### Healthcare

| # | Metric | Value | Source (URL, date) | Quote / paraphrase | Conf |
|---|--------|-------|--------------------|--------------------|------|
| 3.1 | Medical prior authorization done electronically | **40%** (2025 Index) up from 31% (2023 Index) → **~60% still manual/partially manual** | 2025 CAQH Index — press release https://www.globenewswire.com/news-release/2026/2/19/3241072/0/en/2025-caqh-index-shows-u-s-healthcare-avoided-258-billion-and-accelerated-automation-interoperability-and-ai-adoption.html (2026-02-19); AJMC summary https://www.ajmc.com/view/caqh-index-finds-20-billion-in-cost-savings-opportunities | "Medical prior authorization … increasing from 31% in the 2023 Index to 40% in the 2025 Index"; claim status 81%, claim payment 78%; $21 B remaining savings from full automation; 600 orgs / 63% of insured lives | HIGH (figures confirmed across CAQH-hosted copy + AJMC) |
| 3.2 | How physicians actually submit PAs | **Phone is the most common method** for medical-service PAs; only **24%** say their EHR offers electronic PA for prescriptions; ~40 PAs/physician/week; 13 staff-hours/week | AMA 2025 Prior Authorization Physician Survey (n=1,000, fielded Dec 2025) — https://www.ama-assn.org/system/files/prior-authorization-survey.pdf | "Physicians report phone as the most commonly used method for completing PAs for medical services." | HIGH (PDF read directly) |
| 3.3 | Facilities relying on paper fax | **46%** of healthcare facilities still rely on paper fax to exchange information with other providers | CHIME survey commissioned by Consensus Cloud Solutions — https://www.consensus.com/blog/cios-agree-its-time-to-overcome-healthcares-reliance-on-paper-data-exchange/ ; Medical Economics https://www.medicaleconomics.com/view/helping-health-care-s-digital-have-nots-bridge-the-digital-divide (2024–25) | "46% of healthcare facilities still rely on paper fax machines… to send information to other providers" | MED (vendor-sponsored, CHIME-conducted) |
| 3.4 | Fax share of documents | >1/3 of documents sent to healthcare facilities in 2025 are faxes; >half need manual processing; **88%** of practitioners say fax delays hurt care | 2025 Healthcare Fax & Workflow Survey (Consensus), as reported by Medical Economics — https://www.medicaleconomics.com/view/health-care-s-fax-problem-is-still-hurting-patients (2025) | Page 403'd on fetch; figures from search snippet | MED-LOW |
| 3.5 | "70% of healthcare communication is fax" | 70% (up to 90% incl. EHR-integrated fax); 9 B+ pages/yr | Konica Minolta blog — https://kmbs.konicaminolta.us/blog/new-facts-about-fax-in-healthcare/ (2025-01-14) | **No underlying source cited in the article** — widely repeated, unattributed | LOW — do not put on slide without "industry estimate" caveat; prefer 3.1–3.3 |
| 3.6 | Hospital interoperability | 70% of hospitals engage in interoperable exchange at least sometimes; only **43%** routinely do all four (send/receive/find/integrate); eFax explicitly excluded from "electronic" | ONC/ASTP Data Brief 71 — https://healthit.gov/data/data-briefs/interoperable-exchange-patient-health-information-among-us-hospitals-2023/ (May 2024, 2023 data) | Implies majority of hospitals still fall back to non-electronic channels for at least some exchange | HIGH (fetched) |

### Insurance

| # | Metric | Value | Source (URL, date) | Quote / paraphrase | Conf |
|---|--------|-------|--------------------|--------------------|------|
| 3.7 | Agents re-keying into carrier portals | **74%** cite re-keying risk data into multiple carrier portals as #1 pain; **90%** have cut business with a carrier over submission friction; commercial-lines agencies send **49% of submissions by email** vs 7% via submission software; 79% want submission automation | Ivans 2026 Agency-Carrier Connectivity Trends survey (n=702, Apr–May 2026) — https://www.globenewswire.com/news-release/2026/08/26/3351635/27604/en/agents-are-choosing-carriers-that-automate-submissions-say-findings-in-2026-insurance-agency-carrier-connectivity-trends-survey-report.html (2026-08-26) | "90% of agents have reduced business with a carrier due to friction around submissions" | HIGH (fetched via Manila Times syndication of the release) |
| 3.8 | 2025 edition of same survey | 72% wanted more carrier automation on commercial submissions; real-time appetite = #1 carrier-selection factor | Ivans — https://www.ivans.com/news/press-releases/2025/majority-of-agent-respondents-say-real-time-risk-appetite-information-is-the-1-factor-in-carrier-selection-in-2025-insurance-agency-carrier-connectivity-trends-survey-report/ (2025-12-02) | Trend line for 3.7 | MED |
| 3.9 | Legacy core limitations | 46.4% "inflexibility to adapt", 45.5% "integration challenges", 44.5% "high maintenance cost"; obsolescence is #1 modernization driver (48.2%) | Adacta 2025 State of Insurance Legacy System Modernization (110 European insurance leaders) — https://blog.adacta-fintech.com/state-of-insurance-legacy-system-modernization (2025-04-09) | Vendor survey, but the only 2025 quantified one found | MED-LOW |
| 3.10 | Age / budget of legacy cores | Avg core-system lifespan 13–15 yrs (BCG/Gartner, via Thoughtworks); "70–80% of insurance IT budgets go to legacy maintenance" (attributed to Gartner by vendor blogs); "over 70% of insurers rely on legacy systems to some extent" (vendor blogs) | https://www.thoughtworks.com/insights/blog/legacy-modernization/Legacy-modernization-in-insurance-why-insurers-should-act-now ; https://www.decerto.com/us/post/digital-insurance-vs-traditional-insurance-complete-2026-guide-for-carriers | Could not reach Celent/Datos primary (paywall/403) | LOW — say "analysts estimate" or omit |
| 3.11 | L&A carriers | 2/3 run more than one policy-admin system; 23% more than four; many "still operating mainframe-based legacy core applications" | Deloitte, Modernizing L&A systems (100 CIOs, Dec 2022) — https://www.deloitte.com/us/en/insights/industry/financial-services/modernizing-l-and-a-systems.html (2023-06-15) | Quantity not age | MED (dated) |

### Government

| # | Metric | Value | Source (URL, date) | Quote / paraphrase | Conf |
|---|--------|-------|--------------------|--------------------|------|
| 3.12 | Federal forms actually digitized | **"Only 2 percent of Federal Government forms to date have been digitized (offered as a dynamic online form, not just a fillable online PDF)"**; 45% of federal sites not mobile-friendly; 60% have a possible accessibility issue; 80% don't use USWDS | OMB Fact Sheet accompanying M-23-22 — https://bidenwhitehouse.archives.gov/omb/briefing-room/2023/09/22/fact-sheet-building-digital-experiences-for-the-american-people/ (2023-09-22) | Exact quote above | HIGH (fetched) |
| 3.13 | Independent form audit | Of 1,348 federal forms sampled: **<2% (24) fully compliant** with 21st Century IDEA; 78% (1,052) fillable-PDF only; ~20% neither | ITIF — https://itif.org/publications/2021/08/23/assessing-federal-governments-transition-web-based-forms/ (2021-08-23) | "only 24 (less than 2 percent) were fully compliant" | HIGH (fetched; dated 2021) |
| 3.14 | Agency compliance | Only ~1/3 of 24 CFO Act agencies reported progress on all 8 IDEA requirements; 84 of 120 required reports (70%) submitted 2019–2023 | GAO-24-106764 — https://www.gao.gov/products/gao-24-106764 (2024-10-01) | "of the 18 agencies that submitted 2023 annual reports, seven addressed all eight requirements" | HIGH (fetched) |
| 3.15 | SNAP online access | **46 of 53** state agencies accept online SNAP applications; only **33** allow online recertification | USDA FNS, Understanding the Use of SNAP Online Applications (Summit Consulting, **May 2021**) — https://www.fns.usda.gov/research/snap/understanding-use-online-applications ; PDF https://fns-prod.azureedge.us/sites/default/files/resource-files/SNAPOnlineApplications.pdf | FNS page still states these counts as "currently"; underlying study is 2021 — likely higher today | MED (dated) |

---

## Why now — agent-side demand and the WebMCP shipping wave

| # | Event / metric | Value | Source (URL, date) | Quote / paraphrase | Conf |
|---|----------------|-------|--------------------|--------------------|------|
| 4.1 | Chrome origin trial | WebMCP origin trial **from Chrome 149** (announced Google I/O 2026-05-19; blog 2026-06-09); secondary sources say trial runs **149 → 156** (~late 2026) | https://developer.chrome.com/blog/ai-webmcp-origin-trial (2026-06-09); https://developer.chrome.com/docs/ai/webmcp (updated 2026-08-07); end-milestone per https://www.spronta.com/blog/state-of-webmcp-july-2026/ and ppc.land | "In Chrome 149, you can sign up for the WebMCP origin trial"; imperative + declarative APIs; DevTools support | HIGH (start) / MED (end = 156) |
| 4.2 | Shopify | WebMCP live on every Liquid storefront + Hydrogen preview, zero setup | https://shopify.dev/changelog/webmcp-liquid-hydrogen (2026-08-05) | see 1.2 | HIGH |
| 4.3 | Cloudflare | Developer preview: "With one switch, any site becomes usable by browser AI agents — no new APIs, no origin changes" — edge-injected bridge (HTMLRewriter), two tool packs (Content Credentials, Site MCP Server) | https://blog.cloudflare.com/webmcp/ (2026-08-06); InfoQ https://www.infoq.com/news/2026/08/cloudflare-webmcp/ | Cloudflare fronts 16.67% of all sites (Netcraft, July 2026) — the conversion lever at scale | HIGH |
| 4.4 | OpenAI / ChatGPT | WebMCP support in the ChatGPT desktop app's built-in browser, ChatGPT Sites and Codex; "Site tools" in address bar; 10-day WebMCP Challenge (Aug 25–Sep 3) with prizes from Shopify, Chrome, Netlify, Cloudflare, Vercel, Render | OpenAI Devs on X https://x.com/OpenAIDevs/status/2092344959248761263 (2026-08-25); SEJ https://www.searchenginejournal.com/chatgpt-adds-webmcp-support/587237/ (2026-08-27); VKTR (2026-08-27) | "When you visit a compatible website, ChatGPT or Codex can automatically use it to complete your task." Requires GPT-5.6 Sol/Terra; not in Enterprise/Edu | HIGH |
| 4.5 | Bots overtake humans | **57.3% of HTTP requests to HTML content are automated vs 42.7% human** (some outlets round to 57.5/42.5) — "faster than I predicted… agentic traffic growing so fast" | Cloudflare CEO Matthew Prince, Radar data, 2026-06-03; Search Engine Land https://searchengineland.com/cloudflare-bots-webpage-requests-479608 (2026-06-05); Tom's Hardware, NBC | Measures HTML requests on Cloudflare's network (~1/5 of the web); excludes video/email/gaming | HIGH (quote) |
| 4.6 | AI bot baseline, end-2025 | Humans 47% of HTML requests, non-AI bots 44%; AI bots (excl. Googlebot) 4.2%; Googlebot 4.5%; AI "user-action" crawling up **>15x in 2025** | Cloudflare Radar 2025 Year in Review — https://blog.cloudflare.com/radar-2025-year-in-review/ (Dec 2025) | "AI 'user action' crawling increased by over 15x in 2025" | HIGH (fetched) |
| 4.7 | Agentic traffic growth | Agentic AI traffic **+7,851% YoY**; automated traffic growing 8x faster than human; AI-driven traffic +187% Jan→Dec 2025; >95% concentrated in retail/e-com, media, travel | HUMAN Security 2026 State of AI Traffic & Cyberthreat Benchmark — https://www.globenewswire.com/news-release/2026/03/26/3263087/0/en/... (2026-03-26) | Vendor telemetry ("one quadrillion interactions") | MED |
| 4.8 | AI visits per human visit | 1 AI-bot visit per **31** human visits in Q4 2025 (from 1:200 in Q1 2025); RAG bots +33% while training scrapes −15% | TollBit State of the Bots — https://tollbit.com/bots/25q2/ ; The Register https://www.theregister.com/software/2026/02/04/ai-bot-traffic-closing-in-on-human-web-visits-study-finds/4921090 (2026-02-04) | Publisher-side sample; TollBit calls its numbers conservative | MED |
| 4.9 | Enterprise agent adoption | 40% of enterprise apps will embed task-specific AI agents by end-2026 (from <5% in 2025); 33% of enterprise software includes agentic AI by 2028; 1/3 of UX shifts to agentic front ends by 2028 | Gartner — https://www.gartner.com/en/newsroom/press-releases/2025-08-26-gartner-predicts-40-percent-of-enterprise-apps-will-feature-task-specific-ai-agents-by-2026-up-from-less-than-5-percent-in-2025 (2025-08-26); https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027 (2025-06-25) | Forecasts, not measurements | MED |

---

## Market-size anchors (analyst estimates — caveated)

| # | Metric | Value | Source (URL, date) | Caveat | Conf |
|---|--------|-------|--------------------|--------|------|
| 5.1 | Agentic commerce | **up to $1 T US orchestrated retail revenue by 2030; $3–5 T globally** | McKinsey, "The automation curve in agentic commerce" — https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-automation-curve-in-agentic-commerce (Oct 2025); Digital Commerce 360 https://www.digitalcommerce360.com/2025/10/20/mckinsey-forecast-5-trillion-agentic-commerce-sales-2030/ (2025-10-20) | Range; contingent on trust/fraud/identity being solved; mckinsey.com fetch timed out — figures confirmed via DC360 | MED |
| 5.2 | Conservative counter-estimate | Agentic commerce = 10–20% of US e-commerce by 2030: **$190 B base / $385 B bull** | Morgan Stanley (Dec 2025), as cited in Stellagent/commercetools roundups — https://stellagent.ai/insights/agentic-commerce-market-size-forecast-2030 | Secondary citation only | LOW-MED |
| 5.3 | Postman: API revenue | 65% of orgs generate revenue from APIs; 43% of fully API-first orgs get >25% of revenue from APIs | Postman 2025 (see 2.5) | Org survey | HIGH |

No analyst has published an "agent-ready web" market size per se. For the video, the defensible move is: (a) size the *surface* (218 M active sites, 3 tiers) and (b) anchor value with McKinsey's $3–5 T agentic-commerce flow that must transit those sites.

---

## Proposed 3-tier split for the slide (with derivation)

**Denominator:** ~218 M active websites (Netcraft active-sites series, June 2026). Not 1.5 B — that is hostnames.

| Tier | Slide number | Derivation | Honesty note |
|------|--------------|-----------|--------------|
| **Agent-ready** (exposes WebMCP tools today) | **<0.001% hand-built (~420 sites) → ~1.4% incl. Shopify's platform flip (~3 M storefronts)** | 421 / 218 M = 0.0002%. 3.02 M Shopify Liquid stores / 218 M = 1.4%. | Two numbers, on purpose: the ~400 shows how few chose to do it; the 3 M shows what one platform switch does. Directory counts are self-reported and inconsistent (webmcp.com 421 vs webmcpdirectory.com 118 vs webmcp.com API 18). Shopify count is a third-party crawl; Shopify says "millions". Round to "≈1%" on the slide. |
| **API-capable, human-designed** | **≈40–50%** (say "roughly 4 in 10") | Proxy: 44% of 37.4 M pay-level domains carry schema.org structured data (WDC, Oct-2024 crawl). Supporting colour: >50% of dynamic traffic on Cloudflare is API (JSON/XML) traffic; 82% of orgs are some-level API-first (Postman, org-level). | This is a *proxy*, not a measurement of "has an API". Structured data ≈ "the site already describes its entities in machine-readable JSON" — the cheapest population to wrap in WebMCP tools. WDC's 37 M-PLD universe is Common Crawl, not all 218 M active sites; page-weighted Web Almanac (41% JSON-LD) agrees in magnitude. |
| **Legacy patchwork** | **≈50–60%** ("the majority") | Residual: 100% − ~1% − ~44%. Illustrated (not measured) by: 60% of medical prior auths still manual (CAQH 2025); phone = #1 PA channel (AMA Dec 2025); 46% of facilities on paper fax (CHIME/Consensus); 74% of insurance agents re-key into carrier portals, 49% of commercial submissions by email (Ivans 2026); only 2% of federal forms truly digitized (OMB 2023); only 33 of 53 SNAP agencies allow online recert (FNS 2021). | The residual mixes true legacy portals with plain brochure sites that have no data at all. The vertical stats show *how deep* the tier is in regulated industries — they are not the source of the 50–60% figure. |

Suggested spoken line (30 s): "There are about 218 million active websites. Fewer than a thousand chose to make themselves agent-callable — then Shopify flipped a switch and 3 million storefronts joined overnight, still barely 1%. Roughly 4 in 10 sites already publish machine-readable data and run on JSON APIs; they're one wrapper away. The rest — the majority — are the portals, PDFs, faxes and phone queues that healthcare, insurance and government still run on: 60% of prior auths are manual, 3 in 4 insurance agents re-key into carrier portals, 2% of federal forms are truly digital. Every one of them is convertible."

---

## Known gaps / things NOT found
- Celent/Datos/Novarica "X% of insurers on legacy core" — paywalled or 403; only vendor-blog attributions ("70%", "70–80% of IT budget") exist → tagged LOW.
- ONC does not publish a clean "% of hospitals using fax" for 2023; it excludes eFax from "electronic exchange" and reports 43% routinely interoperable (inverse proxy).
- Web Almanac 2025 structured-data chapter returned 404; 2024 used.
- Netcraft's own July 2026 post does not print the active-sites count; taken from Netcraft-derived aggregator (Siteefy).
- SNAP counts are 2021 vintage; FNS page still presents them as current.
- No analyst "agent-ready web" TAM exists; McKinsey agentic-commerce is the nearest anchor.
