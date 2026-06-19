import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../store/authStore';

// ── Note color palette ─────────────────────────────────────────────────────
const NOTE_COLORS = [
  { id: 'default', label: 'Blanco',   hex: '#ffffff' },
  { id: 'yellow',  label: 'Amarillo', hex: '#fef9c3' },
  { id: 'green',   label: 'Verde',    hex: '#dcfce7' },
  { id: 'blue',    label: 'Azul',     hex: '#dbeafe' },
  { id: 'purple',  label: 'Morado',   hex: '#f3e8ff' },
  { id: 'pink',    label: 'Rosa',     hex: '#fce7f3' },
  { id: 'orange',  label: 'Naranja',  hex: '#ffedd5' },
  { id: 'red',     label: 'Rojo',     hex: '#fee2e2' },
  { id: 'teal',    label: 'Teal',     hex: '#ccfbf1' },
];

// ── Default categories ─────────────────────────────────────────────────────
const DEFAULT_CATEGORIES = [
  { id: 'personal',   label: 'Personal',   emoji: '👤', color: '#6366f1' },
  { id: 'negocio',    label: 'Negocio',    emoji: '💼', color: '#0ea5e9' },
  { id: 'ideas',      label: 'Ideas',      emoji: '💡', color: '#f59e0b' },
  { id: 'tarea',      label: 'Tareas',     emoji: '✅', color: '#22c55e' },
  { id: 'importante', label: 'Importante', emoji: '🔴', color: '#ef4444' },
];

const CATEGORY_EMOJIS = [
  '👤','💼','💡','✅','🔴','⭐','📌','🎯','📝','🎨','🏷️','🔖',
  '📚','🎵','🌟','💎','🔔','📊','🚀','❤️','🌈','🔥','🌿','🏠',
];

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1)  return 'Ahora mismo';
  if (mins < 60) return `Hace ${mins} min`;
  if (hrs  < 24) return `Hace ${hrs} h`;
  if (days === 1) return 'Ayer';
  if (days < 7)  return `Hace ${days} días`;
  return d.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
};

// ── Empty state illustration ───────────────────────────────────────────────
const EmptyIllustration = () => (
  <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="20" y="15" width="60" height="75" rx="8" fill="hsl(var(--primary-light))" opacity="0.5"/>
    <rect x="30" y="25" width="40" height="5" rx="2.5" fill="hsl(var(--primary))" opacity="0.4"/>
    <rect x="30" y="35" width="35" height="4" rx="2" fill="hsl(var(--border))"/>
    <rect x="30" y="43" width="30" height="4" rx="2" fill="hsl(var(--border))"/>
    <rect x="30" y="51" width="38" height="4" rx="2" fill="hsl(var(--border))"/>
    <circle cx="85" cy="70" r="20" fill="hsl(var(--primary))" opacity="0.15"/>
    <text x="85" y="76" textAnchor="middle" fontSize="18">✏️</text>
  </svg>
);

