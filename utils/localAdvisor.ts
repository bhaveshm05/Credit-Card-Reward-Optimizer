// CCRO/app/utils/localAdvisor.ts
// Smart local AI advisor — intent-aware, context-driven, card-comparative

import { rewardRules, RewardRule } from "../data/rewardRules";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserCard {
  bank: string;
  cardName: string;
  points: number;
}

interface Intent {
  type:
    | "spend_category"      // "which card for groceries?"
    | "card_specific"       // "how should I use my Infinia?"
    | "redeem_points"       // "how do I redeem my points?"
    | "compare_cards"       // "which of my cards is best?"
    | "milestone_check"     // "how close am I to a free flight?"
    | "exclusion_check"     // "do I earn points on rent/fuel?"
    | "transfer_partner"    // "can I transfer to Singapore KrisFlyer?"
    | "fee_waiver"          // "how much do I need to spend for fee waiver?"
    | "points_value"        // "what are my points worth?"
    | "greeting"            // "hi", "hello"
    | "help"                // "what can you do?"
    | "general";            // fallback

  spendCategory?: string;   // e.g. "grocery", "fuel", "travel"
  mentionedCard?: UserCard;
  mentionedPartner?: string;
  spendAmount?: number;     // parsed spend amount from query
}

// ─── Spend Category Master Map ────────────────────────────────────────────────

const SPEND_CATEGORY_MAP: Record<string, string[]> = {
  travel: [
    "travel", "flight", "flights", "hotel", "hotels", "air", "airport",
    "trip", "vacation", "holiday", "indigo", "vistara", "air india",
    "spicejet", "international", "abroad", "foreign", "booking.com",
    "makemytrip", "mmt", "cleartrip", "yatra", "lounge", "upgrade",
  ],
  dining: [
    "dining", "restaurant", "food", "eat", "dinner", "lunch", "breakfast",
    "café", "cafe", "bar", "dineout", "eazydiner", "zomato", "swiggy food",
  ],
  grocery: [
    "grocery", "groceries", "supermarket", "bigbasket", "blinkit", "zepto",
    "dmart", "instamart", "daily needs", "vegetables", "fruits",
  ],
  online: [
    "online", "amazon", "flipkart", "myntra", "meesho", "ajio", "nykaa",
    "shopping", "ecommerce", "e-commerce",
  ],
  fuel: [
    "fuel", "petrol", "diesel", "gas station", "hp", "bharat petroleum",
    "indian oil", "iocl", "hpcl", "bpcl", "filling station",
  ],
  bills: [
    "bill", "bills", "utility", "utilities", "electricity", "gas",
    "water", "airtel", "jio", "bsnl", "vi", "broadband", "recharge",
    "dth", "ott", "netflix", "hotstar", "prime", "subscription",
  ],
  rent: [
    "rent", "rental", "nobroker", "rentomojo", "house rent", "apartment",
    "pg", "flatmate", "lease",
  ],
  entertainment: [
    "movie", "cinema", "bookmyshow", "pvr", "inox", "netflix", "gaming",
    "entertainment", "concert", "event", "tickets",
  ],
  insurance: [
    "insurance", "premium", "life insurance", "health insurance", "policy",
    "lic", "term plan",
  ],
  jewellery: [
    "gold", "jewellery", "jewelry", "tanishq", "kalyan", "malabar",
    "diamond", "ornament",
  ],
  international: [
    "forex", "foreign currency", "international spend", "abroad purchase",
    "overseas", "usd", "eur", "dollar", "euro",
  ],
};

// ─── Intent Detection ─────────────────────────────────────────────────────────

