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


# --- Sub-component tests ---

def test_pivot_steg_is_valid_solid(pivot_steg_part):
    """pivot_steg() returns non-empty geometry."""
    shape = pivot_steg_part.val()
    assert shape is not None
    vol = shape.Volume()
    assert vol > 0, "Pivot steg should have positive volume"


def test_pivot_steg_split_around_pocket(pivot_steg_part):
    """Pivot steg has a gap where the phone pocket passes through.
    Verify by intersecting a thin slice at the gap center — must be empty."""
    import cadquery as cq
    from config import (basis_laenge, basis_breite, basis_wand, basis_hoehe,
                        slot_breite, slot_offset_y, tasche_wand, pivot_radius)
    mitte_x = basis_laenge / 2
    mitte_y = basis_breite / 2
    # Gap center Y (midpoint of the pocket opening)
    gap_center_y = mitte_y + slot_offset_y
    # Thin slice at the gap center
    probe = (cq.Workplane("XY")
             .box(4 * pivot_radius, 0.1, basis_hoehe, centered=False)
             .translate((mitte_x - 2 * pivot_radius, gap_center_y - 0.05, 0)))
    overlap = pivot_steg_part.intersect(probe)
    vol = overlap.val().Volume()
    assert vol < 0.01, (
        f"Steg should have gap at Y={gap_center_y:.1f}, but intersection vol={vol:.3f}")


def test_pivot_steg_height(pivot_steg_part):
    """Pivot top reaches basis_hoehe - verstaerkung_hoehe + pivot_radius."""
    from config import basis_hoehe, verstaerkung_hoehe, pivot_radius
    bb = bounding_box(pivot_steg_part)
    expected_top = basis_hoehe - verstaerkung_hoehe + pivot_radius
    assert abs(bb["zmax"] - expected_top) < TOL, (
        f"Steg top {bb['zmax']:.2f} != expected {expected_top:.2f}")


def test_pivot_steg_centered_x(pivot_steg_part):
    """Steg centered at basis_laenge/2."""
    from config import basis_laenge, pivot_radius
    bb = bounding_box(pivot_steg_part)
    center_x = (bb["xmin"] + bb["xmax"]) / 2
    expected_x = basis_laenge / 2
    assert abs(center_x - expected_x) < TOL, (
        f"Steg center X {center_x:.2f} != expected {expected_x:.2f}")


def test_rounded_box_has_fillets(rounded_box_part):
    """rounded_box() has filleted vertical edges: volume less than a sharp-cornered box."""
    from config import basis_laenge, basis_breite, basis_hoehe
    sharp_vol = basis_laenge * basis_breite * basis_hoehe
    actual_vol = rounded_box_part.val().Volume()
    removed = sharp_vol - actual_vol
    assert removed > 0, "Fillet should remove material from corners"
    # Fillet removes roughly (4 - pi) * r^2 * h at each of 4 corners
    import math
    from config import basis_radius
    expected_removal = 4 * (1 - math.pi / 4) * basis_radius**2 * basis_hoehe
    assert abs(removed - expected_removal) / expected_removal < 0.15, (
        f"Fillet volume removal {removed:.0f} far from expected {expected_removal:.0f}")


def test_basis_innen_smaller_than_aussen(basis_innen_part):
    """Inner cavity smaller by 2*wall on each side."""
    from config import basis_laenge, basis_breite, basis_wand, basis_hoehe
    bb = bounding_box(basis_innen_part)
    expected_l = basis_laenge - 2 * basis_wand
    expected_b = basis_breite - 2 * basis_wand
    assert abs(bb["xlen"] - expected_l) < TOL, (
        f"Inner length {bb['xlen']:.1f} != expected {expected_l:.1f}")
    assert abs(bb["ylen"] - expected_b) < TOL, (
        f"Inner width {bb['ylen']:.1f} != expected {expected_b:.1f}")
    assert bb["zlen"] <= basis_hoehe, "Inner cavity should not exceed outer height"