// ── Main component ─────────────────────────────────────────────────────────
export const NotesWidget = () => {
  const { user } = useAuth();
  const userId = user?.id || 'guest';

  const notesKey      = `sep_notes_${userId}`;
  const categoriesKey = `sep_notes_cats_${userId}`;

  // ── State: data ──────────────────────────────────────────────────────────
  const [notes, setNotes] = useState(() => {
    try { const r = localStorage.getItem(notesKey); return r ? JSON.parse(r) : []; }
    catch { return []; }
  });

  const [categories, setCategories] = useState(() => {
    try {
      const r = localStorage.getItem(categoriesKey);
      return r ? JSON.parse(r) : DEFAULT_CATEGORIES;
    } catch { return DEFAULT_CATEGORIES; }
  });

  // ── State: UI ────────────────────────────────────────────────────────────
  const [activeCategory, setActiveCategory] = useState('todos');
  const [searchQuery, setSearchQuery]         = useState('');
  const [viewMode, setViewMode]               = useState('grid'); // 'grid' | 'list'

  // Note modal
  const [noteModal, setNoteModal]     = useState(false);
  const [currentNote, setCurrentNote] = useState(null);
  const [formTitle, setFormTitle]     = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formColor, setFormColor]     = useState('default');
  const [formPinned, setFormPinned]   = useState(false);

  // Category manager modal
  const [catModal, setCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState(null); // null=new, obj=editing
  const [catLabel, setCatLabel]   = useState('');
  const [catEmoji, setCatEmoji]   = useState('📝');
  const [catColor, setCatColor]   = useState('#6366f1');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiRef = useRef(null);

  // ── Persist ──────────────────────────────────────────────────────────────
  useEffect(() => {
    try { localStorage.setItem(notesKey, JSON.stringify(notes)); }
    catch {}
  }, [notes, notesKey]);

  useEffect(() => {
    try { localStorage.setItem(categoriesKey, JSON.stringify(categories)); }
    catch {}
  }, [categories, categoriesKey]);

  // Reload on user change
  useEffect(() => {
    try {
      const r = localStorage.getItem(notesKey);
      setNotes(r ? JSON.parse(r) : []);
      const c = localStorage.getItem(categoriesKey);
      setCategories(c ? JSON.parse(c) : DEFAULT_CATEGORIES);
      setActiveCategory('todos');
      setSearchQuery('');
    } catch {}
  }, [userId]);

  // Close emoji picker on outside click
  useEffect(() => {
    const handler = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Note actions ─────────────────────────────────────────────────────────
  const openNewNote = () => {
    setCurrentNote(null);
    setFormTitle('');
    setFormContent('');
    setFormCategory(categories[0]?.id || 'personal');
    setFormColor('default');
    setFormPinned(false);
    setNoteModal(true);
  };

  const openEditNote = (note) => {
    setCurrentNote(note);
    setFormTitle(note.title || '');
    setFormContent(note.content || '');
    setFormCategory(note.category || (categories[0]?.id || 'personal'));
    setFormColor(note.color || 'default');
    setFormPinned(note.pinned || false);
    setNoteModal(true);
  };

  const handleSaveNote = (e) => {
    e.preventDefault();
    const now = new Date().toISOString();
    if (currentNote) {
      setNotes(prev => prev.map(n => n.id === currentNote.id
        ? { ...n, title: formTitle.trim(), content: formContent.trim(), category: formCategory, color: formColor, pinned: formPinned, updatedAt: now }
        : n
      ));
    } else {
      setNotes(prev => [{
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        title: formTitle.trim(),
        content: formContent.trim(),
        category: formCategory,
        color: formColor,
        pinned: formPinned,
        createdAt: now,
        updatedAt: now,
      }, ...prev]);
    }
    setNoteModal(false);
  };

  const handleDeleteNote = (id) => {
    if (window.confirm('¿Seguro que deseas eliminar esta nota?')) {
      setNotes(prev => prev.filter(n => n.id !== id));
      if (noteModal && currentNote?.id === id) setNoteModal(false);
    }
  };

  const handleTogglePin = (id, e) => {
    e.stopPropagation();
    setNotes(prev => prev.map(n =>
      n.id === id ? { ...n, pinned: !n.pinned, updatedAt: new Date().toISOString() } : n
    ));
  };

  // ── Category actions ─────────────────────────────────────────────────────
  const openNewCategory = () => {
    setEditingCat(null);
    setCatLabel('');
    setCatEmoji('📝');
    setCatColor('#6366f1');
    setCatModal(true);
  };

  const openEditCategory = (cat) => {
    setEditingCat(cat);
    setCatLabel(cat.label);
    setCatEmoji(cat.emoji);
    setCatColor(cat.color);
    setCatModal(true);
  };

  const handleSaveCategory = (e) => {
    e.preventDefault();
    if (!catLabel.trim()) return;
    if (editingCat) {
      setCategories(prev => prev.map(c => c.id === editingCat.id
        ? { ...c, label: catLabel.trim(), emoji: catEmoji, color: catColor }
        : c
      ));
    } else {
      const newCat = {
        id: 'cat_' + Date.now(),
        label: catLabel.trim(),
        emoji: catEmoji,
        color: catColor,
      };
      setCategories(prev => [...prev, newCat]);
    }
    setCatModal(false);
  };

  const handleDeleteCategory = (catId) => {
    if (window.confirm('¿Eliminar esta categoría? Las notas de esta categoría quedarán sin categoría.')) {
      setCategories(prev => prev.filter(c => c.id !== catId));
      if (activeCategory === catId) setActiveCategory('todos');
    }
  };

  // ── Filter & sort ─────────────────────────────────────────────────────────
  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      const matchCat    = activeCategory === 'todos' || n.category === activeCategory;
      const matchSearch = (n.title || '').toLowerCase().includes(searchQuery.toLowerCase())
                       || (n.content || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    }).sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
  }, [notes, activeCategory, searchQuery]);

  const pinnedCount = useMemo(() => filteredNotes.filter(n => n.pinned).length, [filteredNotes]);

  const getCategoryObj = (id) => categories.find(c => c.id === id) || { emoji: '📝', label: 'Sin categoría', color: '#94a3b8' };
  const getColorHex    = (id) => (NOTE_COLORS.find(c => c.id === id) || NOTE_COLORS[0]).hex;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="nw-root">
      {/* ── Header ── */}
      <div className="nw-header">
        <div className="nw-header-left">
          <div className="nw-header-icon">📓</div>
          <div>
            <h3 className="nw-header-title">Mis Notas</h3>
            <p className="nw-header-subtitle">{notes.length} {notes.length === 1 ? 'nota' : 'notas'} · {categories.length} categorías</p>
          </div>
        </div>
        <div className="nw-header-right">
          {/* Search */}
          <div className="nw-search">
            <span className="nw-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Buscar notas…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="nw-search-input"
            />
            {searchQuery && (
              <button className="nw-search-clear" onClick={() => setSearchQuery('')}>×</button>
            )}
          </div>
          {/* View toggle */}
          <div className="nw-view-toggle">
            <button
              className={`nw-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Vista cuadrícula"
            >⊞</button>
            <button
              className={`nw-view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="Vista lista"
            >≡</button>
          </div>
          {/* Manage categories */}
          <button className="btn btn-ghost btn-sm nw-cat-manage-btn" onClick={() => setCatModal(true)}>
            ⚙️ Categorías
          </button>
          {/* New note */}
          <button className="btn btn-primary nw-create-btn" onClick={openNewNote}>
            <span>＋</span> Nueva nota
          </button>
        </div>
      </div>

      {/* ── Category tabs ── */}
      <div className="nw-tabs-wrapper">
        <div className="nw-tabs">
          <button
            className={`nw-tab ${activeCategory === 'todos' ? 'active' : ''}`}
            onClick={() => setActiveCategory('todos')}
          >
            <span>📋</span> Todas
            <span className="nw-tab-count">{notes.length}</span>
          </button>
          {categories.map(cat => {
            const cnt = notes.filter(n => n.category === cat.id).length;
            return (
              <button
                key={cat.id}
                className={`nw-tab ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
                style={activeCategory === cat.id ? { '--tab-color': cat.color } : {}}
              >
                <span>{cat.emoji}</span> {cat.label}
                {cnt > 0 && <span className="nw-tab-count">{cnt}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Notes grid / list ── */}
      {filteredNotes.length === 0 ? (
        <div className="nw-empty">
          <EmptyIllustration />
          <h4>{searchQuery || activeCategory !== 'todos' ? 'Sin resultados' : 'Aún no tienes notas'}</h4>
          <p>{searchQuery || activeCategory !== 'todos' ? 'Intenta otro filtro o búsqueda.' : 'Crea tu primera nota para empezar a organizar tus ideas.'}</p>
          {!searchQuery && activeCategory === 'todos' && (
            <button className="btn btn-primary btn-sm" style={{ marginTop: 14 }} onClick={openNewNote}>
              ＋ Crear nota
            </button>
          )}
        </div>
      ) : (
        <div className="nw-body">
          {/* Pinned section */}
          {pinnedCount > 0 && (
            <>
              <div className="nw-section-label">
                <span>📌</span> Fijadas ({pinnedCount})
              </div>
              <div className={`nw-notes-container ${viewMode}`}>
                {filteredNotes.filter(n => n.pinned).map(note => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    category={getCategoryObj(note.category)}
                    colorHex={getColorHex(note.color)}
                    viewMode={viewMode}
                    onEdit={openEditNote}
                    onDelete={handleDeleteNote}
                    onTogglePin={handleTogglePin}
                  />
                ))}
              </div>
            </>
          )}

          {/* Regular notes */}
          {filteredNotes.filter(n => !n.pinned).length > 0 && (
            <>
              {pinnedCount > 0 && (
                <div className="nw-section-label" style={{ marginTop: 20 }}>
                  <span>📓</span> Otras notas ({filteredNotes.filter(n => !n.pinned).length})
                </div>
              )}
              <div className={`nw-notes-container ${viewMode}`}>
                {filteredNotes.filter(n => !n.pinned).map(note => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    category={getCategoryObj(note.category)}
                    colorHex={getColorHex(note.color)}
                    viewMode={viewMode}
                    onEdit={openEditNote}
                    onDelete={handleDeleteNote}
                    onTogglePin={handleTogglePin}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────
          NOTE MODAL
      ────────────────────────────────────────────────────────────────── */}
      {noteModal && (
        <div className="nw-overlay" onClick={() => setNoteModal(false)}>
          <div className="nw-modal" onClick={e => e.stopPropagation()}
            style={{ borderTop: `4px solid ${getColorHex(formColor)}` }}>
            <div className="nw-modal-header">
              <h3>{currentNote ? '✏️ Editar nota' : '✨ Nueva nota'}</h3>
              <button className="nw-modal-close" onClick={() => setNoteModal(false)}>×</button>
            </div>

            <form onSubmit={handleSaveNote} className="nw-modal-body">
              {/* Title */}
              <div className="form-group">
                <label className="form-label">Título *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Escribe el título de la nota…"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              {/* Category */}
              <div className="form-group">
                <label className="form-label">Categoría</label>
                <div className="nw-cat-chips">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      className={`nw-cat-chip ${formCategory === cat.id ? 'active' : ''}`}
                      style={formCategory === cat.id ? { background: cat.color + '22', borderColor: cat.color, color: cat.color } : {}}
                      onClick={() => setFormCategory(cat.id)}
                    >
                      {cat.emoji} {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="form-group">
                <label className="form-label">Contenido *</label>
                <textarea
                  className="form-textarea nw-textarea"
                  placeholder="Escribe aquí el contenido de tu nota…"
                  value={formContent}
                  onChange={e => setFormContent(e.target.value)}
                  rows={5}
                  required
                />
              </div>

              {/* Color */}
              <div className="form-group">
                <label className="form-label">Color de fondo</label>
                <div className="nw-color-row">
                  {NOTE_COLORS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      title={c.label}
                      className={`nw-color-swatch ${formColor === c.id ? 'active' : ''}`}
                      style={{ background: c.hex }}
                      onClick={() => setFormColor(c.id)}
                    >
                      {formColor === c.id && <span className="nw-color-check">✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pin */}
              <label className="nw-pin-toggle">
                <input
                  type="checkbox"
                  checked={formPinned}
                  onChange={e => setFormPinned(e.target.checked)}
                />
                <span>📌 Fijar nota al inicio</span>
              </label>

              {/* Footer */}
              <div className="nw-modal-footer">
                {currentNote && (
                  <button type="button" className="btn btn-ghost nw-delete-btn"
                    onClick={() => handleDeleteNote(currentNote.id)}>
                    🗑️ Eliminar
                  </button>
                )}
                <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setNoteModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {currentNote ? '💾 Guardar' : '✨ Crear nota'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────
          CATEGORY MANAGER MODAL
      ────────────────────────────────────────────────────────────────── */}
      {catModal && (
        <div className="nw-overlay" onClick={() => { setCatModal(false); setEditingCat(null); }}>
          <div className="nw-modal nw-modal-cats" onClick={e => e.stopPropagation()}>
            <div className="nw-modal-header">
              <h3>⚙️ Gestionar categorías</h3>
              <button className="nw-modal-close" onClick={() => { setCatModal(false); setEditingCat(null); }}>×</button>
            </div>
            <div className="nw-modal-body">
              {/* Category list */}
              <div className="nw-cat-list">
                {categories.map(cat => (
                  <div key={cat.id} className="nw-cat-item">
                    <span className="nw-cat-item-emoji">{cat.emoji}</span>
                    <span className="nw-cat-item-dot" style={{ background: cat.color }} />
                    <span className="nw-cat-item-label">{cat.label}</span>
                    <span className="nw-cat-item-count">{notes.filter(n => n.category === cat.id).length} notas</span>
                    <div className="nw-cat-item-actions">
                      <button className="nw-cat-action-btn edit"
                        title="Editar categoría"
                        onClick={() => openEditCategory(cat)}>
                        ✏️
                      </button>
                      <button className="nw-cat-action-btn delete"
                        title="Eliminar categoría"
                        onClick={() => handleDeleteCategory(cat.id)}>
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div className="nw-cat-divider">
                <span>{editingCat ? '✏️ Editar categoría' : '＋ Nueva categoría'}</span>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveCategory} className="nw-cat-form">
                {/* Emoji picker */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div className="nw-cat-form-group" style={{ flex: 1 }}>
                    <label className="form-label">Nombre</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej. Trabajo, Recetas…"
                      value={catLabel}
                      onChange={e => setCatLabel(e.target.value)}
                      maxLength={24}
                      required
                    />
                  </div>
                  <div className="nw-cat-form-group">
                    <label className="form-label">Emoji</label>
                    <div ref={emojiRef} style={{ position: 'relative' }}>
                      <button
                        type="button"
                        className="nw-emoji-btn"
                        onClick={() => setShowEmojiPicker(v => !v)}
                      >{catEmoji}</button>
                      {showEmojiPicker && (
                        <div className="nw-emoji-picker">
                          {CATEGORY_EMOJIS.map(em => (
                            <button
                              key={em}
                              type="button"
                              className={`nw-emoji-option ${catEmoji === em ? 'active' : ''}`}
                              onClick={() => { setCatEmoji(em); setShowEmojiPicker(false); }}
                            >{em}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="nw-cat-form-group">
                    <label className="form-label">Color</label>
                    <input
                      type="color"
                      value={catColor}
                      onChange={e => setCatColor(e.target.value)}
                      className="nw-color-input"
                      title="Elige un color"
                    />
                  </div>
                </div>

                {/* Preview */}
                <div className="nw-cat-preview">
                  <span style={{ marginRight: 6 }}>Vista previa:</span>
                  <span className="nw-cat-chip active"
                    style={{ background: catColor + '22', borderColor: catColor, color: catColor }}>
                    {catEmoji} {catLabel || 'Mi categoría'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  {editingCat && (
                    <button type="button" className="btn btn-ghost btn-sm"
                      onClick={() => { setEditingCat(null); setCatLabel(''); setCatEmoji('📝'); setCatColor('#6366f1'); }}>
                      Cancelar
                    </button>
                  )}
                  <button type="submit" className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }}>
                    {editingCat ? '💾 Guardar cambios' : '＋ Agregar categoría'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── NoteCard ───────────────────────────────────────────────────────────────
const NoteCard = ({ note, category, colorHex, viewMode, onEdit, onDelete, onTogglePin }) => {
  return (
    <div
      className={`nw-card ${viewMode}`}
      style={{ background: colorHex }}
      onClick={() => onEdit(note)}
    >
      {/* Pin ribbon */}
      {note.pinned && <div className="nw-card-pin-ribbon">📌</div>}

      <div className="nw-card-header">
        <span className="nw-card-cat-badge"
          style={{ background: category.color + '22', color: category.color, border: `1px solid ${category.color}44` }}>
          {category.emoji} {category.label}
        </span>
        <button
          className={`nw-card-pin-btn ${note.pinned ? 'pinned' : ''}`}
          onClick={e => onTogglePin(note.id, e)}
          title={note.pinned ? 'Desfijar' : 'Fijar nota'}
        >
          {note.pinned ? '📌' : '📍'}
        </button>
      </div>

      <h4 className="nw-card-title">{note.title || 'Sin título'}</h4>
      <p className="nw-card-content">{note.content || 'Sin contenido'}</p>

      <div className="nw-card-footer">
        <span className="nw-card-date">{fmtDate(note.updatedAt || note.createdAt)}</span>
        <div className="nw-card-actions" onClick={e => e.stopPropagation()}>
          <button className="nw-card-action edit" onClick={() => onEdit(note)} title="Editar">✏️</button>
          <button className="nw-card-action delete" onClick={() => onDelete(note.id)} title="Eliminar">🗑️</button>
        </div>
      </div>
    </div>
  );
};
