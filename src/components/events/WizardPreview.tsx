"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EventDraft } from "@/lib/events/types";
import { templateUrlOf } from "@/lib/events/types";
import { CertificateEngine } from "@/lib/cert/CertificateEngine";
import { FontManager } from "@/lib/cert/FontManager";
import { SignatureOverlay } from "@/lib/cert/SignatureOverlay";
import { Loader2 } from "lucide-react";

/**
 * Preview ao vivo para o wizard de criação de evento.
 * Reage às configurações de aparência e assinatura, com arrasto da assinatura.
 */
export function WizardPreview({
  draft,
  onSignaturePosChange,
}: {
  draft: EventDraft;
  onSignaturePosChange: (x: number, y: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [templateDims, setTemplateDims] = useState({ w: 2000, h: 1414 });
  const [hasSignature, setHasSignature] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const draggingRef = useRef(false);
  const grabOffsetRef = useRef({ x: 0, y: 0 });
  const imgRefs = useRef<{ template: HTMLImageElement | null; signature: HTMLImageElement | null }>({
    template: null,
    signature: null,
  });

  // Input derivado do draft (placeholder para preview)
  const input = useMemo(
    () => ({
      nome: "[NOME DA PESSOA]",
      funcaoParticipante: "ouvinte",
      docTipo: "Nenhum" as const,
      docNumero: "",
      nomeTrabalho: "",
      tipoAtividade: draft.tipoAtividade,
      nomeEvento: draft.nomeEvento || draft.nome || "[NOME DO EVENTO]",
      cargaHoraria: draft.cargaHorariaPadrao || "[HORAS]",
      useDate: draft.useDate,
      dataInicio: draft.dataInicio,
      dataFim: draft.dataFim,
      templateName: draft.templateName,
      templateUrl: templateUrlOf(draft),
      fontName: draft.appearance.fontName,
      fontSize: draft.appearance.fontSize,
      useItalic: draft.appearance.useItalic,
      posX: draft.appearance.posX,
      posY: draft.appearance.posY,
      useSignature: draft.signature.useSignature,
      signaturePath: draft.signature.signatureDataUrl,
      signaturePosX: draft.signature.signaturePosX,
      signaturePosY: draft.signature.signaturePosY,
      signatureSize: draft.signature.signatureSize,
    }),
    [draft],
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

  // Pré-carrega template + assinatura
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!input.templateUrl) {
        await Promise.resolve();
        if (cancelled) return;
        setStatus("error");
        setErrorMsg("Carregue um template na etapa anterior.");
        return;
      }
      try {
        const template = await loadImage(input.templateUrl);
        if (cancelled) return;
        imgRefs.current.template = template;
        setTemplateDims({ w: template.naturalWidth, h: template.naturalHeight });

        if (input.useSignature && input.signaturePath) {
          const sig = await loadImage(input.signaturePath);
          if (cancelled) return;
          imgRefs.current.signature = sig;
          setHasSignature(true);
        } else {
          imgRefs.current.signature = null;
          setHasSignature(false);
        }
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        setErrorMsg(err instanceof Error ? err.message : "Erro");
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [input.templateName, input.templateUrl, input.useSignature, input.signaturePath]);

  // Renderiza
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (status !== "ready") return;
      const canvas = canvasRef.current;
      const template = imgRefs.current.template;
      if (!canvas || !template) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      try {
        const fonts = await FontManager.instance.load(input.fontName);
        if (cancelled) return;
        const engine = new CertificateEngine(ctx);
        await engine.render(input, template, fonts, imgRefs.current.signature);
      } catch (err) {
        console.error("Erro no preview do wizard:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [input, status]);

  const displayDims = computeDisplayDims(
    templateDims.w,
    templateDims.h,
    containerSize.w,
    containerSize.h,
  );

  // ── Arrasto da assinatura ──
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!input.useSignature || !imgRefs.current.signature) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const overlay = new SignatureOverlay(rect.width, rect.height, canvas.width, canvas.height);
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const ratio =
        imgRefs.current.signature.naturalHeight / imgRefs.current.signature.naturalWidth;
      const sigH = input.signatureSize * ratio;
      const sigRect = overlay.toDisplayRect(
        input.signaturePosX,
        input.signaturePosY,
        input.signatureSize,
        sigH,
      );
      const pad = 10;
      if (
        x >= sigRect.x - pad &&
        x <= sigRect.x + sigRect.width + pad &&
        y >= sigRect.y - pad &&
        y <= sigRect.y + sigRect.height + pad
      ) {
        const grabOrig = overlay.toOriginal(x, y);
        if (grabOrig) {
          grabOffsetRef.current = {
            x: grabOrig.x - input.signaturePosX,
            y: grabOrig.y - input.signaturePosY,
          };
        }
        draggingRef.current = true;
        setIsDragging(true);
        canvas.setPointerCapture(e.pointerId);
      }
    },
    [input.useSignature, input.signaturePath, input.signaturePosX, input.signaturePosY, input.signatureSize],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!draggingRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const overlay = new SignatureOverlay(rect.width, rect.height, canvas.width, canvas.height);
      const orig = overlay.toOriginal(e.clientX - rect.left, e.clientY - rect.top);
      if (orig) {
        onSignaturePosChange(
          orig.x - grabOffsetRef.current.x,
          orig.y - grabOffsetRef.current.y,
        );
      }
    },
    [onSignaturePosChange],
  );

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    draggingRef.current = false;
    setIsDragging(false);
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-[220px] flex-1 items-center justify-center overflow-hidden rounded-lg bg-muted/40 p-2"
    >
      {status === "loading" && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      {status === "error" && (
        <div className="max-w-[80%] text-center text-xs text-destructive">{errorMsg}</div>
      )}
      {status === "ready" && (
        <canvas
          ref={canvasRef}
          style={{
            width: displayDims.w,
            height: displayDims.h,
            cursor:
              input.useSignature && hasSignature ? (isDragging ? "grabbing" : "grab") : "default",
          }}
          className="rounded shadow-lg"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      )}
      {input.useSignature && status === "ready" && (
        <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[10px] text-white/90 backdrop-blur">
          Arraste a assinatura
        </div>
      )}
    </div>
  );
}

// Template path accessor (adicionado para clareza)
declare module "@/lib/events/types" {
  interface EventDraft {
    templatePath?: string;
  }
}

function computeDisplayDims(
  origW: number,
  origH: number,
  maxW: number,
  maxH: number,
): { w: number; h: number } {
  if (maxW === 0 || maxH === 0) return { w: origW, h: origH };
  const scale = Math.min(maxW / origW, maxH / origH, 1);
  return { w: Math.round(origW * scale), h: Math.round(origH * scale) };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = src;
  });
}
