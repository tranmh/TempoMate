# ============================================
# Tempest Schachuhr - Teil 1: Basis
# ============================================
# Hauptgehaeuse mit geschlossenem Boden, Pivot-Steg und Anschlaegen

import cadquery as cq
from config import *


def rounded_box(length, width, height, radius):
    """Box with rounded vertical edges, corner at origin."""
    return (cq.Workplane("XY")
            .box(length, width, height, centered=False)
            .edges("|Z").fillet(radius))


def basis_aussen():
    """Aeusserer Kasten mit Verrundung."""
    return rounded_box(basis_laenge, basis_breite, basis_hoehe, basis_radius)


def basis_innen():
    """Innenraum (wird subtrahiert)."""
    r_innen = max(basis_radius - basis_wand, 1)
    innen_l = basis_laenge - 2 * basis_wand
    innen_b = basis_breite - 2 * basis_wand
    return rounded_box(innen_l, innen_b, basis_hoehe, r_innen)


def pivot_steg():
    """Pivot-Steg (halbrund, in der Mitte quer).
    Unterbrochen im Schlitz-Bereich, damit das Handy durchpasst."""
    mitte_x = basis_laenge / 2
    mitte_y = basis_breite / 2
    wand_d = 2 * pivot_radius

    # Tasche-Position in Basis-Koordinaten (Y)
    schlitz_y_start = mitte_y - slot_breite / 2 - tasche_wand + slot_offset_y
    schlitz_y_ende = schlitz_y_start + slot_breite + 2 * tasche_wand

    steg_start = mitte_y - pivot_breite / 2
    steg_ende = mitte_y + pivot_breite / 2

    segments = []

    # Segment 1: before the pocket
    len1 = schlitz_y_start - steg_start
    if len1 > 0:
        cyl1 = (cq.Workplane("XY")
                .circle(pivot_radius).extrude(len1)
                .rotate((0, 0, 0), (1, 0, 0), -90)
                .translate((mitte_x, steg_start, basis_hoehe - verstaerkung_hoehe)))
        wall1 = (cq.Workplane("XY")
                 .box(wand_d, len1, basis_hoehe - verstaerkung_hoehe, centered=False)
                 .translate((mitte_x - wand_d / 2, steg_start, 0)))
        segments.append(cyl1)
        segments.append(wall1)

    # Segment 2: after the pocket
    len2 = steg_ende - schlitz_y_ende
    if len2 > 0:
        cyl2 = (cq.Workplane("XY")
                .circle(pivot_radius).extrude(len2)
                .rotate((0, 0, 0), (1, 0, 0), -90)
                .translate((mitte_x, schlitz_y_ende, basis_hoehe - verstaerkung_hoehe)))
        wall2 = (cq.Workplane("XY")
                 .box(wand_d, len2, basis_hoehe - verstaerkung_hoehe, centered=False)
                 .translate((mitte_x - wand_d / 2, schlitz_y_ende, 0)))
        segments.append(cyl2)
        segments.append(wall2)

    if not segments:
        return cq.Workplane("XY")

    result = segments[0]
    for seg in segments[1:]:
        result = result.union(seg)
    return result


def basis():
    """Complete base part."""
    # Outer shell minus inner cavity
    outer = basis_aussen()
    inner = basis_innen().translate((basis_wand, basis_wand, boden_dicke))
    result = outer.cut(inner)

    # Foot holes through the bottom
    for pos in fuss_positionen:
        hole = (cq.Workplane("XY")
                .circle(fuss_durchmesser / 2).extrude(boden_dicke + 0.2)
                .translate((pos[0], pos[1], -0.1)))
        result = result.cut(hole)

    # Pivot support structure
    result = result.union(pivot_steg())

    return result


if __name__ == "__main__":
    result = basis()
    cq.exporters.export(result, "basis.step")
    print("Exported basis.step")
