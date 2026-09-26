"""
Cena 3D procedural: claustro neocolonial inspirado nas Arcadas do Largo de São Francisco.
Renderiza em Cycles uma imagem (hora azul) e um passe de profundidade para o efeito 2,5D.

Uso:  python arcadas.py <largura> <altura> <amostras> <saida_dir>
"""
import bpy, bmesh, math, os, random, sys
from mathutils import Matrix, Vector

W = int(sys.argv[1]) if len(sys.argv) > 1 else 480
H = int(sys.argv[2]) if len(sys.argv) > 2 else 270
SAMPLES = int(sys.argv[3]) if len(sys.argv) > 3 else 16
OUT = sys.argv[4] if len(sys.argv) > 4 else os.path.abspath("out")
os.makedirs(OUT, exist_ok=True)
random.seed(7)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# --------------------------------------------------------------------------
# materiais
# --------------------------------------------------------------------------
def novo_mat(nome):
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return m, nt, bsdf

def no(nt, tipo, **kw):
    n = nt.nodes.new(tipo)
    for k, v in kw.items():
        if k in n.inputs:
            n.inputs[k].default_value = v
        else:
            setattr(n, k, v)
    return n

def link(nt, a, b):
    nt.links.new(a, b)

def rampa(nt, fac_out, c0, c1, p0=0.0, p1=1.0):
    r = nt.nodes.new("ShaderNodeValToRGB")
    r.color_ramp.elements[0].position = p0
    r.color_ramp.elements[0].color = (*c0, 1)
    r.color_ramp.elements[1].position = p1
    r.color_ramp.elements[1].color = (*c1, 1)
    link(nt, fac_out, r.inputs["Fac"])
    return r

