"""Tests for config derived values and constraints."""

import math


def test_imports():
    from config import (basis_laenge, basis_breite, basis_hoehe, wippe_laenge,
                        wippe_breite, pivot_breite, anschlag_hoehe, druckbett)
    assert basis_laenge > 0
    assert basis_breite > 0


def test_tolerances_positive():
    from config import tol, tol_tight, tol_loose
    assert tol > 0
    assert tol_tight > 0
    assert tol_loose > 0
    assert tol_tight < tol < tol_loose


def test_pivot_breite_derived():
    from config import pivot_breite, basis_breite, basis_wand
    assert pivot_breite == basis_breite - 2 * basis_wand


def test_wippe_dimensions_derived():
    from config import (wippe_laenge, wippe_breite, basis_laenge, basis_breite,
                        basis_wand, tol_loose, wippe_kipp_freiraum)
    assert wippe_laenge == basis_laenge - 2 * (basis_wand + tol_loose + wippe_kipp_freiraum)
    assert wippe_breite == basis_breite - 2 * (basis_wand + tol_loose)


def test_anschlag_hoehe_formula():
    from config import (anschlag_hoehe, basis_hoehe, pivot_radius, wippe_nut_tiefe,
                        anschlag_abstand, kipp_winkel, boden_dicke)
    expected = ((basis_hoehe + pivot_radius - wippe_nut_tiefe)
                - anschlag_abstand * math.sin(math.radians(kipp_winkel))
                - boden_dicke)
    assert abs(anschlag_hoehe - expected) < 1e-10


def test_parts_fit_druckbett():
    from config import basis_laenge, basis_breite, wippe_laenge, wippe_breite, druckbett
    assert basis_laenge <= druckbett
    assert basis_breite <= druckbett
    assert wippe_laenge <= druckbett
    assert wippe_breite <= druckbett


def test_wippe_fits_inside_basis():
    """Wippe must be smaller than basis interior."""
    from config import (wippe_laenge, wippe_breite, basis_laenge, basis_breite, basis_wand)
    assert wippe_laenge < basis_laenge - 2 * basis_wand
    assert wippe_breite < basis_breite - 2 * basis_wand


def test_anschlag_hoehe_positive():
    from config import anschlag_hoehe
    assert anschlag_hoehe > 0
