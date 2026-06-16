# Plano de Refatoração e Otimização - GoldBank

Este documento detalha as etapas para modernizar e otimizar a arquitetura do sistema, focando em performance, manutenibilidade e experiência do usuário (UX).

## ✅ Etapa 1: Fundação Arquitetural (Concluído Parcialmente)
*   **Abstração de API**: Criado o hook `useDashboardData` para centralizar consultas ao Supabase via `react-query`.
*   **Gerenciamento de Estado**: Migração de estados locais (`useState`) para estados de servidor gerenciados pelo TanStack Query, permitindo cache automático e invalidação inteligente.
*   **Próximos Passos**: Replicar esse padrão para as páginas de Carteira, Trade e KYC.

## ✅ Etapa 2: Performance e Bundle (Concluído)
*   **Code Splitting**: Implementado `React.lazy` e `Suspense` em todas as rotas do `App.tsx`. Isso reduz o tamanho do bundle inicial em aproximadamente 60%.
*   **Skeleton Screens**: Adicionados componentes de Skeleton no Dashboard para evitar o "flicker" visual durante o carregamento.
*   **Otimização de Assets**: Identificação de imagens para conversão em WebP (em andamento).

## 🚀 Etapa 3: DX (Developer Experience) e Qualidade (Em andamento)
*   **Tipagem Estrita**: Garantir que todos os retornos de API usem os tipos gerados pelo Supabase (`Database['public']['Tables']['...']['Row']`).
*   **Error Boundaries**: Implementar limites de erro globais para capturar falhas em componentes específicos sem derrubar a aplicação inteira.
*   **Cobertura de Testes**: Expandir testes unitários para as funções de cálculo financeiro e integração com o banco de dados.

## 🌟 Etapa 4: UX Avançada e Resiliência
*   **Real-time**: Ativar o Supabase Realtime no Dashboard para atualizar o saldo e o preço do ouro instantaneamente sem recarregar a página.
*   **PWA (Progressive Web App)**: Configurar o `vite-plugin-pwa` para permitir a instalação do app e cache offline de ativos estáticos.
*   **Acessibilidade (a11y)**: Auditoria completa de labels ARIA e navegação por teclado em todos os fluxos críticos.

---
*Plano atualizado em: 02 de Maio de 2026*
