import React, { useEffect, useRef, useState } from "react";
import arteUrl from "./assets/arcadas.webp";
import profundidadeUrl from "./assets/arcadas-profundidade.png";

/* ============================================================================
   HERO DAS ARCADAS — render 3D (Cycles) + mapa de profundidade, animado em WebGL
   ----------------------------------------------------------------------------
   A imagem é um render estático da cena (ver cena/arcadas.py). O navegador só
   desloca cada pixel conforme a sua profundidade (efeito 2,5D) e soma:
     · respiração lenta da câmera e parallax pelo mouse / rolagem
     · névoa baixa que atravessa o pátio
     · cintilação dos lampiões e brilho trêmulo nas poças
     · grão de filme
   Custo: 1 draw call por quadro. Pausa fora da tela e com a aba oculta.
   Com "reduzir movimento" ou sem WebGL, mostra só a imagem estática.
============================================================================ */

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform sampler2D uImg;
uniform sampler2D uProf;
uniform vec2 uRes;
uniform vec2 uImgRes;
uniform vec2 uOff;
uniform vec2 uFoco;
uniform float uTempo;
uniform float uZoom;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float ruido(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * ruido(p); p *= 2.03; a *= 0.5; }
  return v;
}

void main() {
  // enquadramento "cover" com ponto focal
  float ra = uRes.x / uRes.y, ri = uImgRes.x / uImgRes.y;
  vec2 esc = ra > ri ? vec2(1.0, ri / ra) : vec2(ra / ri, 1.0);
  vec2 uv = (vUv - 0.5) * esc / uZoom;
  vec2 folga = 0.5 - esc / uZoom * 0.5;
  uv += 0.5 + (uFoco - 0.5) * 2.0 * folga;

  // parallax por profundidade (iteração de ponto fixo: resolve a oclusão de forma aproximada)
  vec2 p = uv;
  for (int i = 0; i < 5; i++) {
    float d = texture2D(uProf, p).r;
    p = uv + uOff * (d - 0.32);
  }
  float prof = texture2D(uProf, p).r;

  // poças: pequeno tremor horizontal no terço inferior (onde está o piso molhado)
  float piso = smoothstep(0.30, 0.12, p.y) * smoothstep(0.02, 0.2, prof) * (1.0 - smoothstep(0.55, 0.8, prof));
  p.x += (ruido(vec2(p.x * 40.0, p.y * 220.0 - uTempo * 1.4)) - 0.5) * 0.0026 * piso;

  vec3 cor = texture2D(uImg, p).rgb;

  // lampiões: cintilação sutil nos pontos quentes e muito claros
  float lum = dot(cor, vec3(0.299, 0.587, 0.114));
  float quente = smoothstep(0.62, 0.95, lum) * smoothstep(0.02, 0.18, cor.r - cor.b);
  float cint = ruido(vec2(floor(p.x * 60.0) * 3.1 + uTempo * 5.0, floor(p.y * 30.0)));
  cor *= 1.0 + quente * (cint - 0.5) * 0.10;

  // névoa baixa atravessando o pátio (mais densa ao longe e perto do chão)
  vec2 q = vec2(p.x * 2.2 + uTempo * 0.018, p.y * 5.0);
  float n = fbm(q + fbm(q * 0.7 + uTempo * 0.01));
  float faixa = smoothstep(0.62, 0.18, p.y);
  float nevoa = n * faixa * (1.0 - prof) * 0.16;
  vec3 corNevoa = mix(vec3(0.22, 0.27, 0.34), vec3(0.95, 0.72, 0.45), 0.35);
  cor = mix(cor, corNevoa, nevoa);

  // vinheta e grão de filme
  vec2 c = vUv - 0.5;
  cor *= 1.0 - dot(c, c) * 0.55;
  cor += (hash(vUv * uRes + fract(uTempo * 13.0)) - 0.5) * 0.028;

  gl_FragColor = vec4(cor, 1.0);
}
`;

function compilar(gl, tipo, fonte) {
  const s = gl.createShader(tipo);
  gl.shaderSource(s, fonte);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader");
  return s;
}

function carregar(url) {
  return new Promise((ok, erro) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => ok(img);
    img.onerror = erro;
    img.src = url;
  });
}

function textura(gl, img, unidade) {
  const t = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unidade);
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
  return t;
}

/**
 * props:
 *  - style: posicionamento do contêiner
 *  - rolagem: true = a câmera avança e sobe conforme a página rola (tela de boas-vindas)
 *  - foco: [x, y] ponto da imagem que fica visível quando o enquadramento corta (0..1)
 *  - intensidade: força do parallax (padrão 1)
 */
export default function HeroArcadas({ style, rolagem = false, foco = [0.5, 0.52], intensidade = 1 }) {
  const caixaRef = useRef(null);
  const canvasRef = useRef(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    const caixa = caixaRef.current, canvas = canvasRef.current;
    if (!caixa || !canvas) return undefined;
    let reduz = false;
    try { reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { reduz = false; }
    if (reduz) return undefined;

    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power", preserveDrawingBuffer: false });
    if (!gl) return undefined;

    let vivo = true, raf = 0, visivel = true;
    const toque = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    const dprMax = toque ? 1.25 : 1.5;
    const alvo = { x: 0, y: 0 }, atual = { x: 0, y: 0 };
    let rol = 0, rolAtual = 0;
    let u = null, imgRes = [1920, 1080];

    const tamanho = () => {
      const r = caixa.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, dprMax);
      canvas.width = Math.max(2, Math.round(r.width * dpr));
      canvas.height = Math.max(2, Math.round(r.height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const quadro = (ms) => {
      if (!vivo) return;
      raf = 0;
      if (!visivel || document.hidden || !u) return;
      const t = ms / 1000;
      atual.x += (alvo.x - atual.x) * 0.045;
      atual.y += (alvo.y - atual.y) * 0.045;
      rolAtual += (rol - rolAtual) * 0.08;
      // respiração lenta + mouse + rolagem
      const k = 0.022 * intensidade;
      const ox = (atual.x + Math.sin(t * 0.11) * 0.45) * k;
      const oy = (atual.y + Math.cos(t * 0.083) * 0.3 - rolAtual * 1.6) * k * 0.7;
      gl.uniform2f(u.off, ox, oy);
      gl.uniform1f(u.zoom, 1.06 + rolAtual * 0.08);
      gl.uniform1f(u.tempo, t);
      gl.uniform2f(u.res, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(quadro);
    };
    const pedir = () => { if (!raf && vivo) raf = requestAnimationFrame(quadro); };

    const mover = (e) => {
      const r = caixa.getBoundingClientRect();
      alvo.x = -((e.clientX - r.left) / r.width - 0.5) * 2;
      alvo.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    const sair = () => { alvo.x = 0; alvo.y = 0; };
    const rolar = () => {
      const r = caixa.getBoundingClientRect();
      rol = Math.max(0, Math.min(1, -r.top / Math.max(1, r.height)));
    };

    const io = typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver((ents) => { visivel = ents[0].isIntersecting; if (visivel) pedir(); }, { threshold: 0.01 })
      : null;
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => { tamanho(); pedir(); }) : null;
    const visib = () => { if (!document.hidden) pedir(); };

    Promise.all([carregar(arteUrl), carregar(profundidadeUrl)]).then(([img, prof]) => {
      if (!vivo) return;
      try {
        const prog = gl.createProgram();
        gl.attachShader(prog, compilar(gl, gl.VERTEX_SHADER, VERT));
        gl.attachShader(prog, compilar(gl, gl.FRAGMENT_SHADER, FRAG));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link");
        gl.useProgram(prog);
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(prog, "aPos");
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        textura(gl, img, 0);
        textura(gl, prof, 1);
        imgRes = [img.naturalWidth, img.naturalHeight];
        u = {
          img: gl.getUniformLocation(prog, "uImg"), prof: gl.getUniformLocation(prog, "uProf"),
          res: gl.getUniformLocation(prog, "uRes"), imgRes: gl.getUniformLocation(prog, "uImgRes"),
          off: gl.getUniformLocation(prog, "uOff"), foco: gl.getUniformLocation(prog, "uFoco"),
          tempo: gl.getUniformLocation(prog, "uTempo"), zoom: gl.getUniformLocation(prog, "uZoom"),
        };
        gl.uniform1i(u.img, 0);
        gl.uniform1i(u.prof, 1);
        gl.uniform2f(u.imgRes, imgRes[0], imgRes[1]);
        gl.uniform2f(u.foco, foco[0], 1 - foco[1]);
        tamanho();
        setPronto(true);
        caixa.addEventListener("pointermove", mover);
        caixa.addEventListener("pointerleave", sair);
        if (rolagem) { window.addEventListener("scroll", rolar, { passive: true }); rolar(); }
        document.addEventListener("visibilitychange", visib);
        if (io) io.observe(caixa);
        if (ro) ro.observe(caixa);
        pedir();
      } catch (e) {
        // sem WebGL utilizável: fica a imagem estática
      }
    }).catch(() => {});

    return () => {
      vivo = false;
      if (raf) cancelAnimationFrame(raf);
      caixa.removeEventListener("pointermove", mover);
      caixa.removeEventListener("pointerleave", sair);
      window.removeEventListener("scroll", rolar);
      document.removeEventListener("visibilitychange", visib);
      if (io) io.disconnect();
      if (ro) ro.disconnect();
      const ext = gl.getExtension("WEBGL_lose_context");
      if (ext) ext.loseContext();
    };
  }, [rolagem, foco[0], foco[1], intensidade]);

  return (
    <div ref={caixaRef} style={{ position: "relative", overflow: "hidden", background: "#0B1116", ...style }}>
      <img
        src={arteUrl} alt="Pátio de um claustro neocolonial ao anoitecer, visto sob um arco, com lampiões acesos e piso molhado"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: `${foco[0] * 100}% ${foco[1] * 100}%`, transform: "scale(1.06)" }}
      />
      <canvas
        ref={canvasRef} aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", opacity: pronto ? 1 : 0, transition: "opacity 1.2s ease" }}
      />
    </div>
  );
}
