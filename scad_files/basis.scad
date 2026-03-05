// ============================================
// Tempest Schachuhr - Teil 1: Basis
// ============================================
// Hauptgehaeuse mit geschlossenem Boden, Pivot-Steg und Anschlaegen

use <config.scad>
include <config.scad>

module basis() {
    difference() {
        // Aeusserer Kasten mit abgerundeten Kanten
        basis_aussen();

        // Innenraum ausfraesen (oben offen)
        translate([basis_wand, basis_wand, boden_dicke])
            basis_innen();

        // Loecher fuer Gummifuesse (durch den Boden)
        fuss_positionen()
            translate([0, 0, -0.1])
                cylinder(d=fuss_durchmesser, h=boden_dicke + 0.2);

    }

    // Pivot-Steg (halbrund, in der Mitte quer)
    pivot_steg();


}

// --- Aeusserer Kasten mit Verrundung ---
module basis_aussen() {
    minkowski() {
        cube([basis_laenge - 2*basis_radius,
              basis_breite - 2*basis_radius,
              basis_hoehe/2]);
        translate([basis_radius, basis_radius, 0])
            cylinder(r=basis_radius, h=basis_hoehe/2);
    }
}

// --- Innenraum ---
module basis_innen() {
    innen_l = basis_laenge - 2*basis_wand;
    innen_b = basis_breite - 2*basis_wand;
    innen_h = basis_hoehe; // oben offen, daher volle Hoehe + etwas

    // Einfacher Quader fuer den Innenraum
    // Leicht abgerundete Innenkanten
    r_innen = max(basis_radius - basis_wand, 1);
    minkowski() {
        cube([innen_l - 2*r_innen,
              innen_b - 2*r_innen,
              innen_h/2]);
        translate([r_innen, r_innen, 0])
            cylinder(r=r_innen, h=innen_h/2);
    }
}

// --- Pivot-Steg ---
// Halbrunder Steg in der Mitte, laeuft in Y-Richtung (quer)
// Unterbrochen im Schlitz-Bereich, damit das Handy durchpasst
module pivot_steg() {
    mitte_x = basis_laenge / 2;
    mitte_y = basis_breite / 2;
    wand_d = 2 * pivot_radius; // Stuetzwand so breit wie Pivot-Durchmesser

    // Tasche-Position in Basis-Koordinaten (Y) - breiter als Schlitz
    schlitz_y_start = mitte_y - slot_breite/2 - tasche_wand + slot_offset_y;
    schlitz_y_ende  = schlitz_y_start + slot_breite + 2*tasche_wand;

    // Stueck 1: Pivot + Stuetzwand
    steg_start = mitte_y - pivot_breite/2;
    len1 = schlitz_y_start - steg_start;
    if (len1 > 0) {
        translate([mitte_x, steg_start, basis_hoehe - verstaerkung_hoehe])
            rotate([-90, 0, 0])
                cylinder(r=pivot_radius, h=len1, $fn=40);
        translate([mitte_x - wand_d/2, steg_start, 0])
            cube([wand_d, len1, basis_hoehe - verstaerkung_hoehe]);
    }

    // Stueck 2: Pivot + Stuetzwand
    steg_ende = mitte_y + pivot_breite/2;
    len2 = steg_ende - schlitz_y_ende;
    if (len2 > 0) {
        translate([mitte_x, schlitz_y_ende, basis_hoehe - verstaerkung_hoehe])
            rotate([-90, 0, 0])
                cylinder(r=pivot_radius, h=len2, $fn=40);
        translate([mitte_x - wand_d/2, schlitz_y_ende, 0])
            cube([wand_d, len2, basis_hoehe - verstaerkung_hoehe]);
    }
}

// --- Gummifuss-Positionen ---
module fuss_positionen() {
    // 4 Ecken, mit Abstand vom Rand
    positionen = [
        [fuss_abstand_x, fuss_abstand_y],
        [basis_laenge - fuss_abstand_x, fuss_abstand_y],
        [fuss_abstand_x, basis_breite - fuss_abstand_y],
        [basis_laenge - fuss_abstand_x, basis_breite - fuss_abstand_y]
    ];

    for (pos = positionen) {
        translate([pos[0], pos[1], 0])
            children();
    }
}


// Rendern
basis();
