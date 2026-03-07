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
