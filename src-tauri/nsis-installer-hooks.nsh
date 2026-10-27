; NSIS Installer Hooks — customiza o nome do atalho no menu Iniciar e Desktop.
;
; O productName do Tauri é "GdC" (curto, safe para binário/instalador/URL do updater).
; Mas o atalho visível ao usuário deve ser "Gerador de Certificados" (com espaços).
;
; O Tauri cria atalhos com o productName ("GdC.lnk"). Este hook:
;   1. POSTINSTALL: remove "GdC.lnk" e cria "Gerador de Certificados.lnk"
;   2. PREUNINSTALL: remove "Gerador de Certificados.lnk" na desinstalação

; Nome bonito do atalho (com espaços)
!define APP_DISPLAY_NAME "Gerador de Certificados"

; ━━ Após instalar: recria atalhos com nome bonito ━━
!macro NSIS_HOOK_POSTINSTALL
  ; Menu Iniciar: remove atalho padrão (GdC.lnk) e cria com nome bonito
  Delete "$SMPROGRAMS\${PRODUCTFILENAME}.lnk"
  CreateShortcut "$SMPROGRAMS\${APP_DISPLAY_NAME}.lnk" "$INSTDIR\${PRODUCTFILENAME}.exe"

  ; Desktop: se o Tauri criou atalho no desktop, renomeia também
  Delete "$DESKTOP\${PRODUCTFILENAME}.lnk"
  CreateShortcut "$DESKTOP\${APP_DISPLAY_NAME}.lnk" "$INSTDIR\${PRODUCTFILENAME}.exe"
!macroend

; ━━ Antes de desinstalar: remove os atalhos customizados ━━
!macro NSIS_HOOK_PREUNINSTALL
  Delete "$SMPROGRAMS\${APP_DISPLAY_NAME}.lnk"
  Delete "$DESKTOP\${APP_DISPLAY_NAME}.lnk"
!macroend
