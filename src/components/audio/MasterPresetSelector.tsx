import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type AudioMasterPreset = "voice_solo" | "voice_music" | "interview";

export function MasterPresetSelector({
  value,
  onChange,
}: {
  value: AudioMasterPreset;
  onChange: (value: AudioMasterPreset) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Preset de mastering</Label>
      <Select value={value} onValueChange={(v) => onChange(v as AudioMasterPreset)}>
        <SelectTrigger>
          <SelectValue placeholder="Selecciona preset" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="voice_solo">Voz sola</SelectItem>
          <SelectItem value="voice_music">Voz + música</SelectItem>
          <SelectItem value="interview">Entrevista</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
