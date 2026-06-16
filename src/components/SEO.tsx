import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { SEO_CONFIG } from '@/config/seo';
import { useSystemSettings } from '@/hooks/useSystemSettings';

/**
 * SEO Component
 * @param title - Page title
 * @param description - Meta description
 * @param canonical - Manual canonical URL (optional, defaults to dynamic path)
 * @param ogImage - Open Graph image URL
 * @param ogType - Open Graph type (website, article, etc.)
 * @param jsonLd - Structured data in JSON-LD format
 */
interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'profile';
  jsonLd?: object | object[];
}

export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  canonical,
  ogImage,
  ogType = 'website',
  jsonLd,
}) => {
  const { pathname } = useLocation();
  const { data: settings } = useSystemSettings();
  
  // DB settings
  const dbSeo = settings?.seo_metadata || {};
  const dbSocial = settings?.social_media || {};
  const platformName = settings?.platform_name?.value || SEO_CONFIG.organizationName;
  const gaId = settings?.google_analytics_id;

  const fullTitle = title 
    ? (dbSeo.title_template || SEO_CONFIG.titleTemplate).replace('%s', title) 
    : (dbSeo.title || SEO_CONFIG.defaultTitle);
  
  const fullDescription = description || dbSeo.description || SEO_CONFIG.defaultDescription;
  
  // Dynamic canonical URL generation
  const cleanPathname = pathname === '/' ? '' : pathname.replace(/\/$/, '');
  const siteUrl = settings?.site_url || SEO_CONFIG.siteUrl;
  const dynamicCanonical = `${siteUrl}${cleanPathname}`;
  const fullCanonical = canonical || dynamicCanonical;
  
  const fullOgImage = ogImage || dbSocial.og_image || SEO_CONFIG.defaultOGImage;
  const twitterHandle = dbSocial.twitter_handle || SEO_CONFIG.twitterHandle;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={fullDescription} />
      <meta name="keywords" content={dbSeo.keywords || ""} />
      <link rel="canonical" href={fullCanonical} />

      {/* Google Analytics / Search Console Verification */}
      {gaId && <meta name="google-site-verification" content={gaId} />}

      {/* Open Graph */}
      <meta property="og:site_name" content={platformName} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={fullDescription} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={fullCanonical} />
      <meta property="og:image" content={fullOgImage} />
      <meta property="og:locale" content={SEO_CONFIG.locale} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={twitterHandle} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={fullDescription} />
      <meta name="twitter:image" content={fullOgImage} />

      {/* Theme Color */}
      <meta name="theme-color" content={SEO_CONFIG.themeColor} />

      {/* JSON-LD Structured Data */}
      {jsonLd && !Array.isArray(jsonLd) && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
      {Array.isArray(jsonLd) && jsonLd.map((ld, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(ld)}
        </script>
      ))}
    </Helmet>
  );
};
