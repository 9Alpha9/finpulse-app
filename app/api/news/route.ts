import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/news?filter=all|crypto|stocks|macro|global|id
 *
 * Fetch & parse RSS feeds langsung di server-side (tanpa rss2json).
 * Menggunakan regex XML parser ringan — tidak perlu dependensi tambahan.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Sources
// ─────────────────────────────────────────────────────────────────────────────

const SOURCES = [
  // Indonesia
  { name: "CNBC Indonesia",  url: "https://www.cnbcindonesia.com/market/rss",            region: "id",     lang: "id" },
  { name: "Kontan",          url: "https://rss.kontan.co.id/category/investasi",          region: "id",     lang: "id" },
  // Crypto Global
  { name: "CoinDesk",        url: "https://www.coindesk.com/arc/outboundfeeds/rss/",      region: "global", lang: "en" },
  { name: "CoinTelegraph",   url: "https://cointelegraph.com/rss",                        region: "global", lang: "en" },
  { name: "Decrypt",         url: "https://decrypt.co/feed",                              region: "global", lang: "en" },
  // Macro / Markets
  { name: "Reuters Business",url: "https://feeds.reuters.com/reuters/businessNews",       region: "global", lang: "en" },
  { name: "Investing.com",   url: "https://www.investing.com/rss/news.rss",              region: "global", lang: "en" },
  { name: "MarketWatch",     url: "https://feeds.marketwatch.com/marketwatch/topstories/",region: "global", lang: "en" },
] as const;

type Source = (typeof SOURCES)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Lightweight RSS/Atom parser (no external deps)
// ─────────────────────────────────────────────────────────────────────────────

interface ParsedItem {
  guid:        string;
  title:       string;
  link:        string;
  pubDate:     string;
  description: string;
}

/** Extract a single tag value from XML string */
function extractTag(xml: string, tag: string): string {
  // Try <tag>...</tag>
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = re.exec(xml);
  if (m) return m[1].trim();
  return "";
}

/** Strip CDATA wrappers and HTML tags */
function clean(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function parseRSS(xml: string): ParsedItem[] {
  const items: ParsedItem[] = [];

  // Match every <item> or <entry> block
  const itemRe = /<(?:item|entry)([\s>][\s\S]*?)<\/(?:item|entry)>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRe.exec(xml)) !== null) {
    const block = match[0];

    const rawTitle = extractTag(block, "title");
    const title    = clean(rawTitle).slice(0, 200);
    if (!title) continue;

    // link: try <link> text, or href attribute, or <guid>
    let link = clean(extractTag(block, "link"));
    if (!link) {
      const hrefM = /<link[^>]+href=["']([^"']+)["']/i.exec(block);
      if (hrefM) link = hrefM[1];
    }
    if (!link) link = clean(extractTag(block, "guid"));
    if (!link) continue;

    const guid       = clean(extractTag(block, "guid")) || link;
    const pubDate    = clean(extractTag(block, "pubDate")) ||
                       clean(extractTag(block, "published")) ||
                       clean(extractTag(block, "updated")) ||
                       new Date().toISOString();
    const rawDesc    = extractTag(block, "description") ||
                       extractTag(block, "summary") ||
                       extractTag(block, "content");
    const description = clean(rawDesc).slice(0, 400);

    items.push({ guid, title, link, pubDate, description });
  }

  return items;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch one feed (with 8 s timeout)
// ─────────────────────────────────────────────────────────────────────────────