def mat_reboco(nome, base=(0.70, 0.66, 0.58)):
    """Reboco caiado com variação, manchas e sujeira perto do chão."""
    m, nt, b = novo_mat(nome)
    pos = no(nt, "ShaderNodeNewGeometry")
    ruido = no(nt, "ShaderNodeTexNoise", Scale=1.6, Detail=10.0, Roughness=0.62)
    link(nt, pos.outputs["Position"], ruido.inputs["Vector"])
    var = rampa(nt, ruido.outputs["Fac"], tuple(c * 0.86 for c in base), base, 0.35, 0.7)
    # sujeira de baixo para cima (respingo de chuva)
    sep = no(nt, "ShaderNodeSeparateXYZ")
    link(nt, pos.outputs["Position"], sep.inputs["Vector"])
    faixa = no(nt, "ShaderNodeMapRange", **{"From Min": 0.0, "From Max": 1.4, "To Min": 1.0, "To Max": 0.0})
    link(nt, sep.outputs["Z"], faixa.inputs["Value"])
    manch = no(nt, "ShaderNodeTexNoise", Scale=6.0, Detail=6.0)
    link(nt, pos.outputs["Position"], manch.inputs["Vector"])
    mult = no(nt, "ShaderNodeMath", operation="MULTIPLY")
    link(nt, faixa.outputs["Result"], mult.inputs[0])
    link(nt, manch.outputs["Fac"], mult.inputs[1])
    mix = no(nt, "ShaderNodeMix", data_type="RGBA", blend_type="MULTIPLY")
    link(nt, mult.outputs["Value"], mix.inputs["Factor"])
    link(nt, var.outputs["Color"], mix.inputs[6])
    mix.inputs[7].default_value = (0.42, 0.37, 0.30, 1)
    # escorridos verticais de chuva abaixo de janelas e cornijas
    mp = no(nt, "ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1.6, 1.6, 0.22)
    link(nt, pos.outputs["Position"], mp.inputs["Vector"])
    esc = no(nt, "ShaderNodeTexNoise", Scale=2.2, Detail=5.0, Roughness=0.55)
    link(nt, mp.outputs["Vector"], esc.inputs["Vector"])
    escr = rampa(nt, esc.outputs["Fac"], (0.9, 0.88, 0.85), (1.0, 1.0, 1.0), 0.3, 0.62)
    mix2 = no(nt, "ShaderNodeMix", data_type="RGBA", blend_type="MULTIPLY")
    mix2.inputs["Factor"].default_value = 1.0
    link(nt, mix.outputs[2], mix2.inputs[6])
    link(nt, escr.outputs["Color"], mix2.inputs[7])
    link(nt, mix2.outputs[2], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.92
    fino = no(nt, "ShaderNodeTexNoise", Scale=90.0, Detail=4.0)
    link(nt, pos.outputs["Position"], fino.inputs["Vector"])
    bump = no(nt, "ShaderNodeBump", Strength=0.12, Distance=0.02)
    link(nt, fino.outputs["Fac"], bump.inputs["Height"])
    link(nt, bump.outputs["Normal"], b.inputs["Normal"])
    return m

def mat_pedra(nome, base=(0.36, 0.33, 0.29)):
    """Cantaria de granito para arcos, frisos e embasamentos."""
    m, nt, b = novo_mat(nome)
    pos = no(nt, "ShaderNodeNewGeometry")
    n1 = no(nt, "ShaderNodeTexNoise", Scale=18.0, Detail=12.0, Roughness=0.7)
    link(nt, pos.outputs["Position"], n1.inputs["Vector"])
    var = rampa(nt, n1.outputs["Fac"], tuple(c * 0.72 for c in base), tuple(min(1, c * 1.15) for c in base), 0.3, 0.75)
    link(nt, var.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.72
    bump = no(nt, "ShaderNodeBump", Strength=0.25, Distance=0.02)
    link(nt, n1.outputs["Fac"], bump.inputs["Height"])
    link(nt, bump.outputs["Normal"], b.inputs["Normal"])
    return m

def mat_piso(nome):
    """Lajes de pedra molhadas: poças refletem os lampiões."""
    m, nt, b = novo_mat(nome)
    pos = no(nt, "ShaderNodeNewGeometry")
    tij = no(nt, "ShaderNodeTexBrick", offset=0.5, squash=1.0)
    tij.inputs["Scale"].default_value = 1.0
    tij.inputs["Mortar Size"].default_value = 0.012
    tij.inputs["Brick Width"].default_value = 0.62
    tij.inputs["Row Height"].default_value = 0.42
    tij.inputs["Color1"].default_value = (0.20, 0.19, 0.18, 1)
    tij.inputs["Color2"].default_value = (0.29, 0.27, 0.25, 1)
    tij.inputs["Mortar"].default_value = (0.06, 0.055, 0.05, 1)
    link(nt, pos.outputs["Position"], tij.inputs["Vector"])
    # poças: ruído grande
    poca = no(nt, "ShaderNodeTexNoise", Scale=0.22, Detail=4.0, Roughness=0.5)
    link(nt, pos.outputs["Position"], poca.inputs["Vector"])
    mol = rampa(nt, poca.outputs["Fac"], (0, 0, 0), (1, 1, 1), 0.42, 0.56)
    rug = no(nt, "ShaderNodeMapRange", **{"To Min": 0.52, "To Max": 0.05})
    link(nt, mol.outputs["Color"], rug.inputs["Value"])
    link(nt, rug.outputs["Result"], b.inputs["Roughness"])
    esc = no(nt, "ShaderNodeMix", data_type="RGBA", blend_type="MULTIPLY")
    link(nt, mol.outputs["Color"], esc.inputs["Factor"])
    link(nt, tij.outputs["Color"], esc.inputs[6])
    esc.inputs[7].default_value = (0.55, 0.55, 0.58, 1)
    link(nt, esc.outputs[2], b.inputs["Base Color"])
    bump = no(nt, "ShaderNodeBump", Strength=0.35, Distance=0.01, invert=True)
    link(nt, tij.outputs["Fac"], bump.inputs["Height"])
    link(nt, bump.outputs["Normal"], b.inputs["Normal"])
    return m

def mat_telhado(nome):
    m, nt, b = novo_mat(nome)
    pos = no(nt, "ShaderNodeTexCoord")
    onda = no(nt, "ShaderNodeTexWave", wave_type="BANDS", bands_direction="X", wave_profile="SIN")
    onda.inputs["Scale"].default_value = 18.0
    link(nt, pos.outputs["Object"], onda.inputs["Vector"])
    n1 = no(nt, "ShaderNodeTexNoise", Scale=12.0, Detail=6.0)
    link(nt, pos.outputs["Object"], n1.inputs["Vector"])
    var = rampa(nt, n1.outputs["Fac"], (0.16, 0.06, 0.03), (0.30, 0.12, 0.06), 0.3, 0.7)
    link(nt, var.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.75
    bump = no(nt, "ShaderNodeBump", Strength=0.6, Distance=0.06)
    link(nt, onda.outputs["Fac"], bump.inputs["Height"])
    link(nt, bump.outputs["Normal"], b.inputs["Normal"])
    return m

def mat_simples(nome, cor, rug=0.6, metal=0.0):
    m, nt, b = novo_mat(nome)
    b.inputs["Base Color"].default_value = (*cor, 1)
    b.inputs["Roughness"].default_value = rug
    b.inputs["Metallic"].default_value = metal
    return m

def mat_luz(nome, temp=2600, forca=6.0):
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    bb = nt.nodes.new("ShaderNodeBlackbody")
    bb.inputs["Temperature"].default_value = temp
    nt.links.new(bb.outputs["Color"], em.inputs["Color"])
    em.inputs["Strength"].default_value = forca
    nt.links.new(em.outputs["Emission"], out.inputs["Surface"])
    return m

M_REBOCO = mat_reboco("reboco")
M_REBOCO_INT = mat_reboco("reboco_interno", (0.62, 0.57, 0.49))
M_PEDRA = mat_pedra("cantaria")
M_PISO = mat_piso("piso")
M_PISO_GAL = mat_pedra("piso_galeria", (0.22, 0.20, 0.18))
M_TELHA = mat_telhado("telha")
M_MADEIRA = mat_simples("madeira", (0.045, 0.028, 0.018), 0.45)
M_FERRO = mat_simples("ferro", (0.02, 0.02, 0.02), 0.4, 0.85)
M_LAMPIAO = mat_luz("lampiao", 2500, 14.0)
M_JANELAS = [mat_luz("janela_%d" % i, t, f) for i, (t, f) in enumerate([(2700, 1.6), (3000, 1.1), (2400, 2.0), (2800, 0.8)])]
M_SINOS = mat_luz("campanario", 2300, 0.9)

# --------------------------------------------------------------------------
# geometria
# --------------------------------------------------------------------------
COLECAO = bpy.data.collections.new("cena")
scene.collection.children.link(COLECAO)

def objeto(nome, bm, mat, pai=None):
    me = bpy.data.meshes.new(nome)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(nome, me)
    COLECAO.objects.link(ob)
    if mat:
        ob.data.materials.append(mat)
    if pai:
        ob.parent = pai
    for p in ob.data.polygons:
        p.use_smooth = False
    return ob

def add_box(bm, x0, x1, y0, y1, z0, z1):
    M = Matrix.Translation(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)) @ Matrix.Diagonal((x1 - x0, y1 - y0, z1 - z0, 1))
    bmesh.ops.create_cube(bm, size=1.0, matrix=M)

def caixa(nome, x0, x1, y0, y1, z0, z1, mat, pai=None, chanfro=0.0):
    bm = bmesh.new()
    add_box(bm, x0, x1, y0, y1, z0, z1)
    ob = objeto(nome, bm, mat, pai)
    if chanfro:
        bv = ob.modifiers.new("chanfro", "BEVEL")
        bv.width = chanfro
        bv.segments = 2
    return ob

def perfil_arco(xc, larg, mola, base, seg=40):
    r = larg / 2
    pts = [(xc - r, base), (xc + r, base), (xc + r, mola)]
    for i in range(1, seg):
        a = math.pi * i / seg
        pts.append((xc + r * math.cos(a), mola + r * math.sin(a)))
    pts.append((xc - r, mola))
    return pts

def prisma_xz(bm, pts, y0, y1):
    """Extruda um perfil do plano XZ ao longo de Y (fecha as tampas)."""
    v0 = [bm.verts.new((x, y0, z)) for x, z in pts]
    v1 = [bm.verts.new((x, y1, z)) for x, z in pts]
    bm.faces.new(v0)
    bm.faces.new(list(reversed(v1)))
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((v0[i], v0[j], v1[j], v1[i]))

def anel_arco(bm, xc, r_in, r_out, mola, y0, y1, seg=40):
    pts = []
    for i in range(seg + 1):
        a = math.pi * i / seg
        pts.append((xc + r_out * math.cos(a), mola + r_out * math.sin(a)))
    for i in range(seg, -1, -1):
        a = math.pi * i / seg
        pts.append((xc + r_in * math.cos(a), mola + r_in * math.sin(a)))
    prisma_xz(bm, pts, y0, y1)

def recortar(ob, cortador):
    cortador.hide_render = True
    cortador.hide_viewport = True
    b = ob.modifiers.new("recorte", "BOOLEAN")
    b.operation = "DIFFERENCE"
    b.solver = "EXACT"
    b.object = cortador

def vazio(nome, loc, rot_z):
    e = bpy.data.objects.new(nome, None)
    COLECAO.objects.link(e)
    e.location = loc
    e.rotation_euler = (0, 0, math.radians(rot_z))
    return e

def luz_ponto(nome, loc, forca, raio=0.06, temp_cor=(1.0, 0.62, 0.30), pai=None):
    d = bpy.data.lights.new(nome, "POINT")
    d.energy = forca
    d.shadow_soft_size = raio
    d.color = temp_cor
    ob = bpy.data.objects.new(nome, d)
    COLECAO.objects.link(ob)
    ob.location = loc
    if pai:
        ob.parent = pai
    return ob

# parâmetros da arcada (módulo de 4,6 m, como um claustro de escala institucional)
N_ARCOS = 5
MODULO = 4.6
VAO = 3.3
MOLA = 3.05
R = VAO / 2
ESP = 0.85          # espessura da parede da arcada
H_TERREO = 5.35     # topo da parede do térreo
MEIO = (N_ARCOS - 1) / 2
CENTROS = [(i - MEIO) * MODULO for i in range(N_ARCOS)]
X0, X1 = -N_ARCOS * MODULO / 2 - 0.4, N_ARCOS * MODULO / 2 + 0.4

def ala(nome, loc, rot, prof=4.6, andar_superior=True, luzes=True, portas=True):
    """Uma ala do claustro em coordenadas locais: fachada em y=0 voltada para -y."""
    pai = vazio(nome, loc, rot)
    # parede da arcada com os vãos recortados
    bm = bmesh.new()
    add_box(bm, X0, X1, 0, ESP, 0, H_TERREO)
    parede = objeto(nome + "_arcada", bm, M_REBOCO, pai)
    bm = bmesh.new()
    for xc in CENTROS:
        prisma_xz(bm, perfil_arco(xc, VAO, MOLA, -0.5), -0.5, ESP + 0.5)
    corte = objeto(nome + "_corte", bm, None, pai)
    recortar(parede, corte)
    # arquivolta, impostas e embasamento em cantaria
    bm = bmesh.new()
    for xc in CENTROS:
        anel_arco(bm, xc, R, R + 0.32, MOLA, -0.06, 0.12)
        anel_arco(bm, xc, R - 0.001, R + 0.02, MOLA, 0.0, ESP)  # intradorso
    objeto(nome + "_arquivolta", bm, M_PEDRA, pai)
    bm = bmesh.new()
    for i in range(N_ARCOS + 1):
        xp = (i - MEIO - 0.5) * MODULO
        meia = (MODULO - VAO) / 2
        add_box(bm, xp - meia - 0.08, xp + meia + 0.08, -0.08, ESP + 0.08, MOLA - 0.24, MOLA)      # imposta
        add_box(bm, xp - meia - 0.1, xp + meia + 0.1, -0.1, ESP + 0.1, 0.0, 0.62)                  # embasamento
    objeto(nome + "_impostas", bm, M_PEDRA, pai)
    # piso da galeria (um degrau acima do pátio) e teto
    caixa(nome + "_piso", X0, X1, -0.35, prof, 0, 0.17, M_PISO_GAL, pai, 0.01)
    caixa(nome + "_teto", X0, X1, 0, prof, H_TERREO - 0.05, H_TERREO + 0.25, M_REBOCO_INT, pai)
    # parede do fundo da galeria com portas
    fundo = caixa(nome + "_fundo", X0, X1, prof, prof + 0.5, 0, H_TERREO, M_REBOCO_INT, pai)
    if portas:
        bm = bmesh.new()
        for k, xc in enumerate(CENTROS):
            if k % 2 == 0:
                prisma_xz(bm, perfil_arco(xc, 1.5, 2.55, 0.17), prof - 0.2, prof + 0.25)
        corte_p = objeto(nome + "_corte_portas", bm, None, pai)
        recortar(fundo, corte_p)
        bm = bmesh.new()
        for k, xc in enumerate(CENTROS):
            if k % 2 == 0:
                add_box(bm, xc - 0.76, xc + 0.76, prof + 0.2, prof + 0.26, 0.17, 3.35)
        objeto(nome + "_portas", bm, M_MADEIRA, pai)
    if luzes:
        for k, xc in enumerate(CENTROS):
            xl = xc + (1.2 if k % 2 == 0 else 0.0)
            caixa(nome + "_arandela_%d" % k, xl - 0.09, xl + 0.09, prof - 0.2, prof - 0.02, 2.95, 3.3, M_LAMPIAO, pai)
            luz_ponto(nome + "_luz_%d" % k, (xl, prof - 0.35, 3.1), 55, 0.05, pai=pai)
    if andar_superior:
        caixa(nome + "_friso", X0 - 0.05, X1 + 0.05, -0.12, ESP, H_TERREO, H_TERREO + 0.22, M_PEDRA, pai, 0.02)
        z0, z1 = H_TERREO + 0.22, 9.4
        sup = caixa(nome + "_superior", X0, X1, 0.05, ESP + prof, z0, z1, M_REBOCO, pai)
        bm = bmesh.new()
        for xc in CENTROS:
            add_box(bm, xc - 0.62, xc + 0.62, -0.5, 0.45, 6.35, 8.45)
        corte_j = objeto(nome + "_corte_janelas", bm, None, pai)
        recortar(sup, corte_j)
        bm = bmesh.new()
        for xc in CENTROS:
            add_box(bm, xc - 0.8, xc - 0.62, -0.06, 0.2, 6.2, 8.6)
            add_box(bm, xc + 0.62, xc + 0.8, -0.06, 0.2, 6.2, 8.6)
            add_box(bm, xc - 0.9, xc + 0.9, -0.1, 0.2, 8.45, 8.75)
            add_box(bm, xc - 0.9, xc + 0.9, -0.16, 0.2, 6.2, 6.35)
        objeto(nome + "_molduras", bm, M_PEDRA, pai)
        for k, xc in enumerate(CENTROS):
            acesa = random.random() < 0.62
            mat = random.choice(M_JANELAS) if acesa else M_MADEIRA
            caixa(nome + "_vidro_%d" % k, xc - 0.62, xc + 0.62, 0.4, 0.45, 6.35, 8.45, mat, pai)
            if acesa:
                luz_ponto(nome + "_luzjan_%d" % k, (xc, 1.1, 7.3), 30, 0.4, (1.0, 0.7, 0.42), pai)
            # venezianas abertas
            caixa(nome + "_vez_e_%d" % k, xc - 1.5, xc - 0.84, -0.14, -0.08, 6.35, 8.45, M_MADEIRA, pai)
            caixa(nome + "_vez_d_%d" % k, xc + 0.84, xc + 1.5, -0.14, -0.08, 6.35, 8.45, M_MADEIRA, pai)
        caixa(nome + "_cornija", X0 - 0.3, X1 + 0.3, -0.45, ESP + prof, 9.4, 9.78, M_PEDRA, pai, 0.03)
        # telhado de duas águas simplificado (uma água visível)
        bm = bmesh.new()
        v = [bm.verts.new(p) for p in [(X0 - 0.4, -0.75, 9.72), (X1 + 0.4, -0.75, 9.72), (X1 + 0.4, prof + 0.4, 12.2), (X0 - 0.4, prof + 0.4, 12.2)]]
        f = bm.faces.new(v)
        bmesh.ops.solidify(bm, geom=[f], thickness=0.12)
        tel = objeto(nome + "_telhado", bm, M_TELHA, pai)
    return pai

# ala próxima: a câmera está dentro da galeria, olhando o pátio pelo arco central
ala("ala_proxima", (0, 0.5, 0), 180, prof=7.0, andar_superior=False, luzes=False, portas=False)
luz_ponto("proxima_luz_e", (-2.55, -2.6, 3.2), 7, 0.08)
luz_ponto("proxima_luz_d", (2.55, -2.6, 3.2), 7, 0.08)
# ala do fundo e alas laterais
ala("ala_fundo", (0, 24.5, 0), 0)
ala("ala_esquerda", (-12.2, 12.5, 0), 90)
ala("ala_direita", (12.2, 12.5, 0), -90)

# pátio
caixa("patio", -12.5, 12.5, 0.2, 24.6, -0.05, 0.0, M_PISO)

# postes de iluminação no pátio
def poste(x, y):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=20, radius1=0.16, radius2=0.12, depth=0.6, matrix=Matrix.Translation((x, y, 0.3)))
    bmesh.ops.create_cone(bm, cap_ends=True, segments=16, radius1=0.055, radius2=0.045, depth=3.0, matrix=Matrix.Translation((x, y, 1.9)))
    bmesh.ops.create_cone(bm, cap_ends=True, segments=4, radius1=0.34, radius2=0.02, depth=0.3, matrix=Matrix.Translation((x, y, 4.12)) @ Matrix.Rotation(math.radians(45), 4, "Z"))
    objeto("poste_%s_%s" % (x, y), bm, M_FERRO)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=4, radius1=0.15, radius2=0.22, depth=0.55, matrix=Matrix.Translation((x, y, 3.68)) @ Matrix.Rotation(math.radians(45), 4, "Z"))
    objeto("lanterna_%s_%s" % (x, y), bm, M_LAMPIAO)
    luz_ponto("luz_poste_%s_%s" % (x, y), (x, y, 3.7), 120, 0.1)

for (x, y) in [(-4.4, 9.5), (4.4, 9.5), (-4.4, 17.5), (4.4, 17.5)]:
    poste(x, y)

# torre sineira atrás da ala do fundo
TX, TY, TL = 2.6, 31.2, 4.6
caixa("torre_fuste", TX - TL / 2, TX + TL / 2, TY - TL / 2, TY + TL / 2, 0, 16.6, M_REBOCO)
for z in (12.2, 16.6):
    caixa("torre_friso_%s" % z, TX - TL / 2 - 0.14, TX + TL / 2 + 0.14, TY - TL / 2 - 0.14, TY + TL / 2 + 0.14, z, z + 0.3, M_PEDRA, chanfro=0.02)
camp = caixa("torre_campanario", TX - TL / 2 + 0.1, TX + TL / 2 - 0.1, TY - TL / 2 + 0.1, TY + TL / 2 - 0.1, 16.9, 20.6, M_REBOCO)
bm = bmesh.new()
prisma_xz(bm, perfil_arco(TX, 1.5, 19.3, 17.3), TY - 3, TY + 3)
corte_c1 = objeto("corte_camp_1", bm, None)
recortar(camp, corte_c1)
bm = bmesh.new()
pts = perfil_arco(TY, 1.5, 19.3, 17.3)
v0 = [bm.verts.new((TX - 3, y, z)) for y, z in pts]
v1 = [bm.verts.new((TX + 3, y, z)) for y, z in pts]
bm.faces.new(list(reversed(v0)))
bm.faces.new(v1)
for i in range(len(pts)):
    j = (i + 1) % len(pts)
    bm.faces.new((v0[j], v0[i], v1[i], v1[j]))
corte_c2 = objeto("corte_camp_2", bm, None)
m2 = camp.modifiers.new("recorte2", "BOOLEAN")
m2.operation = "DIFFERENCE"; m2.solver = "EXACT"; m2.object = corte_c2
corte_c2.hide_render = True
caixa("campanario_luz", TX - 1.2, TX + 1.2, TY - 1.2, TY + 1.2, 16.9, 20.4, M_SINOS)
luz_ponto("luz_campanario", (TX, TY, 18.4), 160, 0.5, (1.0, 0.6, 0.3))
caixa("torre_cornija", TX - TL / 2 - 0.3, TX + TL / 2 + 0.3, TY - TL / 2 - 0.3, TY + TL / 2 + 0.3, 20.6, 21.0, M_PEDRA, chanfro=0.03)
bm = bmesh.new()
bmesh.ops.create_cone(bm, cap_ends=True, segments=4, radius1=(TL / 2 + 0.2) * math.sqrt(2), radius2=0.05, depth=4.2, matrix=Matrix.Translation((TX, TY, 23.1)) @ Matrix.Rotation(math.radians(45), 4, "Z"))
objeto("torre_telhado", bm, M_TELHA)
bm = bmesh.new()
bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=0.22, matrix=Matrix.Translation((TX, TY, 25.3)))
bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=0.035, radius2=0.035, depth=1.6, matrix=Matrix.Translation((TX, TY, 25.9)))
objeto("torre_pinaculo", bm, M_FERRO)
# massa de edifícios além do claustro (silhueta no horizonte)
caixa("massa_fundo", -30, 30, 36, 40, 0, 11.5, M_REBOCO)

