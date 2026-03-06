# ============================================
# Tempest Schachuhr - Teil 3: Lehne (Backrest)
# ============================================
# Rueckenlehne als Einzelteil zum Einstecken in die Wippe
# Spreizzapfen mit Rastnasen: kein Kleber noetig

import cadquery as cq
from config import *


def lehne_form(l, d, h, r):
    """Lehne mit abgerundeten oberen Ecken.
    Box from origin, top edges parallel to Y are filleted."""
    result = (cq.Workplane("XY")
              .box(l, d, h, centered=False)
              .edges(">Z and |Y").fillet(r))
    return result


def make_nub_left(cx, z_base, nub, nub_h, d):
    """Linke Rastnase mit 45-Grad-Einfuehrrampe.
    Approximation of the OpenSCAD hull() geometry."""
    z0 = z_base
    z1 = z_base + nub / 2
    z2 = z1 + nub_h

    # XZ profile of the nub (wedge shape), extruded along Y
    result = (cq.Workplane("XZ")
              .moveTo(cx, z0)
              .lineTo(cx - nub, z1)
              .lineTo(cx - nub, z2)
              .lineTo(cx, z2)
              .close()
              .extrude(d))
    return result


def make_nub_right(cx, z_base, nub, nub_h, d):
    """Rechte Rastnase mit 45-Grad-Einfuehrrampe."""
    z0 = z_base
    z1 = z_base + nub / 2
    z2 = z1 + nub_h

    result = (cq.Workplane("XZ")
              .moveTo(cx, z0)
              .lineTo(cx + nub, z1)
              .lineTo(cx + nub, z2)
              .lineTo(cx, z2)
              .close()
              .extrude(d))
    return result


def lehne():
    """Complete backrest part."""
    # Lehne-Form (nach hinten geneigt)
    form = (lehne_form(slot_laenge, lehne_dicke, lehne_hoehe, 5)
            .rotate((0, 0, 0), (1, 0, 0), -lehne_winkel))

    result = form

    # Spreizzapfen mit Rastnasen
    abstand = slot_laenge / (lehne_zapfen_anzahl + 1)
    halb = (lehne_zapfen_laenge - lehne_zapfen_spalt) / 2

    for i in range(1, lehne_zapfen_anzahl + 1):
        cx = i * abstand - lehne_zapfen_laenge / 2

        # Linke Haelfte (tenon)
        left_tenon = (cq.Workplane("XY")
                      .box(halb, lehne_dicke, lehne_zapfen_tiefe, centered=False)
                      .translate((cx, 0, -lehne_zapfen_tiefe)))
        result = result.union(left_tenon)

        # Linke Rastnase
        left_nub = make_nub_left(cx, -lehne_zapfen_tiefe,
                                 lehne_zapfen_nub, lehne_zapfen_nub_h,
                                 lehne_dicke)
        result = result.union(left_nub)

        # Rechte Haelfte (tenon)
        right_tenon = (cq.Workplane("XY")
                       .box(halb, lehne_dicke, lehne_zapfen_tiefe, centered=False)
                       .translate((cx + halb + lehne_zapfen_spalt, 0,
                                   -lehne_zapfen_tiefe)))
        result = result.union(right_tenon)

        # Rechte Rastnase
        right_nub = make_nub_right(cx + lehne_zapfen_laenge, -lehne_zapfen_tiefe,
                                   lehne_zapfen_nub, lehne_zapfen_nub_h,
                                   lehne_dicke)
        result = result.union(right_nub)

    return result


if __name__ == "__main__":
    result = lehne()
    cq.exporters.export(result, "lehne.step")
    print("Exported lehne.step")
