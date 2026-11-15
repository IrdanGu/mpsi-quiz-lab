"""Generate the browser-ready quiz bank from the PSSI exercise note."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
SOURCE = ROOT / "University" / "PSSI" / "materi" / "md" / "mssi-soal-bab-01-07.md"
BOOK = ROOT / "University" / "PSSI" / "materi" / "md" / "buku-ajar-mssi-clean-200page.md"
OUTPUT = Path(__file__).resolve().parents[1] / "data.js"


def source_sections(text: str) -> dict[str, str]:
    sections: dict[str, str] = {}
    lines = text.splitlines()
    headings: list[tuple[int, str]] = []
    for index, line in enumerate(lines):
        match = re.match(r"^#{1,6}\s+(.+?)\s*$", line)
        if match:
            headings.append((index, match.group(1).strip()))

    for position, (start, title) in enumerate(headings):
        end = len(lines)
        current_level = len(re.match(r"^#+", lines[start]).group(0))
        for next_start, _ in headings[position + 1:]:
            next_level = len(re.match(r"^#+", lines[next_start]).group(0))
            if next_level <= current_level:
                end = next_start
                break
        content = "\n".join(lines[start + 1:end])
        content = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", content)
        content = re.sub(r"<[^>]+>", " ", content)
        content = re.sub(r"\s+", " ", content).strip()
        sections[title] = content[:2200].rstrip() + ("…" if len(content) > 2200 else "")
    return sections


def parse_questions(text: str, details: dict[str, str]) -> list[dict]:
    questions: list[dict] = []
    chapter = None
    in_mc = False
    lines = text.splitlines()
    i = 0

    while i < len(lines):
        line = lines[i]
        chapter_match = re.match(r"^## Bab (\d+)\s+[—-]\s+(.+)$", line)
        if chapter_match:
            chapter = int(chapter_match.group(1))
            chapter_title = chapter_match.group(2).strip()
            in_mc = False
            i += 1
            continue

        if line.startswith("### A. Pilihan Ganda"):
            in_mc = True
            i += 1
            continue
        if line.startswith("### B. Esai") or line.startswith("## Bab "):
            in_mc = False
            i += 1
            continue

        question_match = re.match(r"^(\d+)\.\s+(.+)$", line)
        if not (in_mc and chapter and question_match):
            i += 1
            continue

        number = int(question_match.group(1))
        question = question_match.group(2).strip()
        options: list[str] = []
        j = i + 1
        while j < len(lines):
            option_match = re.match(r"^\s+([a-d])\.\s+(.+)$", lines[j])
            if option_match:
                options.append(option_match.group(2).strip())
                j += 1
                continue
            if re.match(r"^\s+\*\*Jawaban:", lines[j]):
                break
            if re.match(r"^\d+\.\s+", lines[j]) or lines[j].startswith("### "):
                break
            j += 1

        if len(options) != 4 or j >= len(lines):
            raise ValueError(f"Unable to parse Bab {chapter} question {number}")

        answer_match = re.search(
            r"\*\*Jawaban:\s*([a-d])\*\*.*?\[\[buku-ajar-mssi-clean-200page#([^|\]]+)\|([^\]]+)\]\]",
            lines[j],
        )
        if not answer_match:
            raise ValueError(f"Unable to parse answer for Bab {chapter} question {number}")

        correct_letter, source_heading, source_label = answer_match.groups()
        questions.append(
            {
                "id": f"b{chapter}-q{number}",
                "chapter": chapter,
                "chapterTitle": chapter_title,
                "number": number,
                "question": question,
                "options": options,
                "correctIndex": ord(correct_letter) - ord("a"),
                "sourceHeading": source_heading,
                "sourceLabel": source_label,
                "explanation": details.get(source_heading, "Baca bagian materi terkait untuk memahami konsep ini."),
            }
        )
        i = j + 1

    if len(questions) != 70:
        raise ValueError(f"Expected 70 questions, found {len(questions)}")
    return questions


def main() -> None:
    details = source_sections(BOOK.read_text(encoding="utf-8"))
    questions = parse_questions(SOURCE.read_text(encoding="utf-8"), details)
    payload = json.dumps(questions, ensure_ascii=False, indent=2)
    OUTPUT.write_text(
        "// Generated from PSSI/materi/md/mssi-soal-bab-01-07.md.\n"
        "// Run scripts/generate_quiz_data.py after changing the source note.\n"
        f"window.QUIZ_QUESTIONS = {payload};\n",
        encoding="utf-8",
    )
    print(f"Generated {len(questions)} questions -> {OUTPUT}")


if __name__ == "__main__":
    main()
