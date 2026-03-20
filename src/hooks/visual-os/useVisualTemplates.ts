import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { VisualTemplate, TemplateCopyBlockDef } from "@/lib/visual-os/types";

export function useVisualTemplates() {
  return useQuery({
    queryKey: ["visual_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visual_templates")
        .select("*")
        .eq("is_active", true)
        .order("production_order");
      if (error) throw error;
      return (data ?? []) as VisualTemplate[];
    },
    staleTime: 1000 * 60 * 30, // templates are stable
  });
}

export function useTemplateRules(templateId: string | undefined) {
  return useQuery({
    queryKey: ["visual_template_rules", templateId],
    enabled:  !!templateId,
    queryFn:  async () => {
      const { data, error } = await supabase
        .from("visual_template_rules")
        .select("*")
        .eq("template_id", templateId!)
        .eq("rule_type", "copy_block")
        .order("order_index");
      if (error) throw error;
      return (data ?? []).map(r => ({
        rule_key:      r.rule_key,
        label:         (r.rule_value_json as any)?.label ?? r.rule_key,
        default_value: (r.rule_value_json as any)?.default ?? "",
        max_chars:     (r.rule_value_json as any)?.max_chars ?? 80,
        is_required:   r.is_required,
        order_index:   r.order_index,
      } as TemplateCopyBlockDef));
    },
  });
}
