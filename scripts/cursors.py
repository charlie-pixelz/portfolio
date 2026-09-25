"""Flecha del cursor nativo (H3) en versión contorno: borde fósforo de 1 px, interior verde oscuro
translúcido y el contorno oscuro exterior de siempre (lo que la separa de los letreros claros).

Parte de la flecha sólida (fósforo + contorno) y vacía su interior. La @2x es la 1x agrandada con
vecino más cercano, así el píxel sigue siendo duro en pantallas retina.

Uso: python3 scripts/cursors.py <flecha_solida.png>   → escribe public/cursors/arrow(.png|@2x.png)
"""
import sys
from PIL import Image

PHOSPHOR = (0x33, 0xFF, 0x66, 255)
FILL = (0x0A, 0x3A, 0x1C, 150)  # verde oscuro al ~60 %: deja ver la escena sin perder la silueta

src = Image.open(sys.argv[1]).convert('RGBA')
w, h = src.size
px = src.load()
is_ph = lambda x, y: 0 <= x < w and 0 <= y < h and px[x, y][:3] == PHOSPHOR[:3]

out = src.copy()
op = out.load()
for y in range(h):
    for x in range(w):
        if not is_ph(x, y):
            continue
        edge = any(not is_ph(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        op[x, y] = PHOSPHOR if edge else FILL

out.save('public/cursors/arrow.png', optimize=True)
out.resize((w * 2, h * 2), Image.NEAREST).save('public/cursors/arrow@2x.png', optimize=True)
