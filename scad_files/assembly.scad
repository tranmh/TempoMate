// ============================================
// Tempest Schachuhr - Assembly (Zusammenbau)
// ============================================
// Zeigt alle Teile in korrekter Position
// Zur visuellen Pruefung - NICHT zum Drucken!

use <config.scad>
include <config.scad>

// --- Steuerung: was anzeigen ---
zeige_basis  = true;
zeige_wippe  = true;
zeige_lehne  = true;
explodiert   = false; // true = Teile auseinandergezogen
explode_dist = 30;    // Abstand bei Explosionsansicht

// ============================================

if (zeige_basis) {
    color(farbe_basis)
        use_basis();
}

if (zeige_wippe) {
    e = explodiert ? explode_dist : 0;
    wippe_z = basis_hoehe + pivot_radius - wippe_nut_tiefe;

    color(farbe_wippe)
        translate([(basis_laenge - wippe_laenge) / 2,
                   (basis_breite - wippe_breite) / 2,
                   wippe_z + e])
            use_wippe();
}

if (zeige_lehne) {
    e = explodiert ? 2 * explode_dist : 0;
    wippe_z = basis_hoehe + pivot_radius - wippe_nut_tiefe;
    sx = (wippe_laenge - slot_laenge) / 2;
    sy = wippe_breite/2 - slot_breite/2 + slot_offset_y;

    color(farbe_lehne)
        translate([(basis_laenge - wippe_laenge) / 2 + sx,
                   (basis_breite - wippe_breite) / 2 + sy + slot_breite,
                   wippe_z + wippe_hoehe + e])
            use_lehne();
}

// --- Module ---

module use_basis() {
    difference() {
        basis_aussen_a();
        translate([basis_wand, basis_wand, boden_dicke])
            basis_innen_a();

    }
    // Pivot + Stuetzwaende (unterbrochen im Tasche-Bereich)
    tasche_y1 = basis_breite/2 - slot_breite/2 - tasche_wand + slot_offset_y;
    tasche_y2 = tasche_y1 + slot_breite + 2*tasche_wand;
    steg_s = basis_wand;
    steg_e = basis_breite - basis_wand;
    wand_d = 2 * pivot_radius; // Stuetzwand so breit wie Pivot-Durchmesser
    // Segment 1: Pivot + Stuetzwand (abgesenkt um verstaerkung_hoehe)
    translate([basis_laenge/2, steg_s, basis_hoehe - verstaerkung_hoehe])
        rotate([-90, 0, 0])
            cylinder(r=pivot_radius, h=tasche_y1 - steg_s, $fn=40);
    translate([basis_laenge/2 - wand_d/2, steg_s, 0])
        cube([wand_d, tasche_y1 - steg_s, basis_hoehe - verstaerkung_hoehe]);
    // Segment 2: Pivot + Stuetzwand (abgesenkt um verstaerkung_hoehe)
    translate([basis_laenge/2, tasche_y2, basis_hoehe - verstaerkung_hoehe])
        rotate([-90, 0, 0])
            cylinder(r=pivot_radius, h=steg_e - tasche_y2, $fn=40);
    translate([basis_laenge/2 - wand_d/2, tasche_y2, 0])
        cube([wand_d, steg_e - tasche_y2, basis_hoehe - verstaerkung_hoehe]);
}

module basis_aussen_a() {
    minkowski() {
        cube([basis_laenge - 2*basis_radius,
              basis_breite - 2*basis_radius,
              basis_hoehe/2]);
        translate([basis_radius, basis_radius, 0])
            cylinder(r=basis_radius, h=basis_hoehe/2);
    }
}

module basis_innen_a() {
    r_innen = max(basis_radius - basis_wand, 1);
    innen_l = basis_laenge - 2*basis_wand;
    innen_b = basis_breite - 2*basis_wand;
    minkowski() {
        cube([innen_l - 2*r_innen,
              innen_b - 2*r_innen,
              basis_hoehe/2]);
        translate([r_innen, r_innen, 0])
            cylinder(r=r_innen, h=basis_hoehe/2);
    }
}

module use_wippe() {
    r = 3;
    sx = (wippe_laenge - slot_laenge) / 2;
    sy = wippe_breite/2 - slot_breite/2 + slot_offset_y;

