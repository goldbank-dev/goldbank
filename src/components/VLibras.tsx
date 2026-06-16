/**
 * VLibras Widget Component
 * Integração com o widget oficial do VLibras (Governo Federal - Brasil)
 * Docs: https://www.vlibras.gov.br/
 */

import { useEffect } from 'react';

export function VLibras() {
  useEffect(() => {
    // Evita duplicação do script em Strict Mode ou HMR
    if (document.getElementById('vlibras-widget-script')) return;

    const script = document.createElement('script');
    script.id = 'vlibras-widget-script';
    script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
    script.async = true;
    script.onload = () => {
      // Inicializa o widget após carregamento do script
      if (typeof window !== 'undefined' && (window as any).VLibas) {
        new (window as any).VLibas.WidgetConfig({
          position: 'R', // R=Right, L=Left
          translate: 'default', // default, pt, en, es
          isEnabled: true,
        });
      }
    };
    script.onerror = (error) => {
      // Fail-safe: não quebra a aplicação se o widget falhar
      console.warn('[VLibras] Falha ao carregar widget:', error);
    };

    document.body.appendChild(script);

    // Cleanup: remove script ao desmontar (útil para dev mode)
    return () => {
      const existingScript = document.getElementById('vlibras-widget-script');
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
      // Remove elementos injetados pelo widget
      document.querySelectorAll('[id^="vlibras"]').forEach(el => el.remove());
    };
  }, []);

  // Container opcional para customização via CSS
  return <div id="vlibras-container" className="vlibras-wrapper" aria-hidden="true" />;
}

export default VLibras;
