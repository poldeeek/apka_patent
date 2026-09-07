"""Import the supplied 2026 bank, including its green answer key and original images.

Usage: python3 scripts/import-questions-pdf.py /path/to/source.pdf
Requires pdfplumber, pypdf and Pillow. No OCR or inferred answers are used.
"""

import argparse
import hashlib
import json
import re
from collections import Counter
from pathlib import Path

import pdfplumber
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent
SOURCE_SHA256 = "3884fa1594be07f714f14f606b9e8142c78c2084149a8c96bc97d44df54e1873"

GROUPS = {
    "Meteorologia": {1, 20, 28, 42, 72, 73, 79, 80, 85, 89, 90, 91, 92, 93, 94, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 124, 184},
    "Budowa jachtu i silnik": {11, 15, 30, 41, 51, 52, 56, 66, 67, 68, 69, 71, 74, 75, 76, 77, 78, 81, 82, 83, 84, 86, 87, 88, 95, 96, 110, 111, 135, 137, 145, 146, 153, 158, 159, 161, 162, 164, 175, 177, 178, 179, 180, 181, 182, 183},
    "Bezpieczeństwo i ratownictwo": {29, 31, 32, 34, 35, 37, 38, 39, 40, 43, 44, 45, 46, 49, 50, 53, 54, 55, 58, 59, 60, 61, 64, 65, 70, 131, 144, 148, 151, 152, 154, 156, 160, 168, 170, 171, 172, 173, 174, 176},
    "Nawigacja i oznakowanie": {3, 5, 6, 14, 25, 26, 33, 36, 62, 63, 112, 113, 114, 118, 119, 120, 121, 122, 123, 125, 128, 129, 132, 133, 138, 139, 143, 150, 155, 163, 166, 167, 169, *range(185, 196)},
    "Manewrowanie i cumowanie": {10, 115, 116, 117, 134},
}

# One drawing is referenced by three consecutive questions, across a page break.
IMAGE_REFERENCES = {
    115: (13, "Im0"), 116: (13, "Im0"), 117: (13, "Im0"),
    185: (21, "Im0"),
    **{186 + i: (22, f"Im{i}") for i in range(6)},
    **{192 + i: (23, f"Im{i}") for i in range(4)},
}
IMAGE_ALT = {
    115: "Schemat jachtu przy nabrzeżu z sześcioma kolorowymi linami oznaczonymi numerami 1–6.",
    185: "Niebieska tablica z białym symbolem polera i liny cumowniczej.",
    186: "Dwie biało-czerwone tablice w kształcie rombów z zaznaczoną odległością między nimi.",
    187: "Tablica z symbolem śruby, czerwoną ramką i ukośnym czerwonym pasem.",
    188: "Tablica z symbolem kotwicy, czerwoną ramką i ukośnym czerwonym pasem.",
    189: "Prostokątna tablica z trzema poziomymi pasami: czerwonym, białym i czerwonym.",
    190: "Dwie biało-zielone tablice w kształcie rombów, z zaznaczonym obszarem pomiędzy nimi.",
    191: "Niebieska tablica z białą sylwetką narciarza wodnego.",
    192: "Tablica z czerwoną ramką, liczbą 2.20 i czarnym trójkątem u dołu.",
    193: "Tablica z zawracającą strzałką, czerwoną ramką i ukośnym czerwonym pasem.",
    194: "Tablica z czerwoną ramką i pionowym czarnym pasem pośrodku.",
    195: "Trzy czerwono-białe znaki nawigacyjne z pionowymi pasami i kulistymi znakami szczytowymi.",
}


def green(rect):
    color = rect.get("non_stroking_color")
    return isinstance(color, (tuple, list)) and len(color) == 3 and color[1] > 0.9 and color[0] < 0.1 and color[2] < 0.1


def highlighted(line, rectangles):
    # Check actual glyph centres, not only bounding-box overlap with adjacent lines.
    return any(
        r["x0"] <= (c["x0"] + c["x1"]) / 2 <= r["x1"]
        and r["top"] <= (c["top"] + c["bottom"]) / 2 <= r["bottom"]
        for c in line["chars"] if c["text"].strip()
        for r in rectangles
    )


