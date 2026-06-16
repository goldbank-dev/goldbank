
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Terminal, BookOpen, Code, Server, Database, ShieldCheck, Activity, Fingerprint, History } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const DocumentationSection = () => {
  const endpoints = [
    {
      method: "POST",
      path: "/functions/v1/deposit",
      title: "Criar Depósito",
      description: "Inicia um processo de depósito no sistema via ledger (partida dobrada). Gera uma entrada pendente que deve ser confirmada pelo admin ou gateway.",
      auth: "Bearer {user_token}",
      body: {
        amount: "number (obrigatório) - Valor do depósito",
        currency: "string (opcional) - Padrão: 'BRL'",
        description: "string (opcional) - Motivo do depósito",
        idempotency_key: "string (opcional) - Chave para evitar duplicidade"
      },
      statusCodes: [
        { code: 200, message: "Sucesso - Retorna o objeto da transação criada." },
        { code: 400, message: "Erro de validação ou saldo insuficiente." },
        { code: 401, message: "Não autorizado." }
      ],
      example: `fetch('https://api.santek.com/functions/v1/deposit', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' },
  body: JSON.stringify({
    amount: 1000.00,
    currency: 'BRL',
    description: 'Depósito inicial'
  })
})`
    },
    {
      method: "POST",
      path: "/functions/v1/withdraw",
      title: "Solicitar Saque",
      description: "Registra uma intenção de saque que será analisada pelo administrativo.",
      auth: "Bearer {user_token}",
      body: {
        amount: "number (obrigatório)",
        currency: "string (opcional)",
        description: "string (opcional)",
        idempotency_key: "uuid (opcional)"
      },
      statusCodes: [
        { code: 200, message: "Solicitação registrada." },
        { code: 403, message: "Conta sem KYC ou saldo bloqueado." }
      ],
      example: `// Exemplo de Saque
const { data, error } = await supabase.functions.invoke('withdraw', {
  body: { amount: 500, currency: 'BRL' }
})`
    },
    {
      method: "POST",
      path: "/functions/v1/transfer",
      title: "Transferência Interna",
      description: "Transfere saldo entre usuários de forma instantânea e segura usando o sistema de Ledger.",
      auth: "Bearer {user_token}",
      body: {
        receiver_id: "uuid (obrigatório)",
        amount: "number (obrigatório)",
        currency: "BRL | GTK | USD",
        description: "string",
        idempotency_key: "string"
      },
      statusCodes: [
        { code: 200, message: "Transferência concluída." },
        { code: 400, message: "Saldo insuficiente ou usuário inexistente." }
      ],
      example: `await supabase.functions.invoke('transfer', {
  body: { 
    receiver_id: 'destinatario-uuid',
    amount: 100,
    currency: 'GTK'
  }
})`
    },
    {
      method: "GET",
      path: "/functions/v1/list-withdrawals",
      title: "Listar Saques",
      description: "Retorna o histórico de saques do usuário autenticado com logs de auditoria.",
      auth: "Bearer {user_token}",
      queryParams: {
        status: "string (pending|approved|rejected)",
        limit: "number (default 20)",
        offset: "number"
      },
      example: `const { data } = await supabase.functions.invoke('list-withdrawals', {
  method: 'GET',
  queryParams: { status: 'pending' }
})`
    }
  ];

  const dbFunctions = [
    {
      name: "create_ledger_deposit",
      params: "(p_user_id uuid, p_amount numeric, p_currency currency_type, p_description text, p_idempotency_key text)",
      returns: "jsonb",
      description: "Executa a lógica de banco de dados para depósitos, garantindo integridade no ledger.",
      security: "Apenas via Service Role ou funções autenticadas."
    },
    {
      name: "perform_ledger_transfer",
      params: "(p_sender_id uuid, p_receiver_id uuid, p_amount numeric, p_currency currency_type, p_tx_type tx_type, ...)",
      returns: "jsonb",
      description: "Realiza a transferência atômica entre contas, debitando de um e creditando em outro.",
      security: "Valida saldo e existência de conta antes da operação."
    },
    {
      name: "execute_trade",
      params: "(p_token_id text, p_amount numeric)",
      returns: "void",
      description: "Processa a compra de ativos tokenizados (GTK/Ouro) usando saldo em BRL.",
      security: "Exige saldo suficiente em BRL na conta do usuário."
    },
    {
      name: "has_permission",
      params: "(_user_id uuid, _permission_key text)",
      returns: "boolean",
      description: "Verifica se um usuário possui uma permissão específica ou se é administrador.",
      security: "Usado em políticas de RLS e funções seguras."
    }
  ];

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Documentação de API</span>
          </div>
          <h2 className="text-4xl font-black italic tracking-tighter">
            SANTEK <span className="text-primary gold-text-gradient">SWAGGER</span>
          </h2>
          <p className="text-white/40 font-medium max-w-2xl">
            Guia completo de integração com o ecossistema Santek. Aqui você encontra os contratos de entrada/saída,
            exemplos de código e as regras de negócio aplicadas.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="border-green-500/30 text-green-500 bg-green-500/5 px-4 py-1">
            <Activity className="w-3 h-3 mr-2 animate-pulse" />
            API v1.0.4 Online
          </Badge>
        </div>
      </div>

      <Separator className="bg-white/5" />

      <Tabs defaultValue="endpoints" className="w-full">
        <TabsList className="bg-neutral-900 border border-white/5 p-1 mb-8 w-full md:w-auto h-12">
          <TabsTrigger value="endpoints" className="gap-2 px-6 data-[state=active]:bg-primary data-[state=active]:text-black font-bold h-full rounded-lg">
            <Server className="w-4 h-4" /> Endpoints (Edge)
          </TabsTrigger>
          <TabsTrigger value="database" className="gap-2 px-6 data-[state=active]:bg-primary data-[state=active]:text-black font-bold h-full rounded-lg">
            <Database className="w-4 h-4" /> Banco de Dados (RPC)
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2 px-6 data-[state=active]:bg-primary data-[state=active]:text-black font-bold h-full rounded-lg">
            <ShieldCheck className="w-4 h-4" /> Segurança & Regras
          </TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints" className="space-y-8">
          {endpoints.map((ep, i) => (
            <Card key={i} className="bg-neutral-900/40 border-white/5 backdrop-blur-sm overflow-hidden group hover:border-primary/20 transition-all duration-300">
              <CardHeader className="border-b border-white/5 bg-white/[0.01] p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={cn(
                      "font-black px-4 py-1 rounded-md text-[11px] uppercase tracking-wider",
                      ep.method === "POST" ? "bg-blue-600 text-white" : 
                      ep.method === "GET" ? "bg-green-600 text-white" : "bg-neutral-600"
                    )}>
                      {ep.method}
                    </Badge>
                    <code className="text-primary text-sm font-mono bg-black/40 px-3 py-1 rounded-md border border-white/5">
                      {ep.path}
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-500" />
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{ep.auth}</span>
                  </div>
                </div>
                <CardTitle className="text-2xl font-black italic tracking-tight mb-2">{ep.title}</CardTitle>
                <CardDescription className="text-white/60 text-base leading-relaxed">{ep.description}</CardDescription>
              </CardHeader>
              <CardContent className="p-6 grid lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7 space-y-6">
                  {ep.body && (
                    <div>
                      <h4 className="text-xs font-black uppercase text-primary mb-3 flex items-center gap-2 tracking-widest">
                        <Terminal className="w-4 h-4" /> Request Body (JSON)
                      </h4>
                      <div className="relative group">
                        <pre className="bg-black/60 p-5 rounded-2xl border border-white/10 text-[13px] text-white/80 overflow-x-auto font-mono leading-relaxed">
                          {JSON.stringify(ep.body, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                  {ep.queryParams && (
                    <div>
                      <h4 className="text-xs font-black uppercase text-primary mb-3 flex items-center gap-2 tracking-widest">
                        <Terminal className="w-4 h-4" /> Query Parameters
                      </h4>
                      <pre className="bg-black/60 p-5 rounded-2xl border border-white/10 text-[13px] text-white/80 overflow-x-auto font-mono leading-relaxed">
                        {JSON.stringify(ep.queryParams, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="text-xs font-black uppercase text-white/40 mb-3 tracking-widest">Status Codes</h4>
                    <div className="space-y-2">
                      {ep.statusCodes?.map((s, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                          <Badge variant="outline" className={cn(
                            "font-bold min-w-[50px] justify-center",
                            s.code < 300 ? "text-green-500 border-green-500/20" : "text-amber-500 border-amber-500/20"
                          )}>
                            {s.code}
                          </Badge>
                          <span className="text-sm text-white/50">{s.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 flex flex-col h-full">
                  <h4 className="text-xs font-black uppercase text-amber-500 mb-3 flex items-center gap-2 tracking-widest">
                    <Code className="w-4 h-4" /> Exemplo de Integração
                  </h4>
                  <div className="flex-1 min-h-[300px] relative">
                    <pre className="absolute inset-0 bg-neutral-950 p-6 rounded-2xl border border-white/10 text-[12px] text-white/60 font-mono leading-relaxed overflow-auto scrollbar-hide">
                      {ep.example}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <Card className="bg-neutral-900/40 border-white/5 backdrop-blur-sm">
            <CardHeader className="p-8">
              <CardTitle className="text-2xl font-black italic tracking-tight">PostgreSQL RPC Functions</CardTitle>
              <CardDescription className="text-white/50">
                Funções internas de baixo nível que garantem a integridade financeira (Double-Entry Ledger).
              </CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="grid gap-4">
                {dbFunctions.map((fn, i) => (
                  <div key={i} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors group">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-lg font-bold text-primary">public.{fn.name}</code>
                          <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px]">FUNCTION</Badge>
                        </div>
                        <code className="text-xs text-white/30 block font-mono bg-black/20 p-2 rounded-md border border-white/5 mt-2">
                          {fn.params}
                        </code>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest block mb-1">Returns</span>
                        <code className="text-green-500 text-sm font-bold">{fn.returns}</code>
                      </div>
                    </div>
                    <p className="text-sm text-white/60 mb-4 leading-relaxed">{fn.description}</p>
                    <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                      <ShieldCheck className="w-3 h-3 text-amber-500/50" />
                      <span className="text-[11px] font-medium text-white/30 italic">{fn.security}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="bg-neutral-900/40 border-white/5 backdrop-blur-sm">
            <CardHeader className="p-8 text-center max-w-2xl mx-auto">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-3xl font-black italic tracking-tight">Segurança & Governança</CardTitle>
              <CardDescription className="text-lg text-white/60">
                Nossa arquitetura prioriza a segurança dos ativos e a conformidade regulatória através de múltiplas camadas de proteção.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-12">
              <div className="grid md:grid-cols-3 gap-6 mb-12">
                <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-4">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Server className="w-5 h-5 text-blue-400" />
                  </div>
                  <h4 className="font-black italic text-blue-400 uppercase tracking-wider">Isolamento RLS</h4>
                  <p className="text-sm text-white/50 leading-relaxed">
                    Row Level Security garante que nenhum usuário acesse dados de terceiros. Cada consulta é validada via JWT no nível do banco de dados.
                  </p>
                </div>
                <div className="p-6 rounded-2xl bg-purple-500/5 border border-purple-500/10 space-y-4">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-purple-400" />
                  </div>
                  <h4 className="font-black italic text-purple-400 uppercase tracking-wider">RBAC / ABAC</h4>
                  <p className="text-sm text-white/50 leading-relaxed">
                    Controle de acesso baseado em cargos e permissões granulares. Acesso administrativo exige multi-fator e validação de permissão.
                  </p>
                </div>
                <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-4">
                  <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                    <Activity className="w-5 h-5 text-amber-400" />
                  </div>
                  <h4 className="font-black italic text-amber-400 uppercase tracking-wider">Trilhas de Auditoria</h4>
                  <p className="text-sm text-white/50 leading-relaxed">
                    Toda operação financeira gera um log de auditoria imutável, permitindo rastreabilidade completa de ponta a ponta.
                  </p>
                </div>
              </div>

              <div className="space-y-8 bg-black/20 p-8 rounded-3xl border border-white/5">
                <h3 className="text-xl font-black italic tracking-tight text-white/80">Funcionamento dos Logs de Auditoria</h3>
                <div className="grid md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-primary font-bold mb-2 flex items-center gap-2 text-sm uppercase tracking-widest">
                        <Fingerprint className="w-4 h-4" /> Captura de Eventos
                      </h4>
                      <p className="text-sm text-white/50 leading-relaxed">
                        O sistema utiliza triggers de banco de dados para capturar automaticamente qualquer evento de <strong>INSERT, UPDATE ou DELETE</strong>. Isso garante que mesmo alterações diretas no banco (fora da aplicação) sejam auditadas.
                      </p>
                    </div>
                    <div>
                      <h4 className="text-primary font-bold mb-2 flex items-center gap-2 text-sm uppercase tracking-widest">
                        <History className="w-4 h-4" /> Contexto do Usuário
                      </h4>
                      <p className="text-sm text-white/50 leading-relaxed">
                        Cada log armazena o <code>user_id</code> do executor, o <code>target_id</code> do registro afetado, a tabela alvo e um payload JSON contendo o estado anterior e posterior do dado alterado.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="text-primary font-bold mb-2 flex items-center gap-2 text-sm uppercase tracking-widest">
                        <Code className="w-4 h-4" /> Critérios de Auditoria
                      </h4>
                      <ul className="text-sm text-white/50 space-y-3 list-disc pl-4 leading-relaxed">
                        <li><strong>Auditabilidade Financeira:</strong> Logs de transferências são vinculados a transações de ledger para conciliação bancária.</li>
                        <li><strong>Segurança de Acesso:</strong> Falhas de login e tentativas de acesso não autorizado são registradas para análise de ameaças.</li>
                        <li><strong>Alterações de Sistema:</strong> Mudanças em taxas, limites e configurações de SEO são monitoradas com prioridade máxima.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
