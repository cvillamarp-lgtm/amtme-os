import { useQuery } from "@tanstack/react-query";
import type { PiezaData } from "@/lib/types/pieza";

export function usePiezasData() {
  return useQuery<PiezaData>({
    queryKey: ["piezas-data"],
    queryFn: async () => {
      const res = await fetch("/data/piezas.json");
      if (!res.ok) throw new Error("Error cargando datos de diseño");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function usePiezas() {
  const { data, ...rest } = usePiezasData();
  return { data: data?.piezas ?? [], ...rest };
}

export function usePieza(id: string) {
  const { data: piezas } = usePiezas();
  return piezas.find((p) => p.id === id) ?? null;
}
