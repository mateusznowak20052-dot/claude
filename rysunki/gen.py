# -*- coding: utf-8 -*-
"""Generuje 5-stronicowy PDF z rysunkami wykonawczymi czesci przekladni."""
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages
import draw_lib as D
from draw_lib import Sheet, dim_h, dim_v, leader, note, dim_dia, arrow
from parts import draw_shaft, section_circle, P

DATE = "15.06.2026"


# ----------------------------------------------------------------
def page_walek(idx, segments, total_len, dias, keyway_seg, keyway_len,
               gear_dia_label, brg_label, title, fname_dims):
    """Rysunek walka stopniowanego."""
    sh = Sheet(part_title=title, sheet=f"{idx}/5", date=DATE, dwg_no=f"WAL-{idx:02d}",
               scale="1:1.5", material="Stal C45 / 45")
    s = 1 / 1.5                      # skala 1:1.5
    cy = 205
    cx = 70
    bounds, radii, xend = draw_shaft(sh, segments, cx, cy, s,
                                     chamfers=(2, 2))
    # rowek wpustowy na stopniu kola (segment keyway_seg, 0-based)
    kstart = sum(L for L, d in segments[:keyway_seg])
    seg_len = segments[keyway_seg][0]
    koff = (seg_len - keyway_len) / 2
    kw = P["b_klin"]
    draw_shaft.__doc__  # noop
    # narysuj rowek recznie na widoku
    x0 = cx + (kstart + koff) * s
    x1 = x0 + keyway_len * s
    rseg = segments[keyway_seg][1] / 2 * s
    hw = kw / 2 * s
    sh.line((x0 + hw, cy + hw), (x1 - hw, cy + hw))
    sh.line((x0 + hw, cy - hw), (x1 - hw, cy - hw))
    sh.ax.add_patch(D.Arc((x0 + hw, cy), kw * s, kw * s, theta1=90, theta2=270,
                          lw=D.LW_VISIBLE, ec="k"))
    sh.ax.add_patch(D.Arc((x1 - hw, cy), kw * s, kw * s, theta1=-90, theta2=90,
                          lw=D.LW_VISIBLE, ec="k"))

    # ---- WYMIARY ----
    rmax = max(radii)
    ytop = cy + rmax
    ybot = cy - rmax
    # dlugosci segmentow (lancuch na dole)
    ylev = ybot - 26
    xb = cx
    for i, (L, d) in enumerate(segments):
        dim_h(sh, xb, xb + L * s, ybot, ylev, f"{L:g}")
        xb += L * s
    # calkowita dlugosc
    dim_h(sh, cx, xend, ybot, ybot - 42, f"{total_len:g}", tol="±0,2")
    # srednice - linie odniesienia u gory, na roznych wysokosciach wg wartosci
    fit = {dias[0]: "h6", dias[1]: "k6", dias[2]: "k6"}   # pasowania
    hlev = {dias[0]: 18, dias[1]: 34, dias[2]: 50}
    xb = cx
    placed = []
    for i, (L, d) in enumerate(segments):
        xm = xb + L * s / 2
        r = d / 2 * s
        if d not in placed:
            leader(sh, (xm, cy + r), (xm, cy + rmax + hlev[d]),
                   f"Ø{d:g} {fit.get(d,'')}", ha="left")
            placed.append(d)
        xb += L * s
    # rowek wpustowy wymiary (dlugosc rowka)
    dim_h(sh, x0, x1, cy - hw, cy - rmax - 12, f"{keyway_len:g}")
    # fazy
    note(sh, xend + 5, cy + rmax + 3, "2x45°", fs=8, ha="left")
    note(sh, cx - 22, cy + rmax + 3, "2x45°", fs=8, ha="left")
    # chropowatosc ogolna
    note(sh, 295, cy + rmax + 52, "Ra 0,8  (powierzchnie pasowane)", fs=9, ha="left")

    # ---- PRZEKROJ A-A (przez stopien kola) ----
    scx, scy = 130, 100
    ssc = 1.0
    gear_d = segments[keyway_seg][1]
    section_circle(sh, scx, scy, gear_d, ssc, keyway_w=kw, keyway_t=P["t1"])
    note(sh, scx, scy + gear_d / 2 * ssc + 10, "A-A  (1:1)", fs=11, ha="center")
    # wymiar srednicy w przekroju
    dim_dia(sh, scx, scy, gear_d / 2 * ssc, -40, f"{gear_d:g}", tol=("+0,03", "0"))
    # rowek 16 i glebokosc rowka (t = d/2 + t1 wg PN)
    dim_h(sh, scx - kw / 2 * ssc, scx + kw / 2 * ssc, scy + gear_d / 2 * ssc,
          scy + gear_d / 2 * ssc + 16, f"{kw:g}", tol=("+0,02", "0"))
    t_naddna = gear_d / 2 + P["t1"]
    leader(sh, (scx + kw / 2 * ssc, scy + gear_d / 2 * ssc - P["t1"] * ssc),
           (scx + gear_d / 2 * ssc + 14, scy - 6),
           f"Rowek wpustowy {kw:g}  gl. t1={P['t1']:g}", ha="left")
    note(sh, scx - 70, scy - 30, "Wpust wg PN-70/M-85005", fs=8, ha="left")

    return sh


