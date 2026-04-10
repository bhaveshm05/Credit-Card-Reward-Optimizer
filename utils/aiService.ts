// CCRO/app/utils/aiService.ts
// FREE AI advisor: Groq (primary) → Gemini (fallback)

import { rewardRules, RewardRule } from "../data/rewardRules";

// ─── API Keys ─────────────────────────────────────────────────────────────────

const GROQ_KEY   = "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";
const GEMINI_KEY = "AIzaSyB313CJWLOJlHtxwDwoOyGmbWpyDeqD61E";

// ─── Models ───────────────────────────────────────────────────────────────────

const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "gemma2-9b-it",
];

const GEMINI_MODELS = [
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash-lite-001",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash",
];

const GROQ_URL   = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_URL = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserCard {
  bank: string;
  cardName: string;
  points: number;
}

export interface Message {
  role: "user" | "model";
  parts: { text: string }[];
}

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are CCRO — an expert Indian credit card reward advisor in a mobile app.
Answer any question about credit cards, reward points, miles, cashback, and redemptions.
Use the wallet and card data provided in the user message. Be specific, concise, friendly. Use emojis naturally.
Respond in the same language/mix the user uses (English/Hindi/Hinglish).
Redemption order of value: travel/miles > vouchers > cashback (best to worst).
Key facts you always know:
- HDFC SmartBuy = 10X bonus on travel & shopping
- ICICI iShop = up to 12X on hotels
- Axis Magnus = 23 pts per ₹200 above ₹1.5L/month spend
- Amex Membership Rewards never expire while card is active
- SBI cards: no points on gaming/govt portals after Sept 2025
- Rent, fuel, wallet loads, EMI excluded on most premium cards`;

// ─── Context builder ──────────────────────────────────────────────────────────

function buildContext(userQuery: string, userCards: UserCard[]): string {
  const q = userQuery.toLowerCase();

  const walletRules = rewardRules.filter((r) =>
    userCards.some((uc) => uc.bank === r.bank && uc.cardName === r.cardName)
  );

  const mentionedRules = rewardRules.filter(
    (r) =>
      !walletRules.includes(r) &&
      (q.includes(r.cardName.toLowerCase()) || q.includes(r.bank.toLowerCase()))
  );

  const categoryMap: Record<string, string[]> = {
    travel:   ["travel", "flight", "hotel", "airport", "lounge", "miles", "trip"],
    cashback: ["cashback", "grocery", "bill", "online", "swiggy", "zomato", "amazon"],
    miles:    ["miles", "krisflyer", "intermiles", "air india", "avios", "transfer"],
    vouchers: ["voucher", "shopping", "myntra", "gift"],
    fuel:     ["fuel", "petrol", "diesel"],
    dining:   ["dining", "restaurant", "food", "eat"],
  };

  let categoryRules: RewardRule[] = [];
  for (const [category, keywords] of Object.entries(categoryMap)) {
    if (keywords.some((kw) => q.includes(kw))) {
      categoryRules = rewardRules
        .filter(
          (r) =>
            !walletRules.includes(r) &&
            !mentionedRules.includes(r) &&
            r.bestRedemptionCategory === category
        )
        .slice(0, 2);
      break;
    }
  }

  const fallbackRules =
    walletRules.length === 0 && mentionedRules.length === 0
      ? rewardRules.filter((r) => r.cardTier === "ultra-premium").slice(0, 3)
      : [];

  const walletLines = walletRules.map((r) => {
    const card = userCards.find((uc) => uc.bank === r.bank && uc.cardName === r.cardName);
    const pts  = card?.points.toLocaleString("en-IN") ?? "0";
    const ms   = r.milestones?.length ? ` | Milestone: ${r.milestones[0]}` : "";
    return `• ${r.cardName} (${r.bank}): ${pts} ${r.pointsName}, best for ${r.bestRedemptionCategory}, ${r.cardTier}${ms}`;
  });

  const walletSection = userCards.length > 0
    ? `WALLET:\n${walletLines.join("\n")}`
    : "WALLET: empty — no cards added yet";

  const allRules = [...walletRules, ...mentionedRules, ...categoryRules, ...fallbackRules];
  const cardData = allRules.map((r) => ({
    card:      `${r.cardName} (${r.bank})`,
    tier:      r.cardTier,
    earn:      r.baseEarnRate,
    bestFor:   r.bestRedemptionCategory,
    tips:      r.suggestions.slice(0, 2),
    exclude:   r.exclusions.slice(0, 3),
    partners:  r.transferPartners?.slice(0, 4),
    milestone: r.milestones?.slice(0, 1),
    fee:       r.annualFee,
    feeWaiver: r.feeWaiverSpend,
    expiry:    r.pointsExpiry,
  }));

  return `${walletSection}\n\nCARD DATA:\n${JSON.stringify(cardData)}`;
}

// ─── Retry helper ─────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url: string, options: RequestInit, retries = 1): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    const res = await fetch(url, options);
    if (res.status !== 429) return res;
    if (i < retries) {
      console.warn(`Rate limited, retrying in 5s...`);
      await sleep(5000);
    }
  }
  return fetch(url, options);
}

// ─── Provider 1: Groq ─────────────────────────────────────────────────────────

async function tryGroq(enrichedQuery: string, history: Message[]): Promise<string | null> {
  // ✅ FIX: Only skip if key is genuinely missing or is the placeholder string
  if (!GROQ_KEY || GROQ_KEY.startsWith("YOUR_")) return null;

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.slice(-6).map((m) => ({
      role: m.role === "model" ? "assistant" : "user",
      content: m.parts[0]?.text ?? "",
    })),
    { role: "user", content: enrichedQuery },
  ];

  for (const model of GROQ_MODELS) {
    try {
      const res = await fetchWithRetry(GROQ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_KEY}`,
        },
        body: JSON.stringify({ model, messages, max_tokens: 500, temperature: 0.7 }),
      });

      const data = await res.json();

      if (data.error) {
        const status = res.status;
        if (status === 429 || status === 404 || data.error.code === "model_not_active") {
          console.warn(`Groq ${model} skipped (${status}), trying next...`);
          continue;
        }
        if (status === 401) {
          console.warn("Groq: invalid API key");
          return null;
        }
        console.error("Groq error:", data.error);
        return null;
      }

      const text = data.choices?.[0]?.message?.content;
      if (text) {
        console.log(`✅ Groq (${model})`);
        return text;
      }
    } catch (err: any) {
      console.warn(`Groq ${model} network error:`, err.message);
    }
  }

  return null;
}

