import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import NProgress from "nprogress";
import "nprogress/nprogress.css";

// Configure NProgress
NProgress.configure({ 
  showSpinner: false,
  easing: 'ease',
  speed: 500,
  minimum: 0.3
});

export const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  const SCROLL_STORAGE_PREFIX = "scroll_position_";
  const isInternalScroll = useRef(false);
  const scrollTimeout = useRef<number | null>(null);

  // Detecta se o usuário preferiu reduzir movimento
  const prefersReducedMotion = () => {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  };

  // Determina o comportamento de scroll baseado na preferência do usuário
  const getScrollBehavior = () => {
    return prefersReducedMotion() ? "auto" : "smooth";
  };

  const handleComplete = () => {
    if (scrollTimeout.current) window.clearTimeout(scrollTimeout.current);
    scrollTimeout.current = window.setTimeout(() => {
      NProgress.done();
      isInternalScroll.current = false;
    }, 300);
  };

  useEffect(() => {
    NProgress.start();
    isInternalScroll.current = true;

    // Se há um hash na URL, vai para a âncora
    if (hash) {
      const id = hash.replace("#", "");
      const timer = window.setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ 
            behavior: getScrollBehavior(), 
            block: "start" 
          });
          element.focus({ preventScroll: true });
        }
        handleComplete();
      }, 100);
      return () => {
        window.clearTimeout(timer);
        NProgress.done();
      };
    }

    // Tenta restaurar a posição salva para esta rota específica
    const routeKey = SCROLL_STORAGE_PREFIX + pathname;
    const savedPosition = sessionStorage.getItem(routeKey);
    
    const timer = window.setTimeout(() => {
      if (savedPosition) {
        window.scrollTo({ 
          top: parseInt(savedPosition, 10), 
          behavior: getScrollBehavior() 
        });
      } else {
        window.scrollTo({ 
          top: 0, 
          behavior: getScrollBehavior() 
        });
      }
      handleComplete();
    }, 50);

    return () => {
      window.clearTimeout(timer);
      NProgress.done();
    };
  }, [pathname, hash]);

  // Salva a posição da rota atual antes de sair
  useEffect(() => {
    const routeKey = SCROLL_STORAGE_PREFIX + pathname;
    let ticking = false;

    const savePosition = () => {
      // Não salva se estivermos no meio de um scroll programático (restauração)
      if (isInternalScroll.current) return;
      sessionStorage.setItem(routeKey, window.scrollY.toString());
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          savePosition();
          ticking = false;
        });
        ticking = true;
      }
    };

    const handleBeforeUnload = () => savePosition();

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [pathname]);

  return null;
};