    difference() {
        union() {
            // Platte (mit 45°-Fase oben)
            hull() {
                minkowski() {
                    cube([wippe_laenge - 2*r, wippe_breite - 2*r, 0.01]);
                    translate([r, r, 0]) cylinder(r=r, h=0.01);
                }
                translate([0, 0, wippe_hoehe - fase_oben])
                    minkowski() {
                        cube([wippe_laenge - 2*r, wippe_breite - 2*r, 0.01]);
                        translate([r, r, 0]) cylinder(r=r, h=0.01);
                    }
                translate([fase_oben, fase_oben, wippe_hoehe])
                    minkowski() {
                        cube([wippe_laenge - 2*r - 2*fase_oben,
                              wippe_breite - 2*r - 2*fase_oben, 0.01]);
                        translate([r, r, 0]) cylinder(r=r, h=0.01);
                    }
            }
            // Tasche (geschlossen auf allen 4 Seiten, abgerundete Kanten)
            translate([sx - tasche_wand, sy - tasche_wand, -tasche_tiefe])
                minkowski() {
                    cube([slot_laenge + 2*tasche_wand - 4,
                          slot_breite + 2*tasche_wand - 4,
                          tasche_tiefe / 2]);
                    translate([2, 2, 0])
                        cylinder(r=2, h=tasche_tiefe / 2);
                }
            // Verstaerkung Mitte (Buckel nach unten)
            hull() {
                translate([wippe_laenge/2 - verstaerkung_breite/2, 0, -0.01])
                    cube([verstaerkung_breite, wippe_breite, 0.01]);
                translate([wippe_laenge/2 - verstaerkung_breite/2 + verstaerkung_hoehe,
                           0, -verstaerkung_hoehe])
                    cube([verstaerkung_breite - 2*verstaerkung_hoehe,
                          wippe_breite, 0.01]);
            }
        }
        // Schlitz (von oben, mit Boden)
        translate([sx, sy, tasche_boden])
            cube([slot_laenge, slot_breite, wippe_hoehe + 10]);
        // Tasche innen ausfraesen (mit 45-Grad-Fasen am Boden)
        hull() {
            translate([sx, sy, -tasche_tiefe + tasche_boden + tasche_wand])
                cube([slot_laenge, slot_breite, tasche_tiefe - tasche_wand]);
            translate([sx + tasche_wand, sy + tasche_wand,
                       -tasche_tiefe + tasche_boden])
                cube([slot_laenge - 2*tasche_wand,
                      slot_breite - 2*tasche_wand, 0.01]);
        }
        // Nut (unterbrochen im Tasche-Bereich)
        sy_w = wippe_breite/2 - slot_breite/2 + slot_offset_y;
        tasche_y1 = sy_w - tasche_wand;
        tasche_y2 = sy_w + slot_breite + tasche_wand;
        translate([wippe_laenge/2, -0.1, -verstaerkung_hoehe])
            rotate([-90, 0, 0])
                cylinder(r=wippe_nut_radius, h=tasche_y1 + 0.1, $fn=40);
        translate([wippe_laenge/2, tasche_y2, -verstaerkung_hoehe])
            rotate([-90, 0, 0])
                cylinder(r=wippe_nut_radius, h=wippe_breite - tasche_y2 + 0.1, $fn=40);
        // Durchgangsloecher fuer Lehne-Zapfen
        sy_l = wippe_breite/2 - slot_breite/2 + slot_offset_y + slot_breite;
        abstand_l = slot_laenge / (lehne_zapfen_anzahl + 1);
        durchsteck = lehne_zapfen_tiefe - wippe_hoehe;
        for (i = [1:lehne_zapfen_anzahl]) {
            loch_x = sx + i * abstand_l;
            // Durchgangsloch
            translate([loch_x - (lehne_zapfen_laenge/2 + tol),
                       sy_l - tol,
                       -1])
                cube([lehne_zapfen_laenge + 2*tol,
                      lehne_dicke + 2*tol,
                      wippe_hoehe + 2]);
            // Freiraum fuer Rastnasen
            translate([loch_x - (lehne_zapfen_laenge/2 + lehne_zapfen_nub + tol),
                       sy_l - tol,
                       -(durchsteck + 0.5)])
                cube([lehne_zapfen_laenge + 2*(lehne_zapfen_nub + tol),
                      lehne_dicke + 2*tol,
                      durchsteck + 0.5 + 1]);
        }
    }

}

module use_lehne() {
    // Lehne-Form (nach hinten geneigt)
    rotate([-lehne_winkel, 0, 0])
        lehne_form_a(slot_laenge, lehne_dicke, lehne_hoehe, 5);

    // Spreizzapfen mit Rastnasen
    abstand = slot_laenge / (lehne_zapfen_anzahl + 1);
    halb = (lehne_zapfen_laenge - lehne_zapfen_spalt) / 2;
    for (i = [1:lehne_zapfen_anzahl]) {
        cx = i * abstand - lehne_zapfen_laenge / 2;
        // Linke Haelfte
        translate([cx, 0, -lehne_zapfen_tiefe])
            cube([halb, lehne_dicke, lehne_zapfen_tiefe]);
        // Linke Rastnase mit 45-Grad-Einfuehrrampe
        hull() {
            translate([cx, 0, -lehne_zapfen_tiefe])
                cube([0.01, lehne_dicke, 0.01]);
            translate([cx - lehne_zapfen_nub, 0,
                       -lehne_zapfen_tiefe + lehne_zapfen_nub/2])
                cube([lehne_zapfen_nub, lehne_dicke, 0.01]);
            translate([cx - lehne_zapfen_nub, 0,
                       -lehne_zapfen_tiefe + lehne_zapfen_nub/2 + lehne_zapfen_nub_h])
                cube([lehne_zapfen_nub, lehne_dicke, 0.01]);
        }
        // Rechte Haelfte
        translate([cx + halb + lehne_zapfen_spalt, 0, -lehne_zapfen_tiefe])
            cube([halb, lehne_dicke, lehne_zapfen_tiefe]);
        // Rechte Rastnase mit 45-Grad-Einfuehrrampe
        hull() {
            translate([cx + lehne_zapfen_laenge, 0, -lehne_zapfen_tiefe])
                cube([0.01, lehne_dicke, 0.01]);
            translate([cx + lehne_zapfen_laenge, 0,
                       -lehne_zapfen_tiefe + lehne_zapfen_nub/2])
                cube([lehne_zapfen_nub, lehne_dicke, 0.01]);
            translate([cx + lehne_zapfen_laenge, 0,
                       -lehne_zapfen_tiefe + lehne_zapfen_nub/2 + lehne_zapfen_nub_h])
                cube([lehne_zapfen_nub, lehne_dicke, 0.01]);
        }
    }
}

module lehne_form_a(l, d, h, r) {
    hull() {
        cube([l, d, 0.01]);
        translate([r, 0, h - r])
            rotate([-90, 0, 0])
                cylinder(r=r, h=d, $fn=30);
        translate([l - r, 0, h - r])
            rotate([-90, 0, 0])
                cylinder(r=r, h=d, $fn=30);
    }
}

