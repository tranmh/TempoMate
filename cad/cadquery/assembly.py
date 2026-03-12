# ============================================
# Tempest Schachuhr - Assembly (Zusammenbau)
# ============================================
# Zeigt alle Teile in korrekter Position
# Zur visuellen Pruefung - NICHT zum Drucken!

import cadquery as cq
from config import *
from basis import basis
from wippe import wippe
from lehne import lehne

# --- Steuerung: was anzeigen ---
zeige_basis = True
zeige_wippe = True
zeige_lehne = True
explodiert = False       # True = Teile auseinandergezogen
explode_dist = 30        # Abstand bei Explosionsansicht


def assembly():
    """Create assembly with all parts positioned correctly."""
    assy = cq.Assembly()

    if zeige_basis:
        basis_part = basis()
        assy.add(basis_part, name="basis",
                 color=cq.Color(*farbe_basis))

    if zeige_wippe:
        e = explode_dist if explodiert else 0
        wippe_z = basis_hoehe + pivot_radius - wippe_nut_tiefe
        wippe_part = wippe()

        assy.add(wippe_part, name="wippe",
                 loc=cq.Location(cq.Vector(
                     (basis_laenge - wippe_laenge) / 2,
                     (basis_breite - wippe_breite) / 2,
                     wippe_z + e)),
                 color=cq.Color(*farbe_wippe))

    if zeige_lehne:
        e = 2 * explode_dist if explodiert else 0
        wippe_z = basis_hoehe + pivot_radius - wippe_nut_tiefe
        sx = (wippe_laenge - slot_laenge) / 2
        sy = wippe_breite / 2 - slot_breite / 2 + slot_offset_y
        lehne_part = lehne()

        assy.add(lehne_part, name="lehne",
                 loc=cq.Location(cq.Vector(
                     (basis_laenge - wippe_laenge) / 2 + sx,
                     (basis_breite - wippe_breite) / 2 + sy + slot_breite,
                     wippe_z + wippe_hoehe + e)),
                 color=cq.Color(*farbe_lehne))

    return assy


if __name__ == "__main__":
    assy = assembly()
    assy.toCompound().exportStep("assembly.step")
    print("Exported assembly.step")