# --------------------------------------------------------------------------
# céu da hora azul, câmera e render
# --------------------------------------------------------------------------
world = bpy.data.worlds.new("mundo")
scene.world = world
world.use_nodes = True
wn = world.node_tree
bg = wn.nodes["Background"]
ceu = wn.nodes.new("ShaderNodeTexSky")
ceu.sky_type = "NISHITA"
ceu.sun_elevation = math.radians(float(os.environ.get("SOL_ELEV", "-2.0")))
ceu.sun_rotation = math.radians(float(os.environ.get("SOL_ROT", "90")))
ceu.sun_disc = False
ceu.air_density = 1.0
ceu.dust_density = 2.0
# degradê de hora azul + nuvens finas, somado ao céu físico (que dá a cor do horizonte)
tc = wn.nodes.new("ShaderNodeTexCoord")
sep = wn.nodes.new("ShaderNodeSeparateXYZ")
wn.links.new(tc.outputs["Generated"], sep.inputs["Vector"])
grad = wn.nodes.new("ShaderNodeValToRGB")
els = grad.color_ramp.elements
els[0].position = 0.02; els[0].color = (0.55, 0.36, 0.26, 1)
els[1].position = 0.75; els[1].color = (0.012, 0.022, 0.07, 1)
e = els.new(0.16); e.color = (0.20, 0.20, 0.30, 1)
e = els.new(0.34); e.color = (0.06, 0.10, 0.24, 1)
wn.links.new(sep.outputs["Z"], grad.inputs["Fac"])
# nuvens projetadas num "teto" (divide a direção pela altura)
somaz = wn.nodes.new("ShaderNodeMath"); somaz.operation = "ADD"; somaz.inputs[1].default_value = 0.08
wn.links.new(sep.outputs["Z"], somaz.inputs[0])
div = wn.nodes.new("ShaderNodeVectorMath"); div.operation = "DIVIDE"
wn.links.new(tc.outputs["Generated"], div.inputs[0])
comb = wn.nodes.new("ShaderNodeCombineXYZ")
for k in ("X", "Y", "Z"):
    wn.links.new(somaz.outputs["Value"], comb.inputs[k])
