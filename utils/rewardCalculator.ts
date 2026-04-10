// CCRO/app/utils/milestones.ts
// Milestone engine tied to real Indian credit card reward data.
// Each card has a tailored redemption ladder built from actual point values.

import { rewardRules } from "../data/rewardRules";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MilestoneReward = {
  name: string;           // Human-readable reward name
  description: string;    // What this unlocks / best use
  pointsRequired: number; // Points needed to reach this tier
  icon: string;           // Icon key for the UI
  category: "lifestyle" | "dining" | "shopping" | "travel" | "premium-travel" | "elite";
};

export type Milestone = {
  targetName: string;
  targetDescription: string;
  pointsNeeded: number;
  percentageComplete: number;
  icon: string;
  category: MilestoneReward["category"];
  allMilestones: MilestoneReward[]; // Full ladder for progress UI
};

// ─── Per-Card Milestone Ladders ───────────────────────────────────────────────
// Point thresholds derived from each card's best redemption rate.
// Formula: target ₹ value ÷ card rate = points needed
// e.g. Infinia: ₹500 movie = 500 pts | Regalia Gold: ₹500 movie = 1,000 pts

type CardMilestoneLadder = {
  bank: string;
  cardName: string;
  ladder: MilestoneReward[];
};

const CARD_MILESTONES: CardMilestoneLadder[] = [

  // ─── HDFC: Infinia Metal ─────────────────────
  {
    bank: "HDFC Bank",
    cardName: "Infinia Metal",
    ladder: [
      { name: "Multiplex Movie Ticket", description: "Redeem via BookMyShow voucher on SmartBuy", pointsRequired: 500, icon: "film", category: "lifestyle" },
      { name: "Fine Dining Meal", description: "Premium restaurant voucher via SmartBuy catalogue", pointsRequired: 1500, icon: "restaurant", category: "dining" },
      { name: "Amazon/Flipkart Voucher", description: "Shopping voucher via HDFC SmartBuy rewards", pointsRequired: 3000, icon: "gift", category: "shopping" },
      { name: "Domestic Flight Ticket", description: "One-way flight via SmartBuy to any Indian metro", pointsRequired: 5000, icon: "airplane", category: "travel" },
      { name: "Weekend Hotel Stay", description: "2-night domestic hotel via SmartBuy 10X portal", pointsRequired: 12000, icon: "bed", category: "travel" },
      { name: "International Business Class Upgrade", description: "Transfer to Singapore KrisFlyer / BA Avios for a premium cabin upgrade", pointsRequired: 30000, icon: "airplane-outline", category: "premium-travel" },
      { name: "International Round Trip", description: "Return ticket to SE Asia / Middle East via airline partner transfer", pointsRequired: 60000, icon: "earth", category: "elite" },
    ],
  },

  // ─── HDFC: Diners Club Black Metal ──────────────────
  {
    bank: "HDFC Bank",
    cardName: "Diners Club Black Metal",
    ladder: [
      { name: "Multiplex Movie Ticket", description: "BookMyShow voucher via SmartBuy", pointsRequired: 500, icon: "film", category: "lifestyle" },
      { name: "Fine Dining Meal", description: "Restaurant voucher via SmartBuy catalogue", pointsRequired: 1500, icon: "restaurant", category: "dining" },
      { name: "Amazon/Flipkart Voucher", description: "E-commerce shopping voucher", pointsRequired: 3000, icon: "gift", category: "shopping" },
      { name: "Domestic Flight Ticket", description: "One-way SmartBuy flight — Delhi/Mumbai/Bangalore routes", pointsRequired: 5000, icon: "airplane", category: "travel" },
      { name: "Premium Hotel Night", description: "Luxury hotel via SmartBuy 10X portal", pointsRequired: 15000, icon: "bed", category: "travel" },
      { name: "International Flight to SE Asia", description: "Transfer to SpiceClub, AirAsia BIG, or Flying Blue", pointsRequired: 35000, icon: "earth", category: "premium-travel" },
      { name: "Business Class to Europe", description: "Combine points with Finnair Avios for long-haul premium cabin", pointsRequired: 100000, icon: "rocket", category: "elite" },
    ],
  },

  // ─── HDFC: Regalia Gold ──────────────────────────
  {
    bank: "HDFC Bank",
    cardName: "Regalia Gold",
    ladder: [
      { name: "Multiplex Movie Ticket", description: "BookMyShow voucher via SmartBuy", pointsRequired: 1000, icon: "film", category: "lifestyle" },
      { name: "Fine Dining Meal", description: "Restaurant voucher via HDFC rewards catalogue", pointsRequired: 3000, icon: "restaurant", category: "dining" },
      { name: "Amazon/Flipkart Voucher", description: "Shopping voucher via SmartBuy", pointsRequired: 5000, icon: "gift", category: "shopping" },
      { name: "Domestic Flight Ticket", description: "One-way domestic flight via SmartBuy", pointsRequired: 10000, icon: "airplane", category: "travel" },
      { name: "Taj / Marriott Hotel Stay", description: "1-night premium hotel via SmartBuy", pointsRequired: 20000, icon: "bed", category: "travel" },
      { name: "International Flight Ticket", description: "Transfer to Air India Flying Returns or InterMiles", pointsRequired: 50000, icon: "earth", category: "premium-travel" },
      { name: "Annual Fee Waiver", description: "₹4L spend target unlocks next year's ₹2,500 fee waiver", pointsRequired: 80000, icon: "shield-checkmark", category: "elite" },
    ],
  },

  // ─── HDFC: Millennia ──────────────────────────────
  {
    bank: "HDFC Bank",
    cardName: "Millennia",
    ladder: [
      { name: "Coffee & Snack Top-Up", description: "Amazon Pay / Swiggy balance boost", pointsRequired: 500, icon: "cafe", category: "lifestyle" },
      { name: "OTT Subscription Month", description: "Netflix/Prime/Hotstar via Amazon voucher", pointsRequired: 1000, icon: "tv", category: "lifestyle" },
      { name: "Grocery Run on BigBasket", description: "BigBasket voucher via HDFC SmartBuy", pointsRequired: 2500, icon: "cart", category: "shopping" },
      { name: "Swiggy / Zomato Dinner for Two", description: "Food delivery voucher from partner apps", pointsRequired: 5000, icon: "restaurant", category: "dining" },
      { name: "Flipkart/Amazon Shopping Spree", description: "E-commerce voucher for electronics/clothing", pointsRequired: 10000, icon: "gift", category: "shopping" },
      { name: "Weekend Hotel Booking", description: "Domestic hotel via partner booking sites", pointsRequired: 20000, icon: "bed", category: "travel" },
      { name: "Annual Fee Recovery", description: "Statement credit recovers ₹1,000 annual fee + surplus", pointsRequired: 10000, icon: "shield-checkmark", category: "elite" },
    ],
  },

  // ─── HDFC: Moneyback+ ─────────────────────────────────────────
  {
    bank: "HDFC Bank",
    cardName: "Moneyback+",
    ladder: [
      { name: "Mobile Recharge", description: "Statement credit covering a monthly recharge", pointsRequired: 500, icon: "phone-portrait", category: "lifestyle" },
      { name: "Swiggy / Zomato Order", description: "Food delivery credit via rewards redemption", pointsRequired: 1000, icon: "restaurant", category: "dining" },
      { name: "Amazon Voucher", description: "Shopping voucher for everyday purchases", pointsRequired: 2500, icon: "gift", category: "shopping" },
      { name: "Grocery Month Covered", description: "BigBasket voucher for a month's grocery top-up", pointsRequired: 5000, icon: "cart", category: "shopping" },
      { name: "Annual Fee Waiver Achieved", description: "₹50,000 spend milestone unlocks next year's ₹500 fee waiver", pointsRequired: 10000, icon: "shield-checkmark", category: "elite" },
      { name: "Domestic Bus / Train Ticket", description: "Travel redemption via IRCTC / RedBus voucher", pointsRequired: 10000, icon: "train", category: "travel" },
    ],
  },

  // ─── HDFC: Tata Neu Infinity ──────────────────────
  {
    bank: "HDFC Bank",
    cardName: "Tata Neu Infinity",
    ladder: [
      { name: "1mg Medicine Order", description: "NeuCoins redeemed on 1mg for a month's medicines", pointsRequired: 500, icon: "medkit", category: "lifestyle" },
      { name: "BigBasket Grocery Order", description: "NeuCoins on BigBasket for a single grocery run", pointsRequired: 1250, icon: "cart", category: "shopping" },
      { name: "Croma Electronics Voucher", description: "NeuCoins toward electronics or accessories on Croma", pointsRequired: 3750, icon: "gift", category: "shopping" },
      { name: "Air India Domestic Flight", description: "NeuCoins applied on Air India booking via Tata Neu", pointsRequired: 10000, icon: "airplane", category: "travel" },
      { name: "Tata CLiQ Luxury Purchase", description: "Premium lifestyle or fashion purchase on Tata CLiQ Luxury", pointsRequired: 20000, icon: "bag", category: "premium-travel" },
      { name: "Taj Hotel Stay", description: "NeuCoins redeemed toward IHCL / Taj Hotels booking", pointsRequired: 37500, icon: "bed", category: "elite" },
    ],
  },

  // ─── HDFC: Swiggy HDFC Bank (cashback → Swiggy Wallet) ───────────────────
  {
    bank: "HDFC Bank",
    cardName: "Swiggy HDFC Bank",
    ladder: [
      { name: "Free Instamart Delivery", description: "Swiggy Wallet cashback covers delivery fees for a month", pointsRequired: 1000, icon: "bicycle", category: "lifestyle" },
      { name: "Swiggy Dinner Order", description: "Wallet balance covers a full Swiggy food order", pointsRequired: 4000, icon: "restaurant", category: "dining" },
      { name: "Weekly Grocery Top-Up", description: "Instamart grocery top-up covered by Swiggy Wallet", pointsRequired: 8000, icon: "cart", category: "shopping" },
      { name: "Dineout Premium Dinner", description: "Swiggy Dineout booking at a fine dining restaurant", pointsRequired: 20000, icon: "wine", category: "dining" },
      { name: "Annual Fee Recovery", description: "₹500 annual fee recovered — net profit point reached!", pointsRequired: 5000, icon: "shield-checkmark", category: "elite" },
    ],
  },

  // ─── ICICI: Emeralde Private Metal (18% via iShop vouchers) ──────────────
  {
    bank: "ICICI Bank",
    cardName: "Emeralde Private Metal",
    ladder: [
      { name: "Premium Dining Voucher", description: "iShop voucher for a top restaurant", pointsRequired: 4000, icon: "restaurant", category: "dining" },
      { name: "Luxury Brand Voucher", description: "iShop for Tanishq, Titan, or designer brands", pointsRequired: 12000, icon: "diamond", category: "shopping" },
      { name: "Domestic Flight Ticket", description: "Airline miles transfer to Air India / InterMiles", pointsRequired: 24000, icon: "airplane", category: "travel" },
      { name: "International Hotel Stay", description: "iShop hotel booking at 36X rate — highest in India", pointsRequired: 80000, icon: "bed", category: "premium-travel" },
      { name: "International Business Class", description: "KrisFlyer transfer for a premium cabin — SE Asia / Middle East", pointsRequired: 240000, icon: "earth", category: "elite" },
    ],
  },

  // ─── ICICI: Amazon Pay ──────────────────
  {
    bank: "ICICI Bank",
    cardName: "Amazon Pay",
    ladder: [
      { name: "Prime Video Rental", description: "Amazon Pay balance toward a movie rental", pointsRequired: 300, icon: "tv", category: "lifestyle" },
      { name: "Amazon Grocery Order", description: "Amazon Fresh / Pantry order covered", pointsRequired: 2000, icon: "cart", category: "shopping" },
      { name: "Amazon eBook / App Purchase", description: "Amazon Pay balance toward a book or app", pointsRequired: 4000, icon: "book", category: "lifestyle" },
      { name: "Amazon Electronics Voucher", description: "Applied toward a gadget or accessory on Amazon", pointsRequired: 10000, icon: "gift", category: "shopping" },
      { name: "Amazon Fashion Haul", description: "Balance toward a clothing/footwear order", pointsRequired: 20000, icon: "shirt", category: "shopping" },
      { name: "Amazon Large Appliance", description: "Significant balance reduction on an appliance purchase", pointsRequired: 40000, icon: "tv", category: "elite" },
    ],
  },

  // ─── ICICI: Sapphiro ──────────────────
  {
    bank: "ICICI Bank",
    cardName: "Sapphiro",
    ladder: [
      { name: "Airport Lounge Visit", description: "Complimentary domestic lounge access", pointsRequired: 1000, icon: "business", category: "travel" },
      { name: "Fine Dining Voucher", description: "ICICI Culinary Treats offer at a premium restaurant", pointsRequired: 6000, icon: "restaurant", category: "dining" },
      { name: "Domestic Flight Ticket", description: "InterMiles transfer for a one-way domestic flight", pointsRequired: 10000, icon: "airplane", category: "travel" },
      { name: "International Hotel Booking", description: "Travel portal hotel booking", pointsRequired: 24000, icon: "bed", category: "premium-travel" },
      { name: "International Flight to Singapore/Dubai", description: "KrisFlyer / InterMiles transfer for round trip", pointsRequired: 60000, icon: "earth", category: "elite" },
    ],
  },

  // ─── ICICI: Coral ──────────────────────────────────
  {
    bank: "ICICI Bank",
    cardName: "Coral",
    ladder: [
      { name: "Movie Ticket (Multiplex)", description: "BookMyShow discount or voucher", pointsRequired: 1000, icon: "film", category: "lifestyle" },
      { name: "Restaurant Voucher", description: "ICICI Culinary Treats partner restaurant offer", pointsRequired: 3000, icon: "restaurant", category: "dining" },
      { name: "Amazon Gift Card", description: "ICICI Rewards catalogue voucher", pointsRequired: 5000, icon: "gift", category: "shopping" },
      { name: "Flipkart Shopping Voucher", description: "ICICI Rewards portal redemption", pointsRequired: 10000, icon: "bag", category: "shopping" },
      { name: "Annual Fee Waiver Milestone", description: "₹1.5L annual spend unlocks fee waiver — effectively free card", pointsRequired: 15000, icon: "shield-checkmark", category: "elite" },
    ],
  },

  // ─── Axis: Magnus Metal ─
  {
    bank: "Axis Bank",
    cardName: "Magnus Metal",
    ladder: [
      { name: "Premium Dining Voucher", description: "Grab Deals dining offer", pointsRequired: 5000, icon: "restaurant", category: "dining" },
      { name: "Amazon/Flipkart Voucher", description: "EDGE Rewards catalogue shopping voucher", pointsRequired: 15000, icon: "gift", category: "shopping" },
      { name: "Domestic Flight Ticket", description: "Transfer EDGE Miles to InterMiles / Air India at 5:4 ratio", pointsRequired: 37500, icon: "airplane", category: "travel" },
      { name: "Business Class Domestic", description: "Upgrade to business class on IndiGo or Air India via miles", pointsRequired: 75000, icon: "airplane-outline", category: "premium-travel" },
      { name: "International Economy Ticket", description: "SE Asia / Middle East via KrisFlyer mile transfer", pointsRequired: 150000, icon: "earth", category: "premium-travel" },
      { name: "Annual Fee Recovery via ₹15L Spend", description: "₹15L spend milestone achieves fee waiver — net zero cost card", pointsRequired: 300000, icon: "rocket", category: "elite" },
    ],
  },

  // ─── Axis: Atlas ─────────────────────────
  {
    bank: "Axis Bank",
    cardName: "Atlas Credit Card",
    ladder: [
      { name: "Airport Lounge Access", description: "Domestic lounge visit", pointsRequired: 1000, icon: "business", category: "travel" },
      { name: "Dining at Partner Restaurant", description: "EDGE Rewards partner restaurant offer", pointsRequired: 3000, icon: "restaurant", category: "dining" },
      { name: "One-Way Domestic Flight", description: "Air India / InterMiles transfer", pointsRequired: 10000, icon: "airplane", category: "travel" },
      { name: "Hotel Stay (Domestic)", description: "Marriott / IHG partner hotel booking", pointsRequired: 20000, icon: "bed", category: "travel" },
      { name: "International Round Trip", description: "Return ticket to SE Asia / Middle East via KrisFlyer or Etihad", pointsRequired: 80000, icon: "earth", category: "premium-travel" },
      { name: "Annual Fee Waiver", description: "₹7.5L annual spend milestone for full fee waiver", pointsRequired: 100000, icon: "shield-checkmark", category: "elite" },
    ],
  },

  // ─── Axis: Ace (cashback at ₹0.40/pt) ────────────────────────────────────
  {
    bank: "Axis Bank",
    cardName: "Ace Credit Card",
    ladder: [
      { name: "Utility Bill Coverage", description: "Electricity or gas bill cashback credits back to statement", pointsRequired: 500, icon: "flash", category: "lifestyle" },
      { name: "Mobile Recharge Month", description: "Airtel / BSNL recharge covered by statement credit", pointsRequired: 1000, icon: "phone-portrait", category: "lifestyle" },
      { name: "Swiggy/Zomato Weekend Dinner", description: "4% cashback unlocked for a full meal for two", pointsRequired: 2500, icon: "restaurant", category: "dining" },
      { name: "OTT Bundle (3 months)", description: "Statement credit equivalent to 3 months of streaming subs", pointsRequired: 3750, icon: "tv", category: "lifestyle" },
      { name: "Annual Fee Recovery", description: "₹499 fee recovered — turns into a net-positive card", pointsRequired: 1250, icon: "shield-checkmark", category: "elite" },
      { name: "Monthly Bill Autopilot", description: "All utility bills on Ace via Google Pay — effectively free every month", pointsRequired: 12500, icon: "rocket", category: "elite" },
    ],
  },

  // ─── Axis: Select ───────────────────
  {
    bank: "Axis Bank",
    cardName: "Select Credit Card",
    ladder: [
      { name: "Movie + Popcorn Combo", description: "BookMyShow offer via Dining Delights", pointsRequired: 2500, icon: "film", category: "lifestyle" },
      { name: "Restaurant Discount Night", description: "15% off at 4,000+ restaurants via Axis Dining Delights", pointsRequired: 5000, icon: "restaurant", category: "dining" },
      { name: "Fashion / Apparel Voucher (10X)", description: "Max 10X earn at clothing stores redeemed as voucher", pointsRequired: 10000, icon: "shirt", category: "shopping" },
      { name: "Domestic Lounge Access Quarter", description: "Quarterly spend (₹50K) unlocks 2 free domestic lounges", pointsRequired: 15000, icon: "business", category: "travel" },
      { name: "Annual Fee Waiver", description: "₹6L spend milestone for fee waiver", pointsRequired: 50000, icon: "shield-checkmark", category: "elite" },
    ],
  },

  // ─── SBI: Cashback SBI Card (5% online cashback) ─────────────────────────
  {
    bank: "SBI",
    cardName: "Cashback SBI Card",
    ladder: [
      { name: "Free Delivery Pass Month", description: "Swiggy One / Blinkit pass covered by cashback", pointsRequired: 2000, icon: "bicycle", category: "lifestyle" },
      { name: "OTT Subscription", description: "Netflix / Prime monthly subscription cashback", pointsRequired: 6000, icon: "tv", category: "lifestyle" },
      { name: "Grocery Month Covered", description: "Online grocery cashback for a full month", pointsRequired: 20000, icon: "cart", category: "shopping" },
      { name: "Online Shopping Haul", description: "5% back on Flipkart / Amazon / Meesho purchase", pointsRequired: 50000, icon: "gift", category: "shopping" },
      { name: "Annual Fee Recovery", description: "₹999 fee recovered within ₹20,000 of online spends", pointsRequired: 20000, icon: "shield-checkmark", category: "elite" },
      { name: "Travel Booking Cashback", description: "5% on MakeMyTrip / IRCTC online booking", pointsRequired: 100000, icon: "airplane", category: "travel" },
    ],
  },

  // ─── SBI: SimplyCLICK ───────────────
  {
    bank: "SBI",
    cardName: "SimplyCLICK",
    ladder: [
      { name: "Movie Night (BookMyShow)", description: "10X BookMyShow earn — free ticket redeemed faster", pointsRequired: 1200, icon: "film", category: "lifestyle" },
      { name: "Dominos Pizza Voucher", description: "10X Dominos earn redeemed as voucher", pointsRequired: 2000, icon: "pizza", category: "dining" },
      { name: "Amazon Shopping Voucher", description: "SBI Rewardz Amazon voucher", pointsRequired: 5000, icon: "gift", category: "shopping" },
      { name: "Cleartrip Flight Booking", description: "10X on Cleartrip — redeem points toward next trip", pointsRequired: 10000, icon: "airplane", category: "travel" },
      { name: "Annual Fee Waiver", description: "₹1L annual spend milestone unlocks free card next year", pointsRequired: 15000, icon: "shield-checkmark", category: "elite" },
    ],
  },

  // ─── SBI: Prime Credit Card ───────────────
  {
    bank: "SBI",
    cardName: "Prime Credit Card",
    ladder: [
      { name: "Dining Voucher", description: "Partner restaurant voucher via SBI Rewardz", pointsRequired: 2000, icon: "restaurant", category: "dining" },
      { name: "Lifestyle Brand Voucher", description: "Shopper's Stop / Lifestyle store voucher", pointsRequired: 5000, icon: "bag", category: "shopping" },
      { name: "Domestic Flight via Yatra", description: "Yatra.com booking using accumulated points", pointsRequired: 10000, icon: "airplane", category: "travel" },
      { name: "Hotel Booking (Weekend Trip)", description: "Moderate hotel via SBI partner travel portal", pointsRequired: 20000, icon: "bed", category: "travel" },
      { name: "Annual Fee Waiver", description: "₹3L annual spend unlocks next year's ₹2,999 waiver", pointsRequired: 30000, icon: "shield-checkmark", category: "elite" },
    ],
  },

  // ─── SBI: Aurum Credit Card ───────────────────
  {
    bank: "SBI",
    cardName: "Aurum Credit Card",
    ladder: [
      { name: "Premium Dining Experience", description: "SBI Rewardz fine dining voucher", pointsRequired: 5000, icon: "restaurant", category: "dining" },
      { name: "ITC / Taj Hotel Stay", description: "Hotel partner booking for one night", pointsRequired: 15000, icon: "bed", category: "travel" },
      { name: "Domestic Business Class Flight", description: "Air India Flying Returns transfer", pointsRequired: 25000, icon: "airplane-outline", category: "premium-travel" },
      { name: "International Flight to Dubai/Singapore", description: "InterMiles transfer for economy return", pointsRequired: 60000, icon: "earth", category: "premium-travel" },
      { name: "Golf + Concierge Bundle", description: "Complimentary golf games + concierge requests at HNI tier", pointsRequired: 80000, icon: "golf", category: "elite" },
    ],
  },

  // ─── Amex: Gold Charge Card ─────────────────────
  {
    bank: "American Express",
    cardName: "Gold Charge Card",
    ladder: [
      { name: "Monthly Bonus 1,000 MR", description: "Hit 4 transactions above ₹1,000 this month to earn 1,000 bonus MR", pointsRequired: 1000, icon: "star", category: "lifestyle" },
      { name: "18 Karat Voucher", description: "Premium brand voucher from Amex Rewards 18K collection", pointsRequired: 5000, icon: "gift", category: "shopping" },
      { name: "24 Karat Voucher (Premium Brands)", description: "Tanishq / Lifestyle / premium Amex voucher from 24K collection", pointsRequired: 10000, icon: "diamond", category: "shopping" },
      { name: "Domestic Flight via KrisFlyer", description: "Transfer MR to Singapore KrisFlyer — Bangalore/Delhi/Mumbai routes", pointsRequired: 11700, icon: "airplane", category: "travel" },
      { name: "International Flight to SE Asia", description: "MR → KrisFlyer / InterMiles for Singapore or Bangkok economy return", pointsRequired: 50000, icon: "earth", category: "premium-travel" },
      { name: "Business Class Upgrade", description: "MR → BA Avios / KrisFlyer for a premium cabin to Middle East or Europe", pointsRequired: 133000, icon: "rocket", category: "elite" },
    ],
  },

  // ─── Amex: MRCC ────────────────────────
  {
    bank: "American Express",
    cardName: "Membership Rewards Credit Card",
    ladder: [
      { name: "Monthly 1,000 MR Bonus", description: "4 transactions above ₹1,000 unlocks this every month", pointsRequired: 1000, icon: "star", category: "lifestyle" },
      { name: "18 Karat Rewards Voucher", description: "Entry brand voucher from Amex 18K rewards collection", pointsRequired: 3000, icon: "gift", category: "shopping" },
      { name: "Annual Fee Recovery", description: "₹1.5L spend milestone gets fee waived — net positive card", pointsRequired: 3750, icon: "shield-checkmark", category: "elite" },
      { name: "InterMiles Transfer (Domestic Flight)", description: "Transfer MR → InterMiles for a one-way domestic flight", pointsRequired: 10000, icon: "airplane", category: "travel" },
      { name: "International Flight Upgrade", description: "Transfer to Jet BlueMembership / KrisFlyer for short-haul international", pointsRequired: 37500, icon: "earth", category: "premium-travel" },
    ],
  },

  // ─── Amex: Platinum Travel ─────────────────────
  {
    bank: "American Express",
    cardName: "Platinum Travel Credit Card",
    ladder: [
      { name: "IndiGo Ticket (Short Haul)", description: "5X earn on IndiGo — redeem toward Delhi-Mumbai type route", pointsRequired: 5000, icon: "airplane", category: "travel" },
      { name: "Taj Experiences Voucher", description: "Milestone voucher toward a Taj hotel dining / spa experience", pointsRequired: 9100, icon: "restaurant", category: "premium-travel" },
      { name: "MakeMyTrip Holiday Voucher", description: "Annual milestone MakeMyTrip voucher for domestic holiday", pointsRequired: 14000, icon: "bed", category: "travel" },
      { name: "IndiGo 6E Prime Lounge Voucher", description: "Annual milestone 6E Prime lounge access bundle", pointsRequired: 18200, icon: "business", category: "premium-travel" },
      { name: "International Economy Return Ticket", description: "Amex MR transfer to KrisFlyer / InterMiles for SE Asia return", pointsRequired: 54500, icon: "earth", category: "elite" },
    ],
  },

  // ─── Standard Chartered: Ultimate ────
  {
    bank: "Standard Chartered",
    cardName: "Ultimate Credit Card",
    ladder: [
      { name: "SC Rewards Catalogue Voucher", description: "Entry brand voucher via SC Rewards", pointsRequired: 2500, icon: "gift", category: "shopping" },
      { name: "Dining Voucher", description: "SC Rewards dining partner voucher", pointsRequired: 5000, icon: "restaurant", category: "dining" },
      { name: "Domestic Flight via KrisFlyer", description: "Transfer to Singapore KrisFlyer for a domestic one-way flight", pointsRequired: 10000, icon: "airplane", category: "travel" },
      { name: "International Economy Ticket", description: "KrisFlyer / BA Avios for SE Asia / Middle East one-way economy", pointsRequired: 40000, icon: "earth", category: "premium-travel" },
      { name: "Business Class Upgrade (Short Haul)", description: "Avios for a premium cabin to Dubai or Colombo", pointsRequired: 80000, icon: "rocket", category: "elite" },
    ],
  },

  // ─── Kotak: Royale Signature ──────────────────────────
  {
    bank: "Kotak Mahindra Bank",
    cardName: "Royale Signature",
    ladder: [
      { name: "Weekend Dining Bonus Points", description: "4X on weekends — plan all dining/shopping on Sat-Sun", pointsRequired: 2000, icon: "restaurant", category: "dining" },
      { name: "Shopping Voucher", description: "Kotak Rewards catalogue brand voucher", pointsRequired: 5000, icon: "gift", category: "shopping" },
      { name: "Domestic Flight Booking", description: "Kotak travel portal flight redemption", pointsRequired: 10000, icon: "airplane", category: "travel" },
      { name: "Hotel Weekend Stay", description: "Kotak travel portal hotel booking", pointsRequired: 20000, icon: "bed", category: "travel" },
      { name: "Annual Fee Waiver", description: "₹8L annual spend for fee waiver — net-free premium card", pointsRequired: 50000, icon: "shield-checkmark", category: "elite" },
    ],
  },

  // ─── IndusInd: Pinnacle World ──────────────────
  {
    bank: "IndusInd Bank",
    cardName: "Pinnacle World",
    ladder: [
      { name: "Golf Round (Complimentary)", description: "6 free rounds/quarter — worth ₹3,000+ at premium courses", pointsRequired: 6000, icon: "golf", category: "lifestyle" },
      { name: "Premium Dining Voucher", description: "Lifestyle voucher for an ITC / Leela dining experience", pointsRequired: 5000, icon: "restaurant", category: "dining" },
      { name: "Domestic Business Class Seat", description: "Air India / InterMiles upgrade to business class", pointsRequired: 20000, icon: "airplane-outline", category: "travel" },
      { name: "Luxury Hotel Stay", description: "ITC / Marriott / The Leela 1-night stay", pointsRequired: 35000, icon: "bed", category: "premium-travel" },
      { name: "International First / Business Class", description: "Air India / InterMiles for long-haul premium cabin", pointsRequired: 100000, icon: "rocket", category: "elite" },
    ],
  },

  // ─── IndusInd: Legend ─────────────────────────
  {
    bank: "IndusInd Bank",
    cardName: "Legend",
    ladder: [
      { name: "Dining Voucher (Leela / Marriott)", description: "Premium restaurant dining via IndusInd rewards", pointsRequired: 5000, icon: "restaurant", category: "dining" },
      { name: "Domestic Flight Ticket", description: "Air India / InterMiles transfer for one-way domestic", pointsRequired: 10000, icon: "airplane", category: "travel" },
      { name: "Luxury Hotel Stay", description: "Leela / Marriott hotel booking via IndusInd partner", pointsRequired: 25000, icon: "bed", category: "travel" },
      { name: "Annual Fee Waiver", description: "₹5L annual spend target for fee waiver", pointsRequired: 30000, icon: "shield-checkmark", category: "elite" },
      { name: "International Economy Return", description: "InterMiles for return ticket to Middle East / SE Asia", pointsRequired: 50000, icon: "earth", category: "premium-travel" },
    ],
  },

  // ─── Yes Bank: Marquee ────────────────────────────────
  {
    bank: "Yes Bank",
    cardName: "Marquee",
    ladder: [
      { name: "Shopping Voucher", description: "Yes Rewardz brand voucher for lifestyle spending", pointsRequired: 2000, icon: "gift", category: "shopping" },
      { name: "Domestic Flight Ticket", description: "Air India / InterMiles transfer via Yes Rewardz", pointsRequired: 10000, icon: "airplane", category: "travel" },
      { name: "Hotel Booking", description: "Travel portal hotel stay for a weekend", pointsRequired: 20000, icon: "bed", category: "travel" },
      { name: "Annual Fee Waiver", description: "₹3L annual spend milestone for fee waiver", pointsRequired: 25000, icon: "shield-checkmark", category: "elite" },
      { name: "International Flight", description: "InterMiles transfer for short international return", pointsRequired: 50000, icon: "earth", category: "premium-travel" },
    ],
  },

  // ─── Yes Bank: PaisaSave (6% dining/travel cashback) ─────────────────────
  {
    bank: "Yes Bank",
    cardName: "Paisabazaar PaisaSave",
    ladder: [
      { name: "Free Cab Ride Home", description: "6% cashback on Ola/Uber effectively covers a short trip", pointsRequired: 2500, icon: "car", category: "lifestyle" },
      { name: "Restaurant Dinner for Two", description: "6% cashback on dining covers a mid-range dinner", pointsRequired: 10000, icon: "restaurant", category: "dining" },
      { name: "Monthly Commute Covered", description: "Auto + cab cashback for a month of city travel", pointsRequired: 25000, icon: "car", category: "lifestyle" },
      { name: "Annual Fee Recovery", description: "₹999 fee recovered within the first quarter of regular dining + travel usage", pointsRequired: 16700, icon: "shield-checkmark", category: "elite" },
    ],
  },

  // ─── RBL: XTRA ───────────────────────────────
  {
    bank: "RBL Bank",
    cardName: "XTRA Credit Card",
    ladder: [
      { name: "Fuel Voucher (HPCL/BPCL)", description: "Redeem for a partial fuel top-up voucher", pointsRequired: 1000, icon: "car", category: "lifestyle" },
      { name: "Movie Ticket Voucher", description: "BookMyShow discount voucher via RBL Rewards", pointsRequired: 1500, icon: "film", category: "lifestyle" },
      { name: "Retail Shopping Voucher", description: "Brand partner voucher via RBL Rewards website", pointsRequired: 5000, icon: "gift", category: "shopping" },
      { name: "Monthly Fuel Budget Covered", description: "Fuel voucher covering an average bike/car monthly fuel", pointsRequired: 10000, icon: "flash", category: "lifestyle" },
      { name: "Annual Fee Recovery", description: "₹1,000 annual fee recovered via fuel/voucher redemptions", pointsRequired: 3000, icon: "shield-checkmark", category: "elite" },
    ],
  },

  // ─── IDFC FIRST: Select ─────────────────────────
  {
    bank: "IDFC FIRST Bank",
    cardName: "Select",
    ladder: [
      { name: "Birthday Bonus Points Trigger", description: "10X on your birthday — a single ₹5,000 purchase nets 50,000 points!", pointsRequired: 1000, icon: "gift", category: "lifestyle" },
      { name: "3 Months of OTT Subscriptions", description: "3X online earn → accumulated points cover a quarter of streaming subs", pointsRequired: 3000, icon: "tv", category: "lifestyle" },
      { name: "Railway Lounge Quarter Pass", description: "Unlimited free railway lounge access every quarter — unique IDFC FIRST perk!", pointsRequired: 5000, icon: "train", category: "travel" },
      { name: "Online Shopping Voucher", description: "Brand voucher via IDFC FIRST rewards portal", pointsRequired: 10000, icon: "bag", category: "shopping" },
      { name: "Zero Fee Card — Pure Profit", description: "Lifetime free card: every point earned is pure gain. 50,000 points = ₹12,500 value.", pointsRequired: 50000, icon: "shield-checkmark", category: "elite" },
    ],
  },

  // ─── IDFC FIRST: Mayura ─────────────────────────
  {
    bank: "IDFC FIRST Bank",
    cardName: "Mayura",
    ladder: [
      { name: "Premium Voucher (Lifestyle Brand)", description: "Tata CLiQ Luxury / Tanishq voucher via IDFC rewards", pointsRequired: 5000, icon: "diamond", category: "shopping" },
      { name: "Domestic Flight Ticket", description: "Air India / InterMiles transfer for one-way domestic", pointsRequired: 15000, icon: "airplane", category: "travel" },
      { name: "Hotel Stay (Weekend Break)", description: "Partner hotel booking via IDFC travel portal", pointsRequired: 30000, icon: "bed", category: "travel" },
      { name: "Annual Fee Recovery", description: "₹4,999 fee recovered via travel/voucher redemptions", pointsRequired: 15150, icon: "shield-checkmark", category: "elite" },
      { name: "Long-Game International Trip", description: "IDFC points never expire — save for 2+ years for an international redemption", pointsRequired: 60600, icon: "earth", category: "elite" },
    ],
  },

  // ─── AU Bank: LIT ───────────────────────
  {
    bank: "AU Bank",
    cardName: "LIT Credit Card",
    ladder: [
      { name: "OTT Subscription Voucher", description: "Activate OTT benefit this month → free Netflix/Hotstar", pointsRequired: 1000, icon: "tv", category: "lifestyle" },
      { name: "Movie + Dining Night", description: "Activate movie + dining benefit → free ticket + discount dinner", pointsRequired: 2000, icon: "film", category: "dining" },
      { name: "Shopping Voucher", description: "Retail brand voucher via AU Bank rewards", pointsRequired: 5000, icon: "gift", category: "shopping" },
      { name: "Monthly Lifestyle Bundle", description: "Combine OTT + Dining benefits for a month — max LIT feature value", pointsRequired: 10000, icon: "star", category: "lifestyle" },
      { name: "Zero Fee Milestone", description: "Lifetime free card — every point is net profit. Ideal first card!", pointsRequired: 15000, icon: "shield-checkmark", category: "elite" },
    ],
  },

  // ─── AU Bank: Zenith+ ────────────────────────
  {
    bank: "AU Bank",
    cardName: "Zenith+ Credit Card",
    ladder: [
      { name: "Premium Dining Experience", description: "20X dining earn → redeem for a fine dining voucher faster than any other card", pointsRequired: 5000, icon: "restaurant", category: "dining" },
      { name: "International Travel Insurance Activated", description: "Automatic on international spends — ₹5 lakh coverage unlocked", pointsRequired: 8000, icon: "shield-checkmark", category: "travel" },
      { name: "Domestic Flight via Air India", description: "Air India / InterMiles transfer at ₹0.45/point effective rate", pointsRequired: 10000, icon: "airplane", category: "travel" },
      { name: "Luxury Hotel Stay", description: "Marriott / ITC hotel booking via AU Bank travel portal", pointsRequired: 30000, icon: "bed", category: "premium-travel" },
      { name: "Annual Fee Recovery", description: "₹4,999 fee recovered via dining + travel combination redemptions", pointsRequired: 11110, icon: "shield-checkmark", category: "elite" },
      { name: "International Round Trip", description: "InterMiles transfer for SE Asia / Middle East economy return", pointsRequired: 50000, icon: "earth", category: "elite" },
    ],
  },

  // ─── HSBC: Travel One ────────────────────
  {
    bank: "HSBC",
    cardName: "Travel One",
    ladder: [
      { name: "Airport Lounge Visit", description: "2X international earn → redeem for domestic lounge access", pointsRequired: 1250, icon: "business", category: "travel" },
      { name: "Dining Voucher", description: "HSBC partner dining programme offer", pointsRequired: 4000, icon: "restaurant", category: "dining" },
      { name: "Domestic Flight Ticket", description: "HSBC Travel Portal flight booking", pointsRequired: 10000, icon: "airplane", category: "travel" },
      { name: "Hotel Loyalty Transfer", description: "Marriott Bonvoy / Accor All transfer for a premium hotel night", pointsRequired: 25000, icon: "bed", category: "premium-travel" },
      { name: "Annual Fee Waiver", description: "₹4L annual spend for ₹4,999 fee waiver", pointsRequired: 30000, icon: "shield-checkmark", category: "elite" },
      { name: "International Return Ticket via KrisFlyer", description: "Singapore Airlines KrisFlyer transfer for SE Asia return", pointsRequired: 62500, icon: "earth", category: "elite" },
    ],
  },

  // ─── HSBC: Liv+ (10% grocery & dining cashback) ───────────────────────────
  {
    bank: "HSBC",
    cardName: "Liv+ Credit Card",
    ladder: [
      { name: "Free Grocery Top-Up", description: "10% cashback on grocery covers a small weekly top-up", pointsRequired: 2000, icon: "cart", category: "shopping" },
      { name: "Dinner for Two Covered", description: "10% dining cashback covers a casual restaurant dinner", pointsRequired: 5000, icon: "restaurant", category: "dining" },
      { name: "Monthly Grocery Budget Contribution", description: "10% on regular grocery store visits", pointsRequired: 10000, icon: "cart", category: "shopping" },
      { name: "Lifetime Free Card — Always Net Positive", description: "Zero annual fee: every rupee of cashback is pure saving. Best companion card.", pointsRequired: 20000, icon: "shield-checkmark", category: "elite" },
    ],
  },

  // ─── BOB Financial: Eterna ─────────────
  {
    bank: "BOB Financial",
    cardName: "Eterna Credit Card",
    ladder: [
      { name: "Dining Voucher (3X Earn)", description: "3X on dining — redeem for restaurant voucher", pointsRequired: 3000, icon: "restaurant", category: "dining" },
      { name: "Grocery Month Covered (3X)", description: "3X on grocery earn redeemed as supermarket voucher", pointsRequired: 4000, icon: "cart", category: "shopping" },
      { name: "Domestic Flight Ticket", description: "Travel portal flight booking via BOB Rewards", pointsRequired: 10000, icon: "airplane", category: "travel" },
      { name: "Annual Fee Waiver", description: "₹1.5L annual spend for low-barrier fee waiver — easily achievable", pointsRequired: 5000, icon: "shield-checkmark", category: "elite" },
      { name: "International Economy Ticket", description: "5X international earn redeemed toward an overseas trip", pointsRequired: 37500, icon: "earth", category: "premium-travel" },
    ],
  },

  // ─── Federal Bank: Signet ───────────────────────
  {
    bank: "Federal Bank",
    cardName: "Signet Credit Card",
    ladder: [
      { name: "OTT Subscription Month", description: "3X online earn → points cover a streaming subscription", pointsRequired: 1000, icon: "tv", category: "lifestyle" },
      { name: "Amazon / Flipkart Voucher", description: "Federal Bank Rewards catalogue voucher for online shopping", pointsRequired: 2500, icon: "gift", category: "shopping" },
      { name: "Online Shopping Haul", description: "Accumulated 3X online earn covers a meaningful e-commerce order", pointsRequired: 5000, icon: "bag", category: "shopping" },
      { name: "Annual Fee Recovery", description: "₹499 fee recovered within ₹5,000 of accumulated redemptions", pointsRequired: 1667, icon: "shield-checkmark", category: "elite" },
      { name: "Domestic Travel Voucher", description: "Accumulated points toward a bus / train booking", pointsRequired: 10000, icon: "train", category: "travel" },
    ],
  },
];

