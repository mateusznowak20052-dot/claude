# -*- coding: utf-8 -*-
"""Biblioteka rysunku technicznego (ISO) na arkuszu A3 - styl szablonu Fusion 360."""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon, PathPatch, Circle, Arc
from matplotlib.path import Path
import numpy as np

mm = 1.0
A3 = (420.0, 297.0)            # szerokosc x wysokosc [mm]

# wagi linii (linewidth w pt) - dobrane do A3
LW_VISIBLE = 1.5
LW_THIN    = 0.5
LW_CENTER  = 0.5
LW_DIM     = 0.5
LW_BORDER  = 1.2

FS_DIM   = 9      # tekst wymiarowy
FS_TITLE = 9
FS_LABEL = 11

ARR_LEN = 3.2     # dlugosc grotu [mm]
ARR_W   = 1.1     # szerokosc grotu [mm]


class Sheet:
    def __init__(self, title="PRZEKLADNIA", created_by="Mateusz Nowak",
                 date="15.06.2026", sheet="1/1", dwg_no="", part_title="",
                 scale="1:1", material=""):
        self.fig = plt.figure(figsize=(A3[0] / 25.4, A3[1] / 25.4))
        self.ax = self.fig.add_axes([0, 0, 1, 1])
        self.ax.set_xlim(0, A3[0])
        self.ax.set_ylim(0, A3[1])
        self.ax.set_aspect("equal")
        self.ax.axis("off")
        self.title = title
        self.created_by = created_by
        self.date = date
        self.sheet = sheet
        self.dwg_no = dwg_no
        self.part_title = part_title
        self.scale = scale
        self.material = material
        self._draw_border()
        self._draw_titleblock()

    # ---------- ramka i strefy ----------
    def _draw_border(self):
        m = 10
        self.ax.add_patch(plt.Rectangle((m, m), A3[0] - 2 * m, A3[1] - 2 * m,
                                         fill=False, lw=LW_BORDER, ec="k"))
        # cienka ramka zewnetrzna
        self.ax.add_patch(plt.Rectangle((5, 5), A3[0] - 10, A3[1] - 10,
                                         fill=False, lw=0.6, ec="k"))
        # strefy 1..8 (poziom) i A..F (pion)
        nx, ny = 8, 6
        x0, y0, x1, y1 = m, m, A3[0] - m, A3[1] - m
        for i in range(nx):
            xc = x0 + (x1 - x0) * (i + 0.5) / nx
            self.ax.text(xc, y0 - 2.5, str(i + 1), ha="center", va="center", fontsize=7)
            self.ax.text(xc, y1 + 2.5, str(i + 1), ha="center", va="center", fontsize=7)
        for i in range(ny):
            yc = y0 + (y1 - y0) * (i + 0.5) / ny
            lab = "FEDCBA"[i]
            self.ax.text(x0 - 2.5, yc, lab, ha="center", va="center", fontsize=7)
            self.ax.text(x1 + 2.5, yc, lab, ha="center", va="center", fontsize=7)
        # kreski podzialu stref na ramce
        for i in range(1, nx):
            x = x0 + (x1 - x0) * i / nx
            self.ax.plot([x, x], [y0 - 5, y0], lw=0.5, color="k")
            self.ax.plot([x, x], [y1, y1 + 5], lw=0.5, color="k")
        for i in range(1, ny):
            y = y0 + (y1 - y0) * i / ny
            self.ax.plot([x0 - 5, x0], [y, y], lw=0.5, color="k")
            self.ax.plot([x1, x1 + 5], [y, y], lw=0.5, color="k")

    def _draw_titleblock(self):
        # tabelka rysunkowa wg ISO 7200 (uproszczona, jak w Fusion) - prawy dolny rog
        ax = self.ax
        X1 = A3[0] - 10           # prawa krawedz = ramka
        Y0 = 10                   # dolna krawedz = ramka
        W = 180
        X0 = X1 - W

        def cell(x, y, w, h, label="", value="", vfs=8, bold=False, mt=False):
            ax.add_patch(plt.Rectangle((x, y), w, h, fill=False, lw=0.5, ec="k"))
            if label:
                ax.text(x + 1.5, y + h - 1.2, label, fontsize=5.5, ha="left", va="top")
            if value:
                vv = ("$" + value.replace("Ø", r"\varnothing ") + "$") if mt else value
                ax.text(x + w / 2, y + (h - 4) / 2 + 0.5, vv, fontsize=vfs,
                        ha="center", va="center",
                        fontweight=("bold" if bold else "normal"))

        # wymiary kolumn / wierszy
        # wiersze (od dolu): 0-8 (data/skala/arkusz), 8-16, 16-30(tytul), 30-38, 38-46
        # gorny rzad: Created by | Approved by
        cell(X0,        38, 70, 8, "Created by", self.created_by, 8)
        cell(X0 + 70,   38, 50, 8, "Approved by", "")
        cell(X0 + 120,  38, 60, 8, "Document status", "Wydanie")
        # tytul (szeroki, wysoki)
        cell(X0,        24, 120, 14, "Title", self.part_title or self.title,
             10, bold=True)
        cell(X0 + 120,  24, 60, 14, "DWG No.", self.dwg_no, 9)
        # material / dokument
        cell(X0,        16, 120, 8, "Material", self.material, 7)
        cell(X0 + 120,  16, 60, 8, "Document type", "Rysunek wykonawczy", 6)
        # dolny rzad: data | skala | arkusz
        cell(X0,        Y0, 70, 6, "Date of issue", self.date, 8)
        cell(X0 + 70,   Y0, 50, 6, "Scale", self.scale, 8)
        cell(X0 + 120,  Y0, 60, 6, "Sheet", self.sheet, 8)

    def save(self, path):
        self.fig.savefig(path, dpi=200)

    # ---------- prymitywy ----------
    def polyline(self, pts, lw=LW_VISIBLE, color="k", ls="-"):
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        self.ax.plot(xs, ys, lw=lw, color=color, ls=ls, solid_capstyle="round")

    def line(self, p1, p2, lw=LW_VISIBLE, color="k", ls="-"):
        self.ax.plot([p1[0], p2[0]], [p1[1], p2[1]], lw=lw, color=color, ls=ls)

    def centerline(self, p1, p2):
        self.ax.plot([p1[0], p2[0]], [p1[1], p2[1]], lw=LW_CENTER, color="k",
                     ls=(0, (12, 3, 2, 3)))

    def circle(self, c, r, lw=LW_VISIBLE, ls="-"):
        self.ax.add_patch(Circle(c, r, fill=False, lw=lw, ec="k", ls=ls))

    def center_cross(self, c, r):
        self.ax.plot([c[0] - r * 1.15, c[0] + r * 1.15], [c[1], c[1]],
                     lw=LW_CENTER, color="k", ls=(0, (12, 3, 2, 3)))
        self.ax.plot([c[0], c[0]], [c[1] - r * 1.15, c[1] + r * 1.15],
                     lw=LW_CENTER, color="k", ls=(0, (12, 3, 2, 3)))

    def hatch(self, poly, spacing=3.0, angle=45):
        """Kreskowanie przekroju wewnatrz wielokata (wypukly/prostokat)."""
        p = np.array(poly)
        xmin, ymin = p.min(0); xmax, ymax = p.max(0)
        diag = np.hypot(xmax - xmin, ymax - ymin)
        a = np.radians(angle)
        d = np.array([np.cos(a), np.sin(a)])
        n = np.array([-np.sin(a), np.cos(a)])
        from matplotlib.path import Path as MPath
        path = MPath(poly)
        cx, cy = (xmin + xmax) / 2, (ymin + ymax) / 2
        segs = []
        k = -int(diag / spacing) - 1
        while k * spacing <= diag:
            base = np.array([cx, cy]) + n * k * spacing
            P1 = base - d * diag; P2 = base + d * diag
            ts = np.linspace(0, 1, 400)
            line = P1[None, :] * (1 - ts[:, None]) + P2[None, :] * ts[:, None]
            inside = path.contains_points(line)
            # znajdz odcinki ciagle wewnatrz
            i = 0
            while i < len(ts):
                if inside[i]:
                    j = i
                    while j + 1 < len(ts) and inside[j + 1]:
                        j += 1
                    segs.append((line[i], line[j]))
                    i = j + 1
                else:
                    i += 1
            k += 1
        for s in segs:
            self.ax.plot([s[0][0], s[1][0]], [s[0][1], s[1][1]], lw=0.35, color="k")

    # ---------- groty / wymiary ----------
    def _arrow(self, tip, ang):
        """grot wypelniony skierowany 'do' tip, kierunek ang (rad) wzdluz linii wym."""
        d = np.array([np.cos(ang), np.sin(ang)])
        n = np.array([-d[1], d[0]])
        base = np.array(tip) - d * ARR_LEN
        p1 = base + n * ARR_W / 2
        p2 = base - n * ARR_W / 2
        self.ax.add_patch(Polygon([tip, p1, p2], closed=True, fc="k", ec="k", lw=0))

