# -*- coding: utf-8 -*-
"""Dokladne rysunki wykonawcze z geometrii STEP (PRZEKLADNIA.step)."""
import numpy as np, json
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages
import draw_lib as D
from draw_lib import Sheet, dim_h, dim_v, leader, note, arrow

DATE = "15.06.2026"
META = json.load(open('/tmp/parts_meta.json'))


def load(name):
    return np.load(f'/tmp/part_{name}.npy', allow_pickle=True), META[name]


def project(edges, ah, av, sh=1, sv=1):
    return [np.column_stack([sh * e[:, ah], sv * e[:, av]]) for e in edges]


def draw_view(sheet, polys, ox, oy, s, lw=0.5):
    for p in polys:
        sheet.ax.plot(ox + p[:, 0] * s, oy + p[:, 1] * s, lw=lw, color='k',
                      solid_capstyle='round')


def extent(polys):
    a = np.vstack(polys)
    return a.min(0), a.max(0)


def holes_on_axis(circles, axis, ah, av):
    """grupuj okregi o danej osi -> {(u,v): [srednice]}; u,v wsp. w plaszczyznie widoku."""
    idx = {'X': 0, 'Y': 1, 'Z': 2}
    g = {}
    for ax, dia, c in circles:
        if ax != axis:
            continue
        u = round(c[ah], 1); v = round(c[av], 1)
        g.setdefault((u, v), []).append(round(dia, 2))
    return g


def center_marks(sheet, holes, ox, oy, s):
    for (u, v), dias in holes.items():
        r = max(dias) / 2 * s
        sheet.center_cross((ox + u * s, oy + v * s), max(r, 3))


