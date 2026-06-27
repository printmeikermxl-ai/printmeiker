export const ConfirmDialog = ({ title, message, icon = '⚠️', onConfirm, onCancel, danger = true }) => {
  return (
    <div className="confirm-dialog">
      <div className="confirm-box">
        <div className="confirm-icon">{icon}</div>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="confirm-actions">
          <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};
