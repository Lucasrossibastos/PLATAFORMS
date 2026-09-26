# Cena 3D do hero (Arcadas)

A arte da página inicial é um render do Blender (Cycles) de um claustro neocolonial
**inspirado** nas Arcadas do Largo de São Francisco. Não é uma réplica fiel do prédio:
a geometria é procedural (arcos, colunata, torre sineira, pátio com piso molhado, lampiões).

O navegador anima esse render com um efeito 2,5D (`src/HeroArcadas.jsx`): cada pixel se
desloca conforme o mapa de profundidade, com névoa, cintilação dos lampiões e grão.

## Gerar de novo

```bash
python3 -m venv bl && ./bl/bin/pip install bpy==4.5.14 pillow
# render final (≈30 min em 4 núcleos de CPU)
./bl/bin/python cena/arcadas.py 2400 1350 192 "$PWD/render"
# converte para os assets do app (WebP + mapa de profundidade)
./bl/bin/python cena/post.py render src/assets 1920
```

Parâmetros por variável de ambiente: `SOL_ELEV`, `SOL_ROT`, `CEU_FORCA`, `EXPOSICAO`.

Para trocar pela arte encomendada (render ou foto profissional): substitua
`src/assets/arcadas.webp` e `src/assets/arcadas-profundidade.png` (branco = perto,
preto = longe). Um render do Blender exporta a profundidade no passe Z; para uma foto,
a profundidade pode ser estimada e retocada à mão.