def page_plate(name, title, dwg, ah, av, tax, scale, mc, material,
               face_label="WIDOK Z GÓRY", side_label="WIDOK Z PRZODU",
               side='below', hole_call=None, sheet_no="x"):
    """Rysunek plyty: widok czolowy (osie ah,av) + widok grubosci (os tax)."""
    edges, m = load(name)
    bb = m['bbox']
    sz = [bb[3] - bb[0], bb[4] - bb[1], bb[5] - bb[2]]
    s = scale
    sh = Sheet(part_title=title, sheet=f"{sheet_no}", date=DATE, dwg_no=dwg,
               scale=f"1:{round(1/s)}" if s < 1 else f"{round(s)}:1", material=material)
    # --- widok czolowy ---
    P = project(edges, ah, av)
    mn, mx = extent(P)
    cx, cy = mc
    ox = cx - (mn[0] + mx[0]) / 2 * s
    oy = cy - (mn[1] + mx[1]) / 2 * s
    draw_view(sh, P, ox, oy, s)
    holes = holes_on_axis(m['circles'], tax_name(tax), ah, av)
    center_marks(sh, holes, ox, oy, s)
    x0 = ox + mn[0] * s; x1 = ox + mx[0] * s
    y0 = oy + mn[1] * s; y1 = oy + mx[1] * s
    note(sh, cx, y1 + 20, f"{face_label} (1:{round(1/s)})", fs=10, ha="center")
    dim_h(sh, x0, x1, y1, y1 + 8, f"{sz[ah]:.0f}")
    dim_v(sh, y0, y1, x0, x0 - 12, f"{sz[av]:.0f}")
    # --- otwory: grupuj wg sygnatury srednic ---
    from collections import defaultdict
    sigs = defaultdict(list)
    bores = []
    for (u, v), dias in holes.items():
        uniq = tuple(sorted(set(round(d, 1) for d in dias)))
        if max(uniq) > 30:                      # gniazdo lozyska (duza srednica)
            bores.append((u, v, max(uniq)))
        else:
            sigs[uniq].append((u, v))
    # otwory srubowe - jeden leader na sygnature, na roznych wysokosciach
    lev = 0
    for uniq, pts in sorted(sigs.items()):
        n = len(pts)
        if len(uniq) == 1:
            txt = f"{n}x Ø{uniq[0]:g}"
        else:
            txt = f"{n}x Ø{uniq[0]:g}  pogł. Ø{uniq[-1]:g}"
        ku, kv = max(pts, key=lambda p: (p[1], p[0]))
        leader(sh, (ox + ku * s, oy + kv * s), (x1 + 16, y1 - lev * 9 + 2), txt, ha="left")
        lev += 1
    # gniazda lozysk - srednice H7 + rozstaw osi
    for (u, v, d) in bores:
        leader(sh, (ox + u * s + d / 2 * s * 0.7, oy + v * s + d / 2 * s * 0.7),
               (x1 + 16, y1 - lev * 9 + 2), f"Ø{d:g} H7", ha="left")
        lev += 1
    if len(bores) == 2:
        b = sorted(bores)
        if abs(b[0][1] - b[1][1]) < abs(b[0][0] - b[1][0]):
            dim_h(sh, ox + b[0][0] * s, ox + b[1][0] * s, oy + max(b[0][1], b[1][1]) * s,
                  y1 - 6, f"{abs(b[1][0]-b[0][0]):.0f}")
        else:
            dim_v(sh, oy + b[0][1] * s, oy + b[1][1] * s, ox + b[0][0] * s, x0 - 26,
                  f"{abs(b[1][1]-b[0][1]):.0f}")
    # rozstawy skrajnych otworow srubowych
    if sigs:
        allp = [p for pts in sigs.values() for p in pts]
        us = sorted(set(u for u, v in allp)); vs = sorted(set(v for u, v in allp))
        if len(us) > 1:
            dim_h(sh, ox + us[0] * s, ox + us[-1] * s, y0, y0 - 10, f"{us[-1]-us[0]:.0f}")
        if len(vs) > 1:
            dim_v(sh, oy + vs[0] * s, oy + vs[-1] * s, x0, x0 - 26, f"{vs[-1]-vs[0]:.0f}")
    # --- widok grubosci ---
    Pt = project(edges, tax, av) if side == 'right' else project(edges, ah, tax)
    mnt, mxt = extent(Pt)
    if side == 'right':
        sox = x1 + 70 - mnt[0] * s; soy = oy
        draw_view(sh, Pt, sox, soy, s)
        note(sh, sox + (mnt[0] + mxt[0]) / 2 * s, oy + mx[1] * s + 14,
             f"{side_label} (1:{round(1/s)})", fs=10, ha="center")
        tx0 = sox + mnt[0] * s; tx1 = sox + mxt[0] * s
        dim_h(sh, tx0, tx1, soy + mxt[1] * s, soy + mxt[1] * s + 8, f"{sz[tax]:.0f}")
    else:
        soy = 95; sox = ox
        draw_view(sh, Pt, sox, soy - (mnt[1] + mxt[1]) / 2 * s + 0, s)
        oy2 = soy - (mnt[1] + mxt[1]) / 2 * s
        note(sh, cx, oy2 + mnt[1] * s - 12, f"{side_label} (1:{round(1/s)})", fs=10, ha="center")
        ty0 = oy2 + mnt[1] * s; ty1 = oy2 + mxt[1] * s
        dim_v(sh, ty0, ty1, ox + mxt[0] * s + 12, ox + mxt[0] * s + 12, f"{sz[tax]:.0f}")
    note(sh, 25, 42, f"Geometria 1:1 z modelu STEP (PRZEKLADNIA.step) — bryła vol.{ {'podstawa':1,'sciana_przednia':3,'sciana_boczna':4,'pokrywa':8}.get(name,'?')}", fs=7, ha="left")
    return sh


def tax_name(ax):
    return 'XYZ'[ax]


def page_shaft(name, title, dwg, scale, sheet_no, material="Stal C45"):
    """Walek: os Y poziomo, srednica pionowo (X). Srednice z okregow osi Y."""
    edges, m = load(name)
    bb = m['bbox']; s = scale
    sh = Sheet(part_title=title, sheet=sheet_no, date=DATE, dwg_no=dwg,
               scale=f"1:{round(1/s)}" if s < 1 else f"{round(s)}:1", material=material)
    P = project(edges, 1, 0)               # Y->poziom, X->pion
    mn, mx = extent(P)
    cx, cy = 215, 200
    ox = cx - (mn[0] + mx[0]) / 2 * s
    oy = cy - (mn[1] + mx[1]) / 2 * s
    draw_view(sh, P, ox, oy, s)
    x0 = ox + mn[0] * s; x1 = ox + mx[0] * s
    y0 = oy + mn[1] * s; y1 = oy + mx[1] * s
    Lcalk = bb[4] - bb[1]                   # dlugosc (os Y)
    note(sh, cx, y1 + 30, f"{title}", fs=10, ha="center")
    dim_h(sh, x0, x1, y0, y0 - 14, f"{Lcalk:.0f}", tol="±0,2")
    # srednice: okregi osi Y -> (Ypos, dia)
    from collections import defaultdict
    seen = {}
    for ax, d, c in m['circles']:
        if ax != 'Y':
            continue
        key = round(d, 0)
        seen.setdefault(key, c[1])          # Ypos dla tej srednicy
    # etykiety srednic na roznych wysokosciach
    dias = sorted(seen, reverse=True)
    lev = 0
    for d in dias:
        yp = seen[d]
        xp = ox + (yp - bb[1]) * s + mn[0] * s   # przelicz Y model -> poziom papier
        xp = ox + yp * s
        leader(sh, (xp, cy), (xp, y1 + 6 + lev * 7), f"Ø{d:g}", ha="left")
        lev = (lev + 1) % 3
    note(sh, 40, 250, "Ra 0,8 (powierzchnie pasowane)   |   Geometria 1:1 z STEP", fs=8, ha="left")
    note(sh, x1 + 6, cy, "2x45°", fs=8, ha="left")
    return sh