function detectIntent(query: string, userCards: UserCard[]): Intent {
  const q = query.toLowerCase().trim();

  // Greeting
  if (/^(hi|hello|hey|good morning|good evening|sup|hola|namaste)\b/.test(q)) {
    return { type: "greeting" };
  }

  // Help
  if (/what can you|how do you work|help me|what do you do|capabilities/.test(q)) {
    return { type: "help" };
  }

  // Fee waiver
  if (/fee waiver|waive fee|annual fee|how much.*spend.*free|spend.*waiver/.test(q)) {
    const card = findMentionedCard(q, userCards);
    return { type: "fee_waiver", mentionedCard: card };
  }

  // Points value
  if (/worth|value of.*points|points worth|how much.*points|redeem value/.test(q)) {
    const card = findMentionedCard(q, userCards);
    return { type: "points_value", mentionedCard: card };
  }

  // Milestone check
  if (/milestone|how close|free flight|free hotel|how many more|earn.*flight|enough for/.test(q)) {
    const card = findMentionedCard(q, userCards);
    return { type: "milestone_check", mentionedCard: card };
  }

  // Exclusion check — rent, fuel, etc.
  if (/earn.*points.*(rent|fuel|insurance|gold)|points.*on.*(rent|fuel|insurance)|do i get.*points/.test(q)) {
    const card = findMentionedCard(q, userCards);
    const match = q.match(/\b(rent|fuel|insurance|gold|jewellery|gaming|wallet|emi)\b/);
    return {
      type: "exclusion_check",
      mentionedCard: card,
      spendCategory: match?.[1],
    };
  }

  // Transfer partner
  if (/transfer|krisflyer|intermiles|air india.*miles|avios|flying returns|marriott|accor/.test(q)) {
    const partner = detectPartner(q);
    const card = findMentionedCard(q, userCards);
    return { type: "transfer_partner", mentionedCard: card, mentionedPartner: partner };
  }

  // Redeem points
  if (/redeem|how to use|use.*points|cash.*points|convert|smartbuy|ishop|best.*redemption/.test(q)) {
    const card = findMentionedCard(q, userCards);
    return { type: "redeem_points", mentionedCard: card };
  }

  // Compare cards
  if (/best card|which card|compare|vs|versus|better|recommend|suggest/.test(q)) {
    // Check if it's also spend-category-specific
    const spendCat = detectSpendCategory(q);
    if (spendCat) {
      return { type: "spend_category", spendCategory: spendCat };
    }
    return { type: "compare_cards" };
  }

  // Spend category
  const spendCat = detectSpendCategory(q);
  if (spendCat) {
    const amount = extractAmount(q);
    return { type: "spend_category", spendCategory: spendCat, spendAmount: amount };
  }

  // Card-specific
  const mentionedCard = findMentionedCard(q, userCards);
  if (mentionedCard) {
    return { type: "card_specific", mentionedCard };
  }

  return { type: "general" };
}

// ─── Helper: Detect spend category ───────────────────────────────────────────

function detectSpendCategory(q: string): string | null {
  for (const [category, keywords] of Object.entries(SPEND_CATEGORY_MAP)) {
    if (keywords.some((kw) => q.includes(kw))) return category;
  }
  return null;
}

// ─── Helper: Find mentioned card ─────────────────────────────────────────────

function findMentionedCard(q: string, userCards: UserCard[]): UserCard | undefined {
  return userCards.find((c) => {
    const name = c.cardName.toLowerCase();
    const bank = c.bank.toLowerCase();
    // Full name match
    if (q.includes(name)) return true;
    // Bank name match
    if (q.includes(bank)) return true;
    // Partial word match (e.g. "infinia", "magnus", "regalia")
    return name.split(" ").some((word) => word.length > 4 && q.includes(word));
  });
}

// ─── Helper: Detect transfer partner ─────────────────────────────────────────

function detectPartner(q: string): string {
  const partners: Record<string, string[]> = {
    "Singapore Airlines KrisFlyer": ["krisflyer", "singapore airlines", "sqkf"],
    "Air India Flying Returns": ["air india", "flying returns"],
    "British Airways Avios": ["avios", "british airways"],
    "InterMiles": ["intermiles"],
    "Marriott Bonvoy": ["marriott", "bonvoy"],
    "Accor Live Limitless": ["accor", "all accor"],
    "Etihad Guest": ["etihad"],
    "Air France Flying Blue": ["air france", "flying blue"],
    "IndiGo 6E": ["indigo", "6e rewards"],
  };
  for (const [partner, keys] of Object.entries(partners)) {
    if (keys.some((k) => q.includes(k))) return partner;
  }
  return "";
}