# Dedykowane, proste funkcje wymiarowania (poziom/pion) ----------------------

def arrow(ax, tip, ang, l=ARR_LEN, w=ARR_W):
    d = np.array([np.cos(ang), np.sin(ang)])
    n = np.array([-d[1], d[0]])
    base = np.array(tip) - d * l
    ax.add_patch(Polygon([tip, base + n * w / 2, base - n * w / 2],
                         closed=True, fc="k", ec="k", lw=0))


def dim_h(sheet, x1, x2, y, ylev, text, tol=None, fs=FS_DIM, flip_text=False):
    """Wymiar poziomy. x1,x2 punkty; y poziom obiektu; ylev poziom linii wymiarowej."""
    ax = sheet.ax
    s = np.sign(ylev - y) or 1
    ax.plot([x1, x1], [y, ylev + s * 2], lw=LW_THIN, color="k")
    ax.plot([x2, x2], [y, ylev + s * 2], lw=LW_THIN, color="k")
    ax.plot([x1, x2], [ylev, ylev], lw=LW_DIM, color="k")
    arrow(ax, (x1, ylev), 0)
    arrow(ax, (x2, ylev), np.pi)
    xc = (x1 + x2) / 2
    _dimtext(ax, xc, ylev + 1.2, text, tol, fs, ha="center", va="bottom")