def page_gear(name, title, dwg, scale, sheet_no, module, teeth, material="Stal C45"):
    edges, m = load(name)
    bb = m['bbox']; s = scale
    sh = Sheet(part_title=title, sheet=sheet_no, date=DATE, dwg_no=dwg,
               scale=f"1:{round(1/s)}" if s < 1 else f"{round(s)}:1", material=material)
    # widok czolowy: X-Z (kolo z zebami)
    Pf = project(edges, 0, 2)
    mn, mx = extent(Pf)
    cx, cy = 130, 200
    ox = cx - (mn[0] + mx[0]) / 2 * s; oy = cy - (mn[1] + mx[1]) / 2 * s
    draw_view(sh, Pf, ox, oy, s)
    sh.center_cross((cx, cy), (mx[0] - mn[0]) / 2 * s * 1.05)
    Do = max(bb[3] - bb[0], bb[5] - bb[2])
    note(sh, cx, oy + mx[1] * s + 14, f"WIDOK CZOŁOWY (1:{round(1/s)})", fs=10, ha="center")
    leader(sh, (cx + Do / 2 * s * 0.7, cy + Do / 2 * s * 0.7),
           (cx + Do / 2 * s + 16, cy + Do / 2 * s + 10), f"Ø{Do:.0f} (wierzch.)", ha="left")
    # widok z boku (przekroj): czysty prostokat szer. W x Ø wierzcholkowa, otwor + linia podzialowa
    W = bb[4] - bb[1]
    Dp = module * teeth                    # srednica podzialowa
    bore = 55                              # otwor pod walek 2 (dw2)
    sx, sy = 330, 200
    hw = W / 2 * s; hd = Do / 2 * s; hp = Dp / 2 * s; hb = bore / 2 * s
    # prostokat zewnetrzny (zarys)
    sh.ax.add_patch(plt.Rectangle((sx - hw, sy - hd), 2 * hw, 2 * hd, fill=False, lw=D.LW_VISIBLE, ec='k'))
    # linie srednicy podzialowej (kreska-kropka)
    sh.line((sx - hw, sy + hp), (sx + hw, sy + hp), lw=D.LW_CENTER, ls=(0, (10, 3, 2, 3)))
    sh.line((sx - hw, sy - hp), (sx + hw, sy - hp), lw=D.LW_CENTER, ls=(0, (10, 3, 2, 3)))
    # otwor (linie wewnetrzne) + os
    sh.line((sx - hw, sy + hb), (sx + hw, sy + hb))
    sh.line((sx - hw, sy - hb), (sx + hw, sy - hb))
    sh.centerline((sx - hw - 6, sy), (sx + hw + 6, sy))
    note(sh, sx, sy + hd + 14, f"WIDOK Z BOKU (1:{round(1/s)})", fs=10, ha="center")
    dim_h(sh, sx - hw, sx + hw, sy + hd, sy + hd + 8, f"{W:.0f}")
    dim_v(sh, sy - hd, sy + hd, sx + hw, sx + hw + 12, f"Ø{Do:.0f}")
    dim_v(sh, sy - hb, sy + hb, sx - hw, sx - hw - 12, f"Ø{bore:g} H7")
    note(sh, 40, 70, f"Koło zębate walcowe: moduł m={module}, liczba zębów z={teeth}, "
                     f"kąt przyporu 20°, Ø podziałowa = {module*teeth}, Ø wierzch. = {Do:.0f}", fs=9, ha="left")
    note(sh, 40, 60, "Geometria 1:1 z modelu STEP", fs=8, ha="left")
    return sh


