import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { User, Shield, Smartphone, Loader2, AlertCircle, Camera } from "lucide-react";
import { AvatarUpload } from "@/components/AvatarUpload";
import { z } from "zod";

// Validation schema
const profileUpdateSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(120, "Nome não pode exceder 120 caracteres")
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "Nome contém caracteres inválidos"),
  phone: z
    .string()
    .trim()
    .refine(
      (val) => val === "" || /^[0-9+()\s\-]{8,30}$/.test(val),
      "Telefone deve ter entre 8 e 30 caracteres numéricos e símbolos"
    )
    .optional()
    .transform((val) => val || ""),
});

type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

const SettingsPage = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    display_name: "",
    phone: "",
    avatar_url: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      
      setProfile(data);
      setFormData({
        display_name: data.display_name || "",
        phone: data.phone || "",
        avatar_url: data.avatar_url || "",
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate form data
    try {
      profileUpdateSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path[0] as string;
          newErrors[path] = err.message;
        });
        setErrors(newErrors);
        toast({
          variant: "destructive",
          title: "Validação falhou",
          description: "Por favor, corrija os erros no formulário.",
        });
      }
      return;
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: formData.display_name.trim(),
          phone: formData.phone.trim(),
          avatar_url: formData.avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground mt-1">Gerencie suas informações pessoais e segurança da conta.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-neutral-900 border-white/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Informações Pessoais
                </CardTitle>
                <CardDescription>
                  Atualize seus dados básicos de perfil.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                       <Label htmlFor="name">Nome Completo</Label>
                       <Input 
                         id="name"
                         value={formData.display_name}
                         onChange={(e) => {
                           setFormData({ ...formData, display_name: e.target.value });
                           setErrors({ ...errors, display_name: "" });
                         }}
                         className={`bg-black border-white/10 focus:border-primary/50 ${
                           errors.display_name ? "border-red-500 focus:border-red-500" : ""
                         }`}
                         placeholder="Seu nome completo"
                       />
                       {errors.display_name && (
                         <div className="flex items-center gap-2 text-sm text-red-400 mt-1">
                           <AlertCircle className="w-4 h-4" />
                           {errors.display_name}
                         </div>
                       )}
                     </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input 
                        id="email"
                        value={profile?.email || ""}
                        disabled
                        className="bg-black/50 border-white/5 text-muted-foreground cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-2">
                       <Label htmlFor="phone">Telefone / WhatsApp</Label>
                       <Input 
                         id="phone"
                         value={formData.phone}
                         onChange={(e) => {
                           setFormData({ ...formData, phone: e.target.value });
                           setErrors({ ...errors, phone: "" });
                         }}
                         className={`bg-black border-white/10 focus:border-primary/50 ${
                           errors.phone ? "border-red-500 focus:border-red-500" : ""
                         }`}
                         placeholder="(00) 00000-0000"
                       />
                       {errors.phone && (
                         <div className="flex items-center gap-2 text-sm text-red-400 mt-1">
                           <AlertCircle className="w-4 h-4" />
                           {errors.phone}
                         </div>
                       )}
                     </div>
                  </div>
                  <div className="pt-4 flex justify-end">
                    <Button type="submit" className="glow-primary rounded-xl px-8" disabled={saving}>
                      {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Salvar Alterações
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="bg-neutral-900 border-white/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Segurança
                </CardTitle>
                <CardDescription>
                  Gerencie sua senha e autenticação.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Autenticação em Duas Etapas (2FA)</p>
                      <p className="text-xs text-muted-foreground">Aumente a segurança da sua conta.</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="border-white/10">
                    Configurar
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Alterar Senha</p>
                      <p className="text-xs text-muted-foreground">Recomendamos trocar a senha a cada 90 dias.</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="border-white/10">
                    Redefinir
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-neutral-900 border-white/5">
              <CardHeader>
                <CardTitle className="text-lg">Sua Conta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center gap-4 mb-6 pt-4">
                  <AvatarUpload
                    userId={profile?.user_id}
                    url={formData.avatar_url}
                    onUpload={(url) => setFormData({ ...formData, avatar_url: url })}
                    size="xl"
                  />
                  <div className="text-center">
                    <p className="font-bold text-lg">{profile?.display_name || "Investidor"}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      Status: {profile?.kyc_status === 'approved' ? 'Verificado' : 'Pendente'}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Membro desde</span>
                    <span>{new Date(profile?.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">ID do Usuário</span>
                    <span className="font-mono opacity-50">{profile?.user_id?.substring(0, 8)}...</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
