/**
 * SEO Configuration
 * Centralized settings for the site's search engine optimization.
 */
export const SEO_CONFIG = {
  defaultTitle: "Gold Bank | Gestão de Ativos Digitais e Portfólios",
  titleTemplate: "%s | Gold Bank",
  defaultDescription: "Gold Bank é a plataforma líder em gestão de ativos digitais, oferecendo segurança, transparência e alta performance para seus investimentos.",
  siteUrl: "https://goldbank.com.br", // Replace with actual domain when available
  defaultOGImage: "https://storage.googleapis.com/gpt-engineer-file-uploads/aUbjDqBphVWi333JE8K67wf8fu63/social-images/social-1777605592766-logof.webp",
  twitterHandle: "@GoldBank",
  organizationName: "Gold Bank",
  locale: "pt_BR",
  themeColor: "#EAB308", // matching primary yellow-500
};

/**
 * Types for structured data
 */
export interface BreadcrumbItem {
  name: string;
  item: string;
}

export interface StructuredDataProps {
  type: 'Organization' | 'WebSite' | 'BreadcrumbList' | 'FinancialProduct';
  data: any;
}
