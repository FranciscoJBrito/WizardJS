/**
 * Módulo para manejar el redimensionamiento de paneles split
 * Usa event delegation para funcionar con paneles creados dinámicamente
 */

let isResizing = false;
let startX = 0;
let activeDivider: HTMLElement | null = null;
let leftPanel: HTMLElement | null = null;
let rightPanel: HTMLElement | null = null;
let leftStartWidth = 0;
let rightStartWidth = 0;

export function mountSplitResizer() {
  // Usar event delegation en el document
  document.addEventListener('mousedown', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const divider = target.closest('.split-divider') as HTMLElement;
    
    if (!divider) return;
    
    isResizing = true;
    startX = e.clientX;
    activeDivider = divider;
    
    leftPanel = divider.previousElementSibling as HTMLElement;
    rightPanel = divider.nextElementSibling as HTMLElement;
    
    if (leftPanel && rightPanel) {
      leftStartWidth = leftPanel.getBoundingClientRect().width;
      rightStartWidth = rightPanel.getBoundingClientRect().width;
    }
    
    divider.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isResizing || !leftPanel || !rightPanel) return;
    
    const deltaX = e.clientX - startX;
    const newLeftWidth = leftStartWidth + deltaX;
    const newRightWidth = rightStartWidth - deltaX;
    
    // Límites mínimos
    const minWidth = 200;
    
    if (newLeftWidth >= minWidth && newRightWidth >= minWidth) {
      leftPanel.style.flex = 'none';
      rightPanel.style.flex = 'none';
      leftPanel.style.width = `${newLeftWidth}px`;
      rightPanel.style.width = `${newRightWidth}px`;
    }
  });

  document.addEventListener('mouseup', () => {
    if (!isResizing) return;
    
    isResizing = false;
    if (activeDivider) {
      activeDivider.classList.remove('dragging');
    }
    activeDivider = null;
    leftPanel = null;
    rightPanel = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });
}
