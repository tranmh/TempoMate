"""Shared fixtures for CadQuery geometry tests.

Parts are built once per session (expensive CAD operations)."""

import sys
import os
import pytest

# Add the tests directory and cadquery source directory to sys.path
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


@pytest.fixture(scope="session")
def basis_part():
    from basis import basis
    return basis()


@pytest.fixture(scope="session")
def wippe_part():
    from wippe import wippe
    return wippe()


@pytest.fixture(scope="session")
def lehne_part():
    from lehne import lehne
    return lehne()


# --- Sub-component fixtures ---

@pytest.fixture(scope="session")
def pivot_steg_part():
    from basis import pivot_steg
    return pivot_steg()


@pytest.fixture(scope="session")
def rounded_box_part():
    from basis import rounded_box
    from config import basis_laenge, basis_breite, basis_hoehe, basis_radius
    return rounded_box(basis_laenge, basis_breite, basis_hoehe, basis_radius)


@pytest.fixture(scope="session")
def basis_innen_part():
    from basis import basis_innen
    return basis_innen()


@pytest.fixture(scope="session")
def wippe_platte_part():
    from wippe import wippe_platte
    return wippe_platte()


@pytest.fixture(scope="session")
def handy_tasche_part():
    from wippe import handy_tasche
    return handy_tasche()


@pytest.fixture(scope="session")
def wippe_verstaerkung_part():
    from wippe import wippe_verstaerkung
    return wippe_verstaerkung()


@pytest.fixture(scope="session")
def wippe_nut_part():
    from wippe import wippe_nut
    return wippe_nut()


@pytest.fixture(scope="session")
def lehne_loecher_part():
    from wippe import lehne_loecher
    return lehne_loecher()


@pytest.fixture(scope="session")
def schlitz_ausschnitt_part():
    from wippe import schlitz_ausschnitt
    return schlitz_ausschnitt()


@pytest.fixture(scope="session")
def lehne_form_part():
    from lehne import lehne_form
    from config import slot_laenge, lehne_dicke, lehne_hoehe
    return lehne_form(slot_laenge, lehne_dicke, lehne_hoehe, 5)


