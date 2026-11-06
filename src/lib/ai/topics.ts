import type { Topic } from "../types";

export const TOPIC_LABEL: Record<Topic, string> = {
  where_is_my_order: "Where is my order?",
  delivery_delay: "Delivery delay",
  exchange: "Exchange",
  promo: "Promo",
  billing: "Billing",
  refund: "Refund",
  pre_sale: "Pre-sale",
  cancellation: "Cancellation",
  damage: "Damage",
  other: "Other",
};

/** Topics whose replies always need a person, whatever the confidence. */
export const SENSITIVE_TOPICS: Topic[] = ["billing", "refund", "damage", "cancellation"];

// Ordered: the first topic with a matching pattern wins.
const PATTERNS: [Topic, RegExp][] = [
  ["billing", /charged twice|double charge|charged (me )?two|duplicate charge|billed twice/i],
  ["damage", /damaged|broken|cracked|smashed|faulty|arrived (in )?bad/i],
  ["cancellation", /\bcancel/i],
  ["exchange", /wrong size|swap|exchange|different size|too (small|big|large)/i],
  ["promo", /discount|promo|code|coupon|voucher/i],
  ["refund", /refund|money back/i],
  ["delivery_delay", /hasn'?t (moved|arrived|updated)|stuck|late|delay|meant to arrive|not (moved|arrived)/i],
  ["where_is_my_order", /where is my (order|parcel)|tracking|when will .* arrive|order status/i],
  ["pre_sale", /do you ship|ship(ping)? to|deliver(y)? to|delivery cost|how much is delivery|in stock|price match|recyclable|wholesale|gift wrap/i],
];

export function classifyTopic(text: string): Topic {
  for (const [topic, re] of PATTERNS) {
    if (re.test(text)) return topic;
  }
  return "other";
}

/** Extra query terms per topic, so short messages still find the right article. */
export const TOPIC_EXPANSION: Record<Topic, string[]> = {
  where_is_my_order: ["tracking", "delivery", "dispatch"],
  delivery_delay: ["late", "deliveries", "courier", "replacement", "replace", "tracking"],
  exchange: ["exchange", "size", "return", "label"],
  promo: ["discount", "codes", "code"],
  billing: ["refund", "duplicate", "charges", "finance"],
  refund: ["refund", "refunds", "payment"],
  pre_sale: ["ship", "countries", "costs"],
  cancellation: ["cancel", "cancelled", "dispatched"],
  damage: ["damaged", "photo", "replacement"],
  other: [],
};