// ─── Helper: Extract spend amount ─────────────────────────────────────────────

function extractAmount(q: string): number | undefined {
  const match = q.match(/₹\s?([\d,]+)|rs\.?\s?([\d,]+)|([\d,]+)\s?rupees?/i);
  if (match) {
    const raw = match[1] || match[2] || match[3];
    return parseInt(raw.replace(/,/g, ""), 10);
  }
  return undefined;
}

// ─── Helper: Get best cards for a category from wallet ───────────────────────

interface CardScore {
  rule: RewardRule;
  userCard: UserCard;
  score: number;
  reason: string;
}

function rankCardsForCategory(category: string, userCards: UserCard[]): CardScore[] {
  const scored: CardScore[] = [];

  for (const userCard of userCards) {
    const rule = rewardRules.find(
      (r) => r.bank === userCard.bank && r.cardName === userCard.cardName
    );
    if (!rule) continue;

    let score = 0;
    let reason = "";

    // Primary category match
    if (rule.bestRedemptionCategory === category) {
      score += 40;
      reason = `optimised for ${category}`;
    }

    // Check suggestions for category mentions
    const suggestionBoost = rule.suggestions.filter((s) =>
      SPEND_CATEGORY_MAP[category]?.some((kw) => s.toLowerCase().includes(kw))
    ).length;
    score += suggestionBoost * 10;

    // Tier bonus
    const tierBonus: Record<string, number> = {
      "ultra-premium": 20,
      premium: 15,
      mid: 10,
      entry: 5,
    };
    score += tierBonus[rule.cardTier] ?? 0;

    // Exclusion penalty — check if category is excluded
    const isExcluded = rule.exclusions.some((ex) =>
      SPEND_CATEGORY_MAP[category]?.some((kw) => ex.toLowerCase().includes(kw))
    );
    if (isExcluded) {
      score -= 60;
      reason = `❌ Excluded — no points earned on ${category}`;
    } else if (!reason) {
      reason = `earns on ${category} spends`;
    }

    scored.push({ rule, userCard, score, reason });
  }

  return scored.sort((a, b) => b.score - a.score);
}

// ─── Response Builders ────────────────────────────────────────────────────────

function respondGreeting(userCards: UserCard[]): string {
  if (userCards.length === 0) {
    return `👋 Hey there! I'm your **CCRO Reward Advisor** — think of me as a financial GPS for your credit card points.\n\n` +
      `Add your cards to your wallet and I'll help you:\n` +
      `• 💳 Pick the **right card** for every spend\n` +
      `• 🎁 Find the **best way to redeem** your points\n` +
      `• ✈️ Figure out how close you are to **free flights or hotels**\n\n` +
      `*Try asking: "Which card for groceries?" or "How should I use my points?"*`;
  }

  const cardCount = userCards.length;
  const totalPoints = userCards.reduce((sum, c) => sum + c.points, 0);
  const topCard = userCards.reduce((best, c) => (c.points > best.points ? c : best), userCards[0]);

  return `👋 Welcome back! Here's a quick snapshot of your wallet:\n\n` +
    `• 💳 **${cardCount} card${cardCount > 1 ? "s" : ""}** in your wallet\n` +
    `• ⭐ **${topCard.cardName}** has the most points (${topCard.points.toLocaleString("en-IN")})\n` +
    `• 📊 **${totalPoints.toLocaleString("en-IN")} total points** across all cards\n\n` +
    `What are you planning to spend on today? I'll tell you exactly which card to swipe. 💡`;
}

