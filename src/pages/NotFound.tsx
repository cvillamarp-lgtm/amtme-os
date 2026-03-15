import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-display font-bold text-primary">404</h1>
        <p className="text-lg text-muted-foreground">Página no encontrada</p>
        <Button asChild variant="outline">
          <Link to="/">Volver al inicio</Link>
        </Button>
      </div>
    </div>
  );
}
