from app.services.csv_import import parse_date, parse_money, parse_rows

ROADS = ["Lake View Road", "Market Street"]
HEAD = "Project Name,Road,Start Date,End Date,Estimated Cost,Contractor\n"


def one(row):
    return parse_rows(HEAD + row + "\n", ROADS)


def test_flexible_headers_dates_and_money():
    r = one("Drain repair,lake view road,01/11/2026,20/11/2026,Rs. 4.5 lakh,ABC Infra")["rows"][0]
    assert not r["errors"] and r["road"] == "Lake View Road"
    assert r["values"]["planned_start"] == "2026-11-01" and r["values"]["budget_inr"] == 450000


def test_unknown_road_gets_suggestion():
    r = one("Drain repair,Lake Vew Road,2026-11-01,2026-11-20,0,X")["rows"][0]
    assert r["road"] is None and r["suggestions"][0] == "Lake View Road" and r["errors"]


def test_bad_dates_and_order():
    assert one("A long title,Market Street,not-a-date,2026-11-20,0,X")["rows"][0]["errors"]
    assert any("before" in e for e in one("A long title,Market Street,2026-12-01,2026-11-20,0,X")["rows"][0]["errors"])


def test_missing_required_column_is_a_file_error():
    res = parse_rows("title,area\nA,B\n", ROADS)
    assert res["rows"] == [] and "Could not find a column" in res["file_errors"][0]


def test_duplicate_and_blank_rows():
    line = "Drain repair,Market Street,2026-11-01,2026-11-20,0,X\n"
    res = parse_rows(HEAD + line + "\n,,,,,\n" + line, ROADS)
    assert len(res["rows"]) == 2 and "Duplicate" in res["rows"][1]["errors"][0]


def test_semicolon_delimiter():
    res = parse_rows("Project Name;Road;Start Date;End Date\nDrain repair;Market Street;2026-11-01;2026-11-20\n", ROADS)
    assert res["rows"] and not res["rows"][0]["errors"]


def test_money_and_date_helpers():
    assert parse_money("4,20,000") == 420000 and parse_money("1.5 Cr") == 15000000 and parse_money("") == 0
    assert parse_money("lots") is None
    assert parse_date("5 Nov 2026").isoformat() == "2026-11-05" and parse_date("31/02/2026") is None