function respondHelp(): string {
  return `🤖 I'm your **AI Reward Advisor**. Here's what I can do:\n\n` +
    `**💳 Spend Decisions**\n` +
    `• *"Which card for groceries/flights/dining/fuel?"*\n\n` +
    `**🎁 Redemption Guidance**\n` +
    `• *"How should I use my HDFC Infinia points?"*\n` +
    `• *"Best way to redeem my Axis Magnus miles?"*\n\n` +
    `**✈️ Milestone Tracking**\n` +
    `• *"How close am I to a free flight?"*\n` +
    `• *"How many points do I need for a hotel stay?"*\n\n` +
    `**💰 Fee & Value Checks**\n` +
    `• *"What's my Regalia fee waiver spend target?"*\n` +
    `• *"What are my HDFC points worth in rupees?"*\n\n` +
    `**🔗 Transfer Partners**\n` +
    `• *"Can I transfer my Infinia points to KrisFlyer?"*\n\n` +
    `**⛔ Exclusion Checks**\n` +
    `• *"Do I earn points on rent?"*`;
}

function respondSpendCategory(category: string, userCards: UserCard[], amount?: number): string {
  if (userCards.length === 0) {
    const topCardsByCategory: Record<string, string> = {
      travel: "HDFC Infinia Metal or Axis Magnus",
      dining: "AU Bank Zenith+ or Axis Ace",
      grocery: "HDFC Millennia or HSBC Liv+",
      online: "SBI Cashback Card or HDFC Millennia",
      fuel: "BPCL SBI Card (not in your wallet yet)",
      bills: "Axis Ace Credit Card",
      rent: "No card earns well on rent — most exclude it",
      entertainment: "SBI SimplyCLICK or ICICI Coral",
      international: "HDFC Infinia or Standard Chartered Ultimate",
    };
    return `You haven't added any cards yet! For **${category}**, the best cards in India are generally: **${topCardsByCategory[category] ?? "HDFC Regalia or Axis Atlas"}**. Add your cards so I can personalise this!`;
  }

  const ranked = rankCardsForCategory(category, userCards);

  if (ranked.length === 0) {
    return `I checked your wallet but couldn't find a match for **${category}** spends. Try adding more cards!`;
  }

  const [first, second, third] = ranked;
  const isFirstExcluded = first.score < 0;

  // Build response
  let response = `🏆 **Best card for ${category.toUpperCase()} spends:**\n\n`;

  if (isFirstExcluded) {
    response = `⚠️ **Heads up on ${category.toUpperCase()} spends:**\n\n`;
    response += `❌ **${first.rule.cardName}** — ${first.reason}\n`;
    if (second && second.score > 0) {
      response += `✅ **Use ${second.rule.cardName} instead** — ${second.reason}\n`;
      response += `\n💡 **Strategy**: ${second.rule.suggestions.find(s =>
        SPEND_CATEGORY_MAP[category]?.some(kw => s.toLowerCase().includes(kw))
      ) ?? second.rule.suggestions[0]}\n`;
    }
  } else {
    response += `✅ **${first.rule.cardName}** (${first.rule.bank})\n`;
    const relevantTip = first.rule.suggestions.find((s) =>
      SPEND_CATEGORY_MAP[category]?.some((kw) => s.toLowerCase().includes(kw))
    ) ?? first.rule.suggestions[0];
    response += `\n💡 ${relevantTip}\n`;

    if (amount) {
      // Estimate points earned
      response += `\n📊 On a spend of ₹${amount.toLocaleString("en-IN")}, expect meaningful rewards — check your bank's app for exact calculation.\n`;
    }

    if (second && second.score > 0) {
      response += `\n🥈 **Runner-up**: ${second.rule.cardName} — ${second.reason}\n`;
    }

    // Exclusion warning for first card if category is partially excluded
    const partialExclusion = first.rule.exclusions.find((ex) =>
      SPEND_CATEGORY_MAP[category]?.some((kw) => ex.toLowerCase().includes(kw))
    );
    if (partialExclusion) {
      response += `\n⚠️ **Watch out**: ${partialExclusion}`;
    }
  }

  return response;
}

