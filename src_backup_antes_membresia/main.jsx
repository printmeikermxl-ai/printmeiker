import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// ── Aplicar preferencias de personalización guardadas ──────────────────────
const animaciones = localStorage.getItem('sep_animaciones');
if (animaciones === 'false') document.documentElement.classList.add('no-animations');

const compactCards = localStorage.getItem('sep_compact_cards');
if (compactCards === 'true') document.documentElement.classList.add('compact-cards');

const sidebarMode = localStorage.getItem('sep_sidebar_mode');
if (sidebarMode === 'compact') document.documentElement.classList.add('sidebar-compact');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
