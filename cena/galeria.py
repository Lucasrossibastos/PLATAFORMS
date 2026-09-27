"""
Galeria infinita de arcos em preto e branco — fundo animado da página de entrada.
A câmera avança exatamente um vão durante o loop, então o último quadro emenda no primeiro.

Uso:  python galeria.py <largura> <altura> <amostras> <saida_dir> [quadro_ini quadro_fim]
"""
import bpy, bmesh, math, os, sys
from mathutils import Matrix

W = int(sys.argv[1]) if len(sys.argv) > 1 else 640
H = int(sys.argv[2]) if len(sys.argv) > 2 else 360
AMOSTRAS = int(sys.argv[3]) if len(sys.argv) > 3 else 16
SAIDA = sys.argv[4] if len(sys.argv) > 4 else os.path.abspath("galeria_out")
Q_INI = int(sys.argv[5]) if len(sys.argv) > 5 else 1
Q_FIM = int(sys.argv[6]) if len(sys.argv) > 6 else 1
os.makedirs(SAIDA, exist_ok=True)

QUADROS = int(os.environ.get("QUADROS", "144"))   # 6 s a 24 qps
VAO = 3.2          # comprimento de um vão (o que a câmera percorre no loop)
N_VAOS = 26
LARG = 5.2         # largura interna da galeria
MOLA = 2.6         # altura de nascimento dos arcos transversais
R_TRANSV = LARG / 2

bpy.ops.wm.read_factory_settings(use_empty=True)
cena = bpy.context.scene
col = bpy.data.collections.new("galeria")
cena.collection.children.link(col)

def material(nome, cor, rug, ruido=0.0, escala_ruido=6.0):
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Roughness"].default_value = rug
    if ruido:
        coord = nt.nodes.new("ShaderNodeNewGeometry")
        rn = nt.nodes.new("ShaderNodeTexNoise")
        rn.inputs["Scale"].default_value = escala_ruido
        rn.inputs["Detail"].default_value = 10.0
        nt.links.new(coord.outputs["Position"], rn.inputs["Vector"])
        rampa = nt.nodes.new("ShaderNodeValToRGB")
        rampa.color_ramp.elements[0].color = (*[c * (1 - ruido) for c in cor], 1)
        rampa.color_ramp.elements[1].color = (*[min(1, c * (1 + ruido)) for c in cor], 1)
        nt.links.new(rn.outputs["Fac"], rampa.inputs["Fac"])
        nt.links.new(rampa.outputs["Color"], b.inputs["Base Color"])
        bump = nt.nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = 0.08
        fino = nt.nodes.new("ShaderNodeTexNoise")
        fino.inputs["Scale"].default_value = 60.0
        nt.links.new(coord.outputs["Position"], fino.inputs["Vector"])
        nt.links.new(fino.outputs["Fac"], bump.inputs["Height"])
        nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    else:
        b.inputs["Base Color"].default_value = (*cor, 1)
    return m

M_PEDRA = material("pedra", (0.55, 0.55, 0.55), 0.85, 0.18, 3.0)
M_PISO = material("piso", (0.10, 0.10, 0.10), 0.22, 0.25, 1.2)

def objeto(nome, bm, mat):
    me = bpy.data.meshes.new(nome)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(nome, me)
    col.objects.link(ob)
    ob.data.materials.append(mat)
    return ob

def prisma(bm, pts, eixo, a0, a1):
    """Extruda um perfil 2D. eixo='y': perfil em XZ; eixo='x': perfil em YZ."""
    if eixo == "y":
        v0 = [bm.verts.new((u, a0, v)) for u, v in pts]
        v1 = [bm.verts.new((u, a1, v)) for u, v in pts]
    else:
        v0 = [bm.verts.new((a0, u, v)) for u, v in pts]
        v1 = [bm.verts.new((a1, u, v)) for u, v in pts]
    bm.faces.new(v0)
    bm.faces.new(list(reversed(v1)))
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((v0[i], v0[j], v1[j], v1[i]))

def perfil_arco(c, larg, mola, base, seg=48):
    r = larg / 2
    pts = [(c - r, base), (c + r, base), (c + r, mola)]
    for i in range(1, seg):
        a = math.pi * i / seg
        pts.append((c + r * math.cos(a), mola + r * math.sin(a)))
    pts.append((c - r, mola))
    return pts

def anel(c, r_in, r_out, mola, seg=48):
    pts = []
    for i in range(seg + 1):
        a = math.pi * i / seg
        pts.append((c + r_out * math.cos(a), mola + r_out * math.sin(a)))
    for i in range(seg, -1, -1):
        a = math.pi * i / seg
        pts.append((c + r_in * math.cos(a), mola + r_in * math.sin(a)))
    return pts

y0, y1 = -2 * VAO, N_VAOS * VAO
# piso
bm = bmesh.new()
bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((0, (y0 + y1) / 2, -0.1)) @ Matrix.Diagonal((LARG + 6, y1 - y0, 0.2, 1)))
objeto("piso", bm, M_PISO)

# arcada da direita (aberta para a luz): parede com vãos em arco
bm = bmesh.new()
bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((LARG / 2 + 0.35, (y0 + y1) / 2, 3.0)) @ Matrix.Diagonal((0.7, y1 - y0, 6.0, 1)))
parede_d = objeto("parede_direita", bm, M_PEDRA)
bm = bmesh.new()
for k in range(-2, N_VAOS):
    prisma(bm, perfil_arco(k * VAO + VAO / 2, 2.2, 2.1, -0.5), "x", LARG / 2 - 0.5, LARG / 2 + 1.2)
corte = objeto("corte_direita", bm, M_PEDRA)
corte.hide_render = True
b = parede_d.modifiers.new("vaos", "BOOLEAN"); b.operation = "DIFFERENCE"; b.solver = "EXACT"; b.object = corte

