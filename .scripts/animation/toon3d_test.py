"""
3D feasibility test (NOT used by the pipeline): an original Raazu-like toon
character built from primitives in Blender, cel-shaded (Shader-to-RGB +
constant ColorRamp) with inverted-hull outlines, rendered headless on CPU.
Lip-sync: a mouth shape key driven per frame by the TTS loudness envelope.

  blender -b --factory-startup --python toon3d_test.py -- \
      --env env.json --out /workspace/anim-demo/3d/frames/ --fps 25 --w 1280 --h 720
"""
import bpy, json, math, sys

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
opt = {argv[i][2:]: argv[i + 1] for i in range(0, len(argv) - 1, 2)}
env = json.load(open(opt["env"])) if "env" in opt else [0.0] * 125
FPS = int(opt.get("fps", 25))
W, H = int(opt.get("w", 1280)), int(opt.get("h", 720))
ENGINE = opt.get("engine", "BLENDER_EEVEE_NEXT")

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = ENGINE
sc.render.resolution_x, sc.render.resolution_y = W, H
sc.render.fps = FPS
sc.frame_start, sc.frame_end = 1, len(env)
sc.render.image_settings.file_format = "PNG"
sc.render.filepath = opt.get("out", "/tmp/toon3d/")
if ENGINE == "BLENDER_EEVEE_NEXT":
    sc.eevee.taa_render_samples = 4
sc.view_settings.view_transform = "Standard"