# ----------------------------------------------------------------
def page_klin(idx):
    """Wpust pryzmatyczny (klin) 16x10 wg PN-70/M-85005, forma A (zaokraglony)."""
    title = "WPUST 16x10  (PN-70/M-85005)"
    sh = Sheet(part_title=title, sheet=f"{idx}/5", date=DATE, dwg_no=f"WPU-{idx:02d}",
               scale="2,5:1", material="Stal C45")
    b, h, L = P["b_klin"], P["h_klin"], 50.0
    s = 2.5                                # skala 2,5:1
    # WIDOK Z GORY (b x L, konce zaokraglone R=b/2)
    cx, cy = 150, 210
    x0 = cx - L / 2 * s
    x1 = cx + L / 2 * s
    r = b / 2 * s
    sh.line((x0 + r, cy + r), (x1 - r, cy + r))
    sh.line((x0 + r, cy - r), (x1 - r, cy - r))
    sh.ax.add_patch(D.Arc((x0 + r, cy), b * s, b * s, theta1=90, theta2=270,
                          lw=D.LW_VISIBLE, ec="k"))
    sh.ax.add_patch(D.Arc((x1 - r, cy), b * s, b * s, theta1=-90, theta2=90,
                          lw=D.LW_VISIBLE, ec="k"))
    sh.centerline((x0 - 6, cy), (x1 + 6, cy))
    sh.centerline((cx, cy - r - 6), (cx, cy + r + 6))
    note(sh, cx, cy + r + 16, "WIDOK Z GÓRY", fs=9, ha="center")
    dim_h(sh, x0, x1, cy - r, cy - r - 16, f"{L:g}", tol=("0", "-0,2"))
    dim_v(sh, cy - r, cy + r, x1, x1 + 14, f"{b:g}", tol=("0", "-0,043"))

    # WIDOK Z PRZODU (b x h, faza)
    fy = cy - 60
    fx0, fx1 = x0, x1
    ftop = fy + h / 2 * s
    fbot = fy - h / 2 * s
    ch = 0.6 * s
    # prostokat z malymi fazami na gornych krawedziach
    sh.polyline([(fx0, fbot), (fx0, ftop - ch), (fx0 + ch, ftop),
                 (fx1 - ch, ftop), (fx1, ftop - ch), (fx1, fbot), (fx0, fbot)])
    sh.centerline((fx0 - 6, fy), (fx1 + 6, fy))
    note(sh, cx, fbot - 26, "WIDOK Z PRZODU", fs=9, ha="center")
    dim_v(sh, fbot, ftop, fx0, fx0 - 14, f"{h:g}", tol=("0", "-0,090"))
    note(sh, fx1 + 4, ftop, "faza 0,6x45°", fs=8)

    # WIDOK Z BOKU (przekroj b x h)
    bx = fx1 + 80
    sh.polyline([(bx - r, fbot), (bx - r, ftop - ch), (bx - r + ch, ftop),
                 (bx + r - ch, ftop), (bx + r, ftop - ch), (bx + r, fbot), (bx - r, fbot)])
    sh.centerline((bx, fbot - 6), (bx, ftop + 6))
    note(sh, bx, fbot - 26, "WIDOK Z BOKU", fs=9, ha="center")
    dim_h(sh, bx - r, bx + r, fbot, fbot - 16, f"{b:g}")
    note(sh, cx - 40, cy + r + 40, r"$Ra\ 3{,}2$", fs=9)
    note(sh, 70, 70, "Materiał: stal C45    |    Wpust wg PN-70/M-85005 (DIN 6885 A)", fs=9)
    return sh


