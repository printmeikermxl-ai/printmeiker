import { useState, useRef, useEffect } from 'react';

const BUTTONS = [
  ['C', '±', '%', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '−'],
  ['1', '2', '3', '+'],
  ['0', '.', '⌫', '='],
];

export const CalculadoraFlotante = () => {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState('0');
  const [prev, setPrev] = useState(null);
  const [op, setOp] = useState(null);
  const [waitNext, setWaitNext] = useState(false);
  const [expression, setExpression] = useState('');
  const panelRef = useRef();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    setTimeout(() => document.addEventListener('mousedown', handler), 100);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Keyboard support
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      const k = e.key;
      if (k >= '0' && k <= '9') handleBtn(k);
      else if (k === '.') handleBtn('.');
      else if (k === '+') handleBtn('+');
      else if (k === '-') handleBtn('−');
      else if (k === '*') handleBtn('×');
      else if (k === '/') { e.preventDefault(); handleBtn('÷'); }
      else if (k === 'Enter') { e.preventDefault(); handleBtn('='); }
      else if (k === '=') handleBtn('=');
      else if (k === 'Backspace') handleBtn('⌫');
      else if (k === 'Escape') setOpen(false);
      else if (k === 'c' || k === 'C') handleBtn('C');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, display, prev, op, waitNext]);

  const handleBtn = (btn) => {
    if (btn === 'C') {
      setDisplay('0'); setPrev(null); setOp(null); setWaitNext(false); setExpression('');
      return;
    }
    if (btn === '⌫') {
      if (display.length > 1) setDisplay(display.slice(0, -1));
      else setDisplay('0');
      return;
    }
    if (btn === '±') {
      setDisplay(String(-parseFloat(display)));
      return;
    }
    if (btn === '%') {
      setDisplay(String(parseFloat(display) / 100));
      return;
    }
    if (['÷', '×', '−', '+'].includes(btn)) {
      setPrev(parseFloat(display));
      setOp(btn);
      setWaitNext(true);
      setExpression(`${display} ${btn}`);
      return;
    }
    if (btn === '=') {
      if (op && prev !== null) {
        const curr = parseFloat(display);
        let result;
        if (op === '+') result = prev + curr;
        else if (op === '−') result = prev - curr;
        else if (op === '×') result = prev * curr;
        else if (op === '÷') result = curr !== 0 ? prev / curr : 'Error';
        const res = typeof result === 'number'
          ? parseFloat(result.toFixed(10)).toString()
          : result;
        setExpression(`${expression} ${display} =`);
        setDisplay(res);
        setPrev(null); setOp(null); setWaitNext(false);
      }
      return;
    }
    // Number or dot
    if (waitNext) {
      setDisplay(btn === '.' ? '0.' : btn);
      setWaitNext(false);
    } else {
      if (btn === '.' && display.includes('.')) return;
      setDisplay(display === '0' && btn !== '.' ? btn : display + btn);
    }
  };

  const isOp = (btn) => ['÷', '×', '−', '+'].includes(btn);
  const isSpecial = (btn) => ['C', '±', '%'].includes(btn);

  const fmt = (val) => {
    if (val === 'Error') return val;
    const n = parseFloat(val);
    if (isNaN(n)) return val;
    if (Math.abs(n) >= 1e12) return n.toExponential(4);
    return n.toLocaleString('es-MX', { maximumFractionDigits: 8 });
  };

  return (
    <div ref={panelRef} style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9000 }}>
      {/* Panel */}
      {open && (
        <div className="calc-flotante-panel">
          {/* Expression */}
          <div className="calc-expression">{expression || '\u00a0'}</div>
          {/* Display */}
          <div className="calc-display">
            {fmt(display)}
          </div>
          {/* Buttons */}
          <div className="calc-grid">
            {BUTTONS.map((row, ri) =>
              row.map((btn, ci) => (
                <button
                  key={`${ri}-${ci}`}
                  className={`calc-btn${isOp(btn) ? ' calc-btn-op' : ''}${isSpecial(btn) ? ' calc-btn-special' : ''}${btn === '=' ? ' calc-btn-eq' : ''}${btn === '0' && ci === 0 ? ' calc-btn-zero' : ''}`}
                  onClick={() => handleBtn(btn)}
                  onMouseUp={(e) => e.currentTarget.blur()}
                >
                  {btn}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* FAB Button */}
      <button
        className="calc-fab"
        onClick={() => setOpen(o => !o)}
        title="Calculadora rápida"
        aria-label="Calculadora flotante"
      >
        {open ? '✕' : '🧮'}
      </button>
    </div>
  );
};
