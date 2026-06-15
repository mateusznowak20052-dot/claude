# -*- coding: utf-8 -*-
"""Rysunek pokrywy (gorna_scianka) z DOKLADNEJ geometrii IGES."""
import numpy as np
import matplotlib.pyplot as plt
import draw_lib as D
from draw_lib import Sheet, dim_h, dim_v, leader, note, arrow

DATE = "15.06.2026"
edges = np.load('/tmp/gorna_edges.npy', allow_pickle=True)
bb = np.load('/tmp/gorna_bbox.npy')
xmin, ymin, zmin, xmax, ymax, zmax = bb
LX, LY, LZ = xmax - xmin, ymax - ymin, zmax - zmin   # 362,204,55
holes = [(-168.5, -89.5), (-168.5, 0), (-168.5, 89.5),
         (0, -89.5), (0, 89.5),
         (168.5, -89.5), (168.5, 0), (168.5, 89.5)]


def proj(sh, ox, oy, s, ia, ja, sgn_i=1, sgn_j=1, lw=0.5):
    """Rzutuj krawedzie 3D na plaszczyzne (osie ia,ja) -> papier (ox,oy,skala s)."""
    for e in edges:
        xs = ox + sgn_i * e[:, ia] * s
        ys = oy + sgn_j * e[:, ja] * s
        sh.ax.plot(xs, ys, lw=lw, color="k", solid_capstyle="round")


def build():
    sh = Sheet(part_title="GÓRNA CZĘŚĆ OBUDOWY (pokrywa)", sheet="6/6", date=DATE,
               dwg_no="GOR-06", scale="1:2", material="Żeliwo EN-GJL-200")
    s = 0.5
    # srodki ukladu (model wycentrowany w X,Y; Z 178..233)
    zc = (zmin + zmax) / 2

    # ---- WIDOK Z GORY (XY) ----
    txc, tyc = 130, 205
    proj(sh, txc, tyc, s, 0, 1)            # x->x, y->y
    for hx, hy in holes:
        sh.center_cross((txc + hx * s, tyc + hy * s), 5)
    x0 = txc + xmin * s; x1 = txc + xmax * s
    y0 = tyc + ymin * s; y1 = tyc + ymax * s
    note(sh, txc, y1 + 16, "WIDOK Z GÓRY (1:2)", fs=10, ha="center")
    dim_h(sh, x0, x1, y1, y1 + 8, f"{LX:.0f}")
    dim_v(sh, y0, y1, x1, x1 + 10, f"{LY:.0f}")
    # rozstawy otworow
    dim_h(sh, txc - 168.5 * s, txc + 168.5 * s, y0, y0 - 10, "337")
    dim_v(sh, tyc - 89.5 * s, tyc + 89.5 * s, x0, x0 - 12, "179")
    leader(sh, (txc + 168.5 * s + 5.0, tyc + 89.5 * s + 5.0),
           (x1 + 14, y1 + 6), "8x Ø4,2  pogł. Ø10", ha="left")

    # ---- WIDOK Z PRZODU (XZ) ----
    fxc, fyc = 130, 95
    proj(sh, fxc, fyc - zc * s, s, 0, 2)   # x->x, z->y
    note(sh, fxc, fyc - LZ / 2 * s - 14, "WIDOK Z PRZODU (1:2)", fs=10, ha="center")
    dim_v(sh, fyc - LZ / 2 * s, fyc + LZ / 2 * s, fxc + xmax * s + 12,
          fxc + xmax * s + 12, f"{LZ:.0f}")

    # ---- WIDOK Z BOKU (YZ) ----
    sxc, syc = 320, 95
    proj(sh, sxc, syc - zc * s, s, 1, 2)   # y->x, z->y
    note(sh, sxc, syc - LZ / 2 * s - 14, "WIDOK Z BOKU (1:2)", fs=10, ha="center")
    dim_h(sh, sxc + ymin * s, sxc + ymax * s, syc + LZ / 2 * s,
          syc + LZ / 2 * s + 8, f"{LY:.0f}")

    note(sh, 30, 45, "Geometria odczytana 1:1 z pliku IGES (gorna_scianka.iges)", fs=8, ha="left")
    sh.fig.savefig('/home/user/claude/rysunki/test_gorna.png', dpi=150)
    sh.fig.savefig('/home/user/claude/rysunki/test_gorna.pdf')
    print("ok bbox %.1f x %.1f x %.1f" % (LX, LY, LZ))


build()
