// ============================================
// Tempest Schachuhr - Gemeinsame Konfiguration
// ============================================
// Alle Masse in mm

// --- Druckbett-Limit ---
druckbett = 220; // Ender 3: 220x220mm

// --- FDM Toleranzen ---
tol = 0.25;       // Allgemeine Passtoleranz
tol_tight = 0.15; // Enge Passung (Snap-fit)
tol_loose = 0.35; // Lose Passung (leichtgaengig)

// --- Gesamtabmessungen Basis ---
basis_laenge = 210;
basis_breite = 100;
basis_hoehe  = 25;
basis_wand   = 4;       // Wandstaerke
basis_radius = 5;       // Kantenverrundung

// --- Pivot (Wippenlager) ---
pivot_radius    = 2;    // Halbrundes Profil
pivot_breite    = basis_breite - 2*basis_wand; // Steg laeuft von Wand zu Wand
pivot_hoehe_auf_basis = basis_hoehe - basis_wand; // Oberkante Basis-Innenwand

// --- Vorab-Definitionen (benoetigt fuer anschlag_hoehe) ---
wippe_nut_tiefe  = 2.5;
boden_dicke      = 2;

// --- Anschlaege ---
anschlag_abstand = 70;  // Abstand vom Pivot zum Anschlag (mm)
anschlag_breite  = 10;
anschlag_tiefe   = 4;
kipp_winkel      = 5;   // Max. Kippwinkel in Grad
// Berechnete Hoehe (vom Boden bis Kipp-Limit)
anschlag_hoehe   = (basis_hoehe + pivot_radius - wippe_nut_tiefe)
                   - anschlag_abstand * sin(kipp_winkel)
                   - boden_dicke;

// --- Wippe ---
wippe_kipp_freiraum = 1.5; // Extra Kuerzung pro Seite fuer Kippbewegung (mm)
wippe_laenge = basis_laenge - 2 * (basis_wand + tol_loose + wippe_kipp_freiraum);
wippe_breite = basis_breite - 2 * (basis_wand + tol_loose);
wippe_hoehe  = 8;
wippe_nut_radius = pivot_radius + tol; // V-Nut passend zum Pivot
fase_oben        = 1;           // 45°-Fase an Wippe-Oberkanten (Freiraum beim Kippen)

// --- Verstaerkung Wippe-Mitte (Buckel nach unten) ---
verstaerkung_breite = 30;  // Breite der Verdickung entlang X (um Pivot-Mitte)
verstaerkung_hoehe  = 4;   // Wie weit der Buckel nach unten ragt

// --- Smartphone-Schlitz ---
// Schlitz laeuft laengs entlang der X-Achse (wie beim Tempest-Original)
slot_laenge = 165;      // Laenge des Schlitzes (entlang X / Laengsachse)
slot_breite = 12;       // Breite des Schlitzes (entlang Y / Handy-Dicke)
slot_offset_y = 15;     // Schlitz-Versatz nach hinten (Y+) vom Zentrum
lehne_hoehe = 22;       // Rueckenlehne hinter dem Schlitz (Handy lehnt dagegen)
lehne_dicke = 5;        // Wandstaerke der Rueckenlehne
lehne_winkel = 10;      // Neigung nach hinten in Grad

// --- Lehne Steckverbindung (Spreizzapfen mit Rastnasen) ---
lehne_zapfen_laenge = 10;   // Zapfenlaenge in X (mm)
lehne_zapfen_tiefe  = 10;   // Gesamtlaenge Zapfen (laenger als Wippe fuer Snap)
lehne_zapfen_anzahl = 3;    // Anzahl Zapfen
lehne_zapfen_spalt  = 1.5;  // Spalt zwischen Zapfen-Haelften (mm)
lehne_zapfen_nub    = 0.5;  // Rastnase Ueberstand (mm)
lehne_zapfen_nub_h  = 1.5;  // Rastnase Hoehe (mm)

// --- Handy-Tasche (haengt unter der Wippe, wippt mit) ---
tasche_tiefe    = 12;   // Wie tief die Tasche unter der Wippe haengt
tasche_wand     = 2;    // Wandstaerke der Tasche
tasche_boden    = 2;    // Bodendicke im Schlitz (Handy steht darauf)

// --- Gummifuesse ---
fuss_durchmesser = 10;
fuss_hoehe       = 2;
fuss_abstand_x   = 15;  // Abstand vom Rand
fuss_abstand_y   = 15;

// --- Farben fuer Assembly ---
farbe_basis  = [0.3, 0.3, 0.3, 0.9];
farbe_wippe  = [0.6, 0.6, 0.7, 0.9];
farbe_lehne  = [0.8, 0.5, 0.3, 0.9];

// --- Hilfsvariable ---
$fn = 40; // Aufloesung fuer Rundungen
