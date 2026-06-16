import { useEffect, useMemo, useState } from "react";
import { Search, Edit, Shield, Trash2, UserPlus, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PaginationControls } from "@/components/admin/PaginationControls";
import { useUrlPagination } from "@/hooks/useUrlPagination";

interface UsersSectionProps {
  profiles: any[];
  userRoles: any[];
  userPermissions: any[];
  availablePermissions: any[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleUpdateRole: (userId: string, role: string) => void;
  handleDeleteUser: (userId: string) => void;
  onEditUser: (user: any) => void;
  onManagePermissions: (user: any, perms: string[]) => void;
  onResetPassword: (user: any) => void;
  onAddUser: () => void;
}

export const UsersSection = ({
  profiles,
  userRoles,
  userPermissions,
  availablePermissions,
  searchQuery,
  setSearchQuery,
  handleUpdateRole,
  handleDeleteUser,
  onEditUser,
  onManagePermissions,
  onResetPassword,
  onAddUser
}: UsersSectionProps) => {
  const { page, pageSize, setPage, setPageSize, resetPage } = useUrlPagination({ prefix: "users" });

  const filteredProfiles = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return profiles.filter(p =>
      p.display_name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q)
    );
  }, [profiles, searchQuery]);

  useEffect(() => { resetPage(); }, [searchQuery, resetPage]);

  const paginatedProfiles = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredProfiles.slice(start, start + pageSize);
  }, [filteredProfiles, page, pageSize]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center mb-6">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input 
            placeholder="Buscar por nome, e-mail ou documento..." 
            className="pl-10 bg-white/5 border-white/10 w-full focus:border-primary/50 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button 
          onClick={onAddUser}
          className="bg-primary hover:bg-primary/90 text-black font-bold rounded-xl h-10 px-6 gap-2 transition-all shadow-[0_4px_15px_rgba(255,215,0,0.2)]"
        >
          <UserPlus className="w-4 h-4" />
          Novo Usuário
        </Button>
      </div>

      {/* Desktop view: Table */}
      <div className="hidden lg:block">
        <Card className="bg-neutral-900/50 border-white/5 overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full text-left">
              <thead className="bg-white/5 text-xs font-bold text-white/40 uppercase tracking-wider">
                <tr>
                  <th className="p-4">Usuário</th>
                  <th className="p-4">Cargo</th>
                  <th className="p-4">Permissões</th>
                  <th className="p-4">Saldo BRL</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedProfiles
                  .map((user) => {
                    const userRole = userRoles.find(r => r.user_id === user.user_id)?.role || 'user';
                    const userPerms = userPermissions.filter(p => p.user_id === user.user_id && p.granted);
                    
                    return (
                      <tr key={user.user_id || user.id} className="hover:bg-white/5 transition-colors group">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {user.avatar_url ? (
                              <img 
                                src={user.avatar_url} 
                                alt={user.display_name} 
                                className="w-10 h-10 rounded-xl object-cover border border-primary/10"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center text-primary font-bold shadow-lg">
                                {user.display_name?.[0]?.toUpperCase() || "U"}
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-white group-hover:text-primary transition-colors">{user.display_name || "Sem nome"}</p>
                              <p className="text-xs text-white/40">{user.email || "Sem e-mail"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <select 
                            className="bg-neutral-800 border-white/10 text-xs rounded-lg p-1.5 focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                            value={userRole}
                            onChange={(e) => handleUpdateRole(user.user_id, e.target.value)}
                          >
                            <option value="user">Usuário</option>
                            <option value="manager">Gerente</option>
                            <option value="admin">Administrador</option>
                          </select>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {userPerms.length > 0 ? userPerms.map(p => (
                              <span key={p.id} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                {availablePermissions.find(ap => ap.key === p.permission_key)?.label || p.permission_key}
                              </span>
                            )) : <span className="text-[10px] text-white/20">Acesso padrão</span>}
                          </div>
                        </td>
                        <td className="p-4 text-white/60 font-mono">
                          R$ {user.currency_balance?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || "0,00"}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary"
                              onClick={() => onEditUser(user)}
                              title="Editar Usuário"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-lg hover:bg-blue-500/10 hover:text-blue-400"
                              onClick={() => onManagePermissions(user, userPerms.map(p => p.permission_key))}
                              title="Gerenciar Permissões"
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-lg hover:bg-amber-500/10 hover:text-amber-500"
                              onClick={() => onResetPassword(user)}
                              title="Alterar Senha"
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-lg hover:bg-red-500/10 hover:text-red-500"
                              onClick={() => handleDeleteUser(user.user_id)}
                              title="Remover Usuário"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Mobile/Tablet view: Grid cards */}
      <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
        {paginatedProfiles
          .map((user) => {
            const userRole = userRoles.find(r => r.user_id === user.user_id)?.role || 'user';
            const userPerms = userPermissions.filter(p => p.user_id === user.user_id && p.granted);
            
            return (
              <Card key={user.user_id || user.id} className="bg-neutral-900/50 border-white/5 p-4 backdrop-blur-sm space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {user.avatar_url ? (
                      <img 
                        src={user.avatar_url} 
                        alt={user.display_name} 
                        className="w-12 h-12 rounded-xl object-cover border border-primary/10"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center text-primary font-bold shadow-lg text-lg">
                        {user.display_name?.[0]?.toUpperCase() || "U"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">{user.display_name || "Sem nome"}</p>
                      <p className="text-xs text-white/40 truncate">{user.email || "Sem e-mail"}</p>
                    </div>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] uppercase">
                    {userRole}
                  </Badge>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40 uppercase font-bold tracking-widest">Saldo BRL</span>
                    <span className="font-mono text-primary">R$ {user.currency_balance?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || "0,00"}</span>
                  </div>
                  
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest block">Permissões</span>
                    <div className="flex flex-wrap gap-1">
                      {userPerms.length > 0 ? userPerms.map(p => (
                        <span key={p.id} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/60 border border-white/10">
                          {availablePermissions.find(ap => ap.key === p.permission_key)?.label || p.permission_key}
                        </span>
                      )) : <span className="text-[10px] text-white/20 italic">Acesso padrão</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  <select 
                    className="flex-1 bg-neutral-800 border-white/10 text-xs rounded-lg p-2 focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                    value={userRole}
                    onChange={(e) => handleUpdateRole(user.user_id, e.target.value)}
                  >
                    <option value="user">Usuário</option>
                    <option value="manager">Gerente</option>
                    <option value="admin">Administrador</option>
                  </select>
                  
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 rounded-lg hover:bg-primary/10 hover:text-primary bg-white/5"
                      onClick={() => onEditUser(user)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 rounded-lg hover:bg-blue-500/10 hover:text-blue-400 bg-white/5"
                      onClick={() => onManagePermissions(user, userPerms.map(p => p.permission_key))}
                    >
                      <Shield className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 rounded-lg hover:bg-amber-500/10 hover:text-amber-500 bg-white/5"
                      onClick={() => onResetPassword(user)}
                      title="Alterar Senha"
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 rounded-lg hover:bg-red-500/10 hover:text-red-500 bg-white/5"
                      onClick={() => handleDeleteUser(user.user_id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
      </div>

      <PaginationControls
        currentPage={page}
        totalItems={filteredProfiles.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[10, 25, 50, 100]}
      />

    </div>
  );
};
