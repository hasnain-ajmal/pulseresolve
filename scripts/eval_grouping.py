"""Grouping evaluation on the labelled set (backend/data/eval_set.json).

Runs every complaint through the real intake pipeline on an in-memory database, then compares the incidents the system
formed with the gold groups. Metrics are pairwise: a pair is "positive" when both complaints are in the same gold group.
Complaints that stay unassigned count as singletons. Run from the repo root:

    python scripts/eval_grouping.py            # offline fallback engine (no network)
    python scripts/eval_grouping.py --ai       # Gemini (needs GEMINI_API_KEY in backend/.env)
    python scripts/eval_grouping.py --seeds 5  # average over 5 random arrival orders
"""
import argparse
import itertools
import json
import os
import random
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND))
os.chdir(BACKEND)
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ["TESTING"] = "true"
os.environ["SEED_DEMO_DATA"] = "false"


def run_once(items, seed, use_ai):
    from app.db import Base, SessionLocal, engine
    from app.models import Complaint
    from app.schemas import ComplaintCreate
    from app.services import ai, intake

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    order = items[:]
    random.Random(seed).shuffle(order)
    db = SessionLocal()
    id_to_gold, ids_by_text = {}, {}
    ctx = None if use_ai else ai.disabled()
    if ctx:
        ctx.__enter__()
    try:
        for it in order:
            c = intake.submit(db, ComplaintCreate(customer_name=it["customer_name"], text=it["text"]))
            id_to_gold[c.id] = it["group"]
    finally:
        if ctx:
            ctx.__exit__(None, None, None)
    pred = {c.id: c.incident_id for c in db.query(Complaint).all()}
    db.close()

    tp = fp = fn = 0
    near_miss_merges = oneoff_grouped = 0
    for a, b in itertools.combinations(pred, 2):
        same_pred = pred[a] is not None and pred[a] == pred[b]
        same_gold = id_to_gold[a] is not None and id_to_gold[a] == id_to_gold[b]
        tp += same_pred and same_gold
        fp += same_pred and not same_gold
        fn += (not same_pred) and same_gold
        if same_pred and not same_gold and id_to_gold[a] and id_to_gold[b]:
            near_miss_merges += 1
    oneoff_grouped = sum(1 for cid, g in id_to_gold.items() if g is None and pred[cid] is not None)
    p = tp / (tp + fp) if tp + fp else 1.0
    r = tp / (tp + fn) if tp + fn else 1.0
    return p, r, near_miss_merges, oneoff_grouped, len({v for v in pred.values() if v})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ai", action="store_true")
    ap.add_argument("--seeds", type=int, default=3)
    args = ap.parse_args()
    items = json.loads((BACKEND / "data" / "eval_set.json").read_text(encoding="utf-8"))
    rows = [run_once(items, s, args.ai) for s in range(1, args.seeds + 1)]
    n_oneoff = sum(1 for i in items if i["group"] is None)
    print(f"engine: {'gemini' if args.ai else 'offline fallback'}  complaints: {len(items)}  gold groups: "
          f"{len({i['group'] for i in items if i['group']})}  one-offs: {n_oneoff}")
    print("seed  precision  recall  near-miss-pairs-merged  one-offs-grouped  incidents")
    for s, (p, r, nm, oo, ni) in enumerate(rows, start=1):
        print(f"{s:>4}  {p:9.3f}  {r:6.3f}  {nm:22d}  {oo:16d}  {ni:9d}")
    print(f"mean  {sum(r[0] for r in rows) / len(rows):9.3f}  {sum(r[1] for r in rows) / len(rows):6.3f}")


if __name__ == "__main__":
    main()
