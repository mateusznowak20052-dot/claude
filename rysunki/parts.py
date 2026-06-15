# -*- coding: utf-8 -*-
"""Definicje 5 czesci przekladni i ich rysunki wykonawcze (A3)."""
import numpy as np
import draw_lib as D
from draw_lib import Sheet, dim_h, dim_v, leader, note, dim_dia, arrow, _fmt

# ============================================================
#  WALEK - rysowanie stopniowanego walka
# ============================================================

def draw_shaft(sh, segments, cx, cy, scale, keyway=None, chamfers=(2, 2),
               fillet=None):
    """segments: lista (dlugosc_mm, srednica_mm) od lewej do prawej.
       cx: x lewego czola [mm na papierze]; cy: os.
       scale: mm_papieru / mm_rzeczywiste.
       keyway: (start_mm_od_lewej, dlugosc_mm, szer_mm) rowek wpustowy (widok z gory -> linie na walku).
       Zwraca liste granic stopni (x_paper) i promieni(paper)."""
    s = scale
    x = cx
    bounds = [x]
    radii = []
    top = []   # (x_paper, r_paper) gornego zarysu po prawej kazdego segmentu
    # rysuj zarys
    xprev = x
    rprev = None
    for i, (L, dia) in enumerate(segments):
        r = dia / 2 * s
        Lp = L * s
        # pionowa scianka na poczatku segmentu (stopien)
        if rprev is None:
            # lewe czolo z faza
            ch = chamfers[0] * s if chamfers else 0
            sh.line((xprev, cy - r + ch), (xprev, cy + r - ch))
            if ch > 0:
                sh.line((xprev, cy + r - ch), (xprev + ch, cy + r))
                sh.line((xprev, cy - r + ch), (xprev + ch, cy - r))
        else:
            # stopien pionowy miedzy rprev i r
            sh.line((xprev, cy - rprev), (xprev, cy - r))
            sh.line((xprev, cy + rprev), (xprev, cy + r))
        # gorny i dolny zarys segmentu
        sh.line((xprev, cy + r), (xprev + Lp, cy + r))
        sh.line((xprev, cy - r), (xprev + Lp, cy - r))
        xprev += Lp
        rprev = r
        bounds.append(xprev)
        radii.append(r)
    # prawe czolo z faza
    ch = chamfers[1] * s if chamfers else 0
    sh.line((xprev, cy - rprev + ch), (xprev, cy + rprev - ch))
    if ch > 0:
        sh.line((xprev, cy + rprev - ch), (xprev - ch, cy + rprev))
        sh.line((xprev, cy - rprev + ch), (xprev - ch, cy - rprev))
    # os
    sh.centerline((cx - 8, cy), (xprev + 8, cy))
    # rowek wpustowy (widok) - dwie linie wzdluz + zaokraglone konce
    if keyway:
        ks, kl, kw = keyway
        x0 = cx + ks * s
        x1 = x0 + kl * s
        hw = kw / 2 * s
        sh.line((x0 + hw, cy + hw), (x1 - hw, cy + hw))
        sh.line((x0 + hw, cy - hw), (x1 - hw, cy - hw))
        sh.ax.add_patch(D.Arc((x0 + hw, cy), kw * s, kw * s, angle=0,
                              theta1=90, theta2=270, lw=D.LW_VISIBLE, ec="k"))
        sh.ax.add_patch(D.Arc((x1 - hw, cy), kw * s, kw * s, angle=0,
                              theta1=-90, theta2=90, lw=D.LW_VISIBLE, ec="k"))
    return bounds, radii, xprev


def section_circle(sh, cx, cy, dia, scale, keyway_w=None, keyway_t=None, label="A-A"):
    """Przekroj kolowy walka z rowkiem wpustowym."""
    r = dia / 2 * scale
    sh.circle((cx, cy), r)
    sh.center_cross((cx, cy), r)
    if keyway_w:
        w = keyway_w * scale
        # rowek na gorze
        depth = (keyway_t if keyway_t else keyway_w * 0.6) * scale
        ytop = cy + r
        ybot = ytop - depth
        sh.line((cx - w / 2, ytop), (cx - w / 2, ybot))
        sh.line((cx + w / 2, ytop), (cx + w / 2, ybot))
        sh.line((cx - w / 2, ybot), (cx + w / 2, ybot))
        # kreskowanie przekroju (pierscien) pominiete dla czytelnosci
    return r


# ============================================================
#  PARAMETRY RZECZYWISTE (z modelu) [mm]
# ============================================================
P = dict(
    dw1=50, dw2=55, dp1=104, dp2=148, mod=4, z1=26, z2=37,
    b_klin=16, h_klin=10, t1=6, t2=4.3,
    d_loz1=85, d_loz2=90, l_nap=40,
    szer_pod=366, dl_pod=244, gr_pod=40,
    dl_prz=362, gr_prz=25, gr_gor=25,
    dl_bok=154, gr_bok=25, H_bok=168, s_bok=30, szer_moc=20,
    b1=104, b2=99, Az=126,
)
