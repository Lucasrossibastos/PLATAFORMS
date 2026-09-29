/* Materiais em áreas: o bloco colorido de cada área (ex.: "Listas de Física")
   e o cartão de cada material dentro dela. */

import { Link } from "react-router-dom";
import {
  Atom, Award, Beaker, Binary, Bird, Bone, BookOpen, BookOpenText, Brain, Bug, Building2, Calculator, CalendarDays, Castle, ChartLine,
  Church, ClipboardList, CloudSun, Code, Coins, Compass, Crown, Dna, Drama, Earth, ExternalLink, Factory, Feather, FileQuestion, Fish,
  Flag, FlaskConical, FolderOpen, Gavel, Globe2, GraduationCap, Handshake, HeartPulse, Headphones, Highlighter, Hourglass,
  Infinity as Infinito, Landmark, Languages, Laptop, Leaf, Library, Lightbulb, ListChecks, Magnet, Map as Mapa, MessagesSquare, Mic,
  Microscope, Mountain, Music, Newspaper, NotebookPen, Orbit, Palette, PenLine, Percent, Pi, Puzzle, Pyramid, Quote, Radiation, Rocket,
  Ruler, Scale, Scroll, Shapes, Sigma, SpellCheck, Sprout, Star, Stethoscope, Swords, Target, Telescope, TestTube, TestTubes,
  Thermometer, Tractor, TreePine, Triangle, Trophy, Users, Variable, Video, Vote, Waves, Zap,
} from "lucide-react";
import { useApp } from "../state/AppContext.jsx";
import { useAreasMateriais, useArquivoUrl } from "../state/hooks.js";
import { AREA_DA_MATERIA, nomeTipoMaterial } from "../services/materiais.js";
import { NomeConteudo } from "./Conteudo.jsx";

// o desenho de cada ícone (os ids e os grupos ficam em services/materiais.js)
export const ICONES_AREA = {
  calculadora: Calculator, sigma: Sigma, pi: Pi, variavel: Variable, porcentagem: Percent, infinito: Infinito, regua: Ruler,
  triangulo: Triangle, formas: Shapes, piramide: Pyramid, grafico: ChartLine, binario: Binary,
  atomo: Atom, ima: Magnet, raio: Zap, ondas: Waves, termometro: Thermometer, telescopio: Telescope, orbita: Orbit, radiacao: Radiation,
  frasco: FlaskConical, becker: Beaker, tubo: TestTube, tubos: TestTubes, dna: Dna, microscopio: Microscope, folha: Leaf, broto: Sprout,
  arvore: TreePine, coracao: HeartPulse, osso: Bone, inseto: Bug, peixe: Fish, passaro: Bird, estetoscopio: Stethoscope,
  globo: Globe2, terra: Earth, mapa: Mapa, bussola: Compass, montanha: Mountain, clima: CloudSun, coluna: Landmark, pergaminho: Scroll,
  coroa: Crown, espadas: Swords, castelo: Castle, bandeira: Flag, balanca: Scale, martelo: Gavel, voto: Vote, pessoas: Users,
  acordo: Handshake, cidade: Building2, fabrica: Factory, trator: Tractor, moedas: Coins, igreja: Church, cerebro: Brain,
  idiomas: Languages, caneta: PenLine, pena: Feather, aspas: Quote, ortografia: SpellCheck, conversa: MessagesSquare, jornal: Newspaper,
  microfone: Mic, teatro: Drama, musica: Music, paleta: Palette,
  livro: BookOpen, livroTexto: BookOpenText, biblioteca: Library, caderno: NotebookPen, lista: ListChecks, prancheta: ClipboardList,
  marcaTexto: Highlighter, lampada: Lightbulb, alvo: Target, ampulheta: Hourglass, calendario: CalendarDays, formatura: GraduationCap,
  trofeu: Trophy, medalha: Award, estrela: Star, foguete: Rocket, quebraCabeca: Puzzle, computador: Laptop, codigo: Code,
  video: Video, fones: Headphones,
};

