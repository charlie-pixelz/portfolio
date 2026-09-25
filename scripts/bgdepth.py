# Genera el depth map SOLO del fondo del hero (sin la silueta del personaje), que usa src/gl/hero.js.
# Regenerar si cambia la ilustración del hero. Requiere Python 3 + numpy + Pillow:
#   python3 scripts/bgdepth.py assets/upscale/hero_depth_1600w.webp assets/upscale/hero_character_2400w.webp assets/upscale/hero_bgdepth_1600w.webp
#   python3 scripts/bgdepth.py assets/upscale/hero_mobile_depth_1600w.webp assets/upscale/hero_mobile_character_2400w.webp assets/upscale/hero_mobile_bgdepth_1600w.webp
import sys
import numpy as np
from PIL import Image, ImageFilter

def resize_f(a, size):
    return np.asarray(Image.fromarray(a.astype(np.float32)).resize(size, Image.BILINEAR))

def box_blur(a, r, passes=3):
    for _ in range(passes):
        for ax in (0, 1):
            pad = [(0, 0), (0, 0)]; pad[ax] = (r, r)
            c = np.cumsum(np.pad(a, pad, mode="edge"), axis=ax)
            c = np.insert(c, 0, 0, axis=ax)
            n = a.shape[ax]
            a = (np.take(c, range(2 * r + 1, 2 * r + 1 + n), axis=ax) - np.take(c, range(0, n), axis=ax)) / (2 * r + 1)
    return a

def pushpull(val, w):
    if min(val.shape) <= 2:
        m = (val * w).sum() / max(w.sum(), 1e-6)
        return np.full_like(val, m)
    h, wd = val.shape
    h2, w2 = (h + 1) // 2, (wd + 1) // 2
    vp = np.pad(val * w, ((0, h2 * 2 - h), (0, w2 * 2 - wd)))
    wp = np.pad(w, ((0, h2 * 2 - h), (0, w2 * 2 - wd)))
    sv = vp.reshape(h2, 2, w2, 2).sum((1, 3))
    sw = wp.reshape(h2, 2, w2, 2).sum((1, 3))
    cv = np.where(sw > 0, sv / np.maximum(sw, 1e-6), 0)
    cw = np.minimum(sw, 1.0)
    coarse = pushpull(cv, cw)
    up = resize_f(coarse, (wd, h))
    return w * val + (1 - w) * up

depth_path, char_path, out_path = sys.argv[1:4]
D = Image.open(depth_path).convert("L")
W, H = D.size
A = Image.open(char_path).getchannel("A").resize((W, H), Image.BILINEAR)
mask = A.point(lambda v: 255 if v > 5 else 0).filter(ImageFilter.MaxFilter(9))  # dilata 4px
known = 1.0 - np.asarray(mask).astype(np.float32) / 255
val = np.asarray(D).astype(np.float32) / 255
filled = pushpull(val, known)
# suavizado leve SOLO dentro de la zona rellenada, para que no quede textura de bloques
blur = box_blur(filled, 4)
filled = known * val + (1 - known) * blur
Image.fromarray(np.clip(filled * 255 + 0.5, 0, 255).astype(np.uint8)).save(out_path, quality=92)
print(out_path, "fill region", round(float((1 - known).mean()) * 100, 1), "%",
      "max bg", round(float(filled.max()), 3))
