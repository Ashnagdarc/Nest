import { AlertTriangle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ReturnDetailsStepProps {
  damage: string;
  notes: string;
  onDamageChange: (value: string) => void;
  onNotesChange: (value: string) => void;
}

const DAMAGE_OPTIONS = [
  { value: "none", label: "No damage", description: "Equipment is in good condition" },
  { value: "minor", label: "Minor wear", description: "Cosmetic wear or small issues" },
  { value: "major", label: "Major damage", description: "Needs repair or replacement" },
] as const;

export function ReturnDetailsStep({
  damage,
  notes,
  onDamageChange,
  onNotesChange,
}: ReturnDetailsStepProps) {
  return (
    <div className="space-y-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="space-y-3">
        <Label className="text-base font-semibold">Equipment condition</Label>
        <RadioGroup value={damage} onValueChange={onDamageChange} className="grid gap-2 sm:grid-cols-3">
          {DAMAGE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              htmlFor={`damage-${opt.value}`}
              className={cn(
                "flex cursor-pointer flex-col rounded-xl border p-4 transition-colors",
                damage === opt.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border hover:bg-muted/50",
                opt.value === "major" && damage === "major" && "border-destructive/50 bg-destructive/5",
              )}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value={opt.value} id={`damage-${opt.value}`} />
                <span className="text-sm font-medium">{opt.label}</span>
                {opt.value === "major" && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
              </div>
              <p className="mt-1 pl-6 text-xs text-muted-foreground">{opt.description}</p>
            </label>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="return-notes" className="text-base font-semibold">
          Notes for admin
          <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="return-notes"
          placeholder="Describe any issues, missing accessories, or context for this return…"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={4}
          className="resize-none"
        />
      </div>
    </div>
  );
}
