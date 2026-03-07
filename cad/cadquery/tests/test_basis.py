"""Tests for the basis (base housing) part geometry."""

import pytest
from helpers import bounding_box

TOL = 0.5  # geometry tolerance for bounding box checks


def test_basis_is_valid_solid(basis_part):
    """Part must be a non-null solid with positive volume."""
    shape = basis_part.val()
    assert shape is not None
    vol = shape.Volume()
    assert vol > 0


def test_basis_bounding_box(basis_part):
    from config import basis_laenge, basis_breite, basis_hoehe
    bb = bounding_box(basis_part)
    assert abs(bb["xlen"] - basis_laenge) < TOL
    assert abs(bb["ylen"] - basis_breite) < TOL
    assert abs(bb["zlen"] - basis_hoehe) < TOL


def test_basis_origin_at_zero(basis_part):
    """Basis starts at origin (corner-aligned box)."""
    bb = bounding_box(basis_part)
    assert abs(bb["xmin"]) < TOL
    assert abs(bb["ymin"]) < TOL
    assert abs(bb["zmin"]) < TOL


def test_basis_volume_less_than_full_box(basis_part):
    """Material was removed (inner cavity, foot holes), so volume < full box."""
    from config import basis_laenge, basis_breite, basis_hoehe
    full_vol = basis_laenge * basis_breite * basis_hoehe
    actual_vol = basis_part.val().Volume()
    assert actual_vol < full_vol


def test_basis_has_foot_holes(basis_part):
    """Foot holes remove material: volume should be less than full box."""
    from config import basis_laenge, basis_breite, basis_hoehe
    import math
    full_vol = basis_laenge * basis_breite * basis_hoehe
    actual_vol = basis_part.val().Volume()
    # Volume ratio should indicate significant material removal (cavity + holes)
    ratio = actual_vol / full_vol
    assert ratio < 0.5, f"Expected hollow shell, got volume ratio {ratio:.2f}"


def test_basis_no_seed_solid_artifact(basis_part):
    """The part should not contain a tiny box artifact from seed solid hack."""
    # A seed solid of 0.001^3 has volume ~1e-9.
    # If the seed wasn't properly absorbed by union, there might be
    # disconnected solids. Check that we have exactly one solid.
    shape = basis_part.val()
    solids = shape.Solids()
    assert len(solids) == 1, f"Expected 1 solid, got {len(solids)} (possible seed solid artifact)"
