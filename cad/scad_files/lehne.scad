// ============================================
// Tempest Schachuhr - Teil 3: Lehne (Backrest)
// ============================================
// Rueckenlehne als Einzelteil zum Einstecken in die Wippe
// Spreizzapfen mit Rastnasen: kein Kleber noetig
// Zapfen sind gespalten, Nasen schnappen unter der Wippe ein

use <config.scad>
include <config.scad>

module lehne() {
    // Lehne-Form (nach hinten geneigt)
    rotate([-lehne_winkel, 0, 0])
        lehne_form(slot_laenge, lehne_dicke, lehne_hoehe, 5);

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
            // Rampenspitze am Zapfenkoerper (unten, tritt zuerst ein)
            translate([cx, 0, -lehne_zapfen_tiefe])
                cube([0.01, lehne_dicke, 0.01]);
            // Volle Nasenbreite (Rampenende)
            translate([cx - lehne_zapfen_nub, 0,
                       -lehne_zapfen_tiefe + lehne_zapfen_nub/2])
                cube([lehne_zapfen_nub, lehne_dicke, 0.01]);
            // Nasenoberseite (Rastflaeche)
            translate([cx - lehne_zapfen_nub, 0,
                       -lehne_zapfen_tiefe + lehne_zapfen_nub/2 + lehne_zapfen_nub_h])
                cube([lehne_zapfen_nub, lehne_dicke, 0.01]);
        }

        // Rechte Haelfte
        translate([cx + halb + lehne_zapfen_spalt, 0, -lehne_zapfen_tiefe])
            cube([halb, lehne_dicke, lehne_zapfen_tiefe]);
        // Rechte Rastnase mit 45-Grad-Einfuehrrampe
        hull() {
            // Rampenspitze am Zapfenkoerper (unten, tritt zuerst ein)
            translate([cx + lehne_zapfen_laenge, 0, -lehne_zapfen_tiefe])
                cube([0.01, lehne_dicke, 0.01]);
            // Volle Nasenbreite (Rampenende)
            translate([cx + lehne_zapfen_laenge, 0,
                       -lehne_zapfen_tiefe + lehne_zapfen_nub/2])
                cube([lehne_zapfen_nub, lehne_dicke, 0.01]);
            // Nasenoberseite (Rastflaeche)
            translate([cx + lehne_zapfen_laenge, 0,
                       -lehne_zapfen_tiefe + lehne_zapfen_nub/2 + lehne_zapfen_nub_h])
                cube([lehne_zapfen_nub, lehne_dicke, 0.01]);
        }
    }
}

// --- Lehne mit abgerundeten oberen Ecken ---
module lehne_form(l, d, h, r) {
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

// Rendern
lehne();