// materiais sem área (ou de uma área apagada) ficam juntos aqui
export const AREA_OUTROS = { id: "outros", nome: "Outros materiais", rotulo: "", cor: "#64748B", icone: "livro" };

export function IconeArea({ icone, ...resto }) {
  const Icone = ICONES_AREA[icone] || FolderOpen;
  return <Icone aria-hidden="true" {...resto} />;
}

/* O bloco da área: ícone grande, "LISTAS DE" pequeno e o nome em destaque. */
export function TileArea({ area, detalhe, to, onClick }) {
  const conteudo = (
    <>
      <span className="tile-area-icone"><IconeArea icone={area.icone} strokeWidth={1.6} /></span>
      {area.rotulo && <span className="tile-area-rotulo">{area.rotulo}</span>}
      <strong className="tile-area-nome">{area.nome}</strong>
      {detalhe && <small className="tile-area-detalhe">{detalhe}</small>}
    </>
  );
  const estilo = { "--cor": area.cor };
  if (to) return <Link to={to} className="tile-area" style={estilo}>{conteudo}</Link>;
  if (onClick) return <button type="button" className="tile-area" style={estilo} onClick={onClick}>{conteudo}</button>;
  return <div className="tile-area" style={estilo}>{conteudo}</div>;
}

/* Cor e ícone de cada matéria, os mesmos de Materiais: a área que o
   moderador criou para a matéria, senão o padrão da matéria. */
export function useVisualMateria() {
  const { ind } = useApp();
  const areas = useAreasMateriais() || [];
  return (materiaId) => {
    const area = areas.find((a) => a.materiaId === materiaId);
    const padrao = AREA_DA_MATERIA[materiaId];
    return { cor: area?.cor || padrao?.cor || ind?.corDaMateria(materiaId) || "#64748B", icone: area?.icone || padrao?.icone || "livro" };
  };
}

// abre o PDF numa aba nova (o visualizador do navegador tem o "baixar")
export function BotaoAbrirPdf({ arquivo, rotulo = "Abrir" }) {
  const { url, carregando, faltando } = useArquivoUrl(arquivo?.ref);
  if (!arquivo) return null;
  if (carregando) return <span className="cartao-lista-acao" aria-busy="true">Carregando…</span>;
  if (faltando || !url) return <span className="cartao-lista-acao cartao-lista-acao--off">Arquivo indisponível neste aparelho</span>;
  return <a className="cartao-lista-acao" href={url} target="_blank" rel="noreferrer"><ExternalLink aria-hidden="true" />{rotulo}</a>;
}

/* Cartão de um material: faixa na cor da área com o ícone, matéria,
   título, orientação (tópico ou descrição), questões e as ações. */
export function CartaoLista({ m, area, extra, acoes }) {
  const { ind } = useApp();
  const sugestao = AREA_DA_MATERIA[m.materiaId];
  const cor = area && area.id !== "outros" ? area.cor : sugestao?.cor || area?.cor || "#64748B";
  const icone = area && area.id !== "outros" ? area.icone : sugestao?.icone || "livro";
  return (
    <article className="cartao-lista" style={{ "--cor": cor }}>
      <div className="cartao-lista-faixa"><IconeArea icone={icone} /></div>
      <div className="cartao-lista-corpo">
        {m.materiaId && <span className="cartao-lista-materia">{ind.nomeMateria(m.materiaId)}</span>}
        <h3>{m.titulo}</h3>
        <p className="cartao-lista-desc">
          {m.descricao || (m.topicoId ? <NomeConteudo materiaId={m.materiaId} topicoId={m.topicoId} subtopicoId={m.subtopicoId} semMateria /> : nomeTipoMaterial(m.tipo))}
        </p>
        <div className="cartao-lista-meta">
          {m.questoes ? <span className="cartao-lista-questoes"><FileQuestion aria-hidden="true" />{m.questoes} {m.questoes === 1 ? "questão" : "questões"}</span> : null}
          <span className="etiqueta">{nomeTipoMaterial(m.tipo)}</span>
          {m.publicado === false && <span className="etiqueta etiqueta--perigo">Rascunho</span>}
          {extra}
        </div>
        {acoes}
      </div>
    </article>
  );
}
