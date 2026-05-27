# 🚀 Increment 2 — Sprint-Checkliste

> [!callout] 🚀 **Sprint-Board des nächsten Increments**
> 

> Operatives Arbeitsdokument für den Increment-2-Sprint. Die inhaltliche Herleitung und Priorisierung steht im Master-Dokument (Sektion 4.5), die Erfolgsmetriken in Sektion 5.4. Diese Seite ist die Umsetzungs-Checkliste — Aufgabe für Aufgabe abhakbar.
> 

## Überblick

| Feld | Wert |
| --- | --- |
| **Sprint** | Increment 2 |
| **Geschätzter Aufwand** | ~1 Arbeitstag (bewusst eng geschnitten) |
| **Inhalt** | 1 Bugfix + 3 Push-Benachrichtigungen |
| **Quelle** | Research (Thema 4), Live-Beobachtung (Thema 6), HMW 4, gesammelte User Stories |
| **Status** | ⬜ Geplant |

> [!callout] ⚠️ **Erst entscheiden, bevor der Code beginnt**
> 

> Die größte Aufwandsfrage: **echtes Web-Push vs. In-App-Benachrichtigung.** Echtes Push (Service Worker + Berechtigungen + Versand-Backend) sprengt einen Ein-Tages-Sprint leicht. In-App (Glocke mit Badge) ist an einem Tag realistisch. Empfehlung: für Increment 2 **In-App**, echtes Push als Backlog-Eintrag — außer der PWA-Service-Worker ist bereits push-bereit. **Diese Entscheidung zuerst treffen.**
> 

---

## Block A — Bugfix: abgelehnte Inserate

*Abgelehnte Inserate verschwinden korrekt aus der Moderations-Warteschlange; das Badge wird konsistent aktualisiert. Betrifft Epic 4 (Admin-Moderation). Severity S2.*

- [ ]  Beim Ablehnen wechselt der Inserat-Status definitiv weg von „in Prüfung“ (korrekter Status im Datenmodell, vgl. Master-Dokument 5.2.1)
- [ ]  Die Query der Pending-Liste filtert so, dass abgelehnte Inserate nicht mehr erscheinen
- [ ]  Entscheidung umgesetzt: abgelehnte Inserate verschwinden ganz **oder** wandern in eine sichtbare „Abgelehnt“-Liste (eine Variante genügt)
- [ ]  Das Badge / der Zähler offener Fälle wird beim Ablehnen neu berechnet und sinkt
- [ ]  Prüfen: liest das Badge dieselbe Quelle wie die Liste, oder eine separate Query, die invalidiert werden muss?
- [ ]  Regressionscheck: der `rejection_reason` bleibt für den Inserat-Eigentümer weiterhin sichtbar

> [!callout] ✅ **Fertig, wenn:** ein Test-Inserat abgelehnt wird → es verschwindet aus der Pending-Liste → das Badge sinkt um 1 → der Eigentümer sieht weiterhin den Ablehnungsgrund.
> 

---

## Block B — Benachrichtigung: neue Chat-Nachricht (→ Bewohner)

*Zweck: Retention — ein konkreter Anlass zurückzukehren. Wirkt auf HMW 4 und das Engagement.*

- [ ]  Bei einer neuen Nachricht in einem Chat wird der **Empfänger** benachrichtigt
- [ ]  Der **Absender** wird nicht selbst benachrichtigt
- [ ]  Keine Benachrichtigung bei Nachrichten von blockierten Nutzern (Logik der `blocks`-Tabelle respektieren)
- [ ]  Notification-Datensatz wird korrekt geschrieben (Typ, Empfänger, gelesen/ungelesen, Referenz auf den Chat)

> [!callout] ✅ **Fertig, wenn:** Nutzer B schreibt → Nutzer A wird benachrichtigt → A bekommt keine Selbst-Benachrichtigung → ein blockierter Absender löst nichts aus.
> 

---

## Block C — Benachrichtigung: neues Inserat (→ Bewohner)

