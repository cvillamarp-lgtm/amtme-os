import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Image, Palette, Settings, BookOpen } from "lucide-react";
import { lazy, Suspense } from "react";

// Lazy load the heavy sub-modules
const BrandStudio = lazy(() => import("./BrandStudio"));
const DesignStudio = lazy(() => import("./DesignStudio"));

function LoadingTab() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function SystemPage() {
  return (
    <div className="p-6 lg:p-8 h-full flex flex-col animate-fade-in">
      <div className="mb-6">
        <h1 className="page-title">Sistema</h1>
        <p className="page-subtitle">Branding, design tokens, presets visuales y reglas editoriales.</p>
      </div>

      <Tabs defaultValue="brand" className="flex-1 flex flex-col">
        <TabsList className="bg-secondary mb-6">
          <TabsTrigger value="brand" className="text-xs gap-1.5">
            <Image className="h-3.5 w-3.5" />Marca
          </TabsTrigger>
          <TabsTrigger value="design" className="text-xs gap-1.5">
            <Palette className="h-3.5 w-3.5" />Diseño
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-auto">
          <TabsContent value="brand" className="mt-0">
            <Suspense fallback={<LoadingTab />}>
              <BrandStudio />
            </Suspense>
          </TabsContent>
          <TabsContent value="design" className="mt-0">
            <Suspense fallback={<LoadingTab />}>
              <DesignStudio />
            </Suspense>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