def dim_v(sheet, y1, y2, x, xlev, text, tol=None, fs=FS_DIM):
    """Wymiar pionowy."""
    ax = sheet.ax
    s = np.sign(xlev - x) or 1
    ax.plot([x, xlev + s * 2], [y1, y1], lw=LW_THIN, color="k")
    ax.plot([x, xlev + s * 2], [y2, y2], lw=LW_THIN, color="k")
    ax.plot([xlev, xlev], [y1, y2], lw=LW_DIM, color="k")
    arrow(ax, (xlev, y1), np.pi / 2)
    arrow(ax, (xlev, y2), -np.pi / 2)
    yc = (y1 + y2) / 2
    _dimtext(ax, xlev + 1.5, yc, text, tol, fs, ha="left", va="center", rot=90)


def _fmt(text, tol):
    """Zwraca napis (mathtext) z opcjonalna tolerancja pietrowa."""
    t = str(text).replace("Ø", r"\varnothing ")
    if tol is None:
        body = t
    elif isinstance(tol, str):
        body = t + tol.replace("±", r"\pm ")
    else:
        up, lo = tol
        body = r"%s^{%s}_{%s}" % (t, up, lo)
    return "$" + body + "$"


def _dimtext(ax, x, y, text, tol, fs, ha="center", va="bottom", rot=0):
    ax.text(x, y, _fmt(text, tol), fontsize=fs, ha=ha, va=va, rotation=rot)


def leader(sheet, p_from, p_to, text, fs=FS_DIM, ha="left", va="center", dx=2):
    """Linia odniesienia z grotem w p_from i tekstem przy p_to (z polka)."""
    ax = sheet.ax
    ang = np.arctan2(p_from[1] - p_to[1], p_from[0] - p_to[0])
    ax.plot([p_from[0], p_to[0]], [p_from[1], p_to[1]], lw=LW_DIM, color="k")
    # polka pozioma
    shelf = 8 if ha == "left" else -8
    ax.plot([p_to[0], p_to[0] + shelf], [p_to[1], p_to[1]], lw=LW_DIM, color="k")
    arrow(ax, p_from, ang + np.pi)
    tx = p_to[0] + shelf + (dx if ha == "left" else -dx)
    ax.text(tx, p_to[1] + 0.5, _fmt(text, None) if any(c in str(text) for c in "Ø") else str(text),
            fontsize=fs, ha=ha, va=va)


def note(sheet, x, y, text, fs=FS_DIM, ha="left", va="center"):
    sheet.ax.text(x, y, text, fontsize=fs, ha=ha, va=va)


def dim_dia(sheet, cx, cy, r, ang_deg, text, tol=None, fs=FS_DIM, outside=True):
    """Wymiar srednicy w przekroju kolowym - linia przez srodek pod katem."""
    ax = sheet.ax
    a = np.radians(ang_deg)
    d = np.array([np.cos(a), np.sin(a)])
    p1 = np.array([cx, cy]) - d * r
    p2 = np.array([cx, cy]) + d * r
    ax.plot([p1[0], p2[0]], [p1[1], p2[1]], lw=LW_DIM, color="k")
    arrow(ax, p1, a)
    arrow(ax, p2, a + np.pi)
    tp = p2 + d * 3
    ax.text(tp[0], tp[1], _fmt("Ø" + str(text), tol), fontsize=fs, ha="left", va="center")