*Zweck: Belebtheit — der Marktplatz wirkt spürbar aktiv. Wirkt direkt auf HMW 4.*

- [ ]  Auslöser ist der Übergang eines Inserats auf Status **„live“** (nach Admin-Freigabe) — **nicht** das bloße Erstellen in „in Prüfung“
- [ ]  Der **Autor** des Inserats wird nicht über sein eigenes Inserat benachrichtigt
- [ ]  Scope-Entscheidung getroffen und umgesetzt: Benachrichtigung an **alle** Bewohner (realistisch für 1 Tag) — ggf. eine **aggregierte** Benachrichtigung statt einer pro Inserat, um Lärm zu vermeiden
- [ ]  Notification-Datensatz korrekt geschrieben

> [!callout] ✅ **Fertig, wenn:** ein Inserat wird freigegeben und live → die übrigen Bewohner werden benachrichtigt → der Autor nicht.
> 

---

## Block D — Benachrichtigung: ausstehende Freigabe (→ Admin)

*Zweck: operative Gesundheit — kürzere Bearbeitungszeit, der Admin wird nicht zum Engpass.*

- [ ]  Bei einer neuen Nutzer-Registrierung (`is_approved = false`) wird der Admin benachrichtigt
- [ ]  Bei einem neuen Inserat (Status „in Prüfung“) wird der Admin benachrichtigt
- [ ]  Entscheidung getroffen: Koexistenz mit der bestehenden Admin-E-Mail (Epic 4) **oder** Ersatz
- [ ]  Optional, nur bei geringem Aufwand: spezifischeres Admin-Badge, das „X Nutzer ausstehend“ von „Y Inserate ausstehend“ unterscheidet — sonst Backlog

> [!callout] ✅ **Fertig, wenn:** ein neuer Nutzer registriert sich oder ein Inserat wird hochgeladen → der Admin wird benachrichtigt → das Badge zeigt den richtigen Typ.
> 

---

## Querschnitt-Prüfung — vor Sprint-Abschluss

- [ ]  **Berechtigungen:** Benachrichtigungen leaken nichts, was der Nutzer nicht ohnehin sehen dürfte (Schichten-Sicherheitsmodell, Master-Dokument 5.2.3)
- [ ]  **Bei Web-Push:** Berechtigungs-Abfrage (Consent-Flow) sauber umgesetzt — berührt DSGVO (5.3)
- [ ]  **Notification-Tabelle:** Schema unterstützt alle 3 Typen (Feld `type`, Empfänger, gelesen/ungelesen, Objekt-Referenz)
- [ ]  **Metrik-Tracking prüfen:** das Dashboard kann WAU, Stickiness, neue Inserate/Woche und Bearbeitungszeit lesen — falls eine Kennzahl noch nicht erfasst wird, gehört dieses Tracking in den Sprint, sonst ist Increment 2 nicht messbar

---

## Erfolgsmetriken (vor der Umsetzung definiert)

*Gemessen über das bestehende Analytics-Dashboard — keine neuen Tools. Vollständig in Master-Dokument Sektion 5.4.2.*

| Benachrichtigung | Erwartete Wirkung | Gemessen an |
| --- | --- | --- |
| Neue Chat-Nachricht | Häufigere Rückkehr, weniger versandete Chats | WAU, Stickiness, Ø Nachrichten/Chat |
| Neues Inserat | Marktplatz wirkt belebter, mehr Uploads | Neue Inserate/Woche, aktive Inserate |
| Ausstehende Freigabe | Schnellere Admin-Reaktion | Bearbeitungszeit (Median Stunden) |

> [!callout] 📝 **Nach dem Sprint auszufüllen**
> 

> Tatsächlicher Aufwand vs. Schätzung · Vorher/Nachher-Screenshots pro Änderung · Vorher/Nachher-Werte pro Metrik. Ergebnisse fließen zurück in Master-Dokument Sektion 5.4.1. Auch ein Nullergebnis ist ein gültiges Ergebnis und wird ehrlich dokumentiert.
>