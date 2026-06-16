/**
 * @module AdminPages
 * @description Management views for system administrators to oversee users, finance, and system health.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { handleError, handleSuccess } from "@/utils/error-handler.tsx";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, BarChart3, Settings, ShieldCheck, LogOut, Menu, 
  Coins, RefreshCw, Wallet, History, Globe,
  BookOpen, Camera, UserPlus, KeyRound
} from "lucide-react";
import { AvatarUpload } from "@/components/AvatarUpload";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

// Section Components
import { OverviewSection } from "@/components/admin/sections/OverviewSection";
import { UsersSection } from "@/components/admin/sections/UsersSection";
import { FinancialSection } from "@/components/admin/sections/FinancialSection";
import { TokensSection } from "@/components/admin/sections/TokensSection";
import { AuditSection } from "@/components/admin/sections/AuditSection";
import { KYCSection } from "@/components/admin/sections/KYCSection";
import { SettingsSection } from "@/components/admin/sections/SettingsSection";
import { SEOManagement } from "@/components/admin/sections/SEOManagement";
import { DocumentationSection } from "@/components/admin/sections/DocumentationSection";

/**
 * AdminPanel Component
 * Provides a comprehensive dashboard for system administrators.
 * Handles user management, KYC reviews, financial requests, and system settings.
 * 
 * @component AdminPanel
 */
const ALLOWED_ROLES: { value: 'user' | 'manager' | 'admin'; label: string; description: string }[] = [
  { value: 'user', label: 'Usuário', description: 'Acesso padrão à plataforma, sem privilégios administrativos.' },
  { value: 'manager', label: 'Gerente', description: 'Pode revisar operações e KYC, mas não altera configurações de sistema.' },
  { value: 'admin', label: 'Administrador', description: 'Acesso total: gerencia usuários, cargos, financeiro e configurações.' },
];

