# Cenas 3D da plataforma

## Galeria de arcos (fundo atual)

Vídeo de fundo da página de entrada e das telas internas: uma galeria infinita de arcos
em preto e branco, com fachos de luz na névoa e piso polido. A câmera avança exatamente
um vão durante o loop (4 s, 96 quadros a 24 qps), então o último quadro emenda no primeiro.

Arquivos no site: `public/video/galeria.mp4` e a capa `public/video/galeria.jpg`
(usados em `src/Cinema.jsx`, `VIDEO_FUNDO` / `POSTER_FUNDO`).

```bash
python3 -m venv bl && ./bl/bin/pip install bpy==4.5.14 pillow imageio-ffmpeg
# render (≈40 s por quadro em 4 núcleos de CPU, ≈1 h no total)
SOL_X=68 SOL_ROT=112 NEVOA=0.045 EXPOSICAO=0.45 SOL=8 QUADROS=96 PASSO_VOL=3 \
  ./bl/bin/python cena/galeria.py 1280 720 20 "$PWD/anim" 1 96
# acabamento (vinheta) + MP4 H.264 + capa
./bl/bin/python cena/video.py anim public/video
```

Variáveis: `SOL_X` (altura do sol), `SOL_ROT` (direção), `NEVOA` (densidade da névoa),
`SOL` (força da luz), `EXPOSICAO`, `QUADROS`, `X_CAM` (posição lateral da câmera).

## Claustro das Arcadas (não usado no momento)

`arcadas.py` + `post.py`: render estático de um claustro neocolonial inspirado nas Arcadas
do Largo de São Francisco, com mapa de profundidade para o efeito 2,5D. O componente
`HeroArcadas.jsx` e as imagens estão no histórico do git (commit `32f3056`).