# parede da esquerda (recebe os desenhos de luz)
bm = bmesh.new()
bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((-LARG / 2 - 0.35, (y0 + y1) / 2, 3.0)) @ Matrix.Diagonal((0.7, y1 - y0, 6.0, 1)))
objeto("parede_esquerda", bm, M_PEDRA)

# arcos transversais (as nervuras que formam o túnel) e a abóbada
bm = bmesh.new()
for k in range(-2, N_VAOS):
    prisma(bm, anel(0, R_TRANSV, R_TRANSV + 0.45, MOLA), "y", k * VAO - 0.22, k * VAO + 0.22)
    # pilastras sob cada nervura
    for sx in (-1, 1):
        x = sx * (LARG / 2 - 0.12)
        bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((x, k * VAO, MOLA / 2)) @ Matrix.Diagonal((0.36, 0.5, MOLA, 1)))
objeto("nervuras", bm, M_PEDRA)
bm = bmesh.new()
prisma(bm, anel(0, R_TRANSV + 0.3, R_TRANSV + 0.6, MOLA, 64), "y", y0, y1)
objeto("abobada", bm, M_PEDRA)

# luz: sol baixo entrando pela arcada da direita
sol_d = bpy.data.lights.new("sol", "SUN")
sol_d.energy = float(os.environ.get("SOL", "6.5"))
sol_d.angle = math.radians(0.8)
sol = bpy.data.objects.new("sol", sol_d)
col.objects.link(sol)
sol.rotation_euler = (math.radians(float(os.environ.get("SOL_X", "68"))), 0, math.radians(float(os.environ.get("SOL_ROT", "62"))))

# névoa volumétrica leve (desenha os fachos de luz)
bm = bmesh.new()
bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((0, (y0 + y1) / 2, 3.0)) @ Matrix.Diagonal((LARG + 5, y1 - y0, 6.2, 1)))
nevoa = objeto("nevoa", bm, bpy.data.materials.new("nevoa"))
mv = nevoa.data.materials[0]
mv.use_nodes = True
for n in list(mv.node_tree.nodes):
    if n.type != "OUTPUT_MATERIAL":
        mv.node_tree.nodes.remove(n)
vol = mv.node_tree.nodes.new("ShaderNodeVolumePrincipled")
vol.inputs["Density"].default_value = float(os.environ.get("NEVOA", "0.035"))
vol.inputs["Anisotropy"].default_value = 0.55
mv.node_tree.links.new(vol.outputs["Volume"], mv.node_tree.nodes["Material Output"].inputs["Volume"])

# mundo quase preto
mundo = bpy.data.worlds.new("mundo")
cena.world = mundo
mundo.use_nodes = True
mundo.node_tree.nodes["Background"].inputs["Color"].default_value = (0.02, 0.02, 0.022, 1)
mundo.node_tree.nodes["Background"].inputs["Strength"].default_value = 1.0

# câmera avançando exatamente um vão
cam_d = bpy.data.cameras.new("cam")
cam_d.lens = 26
cam_d.shift_y = 0.06
cam = bpy.data.objects.new("cam", cam_d)
col.objects.link(cam)
cena.camera = cam
cam.rotation_euler = (math.radians(90), 0, math.radians(0))
X_CAM = float(os.environ.get("X_CAM", "-0.55"))
cam.location = (X_CAM, 0.0, 1.55)
cam.keyframe_insert("location", frame=1)
cam.location = (X_CAM, VAO, 1.55)
cam.keyframe_insert("location", frame=QUADROS + 1)
for fc in cam.animation_data.action.fcurves:
    for kp in fc.keyframe_points:
        kp.interpolation = "LINEAR"
cena.frame_start = 1
cena.frame_end = QUADROS
cena.render.fps = 24

r = cena.render
r.engine = "CYCLES"
r.resolution_x, r.resolution_y, r.resolution_percentage = W, H, 100
c = cena.cycles
c.device = "CPU"
c.samples = AMOSTRAS
c.use_adaptive_sampling = True
c.adaptive_threshold = 0.03
c.use_denoising = True
c.denoiser = "OPENIMAGEDENOISE"
c.use_animated_seed = False
c.max_bounces = 5
c.diffuse_bounces = 3
c.glossy_bounces = 2
c.volume_bounces = 1
c.volume_step_rate = float(os.environ.get("PASSO_VOL", "2.0"))
c.sample_clamp_indirect = 3.0
cena.view_settings.view_transform = "AgX"
cena.view_settings.look = "AgX - High Contrast"
cena.view_settings.exposure = float(os.environ.get("EXPOSICAO", "0.0"))

# composição: preto e branco + brilho suave nas luzes
cena.use_nodes = True
t = cena.node_tree
for n in list(t.nodes):
    t.nodes.remove(n)
rl = t.nodes.new("CompositorNodeRLayers")
glare = t.nodes.new("CompositorNodeGlare"); glare.glare_type = "FOG_GLOW"; glare.quality = "HIGH"; glare.threshold = 0.85; glare.size = 8
pb = t.nodes.new("CompositorNodeRGBToBW")
comp = t.nodes.new("CompositorNodeComposite")
t.links.new(rl.outputs["Image"], glare.inputs["Image"])
t.links.new(glare.outputs["Image"], pb.inputs["Image"])
t.links.new(pb.outputs["Val"], comp.inputs["Image"])

r.image_settings.file_format = "PNG"
r.image_settings.color_mode = "BW"
r.image_settings.color_depth = "8"
r.filepath = os.path.join(SAIDA, "q_")
cena.frame_start, cena.frame_end = Q_INI, Q_FIM
bpy.ops.render.render(animation=True)
print("OK")
