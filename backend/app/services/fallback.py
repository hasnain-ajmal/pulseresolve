"""Deterministic offline analysis. Used when Gemini is unavailable, rate-limited or returns invalid output.

Understands English, Roman Urdu and Urdu script keywords. Results are flagged analysis_source='fallback'.
"""
import re

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "payment": ["payment", "paid", "deduct", "charged", "checkout", "check out", "card", "paise", "paisay", "kat gaye", "kat gaya",
                "debited", "transaction", "wallet", "easypaisa", "jazzcash", "ادائیگی", "پیسے"],
    "login": ["login", "log in", "sign in", "signin", "password", "otp", "verification code", "locked out", "code nahi", "لاگ ان", "پاسورڈ"],
    "delivery": ["wrong item", "wrong product", "galat item", "damaged", "delivery", "deliver", "courier", "parcel", "shipping", "shipment", "rider", "tracking", "pohcha", "pahucha",
                 "arrived", "ڈیلیوری", "پارسل"],
    "billing": ["invoice", "bill", "billing", "subscription", "refund", "overcharged", "tax", "بل"],
    "performance": ["slow", "loading", "forever", "lag", "timeout", "time out", "buffering", "takes forever", "sust", "سست"],
    "bug": ["error", "bug", "crash", "force close", "force closes", "glitch", "not working", "broken", "freez", "hang", "kaam nahi",
            "something went wrong", "app band"],
    "account": ["account", "profile", "email change", "update my email", "delete my account", "address change", "اکاؤنٹ"],
}
CATEGORY_ORDER = ["payment", "login", "delivery", "billing", "performance", "bug", "account"]

SERVICE_BY_CATEGORY = {
    "payment": "Payments", "billing": "Billing", "login": "Authentication", "delivery": "Delivery",
    "performance": "Platform performance", "bug": "Application", "account": "Accounts", "other": "General",
}

SYMPTOM_PATTERNS: list[tuple[str, str]] = [
    ("payment deducted", r"deduct|charged|kat (gaye|gaya|gayi)|paise kat|paisay kat|debited|amount (was )?taken|پیسے کٹ"),
    ("checkout failing", r"checkout|check out"),
    ("no order confirmation", r"confirmation|confirm(ed)? (email|message|sms)|no (email|sms)"),
    ("order stuck pending", r"pending|stuck|processing for"),
    ("order not created", r"order (was )?(not|nahi) (created|bana|bani|placed)|no order|order nahi (bana|bani|show)|not created|آرڈر نہیں"),
    ("card declined", r"declin|card (not|nahi) (accept|work)|rejected card"),
    ("double charge", r"twice|double|two (payments|times)|do baar"),
    ("refund not received", r"refund"),
    ("otp not received", r"otp|او ٹی پی|verification code|login code|code nahi|sms code|code never"),
    ("password reset email missing", r"reset (password|link)|password reset|password mail"),
    ("cannot log in", r"log ?in|sign ?in|locked|password (reset|nahi|not)|لاگ ان"),
    ("slow loading", r"slow|loading|\blag\b|takes? (forever|long)|buffering|sust"),
    ("app crash", r"crash|force close|freez|\bhang\b"),
    ("late delivery", r"\blate\b|delay|not (yet )?(delivered|arrived|received)|nahi (pohcha|pahucha|aaya)|waiting|"
                      r"\d+ days?|days? (ago|late)|din ho|tracking (has )?(not|nahi)|supposed to arrive|abhi tak"),
    ("wrong item", r"wrong (item|product)|damaged|broken item|galat"),
    ("rude rider", r"rude|behav|misbehav"),
    ("app not opening", r"not opening|won'?t open|doesn'?t open|does not open|will not open|not launch|nahi khul"),
    ("error message", r"error|exception|something went wrong"),
    ("cannot update profile", r"update (my )?(email|address|profile)|email change|profile"),
    ("no support reply", r"no (reply|response)|nobody (replied|answered)|support (not|nahi)"),
    ("app is slow after update", r"after (the )?update|new version"),
]

FRUSTRATED = ["angry", "worst", "terrible", "unacceptable", "third time", "again and again", "fed up", "scam", "fraud", "useless",
              "bakwas", "pareshan", "tang aa", "disgusting", "ridiculous", "pathetic", "furious", "bohat bura", "bekar", "فراڈ", "تنگ"]