def extract(source):
    records = []
    current = None
    option = None
    image_inventory = set()
    with pdfplumber.open(source) as pdf:
        assert len(pdf.pages) == 23, "Unexpected page count"
        for page_number, page in enumerate(pdf.pages, 1):
            image_inventory.update((page_number, im["name"]) for im in page.images)
            rectangles = [r for r in page.rects if green(r)]
            for line in page.extract_text_lines():
                text = line["text"].strip()
                question_match = re.match(r"^(\d+)\.\s*(.*)", text)
                option_match = re.match(r"^([a-d])\)\s*(.*)", text)
                is_correct = highlighted(line, rectangles)
                if question_match:
                    current = {"number": int(question_match[1]), "page": page_number,
                               "text": [question_match[2]], "options": [], "labels": [], "correct": set()}
                    records.append(current)
                    option = None
                    assert not is_correct, f"Highlighted question heading: {text}"
                elif option_match:
                    assert current is not None
                    current["labels"].append(option_match[1])
                    current["options"].append([option_match[2]])
                    option = len(current["options"]) - 1
                elif current:
                    (current["text"] if option is None else current["options"][option]).append(text)
                else:
                    assert text == "Baza przykładowych pytań.", f"Unexpected preamble: {text}"
                if is_correct:
                    assert current is not None and option is not None
                    current["correct"].add(option)

    assert len(records) == 195, f"Expected 195 questions, found {len(records)}"
    assert image_inventory == set(IMAGE_REFERENCES.values()), "Unmapped PDF images"
    bank, audit = [], []
    for ordinal, record in enumerate(records, 1):
        assert record["number"] == (44 if ordinal == 74 else ordinal), f"Unexpected numbering at {ordinal}"
        expected_labels = ["a", "c", "d"] if ordinal in (111, 139) else ["a", "b", "c"]
        assert record["labels"] == expected_labels, f"Unexpected options at {ordinal}: {record['labels']}"
        assert len(record["correct"]) == 1, f"Ambiguous/missing green answer at {ordinal}: {record['correct']}"
        options = [" ".join(parts) for parts in record["options"]]
        assert len(options) == 3 and len(set(options)) == 3 and all(options)
        correct = next(iter(record["correct"]))
        item = {"id": f"patent-2026-{ordinal:03d}",
                "category": next((name for name, numbers in GROUPS.items() if ordinal in numbers), "Przepisy żeglugowe"),
                "text": " ".join(record["text"]), "options": options,
                "correctAnswer": correct, "explanation": ""}
        if ordinal in IMAGE_REFERENCES:
            asset_number = 115 if ordinal in (116, 117) else ordinal
            item["image"] = {"src": f"/questions/patent-2026-{asset_number:03d}.png", "alt": IMAGE_ALT[asset_number]}
        bank.append(item)
        audit.append({"id": item["id"], "page": record["page"], "printedNumber": record["number"],
                      "printedOptionLabels": record["labels"], "highlightedOptionLabel": record["labels"][correct]})
    return bank, audit


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--check", action="store_true", help="Compare source with existing JSON and image pixels; write nothing")
    args = parser.parse_args()
    digest = hashlib.sha256(args.source.read_bytes()).hexdigest()
    assert digest == SOURCE_SHA256, "This importer is reviewed for the supplied PDF only; unexpected source SHA-256"
    bank, audit = extract(args.source)
    reader = PdfReader(args.source)
    assets = {}
    for number, (page, resource) in IMAGE_REFERENCES.items():
        if number in (116, 117):
            continue
        # Extract the embedded pixels: the drawing on page 13 extends beyond
        # the page boundary, so a rendered page crop would lose part of it.
        original = next(im.image for im in reader.pages[page - 1].images if Path(im.name).stem == resource)
        assets[ROOT / f"public/questions/patent-2026-{number:03d}.png"] = original.convert("RGB")
    report = {"sourceFile": args.source.name, "sha256": digest, "pageCount": 23,
              "questionCount": len(bank), "imageCount": len(assets),
              "questionsWithImages": sum("image" in q for q in bank),
              "answerKey": "Green highlights in the supplied PDF; answers preserved without factual corrections.",
              "notes": ["Source repeats number 44 in position 74. IDs follow document order.",
                        "Questions 111 and 139 have labels a/c/d. App options preserve order and use A/B/C.",
                        "Questions 115–117 share the original drawing from page 13.",
                        "Repeated questions and original wording are retained. The PDF contains no explanations."],
              "questions": audit}
    outputs = {ROOT / "data/questions.json": bank, ROOT / "data/questions-source.json": report}
    if args.check:
        from PIL import Image, ImageChops
        for path, value in outputs.items():
            assert json.loads(path.read_text()) == value, f"Data mismatch: {path}"
        for path, original in assets.items():
            with Image.open(path) as saved:
                assert saved.size == original.size and ImageChops.difference(saved.convert("RGB"), original).getbbox() is None, f"Image mismatch: {path}"
    else:
        for path, original in assets.items():
            path.parent.mkdir(parents=True, exist_ok=True)
            original.save(path, optimize=True)
        for path, value in outputs.items():
            path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"checked" if args.check else "imported": len(bank), "images": len(assets),
                      "questionsWithImages": report["questionsWithImages"], "categories": dict(Counter(q["category"] for q in bank))}, ensure_ascii=False))


if __name__ == "__main__":
    main()