# ----------------------------------------------------------------
def page_scianka(idx):
    """Sciana przednia przekladni z gniazdami lozysk."""
    title = "ŚCIANA PRZEDNIA OBUDOWY"
    sh = Sheet(part_title=title, sheet=f"{idx}/5", date=DATE, dwg_no=f"SCP-{idx:02d}",
               scale="1:2", material="Żeliwo EN-GJL-200")
    s = 0.5                                  # 1:2
    Wp = P["dl_prz"]      # 362 dlugosc
    Hp = 200.0            # wysokosc przyjeta
    th = P["gr_prz"]      # 25 grubosc
    # WIDOK Z PRZODU
    cx, cy = 150, 200
    x0 = cx - Wp / 2 * s; x1 = cx + Wp / 2 * s
    y0 = cy - Hp / 2 * s; y1 = cy + Hp / 2 * s
    sh.ax.add_patch(plt.Rectangle((x0, y0), Wp * s, Hp * s, fill=False, lw=D.LW_VISIBLE, ec="k"))
    # dwa gniazda lozysk: odleglosc osi = 126 (=(dp1+dp2)/2)
    aw = (P["dp1"] + P["dp2"]) / 2          # 126
    c1 = (cx - aw / 2 * s, cy)
    c2 = (cx + aw / 2 * s, cy)
    r1 = P["d_loz1"] / 2 * s
    r2 = P["d_loz2"] / 2 * s
    sh.circle(c1, r1); sh.center_cross(c1, r1)
    sh.circle(c2, r2); sh.center_cross(c2, r2)
    # srub mocujacych M5 wokol gniazd (po 4)
    import math
    for c, rr in ((c1, r1 + 8 * s), (c2, r2 + 8 * s)):
        for a in (45, 135, 225, 315):
            px = c[0] + rr * math.cos(math.radians(a))
            py = c[1] + rr * math.sin(math.radians(a))
            sh.circle((px, py), 2.6 * s)
    # otwory naroznikowe mocujace
    for dx in (x0 + 12 * s, x1 - 12 * s):
        for dy in (y0 + 12 * s, y1 - 12 * s):
            sh.circle((dx, dy), 3.0 * s)
    note(sh, cx, y1 + 26, "WIDOK Z PRZODU (1:2)", fs=10, ha="center")
    # wymiary
    dim_h(sh, x0, x1, y0, y0 - 18, f"{Wp:g}")
    dim_v(sh, y0, y1, x0, x0 - 16, f"{Hp:g}")
    dim_h(sh, c1[0], c2[0], cy, y1 + 12, f"{aw:g}")
    leader(sh, (c1[0] + r1 * 0.7, c1[1] + r1 * 0.7), (c1[0] - 30, c1[1] + 40),
           f"Ø{P['d_loz1']:g} H7", ha="left")
    leader(sh, (c2[0] + r2 * 0.7, c2[1] + r2 * 0.7), (c2[0] + 30, c2[1] + 40),
           f"Ø{P['d_loz2']:g} H7", ha="left")

    # PRZEKROJ A-A (grubosc)
    bx = cx - Wp / 2 * s
    syc = 95
    rectx = cx - Wp / 2 * s
    sh.ax.add_patch(plt.Rectangle((x0, syc - th / 2 * s), Wp * s, th * s,
                                  fill=False, lw=D.LW_VISIBLE, ec="k"))
    sh.hatch([(x0, syc - th / 2 * s), (x1, syc - th / 2 * s),
              (x1, syc + th / 2 * s), (x0, syc + th / 2 * s)], spacing=2.2)
    note(sh, cx, syc - 22, "PRZEKRÓJ A-A", fs=10, ha="center")
    dim_v(sh, syc - th / 2 * s, syc + th / 2 * s, x1, x1 + 12, f"{th:g}")
    note(sh, 70, 60, "Materiał: żeliwo EN-GJL-200 / stal    |    Otwory mocujące M5", fs=9)
    return sh


