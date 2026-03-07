# ============================================
# Tempest Schachuhr - Teil 2: Wippe (Rocker)
# ============================================
# Kippbare Platte mit laengs laufendem Smartphone-Schlitz
# Unter dem Schlitz haengt eine Tasche in die Basis (wippt mit)

import cadquery as cq
from config import *


def wippe_platte():
    """Hauptplatte mit 45-Grad-Fase oben und abgerundeten Ecken."""
    result = (cq.Workplane("XY")
              .box(wippe_laenge, wippe_breite, wippe_hoehe, centered=False)
              .edges("|Z").fillet(3)
              .edges(">Z").chamfer(fase_oben))
    return result


def handy_tasche():
    """Kasten der unter der Wippe haengt (fuer Smartphone).
    Geschlossen auf allen 4 Seiten, abgerundete vertikale Kanten."""
    sx = (wippe_laenge - slot_laenge) / 2
    sy = wippe_breite / 2 - slot_breite / 2 + slot_offset_y
    r = 2
    outer_l = slot_laenge + 2 * tasche_wand
    outer_b = slot_breite + 2 * tasche_wand

    result = (cq.Workplane("XY")
              .box(outer_l, outer_b, tasche_tiefe, centered=False)
              .edges("|Z").fillet(r)
              .translate((sx - tasche_wand, sy - tasche_wand, -tasche_tiefe)))
    return result


def wippe_verstaerkung():
    """Verstaerkung: Buckel auf der Unterseite in der Mitte.
    Trapezfoermiger Querschnitt (oben breiter, unten schmaler)."""
    mitte_x = wippe_laenge / 2
    half_top = verstaerkung_breite / 2
    half_bot = (verstaerkung_breite - 2 * verstaerkung_hoehe) / 2

    # Trapezoidal XZ cross-section, extruded along Y
    # XZ plane normal points in -Y, so extrude goes -Y; shift to align with plate (Y=0..wippe_breite)
    result = (cq.Workplane("XZ")
              .moveTo(mitte_x - half_top, 0)
              .lineTo(mitte_x + half_top, 0)
              .lineTo(mitte_x + half_bot, -verstaerkung_hoehe)
              .lineTo(mitte_x - half_bot, -verstaerkung_hoehe)
              .close()
              .extrude(wippe_breite)
              .translate((0, wippe_breite, 0)))
    return result


def schlitz_ausschnitt():
    """Smartphone-Schlitz: von oben eingefraest, Boden bleibt.
    Tascheninnenraum mit 45-Grad-Fasen am Boden."""
    sx = (wippe_laenge - slot_laenge) / 2
    sy = wippe_breite / 2 - slot_breite / 2 + slot_offset_y

    # Upper slot through the rocker plate (from tasche_boden upward)
    upper_slot = (cq.Workplane("XY")
                  .box(slot_laenge, slot_breite, wippe_hoehe + 10, centered=False)
                  .translate((sx, sy, tasche_boden)))

    # Inner pocket cavity with 45-degree chamfers at the bottom
    pocket_h = tasche_tiefe - tasche_boden
    pocket_inner = (cq.Workplane("XY")
                    .box(slot_laenge, slot_breite, pocket_h, centered=False)
                    .edges("<Z").chamfer(tasche_wand - 0.01)
                    .translate((sx, sy, -tasche_tiefe + tasche_boden)))

    return upper_slot.union(pocket_inner)


def wippe_nut():
    """V-Nut auf der Unterseite (fuer Pivot).
    Unterbrochen im Tasche-Bereich."""
    nut_r = wippe_nut_radius
    mitte_x = wippe_laenge / 2

    # Pocket Y range
    sy = wippe_breite / 2 - slot_breite / 2 + slot_offset_y
    tasche_y1 = sy - tasche_wand
    tasche_y2 = sy + slot_breite + tasche_wand

    grooves = []

    # Groove before the pocket
    len1 = tasche_y1 + 0.1
    if len1 > 0:
        g1 = (cq.Workplane("XY")
              .circle(nut_r).extrude(len1)
              .rotate((0, 0, 0), (1, 0, 0), -90)
              .translate((mitte_x, -0.1, -verstaerkung_hoehe)))
        grooves.append(g1)

    # Groove after the pocket
    len2 = wippe_breite - tasche_y2 + 0.1
    if len2 > 0:
        g2 = (cq.Workplane("XY")
              .circle(nut_r).extrude(len2)
              .rotate((0, 0, 0), (1, 0, 0), -90)
              .translate((mitte_x, tasche_y2, -verstaerkung_hoehe)))
        grooves.append(g2)

    if not grooves:
        return cq.Workplane("XY")

    result = grooves[0]
    for g in grooves[1:]:
        result = result.union(g)
    return result


def lehne_loecher():
    """Loecher fuer Lehne-Zapfen (Durchgang + Rastnase-Freiraum)."""
    sx = (wippe_laenge - slot_laenge) / 2
    sy = wippe_breite / 2 - slot_breite / 2 + slot_offset_y + slot_breite
    abstand = slot_laenge / (lehne_zapfen_anzahl + 1)
    durchsteck = lehne_zapfen_tiefe - wippe_hoehe

    parts = []

    for i in range(1, lehne_zapfen_anzahl + 1):
        loch_x = sx + i * abstand

        # Through-hole (entire rocker thickness)
        hole = (cq.Workplane("XY")
                .box(lehne_zapfen_laenge + 2 * tol,
                     lehne_dicke + 2 * tol,
                     wippe_hoehe + 2, centered=False)
                .translate((loch_x - (lehne_zapfen_laenge / 2 + tol),
                            sy - tol,
                            -1)))

        # Clearance for snap-fit nubs (wider, below the rocker)
        nub_clear = (cq.Workplane("XY")
                     .box(lehne_zapfen_laenge + 2 * (lehne_zapfen_nub + tol),
                          lehne_dicke + 2 * tol,
                          durchsteck + 0.5 + 1, centered=False)
                     .translate((loch_x - (lehne_zapfen_laenge / 2 + lehne_zapfen_nub + tol),
                                 sy - tol,
                                 -(durchsteck + 0.5))))

        parts.append(hole)
        parts.append(nub_clear)

    if not parts:
        return cq.Workplane("XY")

    result = parts[0]
    for p in parts[1:]:
        result = result.union(p)
    return result


def wippe():
    """Complete rocker part."""
    # Build positive geometry
    result = wippe_platte()
    result = result.union(handy_tasche())
    result = result.union(wippe_verstaerkung())

    # Subtract cuts
    result = result.cut(schlitz_ausschnitt())
    result = result.cut(wippe_nut())
    result = result.cut(lehne_loecher())

    return result


if __name__ == "__main__":
    result = wippe()
    cq.exporters.export(result, "wippe.step")
    print("Exported wippe.step")