NEGATIVE = ["not", "failed", "fail", "problem", "issue", "error", "nahi", "na ", "slow", "wrong", "late", "stuck", "broken",
            "cannot", "can't", "unable", "never", "pending", "missing", "deducted", "twice", "masla", "مسئلہ", "نہیں"]
POSITIVE = ["thank", "great", "love", "good", "excellent", "happy", "shukriya", "acha", "achha", "بہترین", "شکریہ"]
URGENT = ["urgent", "asap", "immediately", "right now", "emergency", "jaldi", "فوری"]
MONEY = ["deduct", "charged", "money", "paise", "paisay", "amount", "refund", "payment", "پیسے"]
ROMAN_URDU_MARKERS = ["nahi", "hai", "hain", "mera", "meri", "kya", "kyun", "paise", "paisay", "mujhe", "aap", "kar", "ho gaya",
                      "bhi", "abhi", "kal", "tak", "wala", "raha", "gaye", "gaya", "masla", "bohat", "lekin", "magar", "se"]

_URDU_SCRIPT = re.compile(r"[؀-ۿ]")


def detect_language(text: str) -> str:
    if _URDU_SCRIPT.search(text):
        return "ur"
    words = set(re.findall(r"[a-z]+", text.lower()))
    hits = sum(1 for m in ROMAN_URDU_MARKERS if m in words or (" " in m and m in text.lower()))
    return "roman-ur" if hits >= 2 else "en"


def _count(text: str, words: list[str]) -> int:
    return sum(1 for w in words if w in text)


def extract_symptoms(text: str) -> list[str]:
    t = text.lower()
    found = [label for label, pat in SYMPTOM_PATTERNS if re.search(pat, t)]
    # Near-miss rules: a double charge is not a failed order, and a declined card is not a lost payment.
    if "double charge" in found:
        found = [s for s in found if s != "payment deducted"]
    if "card declined" in found:
        found = [s for s in found if s not in ("checkout failing", "payment deducted")]
    return found[:6]


STRONG_PROBLEMS = {"payment deducted", "order not created", "card declined", "double charge", "otp not received",
                   "password reset email missing", "app crash", "app not opening", "wrong item"}


def count_problems(text: str) -> int:
    """How many DISTINCT problems the customer describes (payment trouble, a declined card, an app that will not open...).
    Counts fault families and specific symptoms; generic words (error, cannot log in, slow) never count on their own."""
    # Conservative on purpose: only clear, specific problem types are counted. Weak signals (a late-delivery pattern that
    # also matches "10 days", the word "profile", "no email") never make a report look like several problems.
    labels = [l for l in extract_symptoms(text) if l in STRONG_PROBLEMS]
    keys = set()
    for label in labels:
        fam = [f for f in FAMILIES if label in FAMILIES[f]]
        keys.add(fam[0] if fam else label)
    return max(1, len(keys))


def analyze(text: str) -> dict:
    t = text.lower()
    scores = {c: _count(t, kws) for c, kws in CATEGORY_KEYWORDS.items()}
    best = max(CATEGORY_ORDER, key=lambda c: (scores[c], -CATEGORY_ORDER.index(c)))
    category = best if scores[best] > 0 else "other"

    frustrated = _count(t, FRUSTRATED)
    negative = _count(t, NEGATIVE)
    positive = _count(t, POSITIVE)
    exclaim = t.count("!") >= 2 or sum(1 for w in text.split() if len(w) > 3 and w.isupper()) >= 2
    if frustrated or (exclaim and negative):
        sentiment = "frustrated"
    elif positive and not negative:
        sentiment = "positive"
    elif negative:
        sentiment = "negative"
    else:
        sentiment = "neutral"

    money = _count(t, MONEY) > 0 and ("deduct" in t or "charged" in t or "kat" in t or "twice" in t)
    urgent = _count(t, URGENT) > 0
    if (money and sentiment == "frustrated") or "fraud" in t or "فراڈ" in t:
        urgency = "critical"
    elif money or urgent or sentiment == "frustrated":
        urgency = "high"
    elif sentiment in ("positive", "neutral") and negative == 0:
        urgency = "low"
    else:
        urgency = "medium"

    return {
        "category": category,
        "sentiment": sentiment,
        "urgency": urgency,
        "symptoms": extract_symptoms(text),
        "affected_service": SERVICE_BY_CATEGORY[category],
        "language": detect_language(text),
        "problem_count": count_problems(text),
    }