def toon(name, base, shadow, rim=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    dif = nt.nodes.new("ShaderNodeBsdfDiffuse")
    s2r = nt.nodes.new("ShaderNodeShaderToRGB")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.interpolation = "CONSTANT"
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = shadow
    ramp.color_ramp.elements[1].position = 0.25
    ramp.color_ramp.elements[1].color = base
    emi = nt.nodes.new("ShaderNodeEmission")
    nt.links.new(dif.outputs[0], s2r.inputs[0])
    nt.links.new(s2r.outputs[0], ramp.inputs[0])
    if rim:
        # fresnel rim light on top of the two tones
        lw = nt.nodes.new("ShaderNodeLayerWeight")
        lw.inputs[0].default_value = 0.25
        r2 = nt.nodes.new("ShaderNodeValToRGB")
        r2.color_ramp.interpolation = "CONSTANT"
        r2.color_ramp.elements[1].position = 0.75
        mix = nt.nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        nt.links.new(lw.outputs["Facing"], r2.inputs[0])
        nt.links.new(r2.outputs[0], mix.inputs[0])
        nt.links.new(ramp.outputs[0], mix.inputs[6])
        mix.inputs[7].default_value = rim
        nt.links.new(mix.outputs[2], emi.inputs[0])
    else:
        nt.links.new(ramp.outputs[0], emi.inputs[0])
    nt.links.new(emi.outputs[0], out.inputs[0])
    return m

def outline_mat():
    m = bpy.data.materials.new("ink")
    m.use_nodes = True
    m.use_backface_culling = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    e = nt.nodes.new("ShaderNodeEmission")
    e.inputs[0].default_value = (0.03, 0.02, 0.05, 1)
    nt.links.new(e.outputs[0], out.inputs[0])
    return m

INK = outline_mat()
RIM = (1.0, 0.85, 0.6, 1)

def add(obj, mat, thick=0.03):
    obj.data.materials.append(mat)
    obj.data.materials.append(INK)
    bpy.ops.object.shade_smooth()
    mod = obj.modifiers.new("ink", "SOLIDIFY")
    mod.thickness = thick
    mod.offset = 1
    mod.use_flip_normals = True
    mod.material_offset = 1
    return obj

def sphere(name, loc, scale, mat, thick=0.03):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    return add(o, mat, thick)

SKIN = toon("skin", (0.85, 0.6, 0.4, 1), (0.66, 0.42, 0.28, 1), RIM)
COAT = toon("coat", (0.11, 0.55, 0.56, 1), (0.06, 0.38, 0.4, 1), RIM)
HAIR = toon("hair", (0.17, 0.11, 0.09, 1), (0.08, 0.05, 0.04, 1))
SCARF = toon("scarf", (0.95, 0.7, 0.2, 1), (0.75, 0.5, 0.1, 1))
WHITE = toon("white", (1, 1, 1, 1), (0.85, 0.85, 0.9, 1))
DARK = toon("dark", (0.05, 0.04, 0.06, 1), (0.02, 0.02, 0.03, 1))
PANTS = toon("pants", (0.2, 0.25, 0.45, 1), (0.12, 0.15, 0.3, 1))
MOUTH = toon("mouth", (0.55, 0.12, 0.18, 1), (0.4, 0.08, 0.12, 1))
GROUND = toon("ground", (0.85, 0.88, 0.95, 1), (0.6, 0.62, 0.75, 1))

rig = bpy.data.objects.new("rig", None)
sc.collection.objects.link(rig)

def parent(o):
    o.parent = rig
    return o

# body (chibi: head ~ half the height)
body = parent(sphere("body", (0, 0, 0.75), (0.42, 0.34, 0.5), COAT))
for i in range(4):
    parent(sphere(f"btn{i}", (0.1, -0.33, 0.95 - i * 0.14), (0.04, 0.02, 0.04), SCARF, 0.01))
scarf = parent(sphere("scarf", (0, 0, 1.18), (0.36, 0.3, 0.1), SCARF))
for s in (-1, 1):
    parent(sphere(f"leg{s}", (s * 0.17, 0, 0.18), (0.11, 0.11, 0.22), PANTS))
    parent(sphere(f"shoe{s}", (s * 0.17, -0.06, 0.0), (0.13, 0.18, 0.07), HAIR))
    parent(sphere(f"arm{s}", (s * 0.47, 0, 0.8), (0.1, 0.1, 0.3), COAT))
    parent(sphere(f"hand{s}", (s * 0.5, 0, 0.48), (0.09, 0.09, 0.09), SKIN, 0.02))

head = bpy.data.objects.new("head", None)
sc.collection.objects.link(head)
head.parent = rig
head.location = (0, 0, 1.75)

def hpart(o):
    o.parent = head
    o.location = (o.location[0], o.location[1], o.location[2] - 1.75)
    return o

hpart(sphere("face", (0, 0, 1.75), (0.6, 0.55, 0.56), SKIN))
hpart(sphere("hair", (0, 0.06, 1.98), (0.63, 0.58, 0.42), HAIR))
hpart(sphere("curl", (0.05, 0.05, 2.42), (0.08, 0.08, 0.14), HAIR, 0.02))
for s in (-1, 1):
    hpart(sphere(f"ear{s}", (s * 0.6, 0, 1.72), (0.1, 0.06, 0.12), SKIN, 0.02))
    hpart(sphere(f"eye{s}", (s * 0.2, -0.48, 1.8), (0.13, 0.06, 0.15), WHITE, 0.015))
    hpart(sphere(f"pupil{s}", (s * 0.2 + 0.02, -0.53, 1.79), (0.06, 0.03, 0.08), DARK, 0.0))
    hpart(sphere(f"shine{s}", (s * 0.2 + 0.05, -0.56, 1.83), (0.02, 0.01, 0.025), WHITE, 0.0))
    bpy.ops.mesh.primitive_torus_add(major_radius=0.18, minor_radius=0.018, location=(s * 0.2, -0.53, 1.8), rotation=(math.pi / 2, 0, 0))
    g = bpy.context.object
    g.data.materials.append(DARK)
    hpart(g)
    hpart(sphere(f"brow{s}", (s * 0.2, -0.5, 2.0), (0.12, 0.03, 0.025), HAIR, 0.0))
mouth = hpart(sphere("mouth", (0, -0.5, 1.5), (0.1, 0.04, 0.02), MOUTH, 0.012))

bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, -0.07))
g = bpy.context.object
g.data.materials.append(GROUND)

# key light from camera-left, world dark purple
sun = bpy.data.lights.new("sun", "SUN")
sun.energy = 3
so = bpy.data.objects.new("sun", sun)
so.rotation_euler = (math.radians(50), math.radians(-35), math.radians(-30))
sc.collection.objects.link(so)
world = bpy.data.worlds.new("w")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0.2, 0.15, 0.35, 1)
sc.world = world

cam = bpy.data.cameras.new("cam")
cam.lens = 50
co = bpy.data.objects.new("cam", cam)
co.location = (0, -6.2, 1.5)
co.rotation_euler = (math.radians(88), 0, 0)
sc.collection.objects.link(co)
sc.camera = co

# animation: lip-sync from the loudness envelope + idle bob + head turn
for f, lv in enumerate(env, start=1):
    t = f / FPS
    mouth.scale = (0.1 + 0.03 * lv, 0.04, 0.02 + 0.11 * lv)
    mouth.keyframe_insert("scale", frame=f)
    rig.location = (0, 0, 0.02 * math.sin(t * 5))
    rig.keyframe_insert("location", frame=f)
    head.rotation_euler = (0.04 * math.sin(t * 7) * lv, 0, 0.3 * math.sin(t * 0.9))
    head.keyframe_insert("rotation_euler", frame=f)
bpy.ops.render.render(animation=True)
print("DONE", len(env))
