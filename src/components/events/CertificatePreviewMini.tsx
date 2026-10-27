"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Evento } from "@/lib/events/types";
import { templateUrlOf } from "@/lib/events/types";
import { CertificateEngine } from "@/lib/cert/CertificateEngine";
import { FontManager } from "@/lib/cert/FontManager";
import { CertificateGenerator } from "@/lib/events/CertificateGenerator";
import { Loader2 } from "lucide-react";

/** Preview do certificado do evento (usa o primeiro participante ou placeholder). */
export function CertificatePreviewMini({ evento }: { evento: Evento }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  // Participante de exemplo: o primeiro, ou um placeholder
  const sampleParticipant = useMemo(
    () =>
      evento.participantes[0] ?? {
        id: "sample",
        nome: "[Nome da Pessoa]",
        docTipo: "Nenhum" as const,
        docNumero: "",
        funcao: evento.participantes[0]?.funcao ?? "Ouvinte",
        funcaoCustom: "",
        nomeTrabalho: evento.participantes[0]?.nomeTrabalho ?? "",
        cargaHoraria: evento.cargaHorariaPadrao || "[Horas]",
        createdAt: "",
        updatedAt: "",
      },
    [evento],
  );

  // Observa tamanho do container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setContainerSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Renderiza
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const templateUrl = templateUrlOf(evento);
        const template = await loadImage(templateUrl);
        const signature =
          evento.signature.useSignature && evento.signature.signatureDataUrl
            ? await loadImage(evento.signature.signatureDataUrl)
            : null;
        const fonts = await FontManager.instance.load(evento.appearance.fontName);
        if (cancelled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const engine = new CertificateEngine(ctx);
        const input = CertificateGenerator.toInput(evento, sampleParticipant);
        await engine.render(input, template, fonts, signature);
        if (!cancelled) setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        setErrorMsg(err instanceof Error ? err.message : "Erro desconhecido");
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [evento, sampleParticipant]);

  // Dimensões de exibição (contain)
  const displayDims = (() => {
    const origW = 2000;
    const origH = 1414;
    if (containerSize.w === 0) return { w: origW, h: origH };
    const scale = Math.min(containerSize.w / origW, 280 / origH, 1);
    return { w: Math.round(origW * scale), h: Math.round(origH * scale) };
  })();

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-[180px] items-center justify-center overflow-hidden rounded-lg bg-muted/40 p-2"
    >
      {/* Canvas sempre montado para que o effect possa desenhar nele.
          Visibilidade controlada para não mostrar vazio durante o loading. */}
      <canvas
        ref={canvasRef}
        style={{
          width: displayDims.w,
          height: displayDims.h,
          visibility: status === "ready" ? "visible" : "hidden",
          position: status === "ready" ? "static" : "absolute",
        }}
        className="rounded shadow-lg"
      />
      {status === "loading" && (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      )}
      {status === "error" && (
        <div className="text-center text-xs text-destructive">{errorMsg}</div>
      )}
    </div>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Falha ao carregar imagem: ${src.slice(0, 60)}`));
    img.src = src;
  });
}
