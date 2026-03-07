"""Tests for the wippe (rocker) part geometry."""

import pytest
from helpers import bounding_box

TOL = 1.0  # geometry tolerance


def test_wippe_is_valid_solid(wippe_part):
    shape = wippe_part.val()
    assert shape is not None
    vol = shape.Volume()
    assert vol > 0


def test_wippe_bounding_box_length_width(wippe_part):
    from config import wippe_laenge, wippe_breite
    bb = bounding_box(wippe_part)
    assert abs(bb["xlen"] - wippe_laenge) < TOL
    assert abs(bb["ylen"] - wippe_breite) < TOL


def test_wippe_height_span(wippe_part):
    """Wippe extends from -tasche_tiefe (pocket below) to wippe_hoehe (plate top, minus chamfer)."""
    from config import wippe_hoehe, tasche_tiefe
    bb = bounding_box(wippe_part)
    # Bottom of pocket
    assert abs(bb["zmin"] - (-tasche_tiefe)) < TOL
    # Top of plate (chamfer reduces it slightly)
    assert abs(bb["zmax"] - wippe_hoehe) < TOL


def test_wippe_volume_sanity(wippe_part):
    """Volume should be between 10% and 80% of the bounding box."""
    bb = bounding_box(wippe_part)
    bbox_vol = bb["xlen"] * bb["ylen"] * bb["zlen"]
    actual_vol = wippe_part.val().Volume()
    ratio = actual_vol / bbox_vol
    assert 0.10 < ratio < 0.80, f"Volume ratio {ratio:.2f} outside expected range"


def test_wippe_has_slot(wippe_part):
    """With the slot cut, volume should be less than plate + pocket + reinforcement."""
    from config import (wippe_laenge, wippe_breite, wippe_hoehe,
                        slot_laenge, slot_breite, tasche_tiefe, tasche_wand,
                        verstaerkung_breite, verstaerkung_hoehe)
    # Upper bound: plate + full pocket box + full reinforcement box
    plate_vol = wippe_laenge * wippe_breite * wippe_hoehe
    pocket_vol = (slot_laenge + 2 * tasche_wand) * (slot_breite + 2 * tasche_wand) * tasche_tiefe
    reinforce_vol = verstaerkung_breite * wippe_breite * verstaerkung_hoehe
    upper_bound = plate_vol + pocket_vol + reinforce_vol
    actual_vol = wippe_part.val().Volume()
    assert actual_vol < upper_bound


def test_wippe_no_seed_solid_artifact(wippe_part):
    """Should be exactly one solid (no seed solid remnants)."""
    shape = wippe_part.val()
    solids = shape.Solids()
    assert len(solids) == 1, f"Expected 1 solid, got {len(solids)}"


def test_wippe_origin_at_zero_xy(wippe_part):
    """Wippe plate starts at origin in XY (corner-aligned)."""
    bb = bounding_box(wippe_part)
    assert abs(bb["xmin"]) < TOL
    assert abs(bb["ymin"]) < TOL


# --- Sub-component tests ---

def test_wippe_platte_dimensions(wippe_platte_part):
    """Plate alone matches wippe_laenge x wippe_breite x wippe_hoehe."""
    from config import wippe_laenge, wippe_breite, wippe_hoehe
    bb = bounding_box(wippe_platte_part)
    assert abs(bb["xlen"] - wippe_laenge) < TOL
    assert abs(bb["ylen"] - wippe_breite) < TOL
    assert abs(bb["zlen"] - wippe_hoehe) < TOL


def test_wippe_platte_has_chamfer(wippe_platte_part):
    """Chamfer removes material at top edges. Verify volume is less than
    box-minus-fillets-only (i.e. chamfer removes additional material beyond fillets)."""
    import cadquery as cq
    from config import wippe_laenge, wippe_breite, wippe_hoehe
    # Box with only vertical fillets (no chamfer)
    fillet_only = (cq.Workplane("XY")
                   .box(wippe_laenge, wippe_breite, wippe_hoehe, centered=False)
                   .edges("|Z").fillet(3))
    fillet_only_vol = fillet_only.val().Volume()
    actual_vol = wippe_platte_part.val().Volume()
    assert actual_vol < fillet_only_vol, (
        f"Chamfer should remove additional material: {actual_vol:.0f} >= {fillet_only_vol:.0f}")


def test_handy_tasche_below_zero(handy_tasche_part):
    """Pocket extends below Z=0 (hangs under the rocker plate)."""
    bb = bounding_box(handy_tasche_part)
    assert bb["zmin"] < 0, f"Pocket zmin={bb['zmin']:.1f} should be below 0"
    assert bb["zmax"] <= 0.1, f"Pocket zmax={bb['zmax']:.1f} should be at or below 0"


def test_handy_tasche_dimensions(handy_tasche_part):
    """Pocket outer size matches slot_laenge + 2*tasche_wand."""
    from config import slot_laenge, slot_breite, tasche_wand, tasche_tiefe
    bb = bounding_box(handy_tasche_part)
    expected_l = slot_laenge + 2 * tasche_wand
    expected_b = slot_breite + 2 * tasche_wand
    assert abs(bb["xlen"] - expected_l) < TOL, (
        f"Pocket length {bb['xlen']:.1f} != expected {expected_l:.1f}")
    assert abs(bb["ylen"] - expected_b) < TOL, (
        f"Pocket width {bb['ylen']:.1f} != expected {expected_b:.1f}")
    assert abs(bb["zlen"] - tasche_tiefe) < TOL, (
        f"Pocket depth {bb['zlen']:.1f} != expected {tasche_tiefe:.1f}")