function respondCardSpecific(userCard: UserCard): string {
  const rule = rewardRules.find(
    (r) => r.bank === userCard.bank && r.cardName === userCard.cardName
  );

  if (!rule) {
    return `I found **${userCard.cardName}** in your wallet but don't have its 2026 reward data yet. This might be a newer or niche variant — check your bank's rewards portal directly.`;
  }

  const pointsLabel = `${userCard.points.toLocaleString("en-IN")} ${rule.pointsName}`;

  let response = `📊 **${rule.cardName} — Full Breakdown**\n\n`;
  response += `**Balance**: ${pointsLabel}\n`;
  response += `**Tier**: ${rule.cardTier.charAt(0).toUpperCase() + rule.cardTier.slice(1)}\n`;
  response += `**Earn Rate**: ${rule.baseEarnRate}\n`;
  response += `**Best For**: ${rule.bestRedemptionCategory.toUpperCase()}\n\n`;

  response += `**💡 Top 3 Strategies:**\n`;
  rule.suggestions.slice(0, 3).forEach((s) => {
    response += `${s}\n`;
  });

  if (rule.transferPartners && rule.transferPartners.length > 0) {
    response += `\n**🔗 Transfer Partners**: ${rule.transferPartners.slice(0, 4).join(", ")}${rule.transferPartners.length > 4 ? ` +${rule.transferPartners.length - 4} more` : ""}\n`;
  }

  if (rule.milestones && rule.milestones.length > 0) {
    response += `\n**🎯 Milestones**: ${rule.milestones[0]}\n`;
  }

  response += `\n**⛔ Doesn't Earn On**: ${rule.exclusions.slice(0, 3).join(", ")}...\n`;
  response += `**⏳ Points Expiry**: ${rule.pointsExpiry}`;

  return response;
}

function respondRedeemPoints(userCard: UserCard | undefined, userCards: UserCard[]): string {
  const targetCard = userCard ?? (userCards.length === 1 ? userCards[0] : undefined);

  if (!targetCard) {
    // Give general advice for all cards in wallet
    let response = `🎁 **Redemption Guide for Your Wallet:**\n\n`;
    for (const card of userCards.slice(0, 3)) {
      const rule = rewardRules.find(
        (r) => r.bank === card.bank && r.cardName === card.cardName
      );
      if (rule) {
        response += `**${card.cardName}** (${card.points.toLocaleString("en-IN")} pts)\n`;
        response += `→ ${rule.suggestions[0]}\n\n`;
      }
    }
    return response;
  }

  const rule = rewardRules.find(
    (r) => r.bank === targetCard.bank && r.cardName === targetCard.cardName
  );
  if (!rule) return `I don't have redemption data for ${targetCard.cardName} yet.`;

  let response = `🎁 **How to Redeem ${rule.cardName} Points (${targetCard.points.toLocaleString("en-IN")} ${rule.pointsName})**\n\n`;

  response += `**Best to Worst redemption order:**\n`;
  const ordered = [...rule.suggestions];
  ordered.forEach((s, i) => {
    const rank = i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉";
    response += `${rank} ${s}\n`;
  });

  if (rule.transferPartners?.length) {
    response += `\n**✈️ Transfer Partners Available:**\n`;
    rule.transferPartners.forEach((p) => {
      response += `• ${p}\n`;
    });
  }

  response += `\n⏳ **Don't forget**: Points expire ${rule.pointsExpiry.toLowerCase()}`;

  return response;
}