// ─── Generic Fallback Ladder ──────────────────────────────────────────────────
// Used when no card-specific ladder exists.

const GENERIC_LADDER: MilestoneReward[] = [
  { name: "Movie Ticket", description: "Redeem for a multiplex movie ticket voucher", pointsRequired: 1500, icon: "film", category: "lifestyle" },
  { name: "Fine Dining Voucher", description: "Restaurant voucher at a premium dining partner", pointsRequired: 4000, icon: "restaurant", category: "dining" },
  { name: "Shopping Voucher", description: "Amazon / Flipkart or brand partner voucher", pointsRequired: 7500, icon: "gift", category: "shopping" },
  { name: "Domestic Flight Ticket", description: "One-way domestic flight via bank travel portal or miles transfer", pointsRequired: 15000, icon: "airplane", category: "travel" },
  { name: "Hotel Stay (2 nights)", description: "Domestic hotel stay via bank partner travel booking", pointsRequired: 30000, icon: "bed", category: "travel" },
  { name: "International Economy Ticket", description: "Airline miles transfer for a short-haul international trip", pointsRequired: 75000, icon: "earth", category: "premium-travel" },
  { name: "Premium Cabin Experience", description: "Business class or long-haul international redemption via airline partners", pointsRequired: 150000, icon: "rocket", category: "elite" },
];