def test_wippe_verstaerkung_trapezoid(wippe_verstaerkung_part):
    """Reinforcement is trapezoidal: wider at top (Z=0), narrower at bottom.
    Verify by comparing X-span at top vs bottom using thin-slice intersection."""
    import cadquery as cq
    from config import (verstaerkung_hoehe, verstaerkung_breite, wippe_breite,
                        wippe_laenge)
    bb = bounding_box(wippe_verstaerkung_part)
    assert abs(bb["zmin"] - (-verstaerkung_hoehe)) < TOL, (
        f"Reinforcement bottom {bb['zmin']:.1f} != expected {-verstaerkung_hoehe:.1f}")
    assert abs(bb["zmax"]) < TOL, "Reinforcement top should be at Z=0"
    assert abs(bb["ylen"] - wippe_breite) < TOL, (
        f"Reinforcement Y span {bb['ylen']:.1f} != wippe_breite {wippe_breite:.1f}")
    # Trapezoid check: X-span at top should be wider than at bottom
    top_slice = (cq.Workplane("XY")
                 .box(wippe_laenge, wippe_breite, 0.1, centered=False)
                 .translate((0, 0, -0.1)))
    bot_slice = (cq.Workplane("XY")
                 .box(wippe_laenge, wippe_breite, 0.1, centered=False)
                 .translate((0, 0, -verstaerkung_hoehe)))
    top_section = wippe_verstaerkung_part.intersect(top_slice)
    bot_section = wippe_verstaerkung_part.intersect(bot_slice)
    top_bb = bounding_box(top_section)
    bot_bb = bounding_box(bot_section)
    assert top_bb["xlen"] > bot_bb["xlen"], (
        f"Top X-span {top_bb['xlen']:.1f} should be wider than bottom {bot_bb['xlen']:.1f}")


def test_wippe_nut_split(wippe_nut_part):
    """Groove has a physical gap at the pocket location.
    Verify by probing with a thin slice at the pocket center Y — must be empty."""
    import cadquery as cq
    from config import (wippe_laenge, wippe_breite, slot_breite, slot_offset_y,
                        tasche_wand, wippe_nut_radius, verstaerkung_hoehe)
    mitte_x = wippe_laenge / 2
    gap_center_y = wippe_breite / 2 + slot_offset_y
    # Thin probe at the gap center
    probe = (cq.Workplane("XY")
             .box(4 * wippe_nut_radius, 0.1, 4 * wippe_nut_radius, centered=False)
             .translate((mitte_x - 2 * wippe_nut_radius,
                         gap_center_y - 0.05,
                         -verstaerkung_hoehe - wippe_nut_radius)))
    overlap = wippe_nut_part.intersect(probe)
    vol = overlap.val().Volume()
    assert vol < 0.01, (
        f"Groove should have gap at Y={gap_center_y:.1f}, but intersection vol={vol:.3f}")


def test_slot_dimensions(schlitz_ausschnitt_part):
    """Slot cutout matches slot_laenge x slot_breite in XY."""
    from config import slot_laenge, slot_breite
    bb = bounding_box(schlitz_ausschnitt_part)
    assert abs(bb["xlen"] - slot_laenge) < TOL, (
        f"Slot length {bb['xlen']:.1f} != expected {slot_laenge:.1f}")
    assert abs(bb["ylen"] - slot_breite) < TOL, (
        f"Slot width {bb['ylen']:.1f} != expected {slot_breite:.1f}")


def test_lehne_loecher_count(lehne_loecher_part):
    """Verify exactly lehne_zapfen_anzahl (3) holes by probing at each expected X position."""
    import cadquery as cq
    from config import (lehne_zapfen_anzahl, lehne_zapfen_laenge,
                        slot_laenge, wippe_laenge, wippe_breite, wippe_hoehe,
                        slot_breite, slot_offset_y, tol)
    sx = (wippe_laenge - slot_laenge) / 2
    sy = wippe_breite / 2 - slot_breite / 2 + slot_offset_y + slot_breite
    abstand = slot_laenge / (lehne_zapfen_anzahl + 1)

    # Probe at each expected hole center — must find material (the hole cutout)
    found = 0
    for i in range(1, lehne_zapfen_anzahl + 1):
        loch_x = sx + i * abstand
        probe = (cq.Workplane("XY")
                 .box(1, 1, wippe_hoehe + 4, centered=False)
                 .translate((loch_x - 0.5, sy - 0.5, -2)))
        overlap = lehne_loecher_part.intersect(probe)
        if overlap.val().Volume() > 0.01:
            found += 1
    assert found == lehne_zapfen_anzahl, (
        f"Found {found} holes, expected {lehne_zapfen_anzahl}")

    # Probe halfway between holes — should NOT find material (no extra holes)
    for i in range(1, lehne_zapfen_anzahl):
        mid_x = sx + (i + 0.5) * abstand
        probe = (cq.Workplane("XY")
                 .box(1, 1, wippe_hoehe + 4, centered=False)
                 .translate((mid_x - 0.5, sy - 0.5, -2)))
        overlap = lehne_loecher_part.intersect(probe)
        assert overlap.val().Volume() < 0.01, (
            f"Unexpected hole material between positions {i} and {i+1}")