function respondMilestoneCheck(userCard: UserCard | undefined, userCards: UserCard[]): string {
  const targetCard = userCard ?? (userCards.length === 1 ? userCards[0] : undefined);

  if (!targetCard) {
    let response = `🎯 **Milestone Snapshot Across Your Wallet:**\n\n`;
    for (const card of userCards.slice(0, 4)) {
      const rule = rewardRules.find(
        (r) => r.bank === card.bank && r.cardName === card.cardName
      );
      if (!rule) continue;
      if (rule.milestones && rule.milestones.length > 0) {
        response += `**${card.cardName}**: ${rule.milestones[0]}\n`;
      } else {
        response += `**${card.cardName}**: No specific spend milestones — focus on redemption.\n`;
      }
    }
    return response;
  }

  const rule = rewardRules.find(
    (r) => r.bank === targetCard.bank && r.cardName === targetCard.cardName
  );
  if (!rule) return `I don't have milestone data for ${targetCard.cardName}.`;

  let response = `🎯 **${rule.cardName} — Milestone Tracker**\n\n`;
  response += `Current balance: **${targetCard.points.toLocaleString("en-IN")} ${rule.pointsName}**\n\n`;

  if (rule.milestones && rule.milestones.length > 0) {
    response += `**Card-specific milestones:**\n`;
    rule.milestones.forEach((m) => { response += `${m}\n`; });
    response += "\n";
  }

  // Rough reward thresholds based on tier
  const tierThresholds: Record<string, { domestic: number; hotel: number; international: number }> = {
    "ultra-premium": { domestic: 7000, hotel: 15000, international: 28000 },
    premium: { domestic: 12000, hotel: 25000, international: 50000 },
    mid: { domestic: 20000, hotel: 40000, international: 80000 },
    entry: { domestic: 30000, hotel: 60000, international: 120000 },
  };

  const thresholds = tierThresholds[rule.cardTier];
  const pts = targetCard.points;

  response += `**🏆 Redemption milestones:**\n`;

  if (pts >= thresholds.international) {
    response += `✅ **International Flight** — You're there! Redeem now via ${rule.transferPartners?.[0] ?? "your bank's travel portal"}.\n`;
  } else {
    const needed = thresholds.international - pts;
    response += `✈️ **International Flight**: Need **${needed.toLocaleString("en-IN")} more ${rule.pointsName}** (${Math.round((pts / thresholds.international) * 100)}% there)\n`;
  }

  if (pts >= thresholds.hotel) {
    response += `✅ **Luxury Hotel Night** — Unlocked! Book via ${rule.transferPartners?.find(p => p.toLowerCase().includes("marriott") || p.toLowerCase().includes("accor") || p.toLowerCase().includes("ihg")) ?? "travel portal"}.\n`;
  } else {
    const needed = thresholds.hotel - pts;
    response += `🏨 **Luxury Hotel Night**: Need **${needed.toLocaleString("en-IN")} more ${rule.pointsName}** (${Math.round((pts / thresholds.hotel) * 100)}% there)\n`;
  }

  if (pts >= thresholds.domestic) {
    response += `✅ **Domestic Flight** — Ready! Use SmartBuy / iShop / travel portal today.\n`;
  } else {
    const needed = thresholds.domestic - pts;
    response += `🛫 **Domestic Flight**: Need **${needed.toLocaleString("en-IN")} more ${rule.pointsName}** (${Math.round((pts / thresholds.domestic) * 100)}% there)\n`;
  }

  return response;
}

function respondExclusionCheck(
  userCard: UserCard | undefined,
  userCards: UserCard[],
  category?: string
): string {
  const targetCard = userCard ?? (userCards.length === 1 ? userCards[0] : undefined);

  if (!targetCard) {
    if (!category) return `Tell me which card and spend type you're asking about — e.g. *"Do I earn points on rent with my Regalia?"*`;
    // Check all wallet cards
    let response = `📋 **Points earned on ${category?.toUpperCase()} — Wallet Check:**\n\n`;
    for (const card of userCards) {
      const rule = rewardRules.find(
        (r) => r.bank === card.bank && r.cardName === card.cardName
      );
      if (!rule) continue;
      const excluded = rule.exclusions.some((ex) =>
        ex.toLowerCase().includes(category ?? "")
      );
      response += `${excluded ? "❌" : "✅"} **${card.cardName}** — ${excluded ? `No points on ${category}` : `Earns points on ${category}`}\n`;
    }
    return response;
  }

  const rule = rewardRules.find(
    (r) => r.bank === targetCard.bank && r.cardName === targetCard.cardName
  );
  if (!rule) return `I don't have exclusion data for ${targetCard.cardName} yet.`;

  if (!category) {
    let response = `⛔ **${rule.cardName} — Excluded Categories (no points):**\n\n`;
    rule.exclusions.forEach((ex) => { response += `• ${ex}\n`; });
    return response;
  }

  const excluded = rule.exclusions.find((ex) => ex.toLowerCase().includes(category));
  if (excluded) {
    return `❌ **${rule.cardName} does NOT earn points on ${category}.**\n\n` +
      `Exclusion detail: *${excluded}*\n\n` +
      `💡 **Tip**: For ${category} payments, ${category === "rent" ? "consider NoBroker's co-branded card or check if your bank has a rent payment feature with partial rewards." : "check if another card in your wallet has a better policy."}`;
  }

  return `✅ **${rule.cardName} DOES earn ${rule.pointsName} on ${category} spends!**\n\n` +
    `Earn rate: ${rule.baseEarnRate}\n\n` +
    `💡 ${rule.suggestions[0]}`;
}