# ----------------------------------------------------------------
def page_podstawa(idx):
    """Podstawa (dolna czesc obudowy) - plyta z otworami."""
    title = "PODSTAWA OBUDOWY"
    sh = Sheet(part_title=title, sheet=f"{idx}/5", date=DATE, dwg_no=f"POD-{idx:02d}",
               scale="1:2", material="Żeliwo EN-GJL-200")
    s = 0.45
    W = P["szer_pod"]    # 366
    Dp = P["dl_pod"]     # 244
    th = P["gr_pod"]     # 40
    # WIDOK Z GORY
    cx, cy = 150, 195
    x0 = cx - W / 2 * s; x1 = cx + W / 2 * s
    y0 = cy - Dp / 2 * s; y1 = cy + Dp / 2 * s
    sh.ax.add_patch(plt.Rectangle((x0, y0), W * s, Dp * s, fill=False, lw=D.LW_VISIBLE, ec="k"))
    # otwory mocujace w narozach (4) + sruby M5
    holes = []
    mx = 20 * s; my = 20 * s
    for dx in (x0 + mx, x1 - mx):
        for dy in (y0 + my, y1 - my):
            sh.circle((dx, dy), 3.0 * s)
            sh.center_cross((dx, dy), 3.0 * s)
            holes.append((dx, dy))
    # srodkowe otwory pod sruby laczace (rzad)
    for dx in np.linspace(x0 + 60 * s, x1 - 60 * s, 4):
        sh.circle((dx, y0 + my), 2.6 * s)
        sh.circle((dx, y1 - my), 2.6 * s)
    note(sh, cx, y1 + 12, "WIDOK Z GÓRY (1:2)", fs=10, ha="center")
    dim_h(sh, x0, x1, y0, y0 - 18, f"{W:g}")
    dim_v(sh, y0, y1, x0, x0 - 16, f"{Dp:g}")
    dim_h(sh, holes[0][0], holes[2][0], holes[0][1], y0 - 34,
          f"{W - 40:g}")
    dim_v(sh, holes[0][1], holes[1][1], holes[2][0], x1 + 14, f"{Dp - 40:g}")
    leader(sh, holes[3], (holes[3][0] + 24, holes[3][1] + 18), "4x Ø6", ha="left")

    # WIDOK Z PRZODU (grubosc)
    fy = 105
    sh.ax.add_patch(plt.Rectangle((x0, fy - th / 2 * s), W * s, th * s,
                                  fill=False, lw=D.LW_VISIBLE, ec="k"))
    note(sh, cx, fy - th / 2 * s - 16, "WIDOK Z PRZODU", fs=10, ha="center")
    dim_v(sh, fy - th / 2 * s, fy + th / 2 * s, x1, x1 + 12, f"{th:g}")
    note(sh, 70, 55, "Materiał: żeliwo EN-GJL-200    |    Otwory mocujące M5 / M6", fs=9)
    return sh


# ----------------------------------------------------------------
def build():
    pages = []
    # Walek 1: Ø45/48/50, total 311
    seg1 = [(24, 45), (13, 48), (120, 50), (14, 48), (140, 45)]
    pages.append(page_walek(1, seg1, 311, [45, 48, 50], keyway_seg=2,
                            keyway_len=104, gear_dia_label="Ø50", brg_label="Ø48",
                            title="WAŁEK 1 (wałek zębnika)", fname_dims=None))
    # Scianka
    pages.append(page_scianka(2))
    # Klin
    pages.append(page_klin(3))
    # Walek 2: Ø50/53/55, total ~287 (wg wzorca)
    seg2 = [(26, 50), (13, 53), (126.5, 55), (14, 53), (23, 50), (84.85, 50)]
    pages.append(page_walek(4, seg2, 287, [50, 53, 55], keyway_seg=2,
                            keyway_len=99, gear_dia_label="Ø55", brg_label="Ø53",
                            title="WAŁEK 2 (wałek koła)", fname_dims=None))
    # Podstawa
    pages.append(page_podstawa(5))

    with PdfPages("/home/user/claude/rysunki/przekladnia_5_czesci.pdf") as pdf:
        for sh in pages:
            pdf.savefig(sh.fig)
    # zapisz tez podglady PNG
    for i, sh in enumerate(pages, 1):
        sh.save(f"/home/user/claude/rysunki/preview_{i}.png")
    print("OK - zapisano PDF i podglady")


if __name__ == "__main__":
    build()