def page_key(name, title, dwg, scale, sheet_no, material="Stal C45"):
    edges, m = load(name); bb = m['bbox']; s = scale
    sh = Sheet(part_title=title, sheet=sheet_no, date=DATE, dwg_no=dwg,
               scale=f"{round(s)}:1", material=material)
    L = bb[4] - bb[1]; b = bb[3] - bb[0]; h = bb[5] - bb[2]
    # widok z gory: Y-X
    Pt = project(edges, 1, 0); mn, mx = extent(Pt)
    cx, cy = 200, 215
    ox = cx - (mn[0] + mx[0]) / 2 * s; oy = cy - (mn[1] + mx[1]) / 2 * s
    draw_view(sh, Pt, ox, oy, s)
    note(sh, cx, oy + mx[1] * s + 12, "WIDOK Z GÓRY", fs=10, ha="center")
    dim_h(sh, ox + mn[0] * s, ox + mx[0] * s, oy + mn[1] * s, oy + mn[1] * s - 14, f"{L:.0f}", tol=("0", "-0,2"))
    dim_v(sh, oy + mn[1] * s, oy + mx[1] * s, ox + mx[0] * s, ox + mx[0] * s + 14, f"{b:.0f}", tol=("0", "-0,043"))
    # widok z przodu: Y-Z
    Pf = project(edges, 1, 2); mnf, mxf = extent(Pf)
    fy = 150
    fox = ox; foy = fy - (mnf[1] + mxf[1]) / 2 * s
    draw_view(sh, Pf, fox, foy, s)
    note(sh, cx, foy + mnf[1] * s - 14, "WIDOK Z PRZODU", fs=10, ha="center")
    dim_v(sh, foy + mnf[1] * s, foy + mxf[1] * s, fox + mnf[0] * s, fox + mnf[0] * s - 14, f"{h:.0f}", tol=("0", "-0,090"))
    note(sh, 40, 70, "Wpust pryzmatyczny wg PN-70/M-85005 (DIN 6885)   |   Geometria 1:1 z STEP", fs=9, ha="left")
    return sh


def build():
    pages = []
    pages.append(page_shaft('walek1', "WAŁEK 1 (zębnika)", "WAL-01", 1/1.5, "2/9"))
    pages.append(page_shaft('walek2', "WAŁEK 2 (koła)", "WAL-02", 1/1.5, "3/9"))
    pages.append(page_plate('sciana_przednia', "ŚCIANA PRZEDNIA OBUDOWY", "SCP-03",
                            0, 2, 1, 0.5, (135, 195), "Żeliwo EN-GJL-200",
                            face_label="WIDOK Z PRZODU", side_label="WIDOK Z BOKU",
                            side='right', sheet_no="4/9"))
    pages.append(page_plate('sciana_boczna', "ŚCIANA BOCZNA OBUDOWY", "SCB-04",
                            1, 2, 0, 0.6, (135, 195), "Żeliwo EN-GJL-200",
                            face_label="WIDOK Z BOKU", side_label="WIDOK Z PRZODU",
                            side='right', sheet_no="5/9"))
    pages.append(page_plate('podstawa', "PODSTAWA OBUDOWY", "POD-05",
                            0, 1, 2, 0.5, (140, 200), "Żeliwo EN-GJL-200",
                            face_label="WIDOK Z GÓRY", side_label="WIDOK Z PRZODU",
                            side='below', sheet_no="6/9"))
    pages.append(page_plate('pokrywa', "GÓRNA CZĘŚĆ OBUDOWY (pokrywa)", "GOR-06",
                            0, 1, 2, 0.5, (140, 200), "Żeliwo EN-GJL-200",
                            face_label="WIDOK Z GÓRY", side_label="WIDOK Z PRZODU",
                            side='below', sheet_no="7/9"))
    pages.append(page_gear('zebatka2', "KOŁO ZĘBATE 2 (z=37)", "KZ-07", 0.7, "8/9", 4, 37))
    pages.append(page_key('klin', "WPUST 16x10 (PN-70/M-85005)", "WPU-08", 2.2, "9/9"))

    base = "/home/user/claude/rysunki/"
    fnames = ["01_walek1.pdf", "02_walek2.pdf", "03_sciana_przednia.pdf",
              "04_sciana_boczna.pdf", "05_podstawa.pdf", "06_pokrywa.pdf",
              "07_zebatka2.pdf", "08_klin.pdf"]
    with PdfPages(base + "przekladnia_DOKLADNE.pdf") as pdf:
        for sh in pages:
            pdf.savefig(sh.fig)
    for sh, fn in zip(pages, fnames):
        sh.fig.savefig(base + fn)
    for i, sh in enumerate(pages, 1):
        sh.fig.savefig(base + f"p_{i}.png", dpi=110)
    print("OK - 8 rysunkow")


if __name__ == "__main__":
    build()
