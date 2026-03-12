"""Tests for the lehne (backrest) part geometry."""

import pytest
from helpers import bounding_box

TOL = 1.5  # slightly more tolerant due to rotation/fillets


def test_lehne_is_valid_solid(lehne_part):
    shape = lehne_part.val()
    assert shape is not None
    vol = shape.Volume()
    assert vol > 0


def test_lehne_bounding_box_width(lehne_part):
    """Lehne width (X) should approximate slot_laenge."""
    from config import slot_laenge
    bb = bounding_box(lehne_part)
    assert abs(bb["xlen"] - slot_laenge) < TOL


def test_lehne_has_tenons_below_zero(lehne_part):
    """Snap-fit tenons extend below z=0."""
    bb = bounding_box(lehne_part)
    assert bb["zmin"] < 0, "Tenons should extend below z=0"


def test_lehne_tenon_depth(lehne_part):
    """Tenons should extend approximately lehne_zapfen_tiefe below z=0."""
    from config import lehne_zapfen_tiefe
    bb = bounding_box(lehne_part)
    assert abs(bb["zmin"] - (-lehne_zapfen_tiefe)) < TOL


def test_lehne_volume_sanity(lehne_part):
    """Volume should be reasonable (not too small, not too large)."""
    bb = bounding_box(lehne_part)
    bbox_vol = bb["xlen"] * bb["ylen"] * bb["zlen"]
    actual_vol = lehne_part.val().Volume()
    ratio = actual_vol / bbox_vol
    assert 0.05 < ratio < 0.80, f"Volume ratio {ratio:.2f} outside expected range"


def test_lehne_single_solid(lehne_part):
    """Should be exactly one solid."""
    shape = lehne_part.val()
    solids = shape.Solids()
    assert len(solids) == 1, f"Expected 1 solid, got {len(solids)}"


# --- Sub-component tests ---

def test_lehne_form_dimensions(lehne_form_part):
    """lehne_form() matches slot_laenge x lehne_dicke x lehne_hoehe."""
    from config import slot_laenge, lehne_dicke, lehne_hoehe
    bb = bounding_box(lehne_form_part)
    assert abs(bb["xlen"] - slot_laenge) < TOL, (
        f"Form length {bb['xlen']:.1f} != expected {slot_laenge:.1f}")
    assert abs(bb["ylen"] - lehne_dicke) < TOL, (
        f"Form depth {bb['ylen']:.1f} != expected {lehne_dicke:.1f}")
    assert abs(bb["zlen"] - lehne_hoehe) < TOL, (
        f"Form height {bb['zlen']:.1f} != expected {lehne_hoehe:.1f}")


def test_lehne_form_has_top_fillet(lehne_form_part):
    """Top edges are filleted (volume < full box)."""
    from config import slot_laenge, lehne_dicke, lehne_hoehe
    full_vol = slot_laenge * lehne_dicke * lehne_hoehe
    actual_vol = lehne_form_part.val().Volume()
    assert actual_vol < full_vol, (
        f"Fillet should remove material: {actual_vol:.0f} >= {full_vol:.0f}")


def test_lehne_zapfen_count(lehne_part):
    """Verify exactly lehne_zapfen_anzahl (3) tenon pairs by probing at each expected X.
    Each tenon is split into two halves with a spalt gap. Probe the left half center.
    Probes in the deep tenon zone (z < -2) to avoid the tilted form's small overhang."""
    import cadquery as cq
    from config import (slot_laenge, lehne_dicke, lehne_zapfen_anzahl,
                        lehne_zapfen_laenge, lehne_zapfen_tiefe, lehne_zapfen_spalt)
    abstand = slot_laenge / (lehne_zapfen_anzahl + 1)
    halb = (lehne_zapfen_laenge - lehne_zapfen_spalt) / 2
    # Probe only in the deep tenon zone, below where the tilted form reaches
    probe_top = -2.0
    probe_h = lehne_zapfen_tiefe + probe_top

    # Probe at the left-half center of each expected tenon — must find material
    found = 0
    for i in range(1, lehne_zapfen_anzahl + 1):
        # Left half starts at cx = i*abstand - zapfen_laenge/2, width = halb
        cx = i * abstand - lehne_zapfen_laenge / 2
        left_half_center_x = cx + halb / 2
        probe = (cq.Workplane("XY")
                 .box(1, lehne_dicke + 2, probe_h, centered=False)
                 .translate((left_half_center_x - 0.5, -1, -lehne_zapfen_tiefe)))
        overlap = lehne_part.intersect(probe)
        if overlap.val().Volume() > 0.01:
            found += 1
    assert found == lehne_zapfen_anzahl, (
        f"Found {found} tenons, expected {lehne_zapfen_anzahl}")

    # Probe halfway between tenon groups — should find no tenon material
    for i in range(1, lehne_zapfen_anzahl):
        mid_x = (i + 0.5) * abstand
        probe = (cq.Workplane("XY")
                 .box(1, lehne_dicke + 2, probe_h, centered=False)
                 .translate((mid_x - 0.5, -1, -lehne_zapfen_tiefe)))
        overlap = lehne_part.intersect(probe)
        assert overlap.val().Volume() < 0.01, (
            f"Unexpected tenon material between positions {i} and {i+1}")


def test_nub_extends_beyond_tenon():
    """Nubs extend outward beyond tenon X bounds."""
    from config import lehne_zapfen_nub
    assert lehne_zapfen_nub > 0, "Nub overhang must be positive"
    # Test by building a single nub and checking its extent
    from lehne import make_nub_left, make_nub_right
    from config import lehne_dicke
    nub_l = make_nub_left(5.0, -10.0, lehne_zapfen_nub, 1.5, lehne_dicke)
    bb_l = bounding_box(nub_l)
    # Left nub extends in -X direction from cx
    assert bb_l["xmin"] < 5.0, f"Left nub should extend below cx=5.0, got xmin={bb_l['xmin']:.2f}"
    nub_r = make_nub_right(15.0, -10.0, lehne_zapfen_nub, 1.5, lehne_dicke)
    bb_r = bounding_box(nub_r)
    # Right nub extends in +X direction from cx
    assert bb_r["xmax"] > 15.0, f"Right nub should extend above cx=15.0, got xmax={bb_r['xmax']:.2f}"


def test_lehne_tilted(lehne_part):
    """The form is rotated by lehne_winkel around X-axis.
    Y-extent must match the projection of the tilted rectangle."""
    from config import lehne_dicke, lehne_winkel, lehne_hoehe
    import math
    bb = bounding_box(lehne_part)
    # After tilting by lehne_winkel degrees around X, Y extent of the form portion
    # becomes: dicke*cos(angle) + hoehe*sin(angle)
    tilted_y = (lehne_dicke * math.cos(math.radians(lehne_winkel))
                + lehne_hoehe * math.sin(math.radians(lehne_winkel)))
    assert bb["ylen"] > lehne_dicke, (
        f"Tilted lehne Y {bb['ylen']:.1f} should exceed untilted {lehne_dicke:.1f}")
    # Check against expected projection (generous TOL since tenons also contribute)
    assert bb["ylen"] >= tilted_y * 0.9, (
        f"Tilted lehne Y {bb['ylen']:.1f} should be near projected {tilted_y:.1f}")
