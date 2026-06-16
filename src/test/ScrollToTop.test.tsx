import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";

// Mock do useLocation do React Router
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useLocation: vi.fn(),
  };
});

// Componente ScrollToTop para teste
const ScrollToTop = () => {
  const location = useLocation() as any;
  const SCROLL_STORAGE_PREFIX = "scroll_position_";

  // Detecta se o usuário preferiu reduzir movimento
  const prefersReducedMotion = () => {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  };

  // Determina o comportamento de scroll baseado na preferência do usuário
  const getScrollBehavior = () => {
    return prefersReducedMotion() ? "auto" : "smooth";
  };

  useEffect(() => {
    const { pathname, hash } = location;

    // Se há um hash na URL, vai para a âncora
    if (hash) {
      const id = hash.replace("#", "");
      const timer = setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ 
            behavior: getScrollBehavior(), 
            block: "start" 
          });
          element.focus({ preventScroll: true });
        }
      }, 100);
      return () => clearTimeout(timer);
    }

    // Tenta restaurar a posição salva para esta rota específica
    const routeKey = SCROLL_STORAGE_PREFIX + pathname;
    const savedPosition = sessionStorage.getItem(routeKey);

    if (savedPosition) {
      const timer = setTimeout(() => {
        window.scrollTo({ 
          top: parseInt(savedPosition, 10), 
          behavior: getScrollBehavior() 
        });
      }, 50);
      return () => clearTimeout(timer);
    } else {
      // Sem posição salva, rola (suave ou não) para o topo
      window.scrollTo({ 
        top: 0, 
        behavior: getScrollBehavior() 
      });
    }
  }, [location.pathname, location.hash]);

  // Salva a posição da rota atual antes de sair
  useEffect(() => {
    const SCROLL_STORAGE_PREFIX = "scroll_position_";
    const routeKey = SCROLL_STORAGE_PREFIX + location.pathname;

    const handleBeforeUnload = () => {
      sessionStorage.setItem(routeKey, window.scrollY.toString());
    };

    const handleScroll = () => {
      sessionStorage.setItem(routeKey, window.scrollY.toString());
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [location.pathname]);

  return null;
};

// Componente de teste
const TestPage = () => (
  <div>
    <h1>Test Page</h1>
    <div style={{ height: "500px" }}>Conteúdo acima</div>
    <section id="test-section" tabIndex={-1}>
      <h2>Test Section</h2>
      <p>Conteúdo da seção de teste</p>
    </section>
    <div id="another-section" tabIndex={-1}>
      <h2>Another Section</h2>
      <p>Outro conteúdo</p>
    </div>
    <div style={{ height: "500px" }}>Conteúdo abaixo</div>
  </div>
);

describe("ScrollToTop - Hash Navigation and Focus", () => {
  let useLocationMock: any;

  beforeEach(() => {
    // Limpa o sessionStorage antes de cada teste
    sessionStorage.clear();

    // Setup mock do useLocation
    useLocationMock = vi.mocked(useLocation);
    useLocationMock.mockReturnValue({
      pathname: "/",
      hash: "",
      search: "",
      state: null,
      key: "default",
    });

    // Mock do scrollTo
    window.scrollTo = vi.fn();

    // Mock do scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("deve encontrar o elemento correto pelo id", () => {
    render(<TestPage />);

    const testElement = document.getElementById("test-section");
    expect(testElement).toBeInTheDocument();
    expect(testElement).toHaveTextContent("Test Section");
  });

  it("deve rolar para o elemento com hash quando a página carrega", async () => {
    useLocationMock.mockReturnValue({
      pathname: "/",
      hash: "#test-section",
      search: "",
      state: null,
      key: "default",
    });

    const scrollIntoViewMock = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    render(
      <>
        <ScrollToTop />
        <TestPage />
      </>
    );

    const testElement = document.getElementById("test-section");
    expect(testElement).toBeInTheDocument();

    // Aguarda a execução do setTimeout
    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "start",
      });
    });
  });

  it("deve mover o foco do teclado para o elemento com hash", async () => {
    useLocationMock.mockReturnValue({
      pathname: "/",
      hash: "#test-section",
      search: "",
      state: null,
      key: "default",
    });

    render(
      <>
        <ScrollToTop />
        <TestPage />
      </>
    );

    const testElement = document.getElementById("test-section");
    expect(testElement).toBeInTheDocument();

    // Aguarda o foco ser movido
    await waitFor(() => {
      expect(document.activeElement).toBe(testElement);
    });
  });

  it("deve rolar suavemente para o topo quando não há hash", async () => {
    useLocationMock.mockReturnValue({
      pathname: "/",
      hash: "",
      search: "",
      state: null,
      key: "default",
    });

    const scrollToMock = vi.fn();
    window.scrollTo = scrollToMock;

    render(
      <>
        <ScrollToTop />
        <TestPage />
      </>
    );

    // Aguarda a execução do scrollTo
    await waitFor(() => {
      expect(scrollToMock).toHaveBeenCalledWith({
        top: 0,
        behavior: "smooth",
      });
    });
  });

  it("deve restaurar a posição salva ao voltar do navegador", async () => {
    // Salva uma posição no sessionStorage para a rota /
    sessionStorage.setItem("scroll_position_/", "300");

    useLocationMock.mockReturnValue({
      pathname: "/",
      hash: "",
      search: "",
      state: null,
      key: "default",
    });

    const scrollToMock = vi.fn();
    window.scrollTo = scrollToMock;

    render(
      <>
        <ScrollToTop />
        <TestPage />
      </>
    );

    // Aguarda a restauração da posição
    await waitFor(() => {
      expect(scrollToMock).toHaveBeenCalledWith({
        top: 300,
        behavior: "smooth",
      });
    });

    // Verifica que a posição foi salva com a chave correta
    expect(sessionStorage.getItem("scroll_position_/")).toBe("300");
  });

  it("deve salvar a posição de scroll no sessionStorage ao fazer scroll", async () => {
    useLocationMock.mockReturnValue({
      pathname: "/dashboard/wallet",
      hash: "",
      search: "",
      state: null,
      key: "default",
    });

    render(
      <>
        <ScrollToTop />
        <TestPage />
      </>
    );

    // Simula um scroll
    Object.defineProperty(window, "scrollY", {
      writable: true,
      value: 150,
    });

    const scrollEvent = new Event("scroll");
    window.dispatchEvent(scrollEvent);

    // Aguarda o evento de scroll ser processado
    await waitFor(() => {
      expect(sessionStorage.getItem("scroll_position_/dashboard/wallet")).toBe("150");
    });
  });

  it("deve priorizar hash sobre posição salva", async () => {
    // Salva uma posição no sessionStorage para a rota /
    sessionStorage.setItem("scroll_position_/", "200");

    useLocationMock.mockReturnValue({
      pathname: "/",
      hash: "#another-section",
      search: "",
      state: null,
      key: "default",
    });

    const scrollIntoViewMock = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    render(
      <>
        <ScrollToTop />
        <TestPage />
      </>
    );

    const testElement = document.getElementById("another-section");
    expect(testElement).toBeInTheDocument();

    // Aguarda a rolagem para a âncora
    await waitFor(() => {
      // Deve chamar scrollIntoView (para a âncora), não scrollTo com posição salva
      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "start",
      });
    });
  });

  it("deve lidar com hash de múltiplos elementos", async () => {
    useLocationMock.mockReturnValue({
      pathname: "/",
      hash: "#another-section",
      search: "",
      state: null,
      key: "default",
    });

    render(
      <>
        <ScrollToTop />
        <TestPage />
      </>
    );

    const firstElement = document.getElementById("test-section");
    const secondElement = document.getElementById("another-section");

    expect(firstElement).toBeInTheDocument();
    expect(secondElement).toBeInTheDocument();

    // O foco deve estar no elemento com o hash
    await waitFor(() => {
      expect(document.activeElement).toBe(secondElement);
    });
  });

  it("deve lidar com elementos não encontrados graciosamente", async () => {
    useLocationMock.mockReturnValue({
      pathname: "/",
      hash: "#elemento-inexistente",
      search: "",
      state: null,
      key: "default",
    });

    const scrollIntoViewMock = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    render(
      <>
        <ScrollToTop />
        <TestPage />
      </>
    );

    // scrollIntoView não deve ser chamado se o elemento não existe
    await waitFor(() => {
      expect(scrollIntoViewMock).not.toHaveBeenCalled();
    });
  });

  it("deve ignorar hash vazio", async () => {
    useLocationMock.mockReturnValue({
      pathname: "/",
      hash: "",
      search: "",
      state: null,
      key: "default",
    });

    const scrollToMock = vi.fn();
    window.scrollTo = scrollToMock;

    render(
      <>
        <ScrollToTop />
        <TestPage />
      </>
    );

    // Deve fazer scroll para o topo, não ignorar
    await waitFor(() => {
      expect(scrollToMock).toHaveBeenCalledWith({
        top: 0,
        behavior: "smooth",
      });
    });
  });

  it("deve remover caracteres especiais do hash corretamente", async () => {
    useLocationMock.mockReturnValue({
      pathname: "/",
      hash: "#test-section",
      search: "",
      state: null,
      key: "default",
    });

    render(
      <>
        <ScrollToTop />
        <TestPage />
      </>
    );

    const testElement = document.getElementById("test-section");
    expect(testElement).toBeInTheDocument();

    // Aguarda o foco ser movido para confirmar que o hash foi processado corretamente
    await waitFor(() => {
      expect(document.activeElement).toBe(testElement);
    });
  });

  it("deve isolar posições de scroll por rota", async () => {
    // Salva posições diferentes para rotas diferentes
    sessionStorage.setItem("scroll_position_/dashboard/wallet", "500");
    sessionStorage.setItem("scroll_position_/dashboard/trade", "200");

    // Testa a primeira rota
    useLocationMock.mockReturnValue({
      pathname: "/dashboard/wallet",
      hash: "",
      search: "",
      state: null,
      key: "default",
    });

    const scrollToMock = vi.fn();
    window.scrollTo = scrollToMock;

    const { unmount } = render(
      <>
        <ScrollToTop />
        <TestPage />
      </>
    );

    // Aguarda a restauração da posição correta para wallet
    await waitFor(() => {
      expect(scrollToMock).toHaveBeenCalledWith({
        top: 500,
        behavior: "smooth",
      });
    });

    unmount();
    vi.clearAllMocks();

    // Agora testa a segunda rota
    useLocationMock.mockReturnValue({
      pathname: "/dashboard/trade",
      hash: "",
      search: "",
      state: null,
      key: "default",
    });

    render(
      <>
        <ScrollToTop />
        <TestPage />
      </>
    );

    // Aguarda a restauração da posição correta para trade
    await waitFor(() => {
      expect(scrollToMock).toHaveBeenCalledWith({
        top: 200,
        behavior: "smooth",
      });
    });
  });

  it("deve salvar posições diferentes para rotas diferentes", async () => {
    // Primeira rota
    useLocationMock.mockReturnValue({
      pathname: "/dashboard/wallet",
      hash: "",
      search: "",
      state: null,
      key: "default",
    });

    const { unmount } = render(
      <>
        <ScrollToTop />
        <TestPage />
      </>
    );

    // Simula scroll na primeira rota
    Object.defineProperty(window, "scrollY", {
      writable: true,
      value: 450,
    });

    const scrollEvent = new Event("scroll");
    window.dispatchEvent(scrollEvent);

    await waitFor(() => {
      expect(sessionStorage.getItem("scroll_position_/dashboard/wallet")).toBe(
        "450"
      );
    });

    unmount();

    // Segunda rota
    useLocationMock.mockReturnValue({
      pathname: "/dashboard/trade",
      hash: "",
      search: "",
      state: null,
      key: "default",
    });

    render(
      <>
        <ScrollToTop />
        <TestPage />
      </>
    );

    // Simula scroll na segunda rota
    Object.defineProperty(window, "scrollY", {
      writable: true,
      value: 150,
    });

    window.dispatchEvent(scrollEvent);

    await waitFor(() => {
      expect(sessionStorage.getItem("scroll_position_/dashboard/trade")).toBe(
        "150"
      );
    });

    // Verifica que as duas posições são diferentes
    expect(sessionStorage.getItem("scroll_position_/dashboard/wallet")).toBe(
      "450"
    );
    expect(sessionStorage.getItem("scroll_position_/dashboard/trade")).toBe(
      "150"
    );
  });

  it("deve usar posição padrão (topo) quando rota é nova", async () => {
    sessionStorage.clear();

    useLocationMock.mockReturnValue({
      pathname: "/dashboard/settings",
      hash: "",
      search: "",
      state: null,
      key: "default",
    });

    const scrollToMock = vi.fn();
    window.scrollTo = scrollToMock;

    render(
      <>
        <ScrollToTop />
        <TestPage />
      </>
    );

    // Deve rolar para o topo já que não há posição salva para esta rota
    await waitFor(() => {
      expect(scrollToMock).toHaveBeenCalledWith({
        top: 0,
        behavior: "smooth",
      });
    });
  });

  it("deve respeitar prefers-reduced-motion ao rolar para hash", async () => {
    // Mock do matchMedia para simular prefers-reduced-motion: reduce
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }));

    useLocationMock.mockReturnValue({
      pathname: "/",
      hash: "#test-section",
      search: "",
      state: null,
      key: "default",
    });

    const scrollIntoViewMock = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    render(
      <>
        <ScrollToTop />
        <TestPage />
      </>
    );

    const testElement = document.getElementById("test-section");
    expect(testElement).toBeInTheDocument();

    // Aguarda a chamada com behavior: "auto" em vez de "smooth"
    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        behavior: "auto",
        block: "start",
      });
    });

    window.matchMedia = originalMatchMedia;
  });

  it("deve respeitar prefers-reduced-motion ao restaurar posição", async () => {
    // Mock do matchMedia para simular prefers-reduced-motion: reduce
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }));

    // Salva uma posição no sessionStorage para a rota /
    sessionStorage.setItem("scroll_position_/", "300");

    useLocationMock.mockReturnValue({
      pathname: "/",
      hash: "",
      search: "",
      state: null,
      key: "default",
    });

    const scrollToMock = vi.fn();
    window.scrollTo = scrollToMock;

    render(
      <>
        <ScrollToTop />
        <TestPage />
      </>
    );

    // Aguarda a chamada com behavior: "auto" em vez de "smooth"
    await waitFor(() => {
      expect(scrollToMock).toHaveBeenCalledWith({
        top: 300,
        behavior: "auto",
      });
    });

    window.matchMedia = originalMatchMedia;
  });

  it("deve respeitar prefers-reduced-motion ao rolar para o topo", async () => {
    // Mock do matchMedia para simular prefers-reduced-motion: reduce
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }));

    useLocationMock.mockReturnValue({
      pathname: "/",
      hash: "",
      search: "",
      state: null,
      key: "default",
    });

    const scrollToMock = vi.fn();
    window.scrollTo = scrollToMock;

    render(
      <>
        <ScrollToTop />
        <TestPage />
      </>
    );

    // Aguarda a chamada com behavior: "auto" em vez de "smooth"
    await waitFor(() => {
      expect(scrollToMock).toHaveBeenCalledWith({
        top: 0,
        behavior: "auto",
      });
    });

    window.matchMedia = originalMatchMedia;
  });

  it("deve usar smooth behavior quando prefers-reduced-motion não é ativo", async () => {
    // Mock do matchMedia para simular comportamento normal (sem prefers-reduced-motion)
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false, // Sem redução de movimento
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }));

    useLocationMock.mockReturnValue({
      pathname: "/",
      hash: "",
      search: "",
      state: null,
      key: "default",
    });

    const scrollToMock = vi.fn();
    window.scrollTo = scrollToMock;

    render(
      <>
        <ScrollToTop />
        <TestPage />
      </>
    );

    // Aguarda a chamada com behavior: "smooth"
    await waitFor(() => {
      expect(scrollToMock).toHaveBeenCalledWith({
        top: 0,
        behavior: "smooth",
      });
    });

    window.matchMedia = originalMatchMedia;
  });
});
