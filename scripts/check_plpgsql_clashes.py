#!/usr/bin/env python3
"""Flag plpgsql variables that share a name with a column updated in the same function.

The Ember Ring bug was `status text` inside battle_turn, then `UPDATE battles SET status = status`.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "supabase" / "migrations"

# Columns that showed up in UPDATE/INSERT targets and are easy to shadow.
WATCH = {
    "battles": {"id", "status", "mode", "state", "reward_glims", "reward_xp", "profile_id", "companion_id"},
    "companions": {"id", "name", "level", "xp", "wins", "losses", "hunger", "mood", "owner_id"},
    "profiles": {"id", "username", "is_admin", "banned_at", "morning_streak"},
    "wallets": {"profile_id", "glims"},
    "items": {"id", "slug", "category"},
    "daily_claims": {"profile_id", "daily_key", "claimed_on", "payload"},
}


def functions(sql: str):
    for match in re.finditer(r"create\s+(?:or\s+replace\s+)?function\s+([a-z0-9_\.]+)", sql, re.I):
        start = match.end()
        as_at = re.search(r"\bas\s+\$\$", sql[start:], re.I)
        if not as_at:
            continue
        body_start = start + as_at.end()
        body_end = sql.find("$$", body_start)
        if body_end < 0:
            continue
        yield match.group(1), sql[body_start:body_end]


def declared(body: str) -> set[str]:
    declare = re.search(r"declare(.*?)begin", body, re.I | re.S)
    if not declare:
        return set()
    names = set()
    for line in declare.group(1).splitlines():
        line = line.split("--")[0].strip().rstrip(";")
        if not line or line.startswith("#"):
            continue
        name = line.split()[0].lower()
        if name.isidentifier():
            names.add(name)
    return names


def main() -> int:
    latest: dict[str, tuple[str, str]] = {}
    for path in sorted(ROOT.glob("*.sql")):
        text = path.read_text()
        for name, body in functions(text):
            latest[name.lower()] = (path.name, body)
    problems = []
    for name, (path, body) in sorted(latest.items()):
        variables = declared(body)
        for table, columns in WATCH.items():
            if not re.search(rf"\b{table}\b", body, re.I):
                continue
            clash = sorted(variables & columns)
            if not clash or "variable_conflict use_variable" in body:
                continue
            for column in clash:
                update = re.search(
                    rf"update\s+(?:public\.)?{table}\b[\s\S]{{0,500}}?\b{column}\s*=\s*{column}\b",
                    body,
                    re.I,
                )
                if update:
                    problems.append(f"{path}: {name} variable {column} clashes in UPDATE {table}")
    if problems:
        print("\n".join(problems))
        return 1
    print("no unqualified variable/column assignments found")
    return 0


if __name__ == "__main__":
    sys.exit(main())
