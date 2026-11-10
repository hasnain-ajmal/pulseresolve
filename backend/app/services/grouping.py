"""The stable grouping rule (see docs/design.md).

Each new complaint is processed once, in arrival order:
 1. candidates: similarity to existing incidents (average linkage) and to unassigned complaints
 2. verification: a verifier (Gemini, or a deterministic fallback) decides "same underlying cause?"
 3. attach to an active incident / flag recurrence on a resolved one / create a new suggested incident
    from at least MIN_GROUP related unassigned complaints / otherwise stay unassigned.
Existing membership is never changed here. Only humans (reject, reopen) move complaints.
"""
import logging
import re
import threading

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Complaint, Incident, IncidentEvidence, MembershipLog, PairBlock
from app.services import ai, fallback

log = logging.getLogger("pulseresolve.grouping")
GROUP_LOCK = threading.Lock()
ACTIVE = ("suggested", "open", "investigating")
_STOP = {"order", "not", "no", "the", "for", "and", "with", "after", "when", "again", "still", "from"}


# ---- similarity -----------------------------------------------------------------
def ensure_embeddings(db: Session, complaints: list[Complaint]) -> None:
    missing = [c for c in complaints if not c.embedding]
    if not missing or not ai.available():
        return
    try:
        vecs = ai.embed_texts([c.text for c in missing])
    except ai.AIError:
        return
    for c, v in zip(missing, vecs):
        c.embedding = v
    db.flush()


def similarities(db: Session, new: Complaint, others: list[Complaint]) -> tuple[list[float], str]:
    """Returns (sims aligned with others, mode). Mode 'emb' uses Gemini embeddings, 'tfidf' is the offline fallback."""
    if not others:
        return [], "tfidf"
    ensure_embeddings(db, [new] + others)
    if new.embedding and all(o.embedding for o in others):
        n = np.array(new.embedding)
        return [float(np.dot(n, np.array(o.embedding))) for o in others], "emb"
    texts = [new.text] + [o.text for o in others]
    try:
        m = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), sublinear_tf=True).fit_transform(texts)
        sims = [float(s) for s in (m[0] @ m[1:].T).toarray()[0]]
    except ValueError:
        sims = [0.0] * len(others)
    # Wording differs a lot between reports of one fault, so character overlap alone is weak.
    # Add a symptom-based signal: same category and the same symptom or fault family.
    return [max(s, _symptom_sim(new, o)) for s, o in zip(sims, others)], "tfidf"


def _symptom_sim(a: Complaint, b: Complaint) -> float:
    if a.category != b.category:
        return 0.0
    sa, sb = a.symptoms or [], b.symptoms or []
    if (set(sa) & set(sb)) - fallback.GENERIC:
        return 0.8
    if fallback.symptom_families(sa) & fallback.symptom_families(sb):
        return 0.75
    return 0.0


def threshold(mode: str) -> float:
    return settings.T_CANDIDATE_EMB if mode == "emb" else settings.T_CANDIDATE_TFIDF


# ---- verification ---------------------------------------------------------------
def _tokens(symptoms: list[str]) -> set[str]:
    return {w for s in symptoms for w in re.findall(r"[a-z]{5,}", s.lower()) if w not in _STOP}


def overlap(a: list[str], b: list[str]) -> list[str]:
    shared = sorted((set(a) & set(b)) - fallback.GENERIC)
    if shared:
        return shared
    fams = sorted(fallback.symptom_families(a) & fallback.symptom_families(b))
    if fams:
        return fams
    return sorted(_tokens(a) & _tokens(b))


def fallback_verify(new: Complaint, cands: list[tuple[Complaint, float]]) -> dict[int, tuple[bool, str]]:
    """Deterministic verifier: same category AND shared symptoms (or a very high similarity). Category alone never merges."""
    out = {}
    for c, sim in cands:
        shared = overlap(new.symptoms or [], c.symptoms or [])
        same_cat = new.category == c.category
        if same_cat and shared:
            out[c.id] = (True, f"Same {new.category} problem with shared symptoms: {', '.join(shared[:3])}.")
        elif same_cat and sim >= settings.T_STRICT_PAIR:
            out[c.id] = (True, f"Very similar wording in the {new.category} category ({sim:.0%}).")
        else:
            out[c.id] = (False, "Different symptoms or category.")
    return out


