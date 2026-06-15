# -*- coding: utf-8 -*-
"""Rysunek ZESTAWIENIOWY przekladni z balonikami i tabela BOM (z modelu STEP)."""
import numpy as np, json
import matplotlib.pyplot as plt
from matplotlib.patches import Circle
import draw_lib as D
from draw_lib import Sheet, note, arrow

DATE = "15.06.2026"
edges_per = np.load('/tmp/asm_edges.npy', allow_pickle=True)
tags = list(np.load('/tmp/asm_tags.npy'))
info = json.load(open('/tmp/asm_info.json'))
ALL = [e for ev in edges_per for e in ev]

# skala i polozenie widoku
S = 0.46
VCX, VCZ = 128, 150            # srodek widoku na papierze
ZMID = 116.5                   # srodek modelu w Z


def PX(x, z):
    return (VCX + x * S, VCZ + (z - ZMID) * S)


# BOM: (poz, nazwa, ilosc, material/norma, balon_papier(x,y), cel_model(x,z))
BOM = [
    (1, "Podstawa obudowy", 1, "Żeliwo EN-GJL-200", (35, 95), (-120, 18)),
    (2, "Pokrywa górna obudowy", 1, "Żeliwo EN-GJL-200", (95, 232), (0, 222)),
    (3, "Ściana czołowa (przód/tył)", 2, "Żeliwo EN-GJL-200", (35, 215), (-150, 200)),
    (4, "Ściana boczna", 2, "Żeliwo EN-GJL-200", (222, 200), (168, 180)),
    (5, "Wałek 1 (zębnik)", 1, "Stal C45", (35, 150), (-110, 124)),
    (6, "Wałek 2", 1, "Stal C45", (222, 150), (95, 124)),
    (7, "Koło zębate z=26, m=4", 1, "Stal C45", (35, 178), (-74, 158)),
    (8, "Koło zębate z=37, m=4", 1, "Stal C45", (222, 178), (52, 165)),
    (9, "Wpust 16x10x120 (PN-70/M-85005)", 1, "Stal C45", (35, 122), (-74, 140)),
    (10, "Wpust 16x10x115 (PN-70/M-85005)", 1, "Stal C45", (222, 122), (52, 142)),
    (11, "Łożysko kulkowe wałka 1", 2, "znormalizowane", (60, 232), (-95, 145)),
    (12, "Łożysko kulkowe wałka 2", 2, "znormalizowane", (165, 232), (78, 145)),
    (13, "Pierścień/pokrywa łożyska", 8, "Stal", (130, 232), (-50, 138)),
    (14, "Tuleja dystansowa", 4, "Stal", (200, 232), (30, 138)),
    (15, "Śruba M5 (DIN 912)", 21, "Stal 8.8", (35, 65), (-168, 36)),
    (16, "Uszczelka / podkładka", 2, "—", (222, 95), (140, 60)),
]


def build():
    sh = Sheet(part_title="PRZEKŁADNIA — RYSUNEK ZESTAWIENIOWY", sheet="1/9",
               date=DATE, dwg_no="ZEST-00", scale="1:2", material="—")
    # --- widok glowny: rzut przedni (X-Z) ---
    for e in ALL:
        sh.ax.plot(VCX + e[:, 0] * S, VCZ + (e[:, 2] - ZMID) * S,
                   lw=0.28, color='k')
    note(sh, VCX, VCZ + (233 - ZMID) * S + 16, "RZUT GŁÓWNY (1:2)", fs=11, ha="center")

    # --- baloniki ---
    for poz, nazwa, il, mat, (bx, by), (tx, tz) in BOM:
        px, pz = PX(tx, tz)
        sh.ax.plot([bx, px], [by, pz], lw=0.4, color='k')
        sh.ax.plot([px], [pz], 'ko', ms=2.5)
        sh.ax.add_patch(Circle((bx, by), 4.6, fill=True, fc='white', ec='k', lw=1.0, zorder=5))
        sh.ax.text(bx, by, str(poz), ha='center', va='center', fontsize=9,
                   fontweight='bold', zorder=6)

    # --- tabela BOM (prawa strona) ---
    bom_table(sh)

    # --- symbol rzutowania europejskiego + nota ---
    proj_symbol(sh, 150, 60)
    note(sh, 150, 48, "Rzutowanie: metoda europejska (ISO-A, 1-szy kąt)", fs=8, ha="center")
    note(sh, 25, 270, "Model: PRZEKLADNIA.step — geometria 1:1", fs=8, ha="left")

    sh.fig.savefig('/home/user/claude/rysunki/00_zestawieniowy.pdf')
    sh.fig.savefig('/home/user/claude/rysunki/p_asm.png', dpi=120)
    print("OK zestawieniowy")


def bom_table(sh):
    ax = sh.ax
    x0, y_top = 230, 248
    w = 180
    rh = 9
    cols = [0, 14, 116, 134, 180]     # Poz | Nazwa | Il | Material
    headers = ["Poz.", "Nazwa części", "Il.", "Materiał / Norma"]
    n = len(BOM)
    y = y_top
    # naglowek
    ax.add_patch(plt.Rectangle((x0, y), w, rh, fill=True, fc='0.9', ec='k', lw=0.6))
    for i, h in enumerate(headers):
        ax.text(x0 + cols[i] + 2, y + rh / 2, h, fontsize=7, va='center', fontweight='bold')
    # wiersze (od gory w dol: poz 16 na gorze? standard BOM rosnaco od dolu, ale dam rosnaco od gory)
    for k, (poz, nazwa, il, mat, *_ ) in enumerate(BOM):
        ry = y - (k + 1) * rh
        ax.add_patch(plt.Rectangle((x0, ry), w, rh, fill=False, ec='k', lw=0.5))
        ax.text(x0 + cols[0] + 3, ry + rh / 2, str(poz), fontsize=7, va='center', ha='left')
        ax.text(x0 + cols[1] + 2, ry + rh / 2, nazwa, fontsize=6.5, va='center')
        ax.text(x0 + cols[2] + 6, ry + rh / 2, str(il), fontsize=7, va='center', ha='center')
        ax.text(x0 + cols[3] + 2, ry + rh / 2, mat, fontsize=6, va='center')
    # pionowe linie kolumn przez cala tabele
    H = rh * (n + 1)
    for c in cols:
        ax.plot([x0 + c, x0 + c], [y_top - H + rh, y_top + rh], lw=0.6, color='k')
    ax.plot([x0 + w, x0 + w], [y_top - H + rh, y_top + rh], lw=0.6, color='k')
    ax.text(x0, y_top + rh + 3, "WYKAZ CZĘŚCI (BOM)", fontsize=9, fontweight='bold', va='bottom')


def proj_symbol(sh, cx, cy):
    ax = sh.ax
    # uproszczony symbol 1-szego kata (stozek): dwa okregi + trapez
    ax.add_patch(Circle((cx - 10, cy), 4, fill=False, ec='k', lw=0.6))
    ax.add_patch(Circle((cx - 10, cy), 2, fill=False, ec='k', lw=0.6))
    ax.plot([cx + 2, cx + 14, cx + 14, cx + 2, cx + 2],
            [cy - 4, cy - 2.2, cy + 2.2, cy + 4, cy - 4], lw=0.6, color='k')
    ax.plot([cx + 2, cx + 14], [cy, cy], lw=0.4, color='k', ls=(0, (4, 2)))


if __name__ == "__main__":
    build()