function respondTransferPartner(
  partner: string,
  userCard: UserCard | undefined,
  userCards: UserCard[]
): string {
  const targetCards = userCard ? [userCard] : userCards;

  const matches: Array<{ card: UserCard; rule: RewardRule }> = [];
  for (const card of targetCards) {
    const rule = rewardRules.find(
      (r) => r.bank === card.bank && r.cardName === card.cardName
    );
    if (!rule) continue;
    const hasPartner = rule.transferPartners?.some((p) =>
      p.toLowerCase().includes(partner.toLowerCase())
    );
    if (hasPartner) matches.push({ card, rule });
  }

  if (matches.length === 0) {
    return partner
      ? `❌ None of your wallet cards currently transfer to **${partner}**.\n\nCards with the widest transfer networks include HDFC Infinia, Axis Magnus, and Standard Chartered Ultimate — worth considering for future upgrades.`
      : `Tell me which transfer partner you're asking about — e.g. *"Can I transfer to Singapore KrisFlyer?"*`;
  }

  let response = partner
    ? `✅ **Cards in your wallet that transfer to ${partner}:**\n\n`
    : `🔗 **Transfer partner options from your wallet:**\n\n`;

  for (const { card, rule } of matches) {
    response += `**${card.cardName}** (${card.points.toLocaleString("en-IN")} ${rule.pointsName})\n`;
    response += `→ ${rule.suggestions.find(s => s.toLowerCase().includes("transfer") || s.toLowerCase().includes("mile")) ?? rule.suggestions[0]}\n`;
    if (rule.transferPartners) {
      response += `→ All partners: ${rule.transferPartners.slice(0, 4).join(", ")}\n`;
    }
    response += "\n";
  }

  response += `\n💡 **Pro tip**: Transfer when you have enough for a meaningful redemption (e.g. a domestic award ticket) — partial transfers often yield poor value.`;
  return response;
}

function respondFeeWaiver(userCard: UserCard | undefined, userCards: UserCard[]): string {
  const targets = userCard ? [userCard] : userCards;

  let response = `💳 **Annual Fee Waiver Tracker:**\n\n`;

  for (const card of targets) {
    const rule = rewardRules.find(
      (r) => r.bank === card.bank && r.cardName === card.cardName
    );
    if (!rule) continue;

    response += `**${rule.cardName}** (₹${rule.annualFee.toLocaleString("en-IN")} fee)\n`;
    if (rule.feeWaiverSpend) {
      response += `→ Waived at **₹${rule.feeWaiverSpend.toLocaleString("en-IN")} annual spend**\n`;
      response += `→ You need ₹${Math.round(rule.feeWaiverSpend / 12).toLocaleString("en-IN")}/month on average to hit this.\n`;
    } else {
      response += `→ No spend-based fee waiver — annual fee is fixed.\n`;
    }
    response += "\n";
  }

  return response;
}

