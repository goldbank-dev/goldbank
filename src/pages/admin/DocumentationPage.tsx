
import { DocumentationSection } from "@/components/admin/sections/DocumentationSection";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DocumentationPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 md:p-8 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/sanpainel")}
          className="hover:bg-white/5 text-white/60 mb-4"
        >
          <ChevronLeft className="w-4 h-4 mr-2" /> Voltar ao Painel
        </Button>
        <DocumentationSection />
      </div>
    </div>
  );
};

export default DocumentationPage;