HYPOTHESIS_BY_CATEGORY = {
    "payment": "Payment confirmations are not reaching the order service, so money is taken but orders are not completed.",
    "login": "The OTP or authentication provider is failing to deliver or validate codes.",
    "delivery": "A courier or dispatch delay is affecting deliveries in the same area or batch.",
    "billing": "A billing calculation or duplicate-charge defect is affecting invoices.",
    "performance": "A slow dependency or overloaded service is degrading response times.",
    "bug": "A recent release introduced a defect in the same feature.",
    "account": "The account update service is failing to save changes.",
    "other": "The shared cause is unclear and needs manual investigation.",
}
ACTIONS_BY_CATEGORY = {
    "payment": ["Check payment gateway callback and webhook logs", "Compare captured payments with created orders", "Post a status notice for affected customers"],
    "login": ["Check the OTP/SMS provider status and delivery logs", "Review recent authentication changes", "Offer an alternative sign-in method"],
    "delivery": ["Contact the courier about the affected batch", "Check dispatch records for the affected area", "Send delay updates to customers"],
    "billing": ["Audit recent invoices for duplicates", "Review the last billing job run", "Prepare refunds if confirmed"],
    "performance": ["Check service latency dashboards", "Review recent deployments", "Scale or restart the slow component"],
    "bug": ["Reproduce the error from the reports", "Review the latest release changes", "Prepare a hotfix or rollback"],
    "account": ["Check account service logs", "Reproduce profile update failure", "Notify affected users after the fix"],
    "other": ["Gather more details from affected customers", "Assign an owner to investigate"],
}


def fallback_incident(members: list[dict]) -> dict:
    """members: dicts with id, text, category, symptoms, affected_service."""
    cats: dict[str, int] = {}
    sym: dict[str, int] = {}
    for m in members:
        cats[m["category"]] = cats.get(m["category"], 0) + 1
        for s in m["symptoms"]:
            sym[s] = sym.get(s, 0) + 1
    category = max(cats, key=cats.get)
    service = SERVICE_BY_CATEGORY.get(category, "General")
    shared = [s for s, n in sorted(sym.items(), key=lambda kv: -kv[1]) if n >= 2][:6] or [s for s, _ in sorted(sym.items(), key=lambda kv: -kv[1])][:4]
    n = len(members)
    lead = shared[0] if shared else category
    cited = [m["id"] for m in members][:6]
    return {
        "title": f"{service}: reports of {lead}"[:150],
        "affected_service": service,
        "summary": (f"{n} customers reported related {category} problems"
                    + (f" including {', '.join(shared[:3])}." if shared else ".")
                    + " Grouped by similarity of symptoms (basic analysis, AI unavailable)."),
        "shared_symptoms": shared,
        "hypotheses": [{"text": HYPOTHESIS_BY_CATEGORY[category], "confidence": "medium" if n >= 4 else "low", "cited_complaint_ids": cited}],
        "suggested_actions": ACTIONS_BY_CATEGORY[category],
    }


# Symptoms that point to the same underlying fault area. Used by the deterministic verifier.
FAMILIES: dict[str, set[str]] = {
    "order-payment flow": {"payment deducted", "checkout failing", "no order confirmation", "order stuck pending", "order not created"},
    "double billing": {"double charge"},
    "sign-in codes": {"otp not received"},
    "password reset": {"password reset email missing"},
    "delivery delay": {"late delivery"},
    "slowness": {"slow loading", "app is slow after update"},
    "crashes": {"app crash", "error message", "app not opening"},
}


_COMPATIBLE = [{"payment", "billing"}, {"login", "account"}, {"bug", "performance"}]


def categories_compatible(a: str, b: str) -> bool:
    """Same category, or neighbours that AI and the offline analyser may label differently (e.g. refund: payment vs billing)."""
    return a == b or any(a in g and b in g for g in _COMPATIBLE)


GENERIC = {"cannot log in", "error message", "slow loading"}  # too coarse to prove a shared cause alone


def symptom_families(symptoms: list[str]) -> set[str]:
    return {fam for fam, members in FAMILIES.items() if members & set(symptoms)}