async function fetchFeed(source: Source): Promise<{ items: ParsedItem[]; source: Source } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; FinPulse/1.0; +https://finpulse.app)",
        Accept: "application/rss+xml, application/atom+xml, text/xml, */*",
      },
      next: { revalidate: 300 }, // Next.js cache 5 menit
    });

    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`[news] ${source.name} responded ${res.status}`);
      return null;
    }

    const xml = await res.text();
    const items = parseRSS(xml);
    return { items, source };
  } catch (err: any) {
    console.warn(`[news] ${source.name} failed:`, err?.message ?? err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Classification
// ─────────────────────────────────────────────────────────────────────────────

function classify(title: string, desc: string) {
  const text = (title + " " + desc).toLowerCase();

  let category: "crypto" | "stocks" | "macro" = "macro";

  if (
    text.includes("bitcoin") || text.includes("crypto") ||
    text.includes("ethereum") || text.includes("blockchain") ||
    text.includes("defi") || text.includes("nft") ||
    text.includes("altcoin") || text.includes("kripto") ||
    text.includes("btc") || text.includes(" eth ") ||
    text.includes("solana") || text.includes("ripple") ||
    text.includes("xrp") || text.includes("binance") ||
    text.includes("coinbase") || text.includes("stablecoin")
  ) {
    category = "crypto";
  } else if (
    text.includes("stock") || text.includes("shares") ||
    text.includes("equity") || text.includes("nasdaq") ||
    text.includes("s&p") || text.includes("dow jones") ||
    text.includes("ihsg") || text.includes("saham") ||
    text.includes("bursa") || text.includes("idx") ||
    text.includes("emiten") || text.includes("dividen") ||
    text.includes("earnings") || text.includes("ipo") ||
    text.includes("wall street")
  ) {
    category = "stocks";
  }

  const positiveWords = [
    "surge","rally","gain","soar","rise","record","high","bull",
    "growth","profit","beat","strong","boost","jumped","climbs",
    "naik","untung","melonjak","rekor","tumbuh","laba","hijau","melesat",
  ];
  const negativeWords = [
    "drop","fall","crash","decline","bear","loss","slump","plunge",
    "warn","risk","weak","tumble","slid","plummets","sank",
    "turun","rugi","ambles","anjlok","merah","jatuh","koreksi",
  ];

  let sentiment: "positive" | "negative" | "neutral" = "neutral";
  if (positiveWords.some((w) => text.includes(w))) sentiment = "positive";
  else if (negativeWords.some((w) => text.includes(w))) sentiment = "negative";

  return { category, sentiment };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET handler
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filter = (searchParams.get("filter") ?? "all") as string;

  // Select sources
  let sources: readonly Source[] = SOURCES;
  if (filter === "id")     sources = SOURCES.filter((s) => s.region === "id");
  if (filter === "global") sources = SOURCES.filter((s) => s.region === "global");

  // Fetch all feeds in parallel (failed ones return null → skipped)
  const results = await Promise.all(sources.map(fetchFeed));

  const output: {
    guid: string; title: string; link: string; pubDate: string;
    description: string; source: string; region: string; lang: string;
    category: "crypto" | "stocks" | "macro";
    sentiment: "positive" | "negative" | "neutral";
  }[] = [];

  for (const result of results) {
    if (!result) continue;
    for (const item of result.items) {
      const { category, sentiment } = classify(item.title, item.description);

      // Apply category filter (fix: use parentheses to avoid precedence bug)
      if (filter === "crypto" && category !== "crypto") continue;
      if (filter === "stocks" && category !== "stocks") continue;
      if (filter === "macro"  && category !== "macro")  continue;

      output.push({
        guid:        item.guid,
        title:       item.title,
        link:        item.link,
        pubDate:     item.pubDate,
        description: item.description,
        source:      result.source.name,
        region:      result.source.region,
        lang:        result.source.lang,
        category,
        sentiment,
      });
    }
  }

  // Deduplicate by normalised title, sort newest first
  const seen  = new Set<string>();
  const final = output
    .sort((a, b) => {
      const ta = new Date(a.pubDate).getTime();
      const tb = new Date(b.pubDate).getTime();
      return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta);
    })
    .filter((item) => {
      const key = item.title.toLowerCase().replace(/\s+/g, " ").slice(0, 80);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return NextResponse.json(
    { items: final },
    { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" } }
  );
}
