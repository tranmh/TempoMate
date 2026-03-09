# Prompt-Strategie: 3D-Druck-Projekte mit KI umsetzen

> Erprobt am Nachbau der Tempest-Schachuhr in OpenSCAD. Uebertragbar auf beliebige 3D-Druck-Projekte.

---

## 1. Projektstart: Offen einsteigen, Fragen provozieren

**Prompt-Muster:**
```
"Ich moechte [Objekt] nachbauen. Schaue dir die Bilder an und stelle mir Fragen."
```

**Warum:** Die KI erkennt, was sie *nicht* weiss, und fragt gezielt nach. Das verhindert falsche Annahmen.

**Typische Fragerunden:**
1. **Grobe Eckdaten** — Druckbettgroesse, Version/Variante, gewuenschte Funktionen
2. **Technische Details** — CAD-Tool, Mechanismus-Details, Material

**Ergebnis:** Erst nach zwei Fragerunden beginnt die Umsetzung — mit einem soliden Verstaendnis.

---

## 2. Referenzmaterial immer mitliefern

| Material | Einsatz |
|---|---|
| **Fotos des Originals** | SOLL-Zustand definieren |
| **Screenshots des aktuellen Modells** | IST-Zustand zeigen |
| **Beide zusammen** | Effektivste Methode — KI sieht Abweichung sofort |
| **Eingezeichnete Markierungen** | Z.B. blaue Linie auf Screenshot fuer "von hier bis hier" |

---

## 3. Iterativ in kleinen Schritten arbeiten

**Nicht:** "Baue die komplette Schachuhr."
**Sondern:** Ein Aspekt pro Prompt, aufeinander aufbauend.

**Typische Reihenfolge:**
```
Struktur  -->  Mechanik  -->  Verfeinerung  -->  Kosmetik  -->  Export
```

**Beispiel-Kette:**
1. "Der Schlitz muss um 90 Grad gedreht werden"
2. "Zentriere den Schlitz und schiebe ihn nach hinten"
3. "Die Ruecklehne fehlt"
4. "Lehne anwinkeln"
5. "Ecken abrunden"

Jeder Schritt ist klein, pruefbar, und rueckgaengig machbar.

---

## 4. Plan vor Umsetzung anfordern

**Prompt-Muster:**
```
"Erstelle hierfuer einen Plan."
```

**Warum:** Trennt Denken von Handeln. Man kann den Plan pruefen und anpassen, bevor Code entsteht.

**Freigabe:** Erst nach Pruefung mit "Ja" oder "Continue from where you left off."

---

## 5. Rueckfragen als Qualitaetskontrolle

Vor dem Drucken systematisch hinterfragen:

- **"Funktioniert die Wippe noch?"** — Deckte auf, dass die Basis zu flach war
- **"Kann es ueberhaupt noch wippen?"** — Fuehrte zur Erhoehung der Basis
- **"Funktioniert das Reinknippsen?"** — Fand fehlende Einfuehrschraege am Snap-Fit
- **"Soll das so sein, dass die Stange nicht durchgeht?"** — Fand unbeabsichtigte Luecke

**Regel:** Nach jeder strukturellen Aenderung mindestens eine mechanische Rueckfrage stellen.

---

## 6. Korrigieren statt tolerieren

Falsche Ansaetze sofort korrigieren — kurz und direkt:

- "Du hast es in die falsche Richtung angewinkelt" --> 1-Zeilen-Fix
- "Ne, das ist nur ein Stopper, kein Einrasten" --> Neue Optionen
- "Muss die Luecke wirklich so gross sein?" --> Berechnung + Reduktion

**Nie** einen falschen Ansatz weiterlaufen lassen, weil man "nicht unterbrechen" will.

---

## 7. Optionen vorschlagen lassen, dann waehlen

**Prompt-Muster:**
```
"Wie koennen wir [Problem] loesen?"
```

Die KI schlaegt 3-4 Optionen vor. Man waehlt mit:
```
"Option 3."
```

**Vorteil:** Man bekommt Loesungen, an die man selbst nicht gedacht haette, behaelt aber die Kontrolle.

---

## 8. Druckbarkeit frueh pruefen

Typische Probleme, die durch Prompts gefunden wurden:

| Problem | Prompt der es fand |
|---|---|
| Schwebende Stangen (kein Support) | "Die Stangen fliegen frei — macht das Probleme?" |
| 90-Grad-Ueberhang | "Im Moment ist es nicht druckbar wegen dem 90-Grad-Winkel" |
| Teile nicht zusammenbaubar | "Funktioniert das Zusammenbauen der Einzelteile?" |

**Loesung:** Stuetzwaende, 45-Grad-Fasen, Teile aufsplitten (z.B. Lehne als Steckteil).

---

## 9. Prompt-Sprache: Kurz, direkt, gemischt

**Funktioniert:**
- "Mache das Loch weniger tief"
- "Kuerze die Lehne und mache sie dicker"
- "Runde die Ecken ein bisschen ein"
- "Entferne diese Miniwaende"

**Funktioniert nicht:**
- Lange Erklaerungen mit mehreren verschachtelten Anforderungen
- Vage Beschreibungen ohne Screenshot

Deutsch fuer Anweisungen, Englisch fuer Fachbegriffe — beides gemischt ist kein Problem.

---

## 10. Zusammenfassung: Der Workflow

```
┌─────────────────────────────────────────────────────┐
│  1. Offener Start + Bilder  -->  KI stellt Fragen   │
│  2. Zwei Fragerunden  -->  Eckdaten + Details        │
│  3. Plan anfordern  -->  Pruefen  -->  Freigeben     │
│  4. Kleine Aenderungen  -->  Screenshot pruefen      │
│  5. Rueckfrage zur Mechanik  -->  Probleme finden    │
│  6. Korrigieren / Optionen waehlen                   │
│  7. Druckbarkeit pruefen                             │
│  8. Verfeinern  -->  Export                          │
└─────────────────────────────────────────────────────┘
```

**Kernprinzip:** Nie alles auf einmal. Immer ein Schritt, pruefen, naechster Schritt.
