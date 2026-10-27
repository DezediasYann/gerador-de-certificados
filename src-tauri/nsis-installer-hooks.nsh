; NSIS Installer Hooks — customiza o nome do atalho no menu Iniciar e Desktop.
;
; O productName do Tauri é "GdC" (curto, safe para binário/instalador/URL do updater).
; Mas o atalho visível ao usuário deve ser "Gerador de Certificados" (com espaços).
;
; Variáveis NSIS do template oficial do Tauri 2:
;   ${PRODUCTNAME}     → nome do produto ("GdC") — usado no nome do .lnk
;   ${MAINBINARYNAME}  → nome do executável ("GdC") — usado no .exe
;   $SMPROGRAMS        → pasta do menu Iniciar
;   $DESKTOP           → área de trabalho
;   $INSTDIR           → diretório de instalação

; Nome bonito do atalho (com espaços)
!define APP_DISPLAY_NAME "Gerador de Certificados"

; ━━ Após instalar: recria atalhos com nome bonito ━━
; O hook POSTINSTALL roda DEPOIS de CreateOrUpdateStartMenuShortcut e
; CreateOrUpdateDesktopShortcut, então os atalhos "GdC.lnk" já existem.
!macro NSIS_HOOK_POSTINSTALL
  ; Menu Iniciar: remove atalho padrão (GdC.lnk) e cria com nome bonito
  Delete "$SMPROGRAMS\${PRODUCTNAME}.lnk"
  CreateShortcut "$SMPROGRAMS\${APP_DISPLAY_NAME}.lnk" "$INSTDIR\${MAINBINARYNAME}.exe" "" "$INSTDIR\${MAINBINARYNAME}.exe" 0

  ; Desktop: remove atalho padrão (se existir) e cria com nome bonito
  Delete "$DESKTOP\${PRODUCTNAME}.lnk"
  CreateShortcut "$DESKTOP\${APP_DISPLAY_NAME}.lnk" "$INSTDIR\${MAINBINARYNAME}.exe" "" "$INSTDIR\${MAINBINARYNAME}.exe" 0
!macroend

; ━━ Antes de desinstalar: remove os atalhos customizados ━━
!macro NSIS_HOOK_PREUNINSTALL
  Delete "$SMPROGRAMS\${APP_DISPLAY_NAME}.lnk"
  Delete "$DESKTOP\${APP_DISPLAY_NAME}.lnk"
!macroend
