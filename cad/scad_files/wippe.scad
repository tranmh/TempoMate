// ============================================
// Tempest Schachuhr - Teil 2: Wippe (Rocker)
// ============================================
// Kippbare Platte mit laengs laufendem Smartphone-Schlitz
// Schlitz laeuft entlang X-Achse (Laengsachse) wie beim Original
// Unter dem Schlitz haengt eine Tasche in die Basis (wippt mit)

use <config.scad>
include <config.scad>

module wippe() {
    difference() {
        union() {
            // Hauptplatte
            wippe_platte();

            // Tasche unter der Wippe (haengt nach unten in die Basis)
            handy_tasche();

            // Verstaerkung: Mitte dicker nach unten (Buckel um Pivot)
            wippe_verstaerkung();
        }

        // Smartphone-Schlitz aussparen (mit Boden)
        schlitz_ausschnitt();

        // V-Nut auf der Unterseite (fuer Pivot)
        wippe_nut();

        // Loecher fuer Lehne-Zapfen (Presspassung)
        lehne_loecher();
    }

}

// --- Hauptplatte mit 45°-Fase oben ---
module wippe_platte() {
    r = 3;
    hull() {
        // Volle Grundflaeche
        minkowski() {
            cube([wippe_laenge - 2*r, wippe_breite - 2*r, 0.01]);
            translate([r, r, 0]) cylinder(r=r, h=0.01);
        }
        // Volle Groesse bis Fasenbeginn
        translate([0, 0, wippe_hoehe - fase_oben])
            minkowski() {
                cube([wippe_laenge - 2*r, wippe_breite - 2*r, 0.01]);
                translate([r, r, 0]) cylinder(r=r, h=0.01);
            }
        // Eingerueckte Oberkante
        translate([fase_oben, fase_oben, wippe_hoehe])
            minkowski() {
                cube([wippe_laenge - 2*r - 2*fase_oben,
                      wippe_breite - 2*r - 2*fase_oben, 0.01]);
                translate([r, r, 0]) cylinder(r=r, h=0.01);
            }
    }
}

// --- Handy-Tasche ---
// Kasten der unter der Wippe haengt, fest verbunden, wippt mit
// Vertikale Kanten abgerundet (r=2)
// Geschlossen auf allen 4 Seiten (inkl. links/rechts)
module handy_tasche() {
    sx = (wippe_laenge - slot_laenge) / 2;
    sy = wippe_breite/2 - slot_breite/2 + slot_offset_y;
    r = 2;

    // Tasche um tasche_wand in X erweitert -> links/rechts geschlossen
    translate([sx - tasche_wand, sy - tasche_wand, -tasche_tiefe])
        minkowski() {
            cube([slot_laenge + 2*tasche_wand - 2*r,
                  slot_breite + 2*tasche_wand - 2*r,
                  tasche_tiefe / 2]);
            translate([r, r, 0])
                cylinder(r=r, h=tasche_tiefe / 2);
        }
}

// --- Schlitz-Ausschnitt ---
// Von oben eingefraest, Boden bleibt (tasche_boden dick)
// Handy steht auf dem Boden und wippt mit
// Tascheninnenraum mit 45-Grad-Fasen am Boden (druckbar umgedreht)
module schlitz_ausschnitt() {
    sx = (wippe_laenge - slot_laenge) / 2;
    sy = wippe_breite/2 - slot_breite/2 + slot_offset_y;

    // Oberer Schlitz durch die Wippe (ab tasche_boden bis oben)
    translate([sx, sy, tasche_boden])
        cube([slot_laenge, slot_breite, wippe_hoehe + 10]);

    // Inneres der Tasche mit 45-Grad-Fasen nahe Boden
    // Volle Slot-Masse ab tasche_wand ueber Boden,
    // verjuengt sich zum Boden hin um tasche_wand auf jeder Seite
    hull() {
        // Volle Groesse ab Fasenkante bis oben
        translate([sx, sy, -tasche_tiefe + tasche_boden + tasche_wand])
            cube([slot_laenge, slot_breite, tasche_tiefe - tasche_wand]);
        // Verjuengt am Boden (45-Grad-Uebergang)
        translate([sx + tasche_wand, sy + tasche_wand,
                   -tasche_tiefe + tasche_boden])
            cube([slot_laenge - 2*tasche_wand,
                  slot_breite - 2*tasche_wand, 0.01]);
    }
}

// --- V-Nut auf der Unterseite ---
// Unterbrochen im Tasche-Bereich (wie Pivot-Steg in der Basis)
module wippe_nut() {
    nut_r = wippe_nut_radius;
    mitte_x = wippe_laenge / 2;

    // Tasche Y-Bereich
    sy = wippe_breite/2 - slot_breite/2 + slot_offset_y;
    tasche_y1 = sy - tasche_wand;
    tasche_y2 = sy + slot_breite + tasche_wand;

    // Nut vor der Tasche (am Boden des Verstaerkungs-Buckels)
    translate([mitte_x, -0.1, -verstaerkung_hoehe])
        rotate([-90, 0, 0])
            cylinder(r=nut_r, h=tasche_y1 + 0.1, $fn=40);

    // Nut hinter der Tasche
    translate([mitte_x, tasche_y2, -verstaerkung_hoehe])
        rotate([-90, 0, 0])
            cylinder(r=nut_r, h=wippe_breite - tasche_y2 + 0.1, $fn=40);
}

// --- Verstaerkung: Buckel auf der Unterseite in der Mitte ---
// Trapezfoermiger Querschnitt: oben buendig mit Wippe-Unterseite,
// nach unten schmaler werdend (45-Grad-Schraegen)
module wippe_verstaerkung() {
    mitte_x = wippe_laenge / 2;

    hull() {
        // Oben: breiter, buendig mit Wippe-Unterseite (Z=0)
        translate([mitte_x - verstaerkung_breite/2, 0, -0.01])
            cube([verstaerkung_breite, wippe_breite, 0.01]);

        // Unten: schmaler (45-Grad-Schraegen links/rechts)
        translate([mitte_x - verstaerkung_breite/2 + verstaerkung_hoehe,
                   0, -verstaerkung_hoehe])
            cube([verstaerkung_breite - 2*verstaerkung_hoehe,
                  wippe_breite, 0.01]);
    }
}

// --- Loecher fuer Lehne-Zapfen (Durchgang + Rastnase-Freiraum) ---
module lehne_loecher() {
    sx = (wippe_laenge - slot_laenge) / 2;
    sy = wippe_breite/2 - slot_breite/2 + slot_offset_y + slot_breite;
    abstand = slot_laenge / (lehne_zapfen_anzahl + 1);
    durchsteck = lehne_zapfen_tiefe - wippe_hoehe;

    for (i = [1:lehne_zapfen_anzahl]) {
        loch_x = sx + i * abstand;

        // Durchgangsloch (durch gesamte Wippe)
        translate([loch_x - (lehne_zapfen_laenge/2 + tol),
                   sy - tol,
                   -1])
            cube([lehne_zapfen_laenge + 2*tol,
                  lehne_dicke + 2*tol,
                  wippe_hoehe + 2]);

        // Freiraum fuer Rastnasen (breiter, unter der Wippe)
        translate([loch_x - (lehne_zapfen_laenge/2 + lehne_zapfen_nub + tol),
                   sy - tol,
                   -(durchsteck + 0.5)])
            cube([lehne_zapfen_laenge + 2*(lehne_zapfen_nub + tol),
                  lehne_dicke + 2*tol,
                  durchsteck + 0.5 + 1]);
    }
}

// Rendern
wippe();
