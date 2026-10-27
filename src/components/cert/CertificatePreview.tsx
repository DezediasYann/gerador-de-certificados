"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCertStore } from "@/store/cert-store";
import { CertificateEngine } from "@/lib/cert/CertificateEngine";
import { FontLoader } from "@/lib/cert/FontLoader";
import { SignatureOverlay } from "@/lib/cert/SignatureOverlay";
import { Loader2 } from "lucide-react";

/**
 * Pré-visualização em tempo real do certificado, com arrasto da assinatura.
 * Renderiza em um canvas escalado; o motor CertificateEngine desenha na resolução
 * original do template e o canvas é redimensionado via CSS para caber no container.
 */
export function CertificatePreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fontLoaderRef = useRef<FontLoader | null>(null);
  const draggingRef = useRef(false);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [templateDims, setTemplateDims] = useState({ w: 2000, h: 1414 });
  const [hasSignature, setHasSignature] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Refs mutáveis para imagens (acessados só em effects/handlers, nunca em render)
  const imgRefs = useRef<{ template: HTMLImageElement | null; signature: HTMLImageElement | null }>({
    template: null,
    signature: null,
  });

  // Store inteiro (referência estável) — deriva o input via memo.
  const s = useCertStore();
  const setSignaturePos = s.setSignaturePos;
  const input = useMemo(
    () => ({
      nome: s.nome,
      funcaoParticipante: s.funcao === "Outro" ? s.funcaoCustom : s.funcao,
      docTipo: s.docTipo,
      docNumero: s.docNumero,
      nomeTrabalho: s.nomeTrabalho,
      tipoAtividade: s.tipoAtividade,
      nomeEvento: s.nomeEvento,
      cargaHoraria: s.cargaHoraria,
      useDate: s.useDate,
      dataInicio: s.dataInicio,
      dataFim: s.dataFim,
      templateName: s.templateName,
      templateUrl: `/models/${s.templateName}`,
      fontName: s.fontName,
      fontSize: s.fontSize,
      useItalic: s.useItalic,
      posX: s.posX,
      posY: s.posY,
      useSignature: s.useSignature,
      signaturePath: s.signatureUrl,
      signaturePosX: s.signaturePosX,
      signaturePosY: s.signaturePosY,
      signatureSize: s.signatureSize,
    }),
    [
      s.nome, s.funcao, s.funcaoCustom, s.docTipo, s.docNumero, s.nomeTrabalho,
      s.tipoAtividade, s.nomeEvento, s.cargaHoraria, s.useDate, s.dataInicio, s.dataFim,
      s.templateName, s.fontName, s.fontSize, s.useItalic, s.posX, s.posY,
      s.useSignature, s.signatureUrl, s.signaturePosX, s.signaturePosY, s.signatureSize,
    ],
  );

  // Observa o tamanho do container
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

  // Pré-carrega template + assinatura quando mudam
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const templateImg = new Image();
        templateImg.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          templateImg.onload = () => resolve();
          templateImg.onerror = () => reject(new Error("Falha ao carregar template"));
          templateImg.src = input.templateUrl;
        });
        if (cancelled) return;
        imgRefs.current.template = templateImg;
        setTemplateDims({ w: templateImg.naturalWidth, h: templateImg.naturalHeight });

        if (input.useSignature && input.signaturePath) {
          const sigImg = new Image();
          sigImg.crossOrigin = "anonymous";
          await new Promise<void>((resolve, reject) => {
            sigImg.onload = () => resolve();
            sigImg.onerror = () => reject(new Error("Falha ao carregar assinatura"));
            sigImg.src = input.signaturePath!;
          });
          if (cancelled) return;
          imgRefs.current.signature = sigImg;
          setHasSignature(true);
        } else {
          imgRefs.current.signature = null;
          setHasSignature(false);
        }
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        setErrorMsg(err instanceof Error ? err.message : "Erro desconhecido");
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [input.templateName, input.templateUrl, input.useSignature, input.signaturePath]);

  // Renderiza no canvas sempre que input/imagens/status mudam
  useEffect(() => {
    const canvas = canvasRef.current;
    const template = imgRefs.current.template;
    if (!canvas || !template || status !== "ready") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cancelled = false;
    (async () => {
      try {
        if (!fontLoaderRef.current) fontLoaderRef.current = new FontLoader();
        const fonts = await fontLoaderRef.current.load(input.fontName);
        if (cancelled) return;
        const engine = new CertificateEngine(ctx);
        await engine.render(input, template, fonts, imgRefs.current.signature);
      } catch (err) {
        console.error("Erro ao renderizar preview:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [input, status]);

  // Calcula dimensões de exibição (contain dentro do container)
  const displayDims = computeDisplayDims(
    templateDims.w,
    templateDims.h,
    containerSize.w,
    containerSize.h,
  );

  // ── Arrasto da assinatura (handlers, acessam refs livremente) ──
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
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const orig = overlay.toOriginal(x, y);
      if (orig) setSignaturePos(orig.x, orig.y);
    },
    [setSignaturePos],
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
      className="relative flex min-h-[300px] flex-1 items-center justify-center overflow-hidden rounded-xl bg-muted/40 p-2"
    >
      {status === "loading" && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Carregando template…
        </div>
      )}
      {status === "error" && (
        <div className="max-w-sm text-center text-sm text-destructive">{errorMsg}</div>
      )}
      {status === "ready" && (
        <canvas
          ref={canvasRef}
          style={{
            width: displayDims.w,
            height: displayDims.h,
            cursor: input.useSignature && hasSignature ? (isDragging ? "grabbing" : "grab") : "default",
          }}
          className="rounded-lg shadow-xl"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      )}
      {input.useSignature && status === "ready" && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[11px] text-white/90 backdrop-blur">
          Arraste a assinatura para reposicioná-la
        </div>
      )}
    </div>
  );
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
