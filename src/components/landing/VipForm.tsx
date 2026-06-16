import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export const VipForm = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    
    try {
      const { error } = await supabase
        .from("leads")
        .insert([{ name, email, phone }]);
        
      if (error) throw error;
      
      toast({
        title: t("vip.form.success_title"),
        description: t("vip.form.success_desc"),
      });
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao se cadastrar",
        description: error.message || "Tente novamente mais tarde.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-24 bg-primary/5" id="vip">
      <div className="container px-4">
        <div className="max-w-4xl mx-auto glass p-8 md:p-12 rounded-3xl border-primary/20 relative overflow-hidden">
          {/* Decorative element */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[80px] rounded-full -mr-32 -mt-32" />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
            <div>
              <h2 className="text-3xl font-bold mb-4">{t("vip.title")} <span className="text-primary">VIP</span></h2>
              <p className="text-muted-foreground mb-6">
                {t("vip.description")}
              </p>
              <ul className="space-y-3">
                {[t("vip.benefit1"), t("vip.benefit2"), t("vip.benefit3")].map((item, i) => (
                  <li key={i} className="flex items-center text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mr-3" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("vip.form.name")}</Label>
                <Input id="name" name="name" placeholder={t("vip.form.name_placeholder")} required className="bg-white/5 border-white/10" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("vip.form.email")}</Label>
                <Input id="email" name="email" type="email" placeholder={t("vip.form.email_placeholder")} required className="bg-white/5 border-white/10" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t("vip.form.phone")}</Label>
                <Input id="phone" name="phone" placeholder={t("vip.form.phone_placeholder")} className="bg-white/5 border-white/10" />
              </div>
              <Button type="submit" className="w-full font-bold glow-primary" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {t("vip.form.submit")}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};
