"use client";
import { useEffect } from "react";
import { useEventStore } from "@/store/event-store";
import { GlassPanel } from "@/components/macos/GlassPanel";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Users, Trash2, AlertCircle } from "lucide-react";
import { templateUrlOf } from "@/lib/events/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/** Tela inicial: lista de eventos (cards) + botão Criar Evento. */
export function HomeScreen() {
  const events = useEventStore((s) => s.events);
  const init = useEventStore((s) => s.init);
  const startWizard = useEventStore((s) => s.startWizard);
  const openEvent = useEventStore((s) => s.openEvent);
  const deleteEvent = useEventStore((s) => s.deleteEvent);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Meus Eventos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie um evento, configure o certificado e adicione participantes.
          </p>
        </div>
        <Button onClick={startWizard} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-1.5 h-4 w-4" /> Criar evento
        </Button>
      </div>

      {events.length === 0 ? (
        <EmptyState onCreate={startWizard} />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {events.map((ev) => (
            <GlassPanel key={ev.id} className="group flex flex-col overflow-hidden p-0">
              <button
                onClick={() => openEvent(ev.id)}
                className="block flex-1 text-left"
                aria-label={`Abrir evento ${ev.nome}`}
              >
                {/* Imagem do card = template do evento */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                  <img
                    src={templateUrlOf(ev)}
                    alt={ev.nome}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3 flex items-center gap-1.5 text-xs text-white/90">
                    <Calendar className="h-3 w-3" />
                    <span className="truncate">{ev.tipoAtividade}</span>
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="truncate text-sm font-semibold text-foreground">{ev.nome}</h3>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>{ev.participantes.length} participante{ev.participantes.length === 1 ? "" : "s"}</span>
                  </div>
                </div>
              </button>
              <div className="border-t border-border/40 px-3 py-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-full justify-center text-xs text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="mr-1 h-3 w-3" /> Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="glass-strong">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir <strong>{ev.nome}</strong>? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteEvent(ev.id)}
                        className="bg-destructive text-white hover:bg-destructive/90"
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </GlassPanel>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <GlassPanel className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <AlertCircle className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">Nenhum evento ainda</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Crie seu primeiro evento para começar a gerar certificados. Defina o template, configure o certificado e adicione participantes.
      </p>
      <Button onClick={onCreate} className="mt-5 bg-primary text-primary-foreground hover:bg-primary/90">
        <Plus className="mr-1.5 h-4 w-4" /> Criar primeiro evento
      </Button>
    </GlassPanel>
  );
}
