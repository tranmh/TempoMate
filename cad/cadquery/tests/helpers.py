"""Shared test helpers for CadQuery geometry tests."""


def bounding_box(part):
    """Return dict with bounding box dimensions and extents for a CadQuery Workplane or Shape."""
    if hasattr(part, "val"):
        shape = part.val()
    else:
        shape = part
    bb = shape.BoundingBox()
    return {
        "xlen": bb.xmax - bb.xmin,
        "ylen": bb.ymax - bb.ymin,
        "zlen": bb.zmax - bb.zmin,
        "xmin": bb.xmin,
        "ymin": bb.ymin,
        "zmin": bb.zmin,
        "xmax": bb.xmax,
        "ymax": bb.ymax,
        "zmax": bb.zmax,
    }
