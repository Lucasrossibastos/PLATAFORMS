"""Acabamento dos quadros da galeria e conversão para MP4 (H.264) + imagem de capa.
Uso: python video.py <dir_quadros> <dir_saida>"""
import sys, os, glob, subprocess
import numpy as np
from PIL import Image
import imageio_ffmpeg

src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
tmp = os.path.join(src, "_final")
os.makedirs(tmp, exist_ok=True)
quadros = sorted(glob.glob(os.path.join(src, "q_*.png")))
h, w = np.array(Image.open(quadros[0]).convert("L")).shape
yy, xx = np.mgrid[0:h, 0:w]
nx, ny = xx / w, yy / h
# vinheta suave + escurece a faixa de baixo, onde ficam o título e os cartões
r2 = ((nx - 0.5) / 0.75) ** 2 + ((ny - 0.42) / 0.75) ** 2
vinheta = 1 - 0.32 * np.clip(r2, 0, 1)
t = np.clip((ny - 0.58) / 0.42, 0, 1)
baixo = 1 - 0.30 * (t * t * (3 - 2 * t))
fator = (vinheta * baixo).astype(np.float32)
for i, q in enumerate(quadros, 1):
    a = np.array(Image.open(q).convert("L")).astype(np.float32)
    a = np.clip(a * fator, 0, 255).astype(np.uint8)
    Image.fromarray(a, "L").convert("RGB").save(os.path.join(tmp, "f_%04d.png" % i))
    if i == 1:
        Image.fromarray(a, "L").save(os.path.join(dst, "galeria.jpg"), quality=82, optimize=True, progressive=True)
ff = imageio_ffmpeg.get_ffmpeg_exe()
saida = os.path.join(dst, "galeria.mp4")
subprocess.run([ff, "-y", "-loglevel", "error", "-framerate", "24", "-i", os.path.join(tmp, "f_%04d.png"),
                "-c:v", "libx264", "-preset", "slow", "-crf", "22", "-tune", "film", "-pix_fmt", "yuv420p",
                "-movflags", "+faststart", "-an", saida], check=True)
print("ok", len(quadros), "quadros", os.path.getsize(saida) // 1024, "KB", os.path.getsize(os.path.join(dst, "galeria.jpg")) // 1024, "KB capa")
