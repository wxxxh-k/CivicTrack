from app.services.csv_import import parse_rows

ROADS = {"lake view road": [[80.25, 13.0], [80.26, 13.0]]}
HEAD = "title,work_type,area,road,planned_start,planned_end,budget_inr\n"


def test_valid_row():
    rows, errs = parse_rows(HEAD + "Drain repair,Drainage,Adyar,Lake View Road,2026-11-01,2026-11-20,500000\n", ROADS)
    assert len(rows) == 1 and not errs and rows[0]["budget_inr"] == 500000


def test_bad_rows_reported_per_row():
    csv_text = HEAD + (
        "Drain repair,Drainage,Adyar,Nowhere Road,2026-11-01,2026-11-20,1\n"
        "Pipe,Water,Adyar,Lake View Road,2026-12-01,2026-11-01,1\n"
        "Pipe,Water,Adyar,Lake View Road,not-a-date,2026-11-01,1\n"
        "Ok one,Road,Adyar,Lake View Road,2026-11-01,2026-11-05,abc\n")
    rows, errs = parse_rows(csv_text, ROADS)
    assert rows == [] and [e["row"] for e in errs] == [2, 3, 4, 5]


def test_missing_column():
    rows, errs = parse_rows("title,area\nA,B\n", ROADS)
    assert rows == [] and "Missing column" in errs[0]["errors"][0]


def test_duplicate_row():
    line = "Drain repair,Drainage,Adyar,Lake View Road,2026-11-01,2026-11-20,0\n"
    rows, errs = parse_rows(HEAD + line + line, ROADS)
    assert len(rows) == 1 and "duplicate" in errs[0]["errors"][0]
