"use client";
import { useState } from "react";
import { FontManager } from "@/lib/cert/FontManager";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FontImportDialog } from "./FontImportDialog";
import { Type } from "lucide-react";
import { toast } from "sonner";

/** Seletor de fonte com opção de importar fontes customizadas. */
export function FontSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  // Lista derivada do FontManager + contador de versão para forçar re-render após import.
  const [version, setVersion] = useState(0);
  const fonts = FontManager.instance.listAll();
  void version; // referencia o estado para re-render
  const [importOpen, setImportOpen] = useState(false);

  const bundled = fonts.filter((f) => !f.isCustom);
  const custom = fonts.filter((f) => f.isCustom);

  return (
    <>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <Type className="mr-1.5 h-3.5 w-3.5" />
          <SelectValue placeholder="Selecione uma fonte" />
        </SelectTrigger>
        <SelectContent>
          {bundled.length > 0 && (
            <SelectGroup>
              <SelectLabel>Fontes do app</SelectLabel>
              {bundled.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
          {custom.length > 0 && (
            <>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>Fontes importadas</SelectLabel>
                {custom.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </>
          )}
          <SelectSeparator />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setImportOpen(true);
            }}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm font-medium text-primary hover:bg-accent hover:text-accent-foreground"
          >
            + Carregar nova fonte…
          </button>
        </SelectContent>
      </Select>

      <FontImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={(font) => {
          setVersion((v) => v + 1);
          onChange(font.id);
          toast.success(`Fonte "${font.label}" importada e selecionada.`);
        }}
      />
    </>
  );
}