// ─── Core Functions ───────────────────────────────────────────────────────────

/**
 * Returns the card-specific milestone ladder, or the generic fallback.
 */
export const getMilestoneLadder = (bank: string, cardName: string): MilestoneReward[] => {
  const cardLadder = CARD_MILESTONES.find(
    (c) => c.bank === bank && c.cardName === cardName
  );
  return cardLadder?.ladder ?? GENERIC_LADDER;
};

/**
 * Returns the next milestone the user hasn't reached yet,
 * plus full progress context for the UI.
 * Progress % is calculated relative to the floor of the current tier,
 * so the bar always advances meaningfully between each milestone.
 */
export const getNextMilestone = (
  bank: string,
  cardName: string,
  points: number
): Milestone => {
  const currentPoints = isNaN(points) || points === undefined ? 0 : points;
  const ladder = getMilestoneLadder(bank, cardName);

  // Find the first milestone that the user has NOT reached yet.
  const next = ladder.find((reward) => currentPoints < reward.pointsRequired);

  if (!next) {
    return {
      targetName: "🏆 All Milestones Unlocked!",
      targetDescription: "You've reached the top of the rewards ladder for this card.",
      pointsNeeded: 0,
      percentageComplete: 1,
      icon: "trophy",
      category: "elite",
      allMilestones: ladder,
    };
  }

  const currentIndex = ladder.indexOf(next);
  const prevPoints = currentIndex > 0 ? ladder[currentIndex - 1].pointsRequired : 0;
  const rangeTotal = next.pointsRequired - prevPoints;
  const rangeProgress = currentPoints - prevPoints;
  
  // Guard against division by zero if two milestones have the same pointsRequired
  const percentageComplete = rangeTotal > 0 
    ? Math.min(1, Math.max(0, rangeProgress / rangeTotal))
    : 1;

  return {
    targetName: next.name,
    targetDescription: next.description,
    pointsNeeded: Math.max(0, next.pointsRequired - currentPoints),
    percentageComplete,
    icon: next.icon,
    category: next.category,
    allMilestones: ladder,
  };
};

