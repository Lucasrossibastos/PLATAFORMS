import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Moon, RotateCcw, Sparkles, Sun } from "lucide-react";
import { useApp } from "../state/AppContext.jsx";
import { useTema } from "../state/tema.js";
import { baseDoPapel } from "../navegacao.js";
import { MenuCheio } from "../ui/Cinema.jsx";
import { Botao, Grao, Marca } from "../ui/ui.jsx";

/* Moldura das telas internas: cabeçalho com pílulas de metal (quatro fixas +
   "Mais"), tema, conta; no celular, menu em tela cheia. */
export default function Shell({ menu }) {
  const { usuario, sair, restaurarExemplo } = useApp();
  const [tema, alternarTema] = useTema();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const base = baseDoPapel(usuario.role);
  const [rolou, setRolou] = useState(false);
  const [aberto, setAberto] = useState(null); // "mais" | "conta" | null
  const [menuCel, setMenuCel] = useState(false);

  useEffect(() => {
    const f = () => setRolou(window.scrollY > 8);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  useEffect(() => { window.scrollTo(0, 0); setAberto(null); }, [pathname]);
  useEffect(() => {
    if (!aberto) return undefined;
    const esc = (e) => { if (e.key === "Escape") setAberto(null); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [aberto]);

  const rota = (item) => `${base}/${item.k}`;
  const principais = menu.slice(0, 4);
  const extras = menu.slice(4);
  const extraAtivo = [...extras, principais[3]].some((i) => i && pathname.startsWith(rota(i)));
  const alternar = (qual) => setAberto((a) => (a === qual ? null : qual));
  const primeiro = usuario.name.split(" ")[0];
  const IconeTema = tema === "light" ? Moon : Sun;

  const restaurar = () => {
    restaurarExemplo();
    setAberto(null);
    navigate(base);
  };

  return (
    <div className="app">
      <header className={`app-topo${rolou ? " rolou" : ""}`}>
        <NavLink to={base} aria-label="Início"><Marca /></NavLink>

        <nav className="app-nav" aria-label="Principal">
          {principais.map((item, i) => (
            <NavLink key={item.k} to={rota(item)} className={`metal${i === 3 ? " so-largo" : ""}`}>{item.label}</NavLink>
          ))}
          {extras.length > 0 && (
            <div style={{ position: "relative" }}>
              <button type="button" className="metal" aria-expanded={aberto === "mais"} data-ativo={extraAtivo} onClick={() => alternar("mais")}>
                Mais<ChevronDown aria-hidden="true" />
              </button>
              {aberto === "mais" && (
                <div className="painel" style={{ right: "auto", left: 0 }}>
                  {[principais[3], ...extras].map((item, i) => (
                    <NavLink key={item.k} to={rota(item)} className={i === 0 ? "so-estreito" : undefined}>
                      <item.icone aria-hidden="true" />{item.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="app-acoes">
          <button type="button" className="icone-btn opcional" onClick={alternarTema}
            aria-label={tema === "light" ? "Usar tema escuro" : "Usar tema claro"} title="Alternar tema">
            <IconeTema />
          </button>
          <div className="opcional" style={{ position: "relative" }}>
            <Botao variante="solido" tamanho="sm" aria-expanded={aberto === "conta"} onClick={() => alternar("conta")}>
              <span className="conta-inicial" aria-hidden="true">{usuario.name.charAt(0)}</span>{primeiro}
            </Botao>
            {aberto === "conta" && (
              <div className="painel">
                <div className="painel-cabeca">
                  <strong>{usuario.name}</strong>
                  <span>{usuario.email}</span>
                  <span>{usuario.role === "moderador" ? "Moderador" : "Aluno"}</span>
                </div>
                <hr />
                <button type="button" onClick={() => navigate("/boas-vindas")}><Sparkles />Rever a tela de boas-vindas</button>
                <button type="button" onClick={restaurar}><RotateCcw />Restaurar dados de exemplo</button>
                <button type="button" onClick={sair}><LogOut />Sair</button>
              </div>
            )}
          </div>
          <button type="button" className="burger" aria-expanded={menuCel} aria-controls="menu-app"
            aria-label="Abrir menu" onClick={() => setMenuCel(true)}>
            <span /><span /><span />
          </button>
        </div>
      </header>
      {aberto && <div style={{ position: "fixed", inset: 0, zIndex: 30 }} onClick={() => setAberto(null)} aria-hidden="true" />}

      <MenuCheio aberto={menuCel} aoFechar={() => setMenuCel(false)} id="menu-app" className="menu-cheio--app"
        rodape={<>
          <Botao variante="vidro" icone={IconeTema} onClick={alternarTema}>{tema === "light" ? "Tema escuro" : "Tema claro"}</Botao>
          <Botao variante="vidro" icone={LogOut} onClick={sair}>Sair</Botao>
        </>}>
        <div className="menu-cheio-lista">
          {menu.map((item) => (
            <NavLink key={item.k} to={rota(item)} className="metal" onClick={() => setMenuCel(false)}>
              <item.icone aria-hidden="true" />{item.label}
            </NavLink>
          ))}
        </div>
      </MenuCheio>

      <main className="app-main" key={pathname}>
        <Outlet />
      </main>
      {/* grão só nas telas internas: sobre o vídeo, a mistura custa um quadro a cada quadro */}
      <Grao />
    </div>
  );
}
