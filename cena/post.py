"""Converte o render em assets web: imagem WebP e mapa de profundidade (disparidade) em PNG.
Uso: python post.py <dir_render> <dir_saida> <largura_final>"""
import sys, os
import numpy as np
import bpy
from PIL import Image, ImageFilter

src, dst, larg = sys.argv[1], sys.argv[2], int(sys.argv[3])
os.makedirs(dst, exist_ok=True)

# imagem final (PNG 16 bits do Blender, já com AgX + glare) -> WebP
im = Image.open(os.path.join(src, "arcadas.png"))
if im.mode not in ("RGB", "RGBA"):
    arr = np.array(im).astype(np.float32)
    arr = (arr / (65535.0 if arr.max() > 255 else 255.0) * 255).clip(0, 255).astype(np.uint8)
    im = Image.fromarray(arr)
im = im.convert("RGB")
alt = round(im.height * larg / im.width)
im = im.resize((larg, alt), Image.LANCZOS)
im.save(os.path.join(dst, "arcadas.webp"), "WEBP", quality=90, method=6)

# profundidade: EXR em metros -> disparidade normalizada (perto = branco)
exr = [f for f in os.listdir(src) if f.startswith("profundidade_") and f.endswith(".exr")][0]
img = bpy.data.images.load(os.path.join(src, exr))
w, h = img.size
z = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)[:, :, 0]
z = np.flipud(z)  # Blender guarda de baixo para cima
z = np.where(z > 1e5, 1e5, z)
perto, longe = 2.6, 70.0
disp = (1.0 / np.maximum(z, perto) - 1.0 / longe) / (1.0 / perto - 1.0 / longe)
disp = np.clip(disp, 0, 1) ** 0.55  # espalha o meio do pátio
d8 = Image.fromarray((disp * 255).astype(np.uint8), "L")
dl = max(256, larg // 2)
d8 = d8.resize((dl, round(h * dl / w)), Image.BILINEAR)
# dilata um pouco o primeiro plano: evita "halo" nas bordas ao deslocar
d8 = d8.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1.2))
d8.save(os.path.join(dst, "arcadas-profundidade.png"), optimize=True)
print("ok", im.size, d8.size, os.path.getsize(os.path.join(dst, "arcadas.webp")), os.path.getsize(os.path.join(dst, "arcadas-profundidade.png")))