/**
 * Rewards estimation via direct rate is decommissioned by user request.
 * All logic now flows through the point-based Reward Ladders.
 */

/**
 * Returns the primary suggestion for a given card.
 */
export const getSuggestion = (bank: string, cardName: string): string => {
  const rule = rewardRules.find((r) => r.bank === bank && r.cardName === cardName);
  return rule?.suggestions[0] ?? "Maximize your rewards today!";
};

/**
 * Returns all milestones the user has already completed.
 */
export const getCompletedMilestones = (
  bank: string,
  cardName: string,
  points: number
): MilestoneReward[] => {
  const ladder = getMilestoneLadder(bank, cardName);
  return ladder.filter((reward) => points >= reward.pointsRequired);
};

/**
 * Returns a motivational nudge message calibrated to how close
 * the user is to their next milestone.
 */
export const getMotivationalMessage = (
  bank: string,
  cardName: string,
  points: number
): string => {
  const milestone = getNextMilestone(bank, cardName, points);

  if (milestone.percentageComplete >= 1)
    return "🏆 You've unlocked all rewards — legendary status achieved!";
  if (milestone.percentageComplete >= 0.9)
    return `🔥 Almost there! Just ${milestone.pointsNeeded.toLocaleString("en-IN")} more points to unlock ${milestone.targetName}!`;
  if (milestone.percentageComplete >= 0.7)
    return `💪 ${Math.round(milestone.percentageComplete * 100)}% to ${milestone.targetName} — you're on a roll!`;
  if (milestone.percentageComplete >= 0.4)
    return `🎯 Halfway there! ${milestone.pointsNeeded.toLocaleString("en-IN")} points to go for ${milestone.targetName}.`;
  return `🚀 Start building — ${milestone.pointsNeeded.toLocaleString("en-IN")} points will unlock your ${milestone.targetName}.`;
};