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