wn.links.new(comb.outputs["Vector"], div.inputs[1])
esc = wn.nodes.new("ShaderNodeMapping"); esc.inputs["Scale"].default_value = (0.9, 2.4, 1.0)
wn.links.new(div.outputs["Vector"], esc.inputs["Vector"])
nuv = wn.nodes.new("ShaderNodeTexNoise"); nuv.inputs["Scale"].default_value = 1.3; nuv.inputs["Detail"].default_value = 12; nuv.inputs["Roughness"].default_value = 0.62
wn.links.new(esc.outputs["Vector"], nuv.inputs["Vector"])
masc = wn.nodes.new("ShaderNodeValToRGB")
masc.color_ramp.elements[0].position = 0.5; masc.color_ramp.elements[0].color = (0, 0, 0, 1)
masc.color_ramp.elements[1].position = 0.72; masc.color_ramp.elements[1].color = (0.8, 0.8, 0.8, 1)
wn.links.new(nuv.outputs["Fac"], masc.inputs["Fac"])
mixn = wn.nodes.new("ShaderNodeMix"); mixn.data_type = "RGBA"
wn.links.new(masc.outputs["Color"], mixn.inputs["Factor"])
wn.links.new(grad.outputs["Color"], mixn.inputs[6])
mixn.inputs[7].default_value = (0.035, 0.038, 0.055, 1)
somac = wn.nodes.new("ShaderNodeMix"); somac.data_type = "RGBA"; somac.blend_type = "ADD"; somac.inputs["Factor"].default_value = 0.35
wn.links.new(mixn.outputs[2], somac.inputs[6])
wn.links.new(ceu.outputs["Color"], somac.inputs[7])
wn.links.new(somac.outputs[2], bg.inputs["Color"])
bg.inputs["Strength"].default_value = float(os.environ.get("CEU_FORCA", "1.05"))