function respondPointsValue(userCard: UserCard | undefined, userCards: UserCard[]): string {
  const targets = userCard ? [userCard] : userCards;

  let response = `💰 **Points Value Estimate:**\n\n`;

  for (const card of targets) {
    const rule = rewardRules.find(
      (r) => r.bank === card.bank && r.cardName === card.cardName
    );
    if (!rule) continue;

    const category = rule.bestRedemptionCategory;
    const categoryLabels: Record<string, string> = {
      travel: "travel portal / airline miles",
      cashback: "cashback / statement credit",
      vouchers: "brand vouchers",
      miles: "airline mile transfer",
    };

    response += `**${rule.cardName}** — ${card.points.toLocaleString("en-IN")} ${rule.pointsName}\n`;
    response += `→ Best redemption: **${categoryLabels[category] ?? category}**\n`;
    response += `→ ${rule.suggestions[0]}\n\n`;
  }

  return response;
}

function respondCompareCards(userCards: UserCard[]): string {
  if (userCards.length === 0) return respondGreeting([]);
  if (userCards.length === 1) return respondCardSpecific(userCards[0]);

  const categories = ["travel", "cashback", "online", "dining", "bills"];
  let response = `📊 **Wallet Comparison — Which Card Wins Where:**\n\n`;

  for (const cat of categories) {
    const ranked = rankCardsForCategory(cat, userCards);
    const winner = ranked.find((r) => r.score > 0);
    if (winner) {
      response += `**${cat.toUpperCase()}**: ${winner.rule.cardName} ✅\n`;
    }
  }

  response += `\n**💡 Quick Rules:**\n`;
  for (const card of userCards.slice(0, 4)) {
    const rule = rewardRules.find(
      (r) => r.bank === card.bank && r.cardName === card.cardName
    );
    if (rule) {
      response += `• **${rule.cardName}** → best for ${rule.bestRedemptionCategory}\n`;
    }
  }

  return response;
}

function respondGeneral(userCards: UserCard[]): string {
  if (userCards.length === 0) return respondGreeting([]);

  const totalPoints = userCards.reduce((sum, c) => sum + c.points, 0);
  const topCard = userCards.reduce(
    (best, c) => (c.points > best.points ? c : best),
    userCards[0]
  );
  const topRule = rewardRules.find(
    (r) => r.bank === topCard.bank && r.cardName === topCard.cardName
  );

  let response = `💡 **Here's what I'd focus on for your wallet right now:**\n\n`;

  if (topRule) {
    response += `🌟 **${topCard.cardName}** has your highest balance (${topCard.points.toLocaleString("en-IN")} pts).\n`;
    response += `→ ${topRule.suggestions[0]}\n\n`;
  }

  response += `📊 **Total across ${userCards.length} cards**: ${totalPoints.toLocaleString("en-IN")} points\n\n`;
  response += `**Try asking me:**\n`;
  response += `• *"Which card for groceries?"*\n`;
  response += `• *"How do I redeem my ${topCard.cardName} points?"*\n`;
  response += `• *"Am I close to a free flight?"*`;

  return response;
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function getLocalAdvice(query: string, userCards: UserCard[]): string {
  const intent = detectIntent(query, userCards);

  switch (intent.type) {
    case "greeting":
      return respondGreeting(userCards);

    case "help":
      return respondHelp();

    case "spend_category":
      return respondSpendCategory(
        intent.spendCategory!,
        userCards,
        intent.spendAmount
      );

    case "card_specific":
      return respondCardSpecific(intent.mentionedCard!);

    case "redeem_points":
      return respondRedeemPoints(intent.mentionedCard, userCards);

    case "compare_cards":
      return respondCompareCards(userCards);

    case "milestone_check":
      return respondMilestoneCheck(intent.mentionedCard, userCards);

    case "exclusion_check":
      return respondExclusionCheck(
        intent.mentionedCard,
        userCards,
        intent.spendCategory
      );

    case "transfer_partner":
      return respondTransferPartner(
        intent.mentionedPartner ?? "",
        intent.mentionedCard,
        userCards
      );

    case "fee_waiver":
      return respondFeeWaiver(intent.mentionedCard, userCards);

    case "points_value":
      return respondPointsValue(intent.mentionedCard, userCards);

    case "general":
    default:
      return respondGeneral(userCards);
  }
}