def verify(new: Complaint, cands: list[tuple[Complaint, float]]) -> dict[int, tuple[bool, str]]:
    if not cands:
        return {}
    if ai.available():
        try:
            res = ai.verify_same_cause(new.text, [{"id": c.id, "text": c.text} for c, _ in cands])
            if len(res) == len(cands):
                return res
        except ai.AIError:
            pass
    return fallback_verify(new, cands)


# ---- the rule ---------------------------------------------------------------------
def _blocked(db: Session, cid: int) -> set[int]:
    rows = db.query(PairBlock).filter((PairBlock.complaint_a == cid) | (PairBlock.complaint_b == cid)).all()
    return {r.complaint_b if r.complaint_a == cid else r.complaint_a for r in rows}


def assign(db: Session, c: Complaint, actor: str = "system") -> str:
    """Run the grouping rule for one new complaint. Caller holds GROUP_LOCK and commits."""
    from app.services import incidents as inc_svc  # local import avoids a cycle

    blocked = _blocked(db, c.id)
    incidents = db.query(Incident).filter(Incident.status.in_(ACTIVE + ("resolved",))).all()
    members_by_inc: dict[int, list[Complaint]] = {}
    for inc in incidents:
        ms = (db.query(Complaint).filter(Complaint.incident_id == inc.id, Complaint.status.in_(("linked", "resolved")),
                                         Complaint.id != c.id).all())
        members_by_inc[inc.id] = [m for m in ms if m.id not in blocked]
    pool = [p for p in db.query(Complaint).filter(Complaint.status == "new", Complaint.incident_id.is_(None), Complaint.id != c.id).all()
            if p.id not in blocked]

    flat = [m for ms in members_by_inc.values() for m in ms] + pool
    sims_list, mode = similarities(db, c, flat)
    sim = {o.id: s for o, s in zip(flat, sims_list)}
    t = threshold(mode)

    # 1) existing incidents (average linkage over members)
    best: tuple[float, Incident] | None = None
    for inc in incidents:
        ms = members_by_inc[inc.id]
        if not ms:
            continue
        score = sum(sim[m.id] for m in ms) / len(ms)
        if score >= t and (best is None or score > best[0]):
            best = (score, inc)
    if best:
        score, inc = best
        reps = sorted(members_by_inc[inc.id], key=lambda m: -sim[m.id])[:3]
        verdict = verify(c, [(m, sim[m.id]) for m in reps])
        yes = [m for m in reps if verdict.get(m.id, (False, ""))[0]]
        if yes and len(yes) * 2 >= len(reps):
            ev = [(c.id, m.id, sim[m.id], verdict[m.id][1]) for m in yes]
            if inc.status == "resolved":
                inc_svc.flag_recurrence(db, inc, c, score, ev)
                return "recurrence"
            inc_svc.attach_complaint(db, inc, c, score, ev, actor)
            return "attached"

    # 2) new incident from unassigned complaints
    cands = sorted([(p, sim[p.id]) for p in pool if sim[p.id] >= t], key=lambda x: -x[1])[:5]
    verdict = verify(c, cands)
    related: list[tuple[Complaint, float]] = []
    pairs = {(b.complaint_a, b.complaint_b) for b in db.query(PairBlock).all()}
    for p, s in cands:
        if not verdict.get(p.id, (False, ""))[0]:
            continue
        # never re-suggest a grouping a human rejected: skip members blocked with an already chosen one
        if any((min(p.id, q.id), max(p.id, q.id)) in pairs for q, _ in related):
            continue
        related.append((p, s))
    if len(related) >= settings.MIN_GROUP - 1:
        members = [c] + [p for p, _ in related]
        ev = [(c.id, p.id, s, verdict[p.id][1]) for p, s in related]
        inc_svc.create_incident(db, members, ev, actor)
        return "new_incident"
    return "unassigned"