cam_d = bpy.data.cameras.new("camera")
cam_d.lens = 20.05
cam_d.sensor_width = 36
cam_d.sensor_fit = "HORIZONTAL"
cam_d.shift_y = 0.164
cam_d.clip_start = 0.1
cam_d.clip_end = 400
cam = bpy.data.objects.new("camera", cam_d)
COLECAO.objects.link(cam)
cam.location = (0.35, -3.5, 1.55)
cam.rotation_euler = (math.radians(90), 0, 0)
scene.camera = cam

r = scene.render
r.engine = "CYCLES"
r.resolution_x = W
r.resolution_y = H
r.resolution_percentage = 100
r.film_transparent = False
c = scene.cycles
c.device = "CPU"
c.samples = SAMPLES
c.use_adaptive_sampling = True
c.adaptive_threshold = 0.02
c.use_denoising = True
c.denoiser = "OPENIMAGEDENOISE"
c.max_bounces = 6
c.diffuse_bounces = 3
c.glossy_bounces = 3
c.sample_clamp_indirect = 4.0
c.blur_glossy = 1.0
scene.view_settings.view_transform = "AgX"
scene.view_settings.look = "AgX - Medium High Contrast"
scene.view_settings.exposure = float(os.environ.get("EXPOSICAO", "-0.3"))

vl = scene.view_layers[0]
vl.use_pass_z = True

scene.use_nodes = True
tree = scene.node_tree
for n in list(tree.nodes):
    tree.nodes.remove(n)
rl = tree.nodes.new("CompositorNodeRLayers")
glare = tree.nodes.new("CompositorNodeGlare")
glare.glare_type = "FOG_GLOW"
glare.quality = "HIGH"
glare.threshold = 0.9
glare.size = 8
comp = tree.nodes.new("CompositorNodeComposite")
tree.links.new(rl.outputs["Image"], glare.inputs["Image"])
tree.links.new(glare.outputs["Image"], comp.inputs["Image"])
fo = tree.nodes.new("CompositorNodeOutputFile")
fo.base_path = OUT
fo.format.file_format = "OPEN_EXR"
fo.format.color_depth = "32"
fo.file_slots[0].path = "profundidade_"
tree.links.new(rl.outputs["Depth"], fo.inputs[0])

r.image_settings.file_format = "PNG"
r.image_settings.color_depth = "16"
r.filepath = os.path.join(OUT, "arcadas.png")
bpy.ops.render.render(write_still=True)
print("OK", r.filepath)