// ─── Provider 2: Gemini ───────────────────────────────────────────────────────

async function tryGemini(enrichedQuery: string, history: Message[]): Promise<string | null> {
  const contents = [
    ...history.slice(-6),
    { role: "user", parts: [{ text: enrichedQuery }] },
  ];

  const body = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 500, topP: 0.9 },
  };

  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetchWithRetry(GEMINI_URL(model), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.error) {
        const code = data.error.code;
        if (code === 429 || code === 404) {
          console.warn(`Gemini ${model} skipped (${code}), trying next...`);
          continue;
        }
        console.error(`Gemini ${model} error:`, data.error.message);
        return null;
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        console.log(`✅ Gemini (${model})`);
        return text;
      }
    } catch (err: any) {
      console.warn(`Gemini ${model} network error:`, err.message);
    }
  }

  return null;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function askAI(
  userQuery: string,
  userCards: UserCard[] = [],
  history: Message[] = []
): Promise<string> {
  const context       = buildContext(userQuery, userCards);
  const enrichedQuery = `${context}\n\nQuestion: ${userQuery}`;

  const groqReply   = await tryGroq(enrichedQuery, history);
  if (groqReply) return groqReply;

  const geminiReply = await tryGemini(enrichedQuery, history);
  if (geminiReply) return geminiReply;

  return getFallback(userCards);
}

// ─── Local fallback ───────────────────────────────────────────────────────────

function getFallback(userCards: UserCard[]): string {
  if (userCards.length === 0) {
    return "⚡ AI is at capacity right now. Add your cards and try again in a minute!";
  }
  const top  = userCards.reduce((a, b) => (a.points > b.points ? a : b));
  const rule = rewardRules.find((r) => r.bank === top.bank && r.cardName === top.cardName);
  return (
    `⚡ AI is busy right now — quick tip while you wait:\n\n` +
    `Your **${top.cardName}** has the most points (${top.points.toLocaleString("en-IN")}).\n` +
    (rule ? `💡 ${rule.suggestions[0]}\n` : "") +
    `\nTry again in a moment!`
  );
}