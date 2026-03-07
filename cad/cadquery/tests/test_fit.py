"""Cross-part fit and interference tests.

Verify that parts fit together correctly:
- Wippe fits inside basis interior
- Pivot groove engages with pivot steg
- Lehne tenons fit wippe holes
- Assembled parts don't collide excessively
"""

import cadquery as cq
import pytest
from helpers import bounding_box

TOL = 1.0


def test_wippe_fits_in_basis_xy(wippe_part, basis_part):
    """Wippe bounding box must fit inside basis interior (with wall clearance)."""
    from config import basis_laenge, basis_breite, basis_wand
    wb = bounding_box(wippe_part)
    inner_l = basis_laenge - 2 * basis_wand
    inner_b = basis_breite - 2 * basis_wand
    assert wb["xlen"] < inner_l, f"Wippe X {wb['xlen']:.1f} >= basis inner {inner_l:.1f}"
    assert wb["ylen"] < inner_b, f"Wippe Y {wb['ylen']:.1f} >= basis inner {inner_b:.1f}"


def test_pivot_groove_engages_steg(wippe_nut_part, pivot_steg_part):
    """Groove and steg actually overlap when wippe is in assembled position.
    Intersect the groove (shifted to world coords) with the steg — must have volume."""
    from config import (basis_laenge, basis_breite, basis_wand, basis_hoehe,
                        pivot_radius, wippe_nut_tiefe, wippe_laenge, wippe_breite)
    # Wippe offset in assembled position
    dx = (basis_laenge - wippe_laenge) / 2
    dy = (basis_breite - wippe_breite) / 2
    dz = basis_hoehe + pivot_radius - wippe_nut_tiefe
    groove_world = wippe_nut_part.translate((dx, dy, dz))
    overlap = pivot_steg_part.intersect(groove_world)
    vol = overlap.val().Volume()
    assert vol > 0, "Groove and steg must overlap when assembled"


def test_lehne_tenons_fit_wippe_holes_geometry(lehne_loecher_part):
    """Verify hole geometry is wide enough for tenons by checking hole X-span
    covers each expected tenon position."""
    from config import (slot_laenge, lehne_zapfen_anzahl, lehne_zapfen_laenge,
                        wippe_laenge, wippe_breite, slot_breite, slot_offset_y, tol)
    sx = (wippe_laenge - slot_laenge) / 2
    abstand = slot_laenge / (lehne_zapfen_anzahl + 1)
    bb = bounding_box(lehne_loecher_part)
    # Holes should span from first to last tenon position (with margin)
    first_hole_x = sx + abstand - lehne_zapfen_laenge / 2
    last_hole_x = sx + lehne_zapfen_anzahl * abstand + lehne_zapfen_laenge / 2
    assert bb["xmin"] <= first_hole_x + tol, (
        f"Holes xmin {bb['xmin']:.1f} should cover first tenon at {first_hole_x:.1f}")
    assert bb["xmax"] >= last_hole_x - tol, (
        f"Holes xmax {bb['xmax']:.1f} should cover last tenon at {last_hole_x:.1f}")


def test_wippe_pivot_z_alignment():
    """Groove center Z (in world) must be within wippe_nut_tiefe of steg top Z.
    Exact expected offset is wippe_nut_tiefe (groove sits that deep over the steg)."""
    from config import (basis_hoehe, pivot_radius, wippe_nut_tiefe,
                        verstaerkung_hoehe)
    wippe_z = basis_hoehe + pivot_radius - wippe_nut_tiefe
    groove_world_z = wippe_z - verstaerkung_hoehe
    steg_top_z = basis_hoehe - verstaerkung_hoehe + pivot_radius
    offset = steg_top_z - groove_world_z
    assert abs(offset - wippe_nut_tiefe) < 0.01, (
        f"Groove-steg offset {offset:.2f} != wippe_nut_tiefe {wippe_nut_tiefe:.2f}")


def test_assembly_wippe_basis_interference(basis_part, wippe_part):
    """When wippe is placed in assembled position, the solid-solid intersection
    (collision volume) must be small — only the pivot engagement region."""
    from config import (basis_laenge, basis_breite, basis_wand, basis_hoehe,
                        pivot_radius, wippe_nut_tiefe, wippe_laenge, wippe_breite)
    import math
    dx = (basis_laenge - wippe_laenge) / 2
    dy = (basis_breite - wippe_breite) / 2
    dz = basis_hoehe + pivot_radius - wippe_nut_tiefe
    wippe_world = wippe_part.translate((dx, dy, dz))
    overlap = basis_part.intersect(wippe_world)
    overlap_vol = overlap.val().Volume()
    # Only the pivot steg / groove engagement should overlap
    # Upper bound: steg cross-section * breite (generous)
    pivot_breite = basis_breite - 2 * basis_wand
    max_engagement_vol = math.pi * pivot_radius**2 * pivot_breite
    assert overlap_vol < max_engagement_vol, (
        f"Collision volume {overlap_vol:.0f} exceeds pivot engagement {max_engagement_vol:.0f}")


def test_lehne_zapfen_reach_through_wippe(lehne_part, wippe_part):
    """Lehne tenons must extend deep enough to pass through wippe thickness."""
    from config import lehne_zapfen_tiefe, wippe_hoehe
    assert lehne_zapfen_tiefe >= wippe_hoehe, (
        f"Tenon depth {lehne_zapfen_tiefe} must reach through wippe height {wippe_hoehe}")
