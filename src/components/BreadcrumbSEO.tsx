import React from 'react';
import { useLocation } from 'react-router-dom';
import { SEO_CONFIG } from '@/config/seo';
import { Helmet } from 'react-helmet-async';

/**
 * Mapeamento de caminhos amigáveis para os breadcrumbs
 */
const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Painel',
  wallet: 'Carteira',
  trade: 'Negociação',
  statement: 'Extrato',
  audit: 'Auditoria',
  kyc: 'Verificação KYC',
  settings: 'Configurações',
  sanpainel: 'Administração',
  docs: 'Documentação',
  privacy: 'Privacidade',
  terms: 'Termos de Uso',
  auth: 'Login',
};

/**
 * Componente BreadcrumbSEO
 * Gera automaticamente o JSON-LD de BreadcrumbList baseado na rota atual.
 */
export const BreadcrumbSEO: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);
  
  // Se estiver na home, não exibe breadcrumbs ou exibe apenas a home
  const breadcrumbs = [
    {
      name: 'Início',
      item: SEO_CONFIG.siteUrl,
    },
    ...pathnames.map((value, index) => {
      const url = `${SEO_CONFIG.siteUrl}/${pathnames.slice(0, index + 1).join('/')}`;
      return {
        name: ROUTE_LABELS[value] || value.charAt(0).toUpperCase() + value.slice(1),
        item: url,
      };
    }),
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.item,
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </script>
    </Helmet>
  );
};