const AdminPanel = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [userPermissions, setUserPermissions] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [financialRequests, setFinancialRequests] = useState<any[]>([]);
  const [tokens, setTokens] = useState<any[]>([]);
  const [kycs, setKycs] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [transferAuditLogs, setTransferAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [systemSettings, setSystemSettings] = useState<any>({});
  
  // Dialog States
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  
  const [isConfirmRoleOpen, setIsConfirmRoleOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<{ userId: string, role: string } | null>(null);
  const [roleChangeReason, setRoleChangeReason] = useState("");
  const [adminConfirmText, setAdminConfirmText] = useState("");
  const [currentUserPerms, setCurrentUserPerms] = useState<string[]>([]);
  
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserDisplayName, setNewUserDisplayName] = useState("");
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchAdminData = useCallback(async () => {
    try {
      const [p, roles, perms, t, fr, tok, kyc, setts, audit, transferAudit] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("user_roles").select("*"),
        supabase.from("user_permissions").select("*"),
        supabase.from("transactions").select("*, profiles(display_name)"),
        supabase.from("financial_requests").select("*, profiles(display_name)"),
        supabase.from("tokens").select("*"),
        supabase.from("kyc_documents").select("*, profiles(display_name, email)"),
        supabase.from("system_settings").select("*"),
        supabase.from('admin_audit_logs').select('*, profiles:admin_id(display_name)').order('created_at', { ascending: false }).limit(50),
        supabase.from('transfer_audit_events').select('*, profiles:user_id(display_name, email)').order('created_at', { ascending: false }).limit(100)
      ]);

      setProfiles(p.data || []);
      setUserRoles(roles.data || []);
      setUserPermissions(perms.data || []);
      setTransactions(t.data || []);
      setFinancialRequests(fr.data || []);
      setTokens(tok.data || []);
      setKycs(kyc.data || []);
      setAuditLogs(audit.data || []);
      setTransferAuditLogs(transferAudit.data || []);
      
      const sMap = (setts.data || []).reduce((acc: any, s: any) => ({ ...acc, [s.key]: s.value }), {});
      setSystemSettings(sMap);
    } catch (e) { 
      console.error(e); 
      handleError(e, "Não foi possível carregar os dados administrativos.");
    } finally { 
      setLoading(false); 
    }
  }, [toast]);

  useEffect(() => {
    fetchAdminData();
    // Optimized real-time: Listen only for critical updates
    const channel = supabase.channel('admin-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'financial_requests' }, fetchAdminData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kyc_documents' }, fetchAdminData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAdminData]);

  const handleUpdateRole = async (userId: string, role: string) => {
    setPendingRole({ userId, role });
    setIsConfirmRoleOpen(true);
  };

  const confirmRoleUpdate = async () => {
    if (!pendingRole) return;
    const { userId, role } = pendingRole;
    
    const oldRole = userRoles.find(r => r.user_id === userId)?.role || 'user';
    const involvesAdmin = role === 'admin' || oldRole === 'admin';
    
    if (involvesAdmin && (!roleChangeReason || roleChangeReason.trim().length < 3)) {
      toast({ variant: "destructive", title: "Erro", description: "O motivo é obrigatório (mín. 3 caracteres) para alterações de cargo Admin." });
      return;
    }

    // Extra confirmation: require typing "ADMIN" when promoting to admin
    if (role === 'admin' && adminConfirmText.trim().toUpperCase() !== 'ADMIN') {
      toast({ variant: "destructive", title: "Confirmação inválida", description: 'Digite ADMIN exatamente para confirmar a promoção.' });
      return;
    }

    // Server-side validation: only existing admins can promote/demote, and the
    // RPC handles audit logging atomically.
    const { error } = await supabase.rpc('admin_change_user_role', {
      _target_user_id: userId,
      _new_role: role as any,
      _reason: roleChangeReason || null,
    });

    if (error) {
      // Surface permission errors clearly
      const msg = error.message?.includes('Permissão negada') || error.code === '42501'
        ? 'Você não tem permissão para alterar cargos. Apenas administradores podem promover ou rebaixar usuários.'
        : error.message;
      handleError({ ...error, message: msg }, 'Falha ao alterar cargo');
      return;
    }

    handleSuccess("Cargo atualizado.");
    fetchAdminData();
    setIsConfirmRoleOpen(false);
    setPendingRole(null);
    setRoleChangeReason("");
    setAdminConfirmText("");
  };

  const handleTogglePermission = async (userId: string, permission: string, granted: boolean) => {
    const { error } = await supabase.from('user_permissions').upsert({ 
      user_id: userId, 
      permission_key: permission, 
      granted 
    }, { onConflict: 'user_id,permission_key' });
    
    if (error) handleError(error);
    else fetchAdminData();
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) {
      toast({ variant: "destructive", title: "Erro", description: "Digite a nova senha." });
      return;
    }

    if (newPassword.length < 6) {
      toast({ variant: "destructive", title: "Erro", description: "A senha deve ter pelo menos 6 caracteres." });
      return;
    }

    setIsResettingPassword(true);
    try {
      const { data, error } = await supabase.rpc('admin_reset_user_password', {
        target_user_id: selectedUser.user_id,
        new_password: newPassword
      });

      if (error) throw error;

      handleSuccess("Senha alterada com sucesso.");
      setIsPasswordResetOpen(false);
      setNewPassword("");
    } catch (error: any) {
      handleError(error, "Erro ao alterar senha");
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Tem certeza? Esta ação removerá o perfil do usuário.")) return;
    
    // First, try to remove from roles and permissions to avoid constraint issues
    await supabase.from('user_roles').delete().eq('user_id', userId);
    await supabase.from('user_permissions').delete().eq('user_id', userId);
    
    const { error } = await supabase.from('profiles').delete().eq('user_id', userId);
    if (error) handleError(error);
    else { handleSuccess("Usuário removido com sucesso."); fetchAdminData(); }
  };

  const handleAddUser = async () => {
    if (!newUserEmail || !newUserPassword || !newUserDisplayName) {
      toast({ variant: "destructive", title: "Erro", description: "Preencha todos os campos." });
      return;
    }

    setIsCreatingUser(true);
    try {
      // In a real app, you might want to use a Supabase Edge Function for this 
      // to avoid triggering email confirmation if desired, or just use regular signup.
      // For this implementation, we'll use the public signUp.
      const { data, error } = await supabase.auth.signUp({
        email: newUserEmail,
        password: newUserPassword,
        options: {
          data: {
            display_name: newUserDisplayName,
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // Wait a bit for the profile trigger to finish (if any) or create it manually
        const { error: profileError } = await supabase.from('profiles').upsert({
          user_id: data.user.id,
          display_name: newUserDisplayName,
        }, { onConflict: 'user_id' });

        if (profileError) console.error("Error creating profile:", profileError);
        
        handleSuccess("Usuário convidado/criado com sucesso.");
        setIsAddUserOpen(false);
        setNewUserEmail("");
        setNewUserPassword("");
        setNewUserDisplayName("");
        fetchAdminData();
      }
    } catch (error: any) {
      handleError(error, "Erro ao criar");
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleUpdateFinancialRequest = async (id: string, status: 'approved' | 'rejected', reason?: string) => {
    const { error } = await supabase.from('financial_requests').update({ status, rejection_reason: reason }).eq('id', id);
    if (!error) { handleSuccess(`Solicitação ${status}.`); fetchAdminData(); } else { handleError(error); }
  };

  const handleUpdateSetting = async (key: string, value: any) => {
    const formattedValue = typeof value === 'string' ? JSON.stringify(value) : value;
    const { error } = await supabase.from('system_settings').upsert({ key, value: formattedValue }, { onConflict: 'key' });
    if (error) handleError(error, "Erro ao salvar");
    else { handleSuccess("Configuração atualizada."); fetchAdminData(); }
  };

  const exportAuditLogsToCSV = () => {
    const headers = ["ID", "Data", "Nome", "Tipo", "Valor", "Status"];
    const csvRows = [
      headers.join(","),
      ...transferAuditLogs.map(log => [
        log.id,
        format(new Date(log.created_at), "yyyy-MM-dd HH:mm"),
        `"${log.profiles?.display_name || "N/A"}"`,
        log.type,
        log.amount,
        log.status
      ].join(","))
    ];

    const blob = new Blob([csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `audit_logs_${Date.now()}.csv`;
    link.click();
  };

  const availablePermissions = [
    { key: 'manage_users', label: 'Gerenciar Usuários' },
    { key: 'approve_kyc', label: 'Aprovar KYC' },
    { key: 'manage_tokens', label: 'Gerenciar Tokens' },
    { key: 'manage_financial', label: 'Depósitos e Saques' },
    { key: 'system_settings', label: 'Configurações do Sistema' }
  ];

  const stats = useMemo(() => [
    { title: "Usuários", value: profiles.length, icon: Users, trend: "+12%", color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Ativos GTK", value: tokens.reduce((acc, t) => acc + Number(t.circulating_supply), 0).toLocaleString(), icon: Coins, trend: "+5.2%", color: "text-primary", bg: "bg-primary/10" },
    { title: "Financeiro (BRL)", value: `R$ ${transactions.reduce((acc, tx) => acc + Number(tx.amount_currency), 0).toLocaleString()}`, icon: Wallet, trend: "+18%", color: "text-green-500", bg: "bg-green-500/10" },
    { title: "KYC Pendente", value: kycs.filter(k => k.status === 'under_review').length, icon: ShieldCheck, trend: "-2", color: "text-amber-500", bg: "bg-amber-500/10" },
  ], [profiles, tokens, transactions, kycs]);

  const chartData = useMemo(() => [
    { name: 'Seg', value: 4000 }, { name: 'Ter', value: 3000 }, { name: 'Qua', value: 2000 },
    { name: 'Qui', value: 2780 }, { name: 'Sex', value: 1890 }, { name: 'Sab', value: 2390 }, { name: 'Dom', value: 3490 },
  ], []);

  const menuItems = [
    { id: "overview", icon: BarChart3, label: "Visão Geral" },
    { id: "users", icon: Users, label: "Usuários" },
    { id: "kyc", icon: ShieldCheck, label: "KYC & Verificação" },
    { id: "financial", icon: Wallet, label: "Depósitos/Saques" },
    { id: "tokens", icon: Coins, label: "Ativos Tokenizados" },
    { id: "audit", icon: History, label: "Auditoria" },
    { id: "seo", icon: Globe, label: "SEO & Google" },
    { id: "docs", icon: BookOpen, label: "Documentação" },
    { id: "settings", icon: Settings, label: "Configurações" },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-neutral-950/80 backdrop-blur-2xl">
      <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
        <Logo size="md" />
      </div>
      <nav className="flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto px-6 py-2">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button 
              key={item.id} 
              onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
              className={cn(
                "flex items-center gap-3 rounded-xl h-12 px-4 transition-all duration-300 relative group overflow-hidden border shrink-0",
                isActive 
                  ? "bg-primary text-black font-bold border-primary shadow-[0_4px_15px_rgba(255,215,0,0.3)]" 
                  : "text-white/60 hover:text-white hover:bg-white/5 border-transparent"
              )}
              aria-label={`Ir para ${item.label}`}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-transform duration-300 shrink-0",
                isActive ? "scale-110" : "group-hover:scale-110"
              )} /> 
              <span className="text-sm tracking-tight">{item.label}</span>
              {isActive && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute right-0 top-2 bottom-2 w-1.5 bg-black rounded-l-full" 
                />
              )}
            </button>
          );
        })}
      </nav>
      <div className="px-6 pt-4 pb-6 border-t border-white/5 shrink-0">
        <Button
          variant="ghost"
          className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl px-4 h-12 transition-colors border border-transparent"
          onClick={() => { supabase.auth.signOut(); navigate("/"); }}
        >
          <LogOut className="w-5 h-5 mr-3" /> <span className="text-sm font-bold">Sair do Painel</span>
        </Button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col lg:flex-row font-sans selection:bg-primary selection:text-black">
      {/* Desktop Sidebar */}
      <aside className="w-72 border-r border-white/5 hidden lg:block h-screen sticky top-0 z-40">
        <SidebarContent />
      </aside>
      
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between p-4 border-b border-white/5 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-50">
        <Logo size="sm" />
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="hover:bg-white/5 rounded-xl">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 bg-neutral-950 border-white/5 w-72 flex flex-col h-full">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </header>

      <main className="flex-1 p-4 md:p-6 lg:p-8 xl:p-12 overflow-x-hidden min-w-0">
        <div className="max-w-7xl mx-auto w-full">
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8 md:mb-12">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Sistema Online</span>
              </div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-black italic tracking-tighter">
                PAINEL <span className="text-primary gold-text-gradient">ADMIN</span>
              </h1>
              <p className="text-xs md:text-sm text-white/40 font-medium">Controle total do ecossistema Santek em tempo real.</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 sm:flex-none h-10 md:h-11 px-4 md:px-6 border-white/10 hover:border-primary/50 rounded-xl bg-white/5 backdrop-blur-sm transition-all font-bold text-xs md:text-sm"
                onClick={fetchAdminData}
              >
                <RefreshCw className="w-3.5 h-3.5 md:w-4 md:h-4 mr-2" /> Atualizar
              </Button>
            </div>
          </header>


          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {activeTab === "overview" && <OverviewSection stats={stats} chartData={chartData} />}
              {activeTab === "users" && (
                <UsersSection 
                  profiles={profiles} 
                  userRoles={userRoles} 
                  userPermissions={userPermissions}
                  availablePermissions={availablePermissions}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  handleUpdateRole={handleUpdateRole}
                  handleDeleteUser={handleDeleteUser}
                  onEditUser={(u) => { setSelectedUser(u); setIsEditUserOpen(true); }}
                  onManagePermissions={(u, perms) => { setSelectedUser(u); setCurrentUserPerms(perms); setIsPermissionsOpen(true); }}
                  onResetPassword={(u) => { setSelectedUser(u); setIsPasswordResetOpen(true); }}
                  onAddUser={() => setIsAddUserOpen(true)}
                />
              )}
              {activeTab === "financial" && (
                <FinancialSection 
                  financialRequests={financialRequests} 
                  handleUpdateFinancialRequest={handleUpdateFinancialRequest}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                />
              )}
              {activeTab === "kyc" && (
                <KYCSection 
                  kycs={kycs} 
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                />
              )}
              {activeTab === "tokens" && <TokensSection tokens={tokens} onRefresh={fetchAdminData} />}
              {activeTab === "audit" && (
                <AuditSection 
                  auditLogs={auditLogs} 
                  transferAuditLogs={transferAuditLogs} 
                  transferFilters={{}} 
                  exportAuditLogsToCSV={exportAuditLogsToCSV}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                />
              )}
              { activeTab === "seo" && <SEOManagement systemSettings={systemSettings} onUpdateSetting={handleUpdateSetting} /> }
              { activeTab === "docs" && <DocumentationSection /> }
              { activeTab === "settings" && (
                <SettingsSection 
                  systemSettings={systemSettings} 
                  handleUpdateSetting={handleUpdateSetting} 
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Dialogs */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="bg-neutral-900 border-white/10 text-white rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic tracking-tight">Editar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex justify-center mb-6">
              <AvatarUpload
                userId={selectedUser?.user_id}
                url={selectedUser?.avatar_url}
                onUpload={(url) => setSelectedUser(selectedUser ? {...selectedUser, avatar_url: url} : null)}
                size="lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-white/40 tracking-widest">Nome de Exibição</Label>
              <Input 
                value={selectedUser?.display_name || ""} 
                onChange={(e) => setSelectedUser(selectedUser ? {...selectedUser, display_name: e.target.value} : null)}
                className="bg-white/5 border-white/10 rounded-xl h-12"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-white/40 tracking-widest">Saldo BRL</Label>
              <Input 
                type="number"
                value={selectedUser?.balance_brl || 0} 
                onChange={(e) => setSelectedUser(selectedUser ? {...selectedUser, balance_brl: Number(e.target.value)} : null)}
                className="bg-white/5 border-white/10 rounded-xl h-12"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="ghost" onClick={() => setIsEditUserOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={async () => {
              if (selectedUser) {
                const { error } = await supabase.from('profiles').update({ 
                  display_name: selectedUser.display_name,
                  balance_brl: selectedUser.balance_brl,
                  avatar_url: selectedUser.avatar_url
                } as any).eq('user_id', selectedUser.user_id);
                if (error) toast({ variant: "destructive", title: "Erro", description: error.message });
                else { toast({ title: "Sucesso", description: "Usuário atualizado." }); fetchAdminData(); setIsEditUserOpen(false); }
              }
            }} className="bg-primary text-black font-bold rounded-xl px-6">Salvar Alterações</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen}>
        <DialogContent className="bg-neutral-900 border-white/10 text-white rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic tracking-tight">Permissões: {selectedUser?.display_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {availablePermissions.map((perm) => (
              <div key={perm.key} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="font-bold text-sm">{perm.label}</span>
                <input 
                  type="checkbox" 
                  checked={currentUserPerms.includes(perm.key)}
                  onChange={(e) => {
                    const granted = (e.target as HTMLInputElement).checked;
                    handleTogglePermission(selectedUser.user_id, perm.key, granted);
                    if (granted) setCurrentUserPerms([...currentUserPerms, perm.key]);
                    else setCurrentUserPerms(currentUserPerms.filter((k: string) => k !== perm.key));
                  }}
                  className="w-5 h-5 accent-primary"
                />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="bg-neutral-900 border-white/10 text-white rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic tracking-tight uppercase">Novo Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-white/40 tracking-widest">Nome Completo</Label>
              <Input 
                placeholder="Ex: João Silva" 
                value={newUserDisplayName}
                onChange={(e) => setNewUserDisplayName(e.target.value)}
                className="bg-white/5 border-white/10 rounded-xl h-12"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-white/40 tracking-widest">E-mail</Label>
              <Input 
                type="email" 
                placeholder="email@exemplo.com" 
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className="bg-white/5 border-white/10 rounded-xl h-12"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-white/40 tracking-widest">Senha Provisória</Label>
              <Input 
                type="password" 
                placeholder="••••••••" 
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                className="bg-white/5 border-white/10 rounded-xl h-12"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="ghost" onClick={() => setIsAddUserOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button 
              onClick={handleAddUser} 
              disabled={isCreatingUser}
              className="bg-primary text-black font-bold rounded-xl px-6"
            >
              {isCreatingUser ? "Criando..." : "Criar Usuário"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfirmRoleOpen} onOpenChange={setIsConfirmRoleOpen}>
        <DialogContent className="bg-neutral-900 border-white/10 text-white rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic tracking-tight uppercase">Confirmar Alteração</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2 border border-primary/20">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            
            <p className="text-white/80 text-sm text-center">
              Selecione o novo cargo para este usuário:
            </p>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-white/40 tracking-widest px-1">Cargo Permitido</Label>
              <div className="grid grid-cols-1 gap-2">
                {ALLOWED_ROLES.map((opt) => {
                  const isSelected = pendingRole?.role === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => pendingRole && setPendingRole({ ...pendingRole, role: opt.value })}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-xl border text-left transition-all",
                        isSelected
                          ? "border-primary bg-primary/10 shadow-[0_4px_15px_rgba(255,215,0,0.15)]"
                          : "border-white/10 bg-white/5 hover:border-white/20"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center",
                        isSelected ? "border-primary" : "border-white/30"
                      )}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-bold uppercase tracking-wide", isSelected ? "text-primary" : "text-white")}>
                          {opt.label}
                        </p>
                        <p className="text-[11px] text-white/50 mt-0.5">{opt.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {(pendingRole?.role === 'admin' || userRoles.find(r => r.user_id === pendingRole?.userId)?.role === 'admin') && (
              <div className="space-y-3 pt-2">
                <p className="text-red-400 text-xs font-bold border border-red-500/20 bg-red-500/5 p-3 rounded-xl">
                  {pendingRole?.role === 'admin'
                    ? "AVISO: Esta ação concederá privilégios administrativos totais."
                    : "AVISO: Esta ação removerá os privilégios administrativos do usuário."}
                </p>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-white/40 tracking-widest px-1">Motivo da Alteração (Obrigatório)</Label>
                  <Input
                    placeholder="Ex: Novo membro da equipe técnica"
                    value={roleChangeReason}
                    onChange={(e) => setRoleChangeReason(e.target.value)}
                    className="bg-white/5 border-white/10 rounded-xl h-10 text-sm"
                  />
                </div>

                {pendingRole?.role === 'admin' && (
                  <div className="space-y-1 pt-1">
                    <Label className="text-[10px] font-bold uppercase text-red-400 tracking-widest px-1">
                      Confirmação Final — Digite <span className="font-mono text-red-300">ADMIN</span>
                    </Label>
                    <Input
                      placeholder="ADMIN"
                      value={adminConfirmText}
                      onChange={(e) => setAdminConfirmText(e.target.value)}
                      autoComplete="off"
                      className="bg-red-500/5 border-red-500/30 rounded-xl h-10 text-sm font-mono uppercase tracking-widest focus-visible:ring-red-500/40"
                    />
                    {adminConfirmText && adminConfirmText.trim().toUpperCase() !== 'ADMIN' && (
                      <p className="text-[10px] text-red-400/80 px-1">Texto não corresponde. Digite exatamente ADMIN.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 mt-2">
            <Button 
              onClick={confirmRoleUpdate}
              disabled={
                (!roleChangeReason && (pendingRole?.role === 'admin' || userRoles.find(r => r.user_id === pendingRole?.userId)?.role === 'admin'))
                || (pendingRole?.role === 'admin' && adminConfirmText.trim().toUpperCase() !== 'ADMIN')
              }
              className="bg-primary text-black font-bold rounded-xl h-12 shadow-[0_4px_15px_rgba(255,215,0,0.2)] disabled:opacity-50"
            >
              Confirmar Alteração
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => { 
                setIsConfirmRoleOpen(false); 
                setPendingRole(null); 
                setRoleChangeReason("");
                setAdminConfirmText("");
              }} 
              className="rounded-xl h-12 text-white/40 hover:text-white"
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isPasswordResetOpen} onOpenChange={setIsPasswordResetOpen}>
        <DialogContent className="bg-neutral-900 border-white/10 text-white rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic tracking-tight uppercase">Alterar Senha</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-2 border border-amber-500/20">
              <KeyRound className="w-8 h-8 text-amber-500" />
            </div>
            
            <p className="text-white/80 text-sm text-center">
              Defina uma nova senha para <strong>{selectedUser?.display_name}</strong>.
            </p>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-white/40 tracking-widest px-1">Nova Senha</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-white/5 border-white/10 rounded-xl h-12"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-2">
            <Button 
              onClick={handleResetPassword}
              disabled={isResettingPassword || !newPassword || newPassword.length < 6}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl h-12 shadow-[0_4px_15px_rgba(245,158,11,0.2)]"
            >
              {isResettingPassword ? "Alterando..." : "Confirmar Nova Senha"}
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => { 
                setIsPasswordResetOpen(false); 
                setNewPassword("");
              }} 
              className="rounded-xl h-12 text-white/40 hover:text-white"
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPanel;