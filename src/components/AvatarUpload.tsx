import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, User } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface AvatarUploadProps {
  userId: string;
  url?: string;
  onUpload: (url: string) => void;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  editable?: boolean;
}

export const AvatarUpload = ({
  userId,
  url,
  onUpload,
  className,
  size = "md",
  editable = true,
}: AvatarUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-16 h-16",
    lg: "w-24 h-24",
    xl: "w-32 h-32",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
    xl: "w-10 h-10",
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("Você deve selecionar uma imagem para fazer upload.");
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `${userId}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      onUpload(publicUrl);
      toast({
        title: "Sucesso!",
        description: "Foto de perfil atualizada.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao fazer upload",
        description: error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={cn("relative group", className)}>
      <div 
        className={cn(
          "rounded-full overflow-hidden bg-neutral-800 border-2 border-primary/20 flex items-center justify-center transition-all duration-300",
          sizeClasses[size],
          editable && "cursor-pointer group-hover:border-primary/50 group-hover:brightness-75"
        )}
        onClick={editable ? triggerUpload : undefined}
      >
        {url ? (
          <img 
            src={url} 
            alt="Avatar" 
            className="w-full h-full object-cover"
          />
        ) : (
          <User className={cn("text-primary/40", iconSizes[size])} />
        )}
        
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {editable && !uploading && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="w-6 h-6 text-white" />
          </div>
        )}
      </div>

      {editable && (
        <input
          type="file"
          id="avatar-upload"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
        />
      )}
    </div>
  );
};
