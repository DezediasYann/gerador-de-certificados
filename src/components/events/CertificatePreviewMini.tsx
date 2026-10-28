"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Evento } from "@/lib/events/types";
import { templateUrlOf } from "@/lib/events/types";
import { CertificateEngine, type QrDrawOptions } from "@/lib/cert/CertificateEngine";
import { FontManager } from "@/lib/cert/FontManager";
import { CertificateGenerator } from "@/lib/events/CertificateGenerator";
import { SignatureOverlay } from "@/lib/cert/SignatureOverlay";
import { isValidAccessKey, API_URL } from "@/lib/events/apiConfig";
import { useEventStore } from "@/store/event-store";
import { Loader2 } from "lucide-react";

interface CertificatePreviewMiniProps {
  evento: Evento;
  onUpdate?: (patch: Partial<Evento>) => void;
  qrUrl?: string;
}

/** Preview do certificado com drag de assinatura e QR code. */
export function CertificatePreviewMini({ evento, onUpdate, qrUrl }: CertificatePreviewMiniProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [hoverTarget, setHoverTarget] = useState<"none" | "sig" | "qr">("none");
  const [isDragging, setIsDragging] = useState(false);
  const draggingRef = useRef<"none" | "sig" | "qr">("none");
  const grabOffsetRef = useRef({ x: 0, y: 0 });

  // Cache das dimensões da assinatura carregada (evita criar new Image no pointerdown)
  const sigDimsRef = useRef<{ w: number; h: number } | null>(null);

  // Participante de exemplo
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

  // Pré-carrega assinatura e guarda dimensões
  useEffect(() => {
    if (evento.signature.useSignature && evento.signature.signatureDataUrl) {
      const img = new Image();
      img.onload = () => {
        sigDimsRef.current = { w: img.naturalWidth, h: img.naturalHeight };
      };
      img.src = evento.signature.signatureDataUrl;
    } else {
      sigDimsRef.current = null;
    }
  }, [evento.signature.useSignature, evento.signature.signatureDataUrl]);

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

  // URL efetiva do QR (access key ou qrUrl prop)
  const effectiveQrUrl = useMemo(() => {
    if (qrUrl) return qrUrl;
    const accessKey = useEventStore.getState().apiConfig.accessKey;
    if (isValidAccessKey(accessKey)) return `${API_URL}/v/preview-placeholder`;
    return undefined;
  }, [qrUrl]);

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

        let qrOptions: QrDrawOptions | undefined;
        if (evento.qrCode?.enabled && effectiveQrUrl) {
          qrOptions = {
            url: effectiveQrUrl,
            size: evento.qrCode.size,
            style: evento.qrCode.style,
            posX: evento.qrCode.posX,
            posY: evento.qrCode.posY,
            showLabel: evento.qrCode.showLabel,
            fgColor: evento.qrCode.fgColor,
            bgColor: evento.qrCode.bgColor,
          };
        }

        await engine.render(input, template, fonts, signature, qrOptions);
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
  }, [evento, sampleParticipant, effectiveQrUrl]);

  const displayDims = (() => {
    const origW = 2000;
    const origH = 1414;
    if (containerSize.w === 0 || containerSize.h === 0) return { w: origW, h: origH };
    const scale = Math.min(containerSize.w / origW, containerSize.h / origH);
    return { w: Math.round(origW * scale), h: Math.round(origH * scale) };
  })();

  // ━━ Hit-test: verifica se ponto está sobre assinatura ou QR ━━
  // Converte coords centradas (delta do centro) para coords absolutas do canvas.
  const hitTest = useCallback(
    (x: number, y: number): "none" | "sig" | "qr" => {
      const canvas = canvasRef.current;
      if (!canvas) return "none";
      const rect = canvas.getBoundingClientRect();
      const overlay = new SignatureOverlay(rect.width, rect.height, canvas.width, canvas.height);
      // Centro absoluto da imagem no canvas
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const pad = 15;

      // Assinatura (usa dimensões em cache)
      if (evento.signature.useSignature && evento.signature.signatureDataUrl && sigDimsRef.current) {
        const dims = sigDimsRef.current;
        const ratio = dims.h / dims.w;
        const sigW = evento.signature.signatureSize;
        const sigH = sigW * ratio;
        // Centro absoluto da assinatura
        const sigCenterAbsX = cx + evento.signature.signaturePosX;
        const sigCenterAbsY = cy + evento.signature.signaturePosY;
        // Top-left absoluto
        const absX = sigCenterAbsX - sigW / 2;
        const absY = sigCenterAbsY - sigH / 2;
        const sigRect = overlay.toDisplayRect(absX, absY, sigW, sigH);
        if (
          x >= sigRect.x - pad && x <= sigRect.x + sigRect.width + pad &&
          y >= sigRect.y - pad && y <= sigRect.y + sigRect.height + pad
        ) {
          return "sig";
        }
      }

      // QR code
      if (evento.qrCode?.enabled && effectiveQrUrl) {
        const qrSize = evento.qrCode.size;
        const qrH = qrSize + (evento.qrCode.showLabel ? 50 : 0);
        // Centro absoluto do QR
        const qrCenterAbsX = cx + evento.qrCode.posX;
        const qrCenterAbsY = cy + evento.qrCode.posY;
        // Top-left absoluto
        const absX = qrCenterAbsX - qrSize / 2;
        const absY = qrCenterAbsY - qrH / 2;
        const qrRect = overlay.toDisplayRect(absX, absY, qrSize, qrH);
        if (
          x >= qrRect.x - pad && x <= qrRect.x + qrRect.width + pad &&
          y >= qrRect.y - pad && y <= qrRect.y + qrRect.height + pad
        ) {
          return "qr";
        }
      }

      return "none";
    },
    [evento.signature, evento.qrCode, effectiveQrUrl],
  );

  // ━━ Pointer handlers ━━
  // Conversão: coords centradas (delta do centro) <-> coords absolutas do canvas.
  //   absX = cx + posX  →  posX = absX - cx
  // onde cx = canvas.width / 2 (centro absoluto da imagem)
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!onUpdate) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const target = hitTest(x, y);
      if (target === "none") return;

      const overlay = new SignatureOverlay(rect.width, rect.height, canvas.width, canvas.height);
      const orig = overlay.toOriginal(x, y);
      if (!orig) return;

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      if (target === "sig") {
        // grabOffset = orig_abs - sigCenter_abs
        const sigCenterAbsX = cx + evento.signature.signaturePosX;
        const sigCenterAbsY = cy + evento.signature.signaturePosY;
        grabOffsetRef.current = {
          x: orig.x - sigCenterAbsX,
          y: orig.y - sigCenterAbsY,
        };
      } else {
        const qrCenterAbsX = cx + (evento.qrCode?.posX ?? 0);
        const qrCenterAbsY = cy + (evento.qrCode?.posY ?? 0);
        grabOffsetRef.current = {
          x: orig.x - qrCenterAbsX,
          y: orig.y - qrCenterAbsY,
        };
      }

      draggingRef.current = target;
      setIsDragging(true);
      canvas.setPointerCapture(e.pointerId);
    },
    [onUpdate, hitTest, evento.signature, evento.qrCode],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!onUpdate) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (draggingRef.current !== "none") {
        const overlay = new SignatureOverlay(rect.width, rect.height, canvas.width, canvas.height);
        const orig = overlay.toOriginal(x, y);
        if (!orig) return;

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        if (draggingRef.current === "sig") {
          // newSigCenter_abs = orig_abs - grabOffset
          // newSigPosX = newSigCenter_abs.x - cx
          const newSigCenterAbsX = orig.x - grabOffsetRef.current.x;
          const newSigCenterAbsY = orig.y - grabOffsetRef.current.y;
          onUpdate({
            signature: {
              ...evento.signature,
              signaturePosX: Math.round(newSigCenterAbsX - cx),
              signaturePosY: Math.round(newSigCenterAbsY - cy),
            },
          });
        } else if (draggingRef.current === "qr" && evento.qrCode) {
          const newQrCenterAbsX = orig.x - grabOffsetRef.current.x;
          const newQrCenterAbsY = orig.y - grabOffsetRef.current.y;
          onUpdate({
            qrCode: {
              ...evento.qrCode,
              posX: Math.round(newQrCenterAbsX - cx),
              posY: Math.round(newQrCenterAbsY - cy),
            },
          });
        }
      } else {
        const target = hitTest(x, y);
        setHoverTarget(target);
      }
    },
    [onUpdate, hitTest, evento.signature, evento.qrCode],
  );

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    draggingRef.current = "none";
    setIsDragging(false);
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  }, []);

  const cursor = isDragging ? "grabbing" : hoverTarget !== "none" ? "grab" : "default";

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg bg-muted/40 p-2"
      style={{ maxHeight: "100%", minHeight: "200px" }}
    >
      <canvas
        ref={canvasRef}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          width: displayDims.w,
          height: displayDims.h,
          objectFit: "contain",
          visibility: status === "ready" ? "visible" : "hidden",
          position: status === "ready" ? "static" : "absolute",
          willChange: "transform",
          cursor: onUpdate ? cursor : "default",
        }}
        className="rounded shadow-lg"
        onPointerDown={onUpdate ? onPointerDown : undefined}
        onPointerMove={onUpdate ? onPointerMove : undefined}
        onPointerUp={onUpdate ? onPointerUp : undefined}
        onPointerCancel={onUpdate ? onPointerUp : undefined}
        onPointerLeave={onUpdate ? () => setHoverTarget("none") : undefined}
      />
      {status === "loading" && (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      )}
      {status === "error" && (
        <div className="max-w-[80%] text-center text-xs text-destructive">{errorMsg}</div>
      )}
      {onUpdate && (evento.signature.useSignature || (evento.qrCode?.enabled && effectiveQrUrl)) && status === "ready" && (
        <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[10px] text-white/90 backdrop-blur">
          Arraste a assinatura ou QR code para reposicionar
        </div>
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
