import pytest

import panel

CONTACT = """# Jan De Smet
Kerkstraat 12 bus 3, 9000 Gent | +32 470 12 34 56 | jan.desmet@example.com
linkedin.com/in/jandesmet | https://github.com/jdesmet | https://jandesmet.dev
Date of birth: 12/03/1998

## Experience
Data engineer at Acme (01/2020 - 03/2023), 2019 - 2023
Grew revenue by 15% and saved €1.200.000; Python 3.11; v1.2.3
Jan De Smet presented the work at PyData. Call 0470/12.34.56 for references.
"""


def red(text, **kw):
    return panel.redact(text, **kw)


def test_contact_block_is_redacted_and_restorable():
    r = red(CONTACT)
    t = r["text"]
    for leaked in ("Jan De Smet", "jan.desmet@example.com", "470 12 34 56", "0470/12.34.56", "Kerkstraat",
                   "9000 Gent", "jandesmet", "jdesmet", "12/03/1998"):
        assert leaked not in t, leaked
    assert t.startswith("# {{PII_NAME}}\n")
    assert "{{PII_ADDRESS}} | {{PII_PHONE}} | {{PII_EMAIL}}" in t
    assert "{{PII_LINKEDIN}} | {{PII_GITHUB}} | {{PII_URL_1}}" in t
    assert "Date of birth: {{PII_DOB}}" in t
    assert "{{PII_NAME}} presented" in t and "Call {{PII_PHONE_2}} for" in t
    # dates, money, percentages and versions are not phone numbers
    for kept in ("(01/2020 - 03/2023), 2019 - 2023", "15%", "€1.200.000", "Python 3.11", "v1.2.3"):
        assert kept in t, kept
    assert r["name"]["confidence"] == "high"
    assert panel.restore_pii(t, r["pii"]) == CONTACT


@pytest.mark.parametrize("phone", [
    "+32 470 12 34 56", "+32 (0)470 12 34 56", "0032 470 12 34 56", "0470/12.34.56",
    "0470.12.34.56", "09 123 45 67", "06 12 34 56 78", "020-1234567", "+31 6 12345678",
    "+33 6 12 34 56 78", "(415) 555-0134", "415-555-0134", "+1 415 555 0134",
])
def test_phone_forms(phone):
    t = red("x\nphone: %s\n" % phone)["text"]
    assert t == "x\nphone: {{PII_PHONE}}\n", t


@pytest.mark.parametrize("not_phone", [
    "2019 - 2023", "01/2020 - 03/2023", "06/2019 – 09/2021", "01/2020-03/2023", "15.04.2021",
    "$ 0470123456", "€0470123456", "1.200.000", "99.9%", "0.12.3",
])
def test_not_phones(not_phone):
    assert "{{PII_PHONE}}" not in red("x\n%s\n" % not_phone)["text"]


@pytest.mark.parametrize("text,name", [
    ("JAN VAN DER BERGH\njan.vanderbergh@example.com\n", "JAN VAN DER BERGH"),
    ("Élise d'Hondt\nelise.dhondt@example.be\n", "Élise d'Hondt"),
    ("Curriculum Vitae\nMarie-Claire Dubois\nmc.dubois@example.fr\n", "Marie-Claire Dubois"),
    ("Senior Data Engineer\nPieter Janssens\npjanssens@example.com\n", "Pieter Janssens"),
])
def test_name_detection_anchored_on_email(text, name):
    r = red(text)
    assert r["name"]["confidence"] == "high", r["name"]
    assert name not in r["text"] and r["pii"]["{{PII_NAME}}"] == name


def test_name_medium_without_email_and_low_without_candidate():
    assert red("Pieter Janssens\nData engineer\n")["name"]["confidence"] == "medium"
    r = red("Resume\nData engineer with 5 years of experience\n")
    assert r["name"]["confidence"] == "low" and not r["name"]["found"]


def test_candidate_name_override():
    r = red("PJ\nP. Janssens works here. pj@example.com\n", candidate_name="P. Janssens")
    assert "{{PII_NAME}} works here" in r["text"] and r["name"]["reason"] == "given by the user"
    assert red("Anon\n", candidate_name="-")["name"]["found"] is False


@pytest.mark.parametrize("line,expect", [
    ("12 rue de la Paix, 75002 Paris", "{{PII_ADDRESS}}"),
    ("123 Main Street, Springfield, IL 62701", "{{PII_ADDRESS}}"),
    ("Damrak 1, 1012 LG Amsterdam", "Damrak 1, {{PII_ADDRESS}}"),
    ("B-1000 Brussel", "{{PII_ADDRESS}}"),
])
def test_address_forms(line, expect):
    t = red("x\n%s\n" % line)["text"]
    assert t == "x\n%s\n" % expect, t


def test_address_only_in_contact_block_or_labelled():
    filler = "\n".join("line %d of profile text" % i for i in range(15))
    t = red("Some Person\n" + filler + "\nOffice at Kerkstraat 5, 9000 Gent\nAdres: Molenstraat 9, Lier\n")["text"]
    assert "Kerkstraat 5, 9000 Gent" in t
    assert "Adres: {{PII_ADDRESS}}" in t


def test_year_present_is_not_a_postcode():
    t = red("Some Person\n2019 Present: Data engineer\n2021 - 2023 Gent\n")["text"]
    assert "{{PII_ADDRESS}}" not in t


def test_dob_variants_keep_their_label():
    t = red("x\nGeboortedatum: 12 maart 1998\nné le 3 avril 1999\n")["text"]
    assert "Geboortedatum: {{PII_DOB}}" in t and "né le {{PII_DOB_2}}" in t
