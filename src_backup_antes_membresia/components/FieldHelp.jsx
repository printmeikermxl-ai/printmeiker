import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * FieldHelp — Ícono de ayuda con tooltip flotante inteligente.
 *
 * Se posiciona automáticamente para no salirse de la pantalla.
 *
 * Props:
 *   text     — Texto de ayuda (string)
 *   example  — Texto de ejemplo opcional: se muestra como "Ej: ..."
 *   position — 'top' | 'bottom' (preferencia; se ajusta si no hay espacio)
 */
export const FieldHelp = ({ text, example, position = 'top' }) => {
  const [open, setOpen] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const [arrowLeft, setArrowLeft] = useState('50%');
  const [actualPos, setActualPos] = useState(position);

  const wrapRef = useRef(null);
  const tooltipRef = useRef(null);
  const TOOLTIP_WIDTH = 260;
  const MARGIN = 10; // margen mínimo del borde de pantalla

  // Calcular posición inteligente al abrir
  const calcPosition = useCallback(() => {
    if (!wrapRef.current) return;

    const iconRect = wrapRef.current.getBoundingClientRect();
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;

    // Centro del ícono en la pantalla
    const iconCenterX = iconRect.left + iconRect.width / 2;

    // Calcular offset horizontal para que el tooltip no salga de pantalla
    let left = iconCenterX - TOOLTIP_WIDTH / 2;
    if (left < MARGIN) left = MARGIN;
    if (left + TOOLTIP_WIDTH > viewW - MARGIN) left = viewW - MARGIN - TOOLTIP_WIDTH;

    // Posición de la flechita relativa al tooltip
    const arrowAbsX = iconCenterX;
    const arrowRelX = arrowAbsX - left;
    const arrowLeftPct = Math.max(12, Math.min(TOOLTIP_WIDTH - 18, arrowRelX));

    // Decidir si va arriba o abajo
    const spaceAbove = iconRect.top;
    const spaceBelow = viewH - iconRect.bottom;
    let finalPos = position;
    if (finalPos === 'top' && spaceAbove < 120 && spaceBelow > 120) finalPos = 'bottom';
    if (finalPos === 'bottom' && spaceBelow < 120 && spaceAbove > 120) finalPos = 'top';

    const verticalStyle = finalPos === 'top'
      ? { bottom: 'calc(100% + 8px)', top: 'auto' }
      : { top: 'calc(100% + 8px)', bottom: 'auto' };

    // Offset relativo al ícono: position:fixed para saltar cualquier overflow:hidden de ancestros
    setTooltipStyle({
      position: 'fixed',
      zIndex: 99999,
      left,
      ...(finalPos === 'top'
        ? { top: iconRect.top - 8, transform: 'translateY(-100%)' }
        : { top: iconRect.bottom + 8, transform: 'none' }),
      width: TOOLTIP_WIDTH,
      background: 'hsl(var(--card))',
      border: '1px solid hsl(var(--border))',
      borderRadius: 10,
      padding: '10px 12px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
      fontSize: 12,
      color: 'hsl(var(--foreground))',
      lineHeight: 1.55,
      animation: 'fadeIn 0.12s ease',
      pointerEvents: 'none',
    });

    setArrowLeft(arrowLeftPct);
    setActualPos(finalPos);
  }, [position]);

  // Recalcular al abrir y al hacer scroll/resize
  useEffect(() => {
    if (!open) return;
    calcPosition();

    const onScroll = () => calcPosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, calcPosition]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <span
      ref={wrapRef}
      className="field-help-wrap"
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        verticalAlign: 'middle',
        marginLeft: 5,
      }}
    >
      {/* Ícono ? */}
      <button
        type="button"
        className="field-help-icon"
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        aria-label="Ayuda"
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          border: '1.5px solid hsl(var(--primary) / 0.5)',
          background: open ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.1)',
          color: open ? '#fff' : 'hsl(var(--primary))',
          fontSize: 10,
          fontWeight: 800,
          lineHeight: 1,
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
          transition: 'all 0.15s ease',
          padding: 0,
          outline: 'none',
          userSelect: 'none',
        }}
      >
        ?
      </button>

      {/* Tooltip — posición calculada con position:fixed para evitar overflow:hidden de modales */}
      {open && (
        <div
          ref={tooltipRef}
          className="field-help-tooltip"
          style={tooltipStyle}
        >
          {/* Flechita */}
          <span style={{
            position: 'absolute',
            ...(actualPos === 'top'
              ? { bottom: -6, borderTop: '6px solid hsl(var(--card))', top: 'auto' }
              : { top: -6, borderBottom: '6px solid hsl(var(--card))', bottom: 'auto' }),
            left: arrowLeft,
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
          }} />

          <div style={{ fontWeight: 500 }}>{text}</div>

          {example && (
            <div style={{
              marginTop: 6,
              padding: '5px 8px',
              background: 'hsl(var(--primary) / 0.08)',
              borderRadius: 6,
              color: 'hsl(var(--primary))',
              fontSize: 11,
              fontWeight: 600,
              wordBreak: 'break-word',
            }}>
              Ej: {example}
            </div>
          )}
        </div>
      )}
    </span>
  );
};
