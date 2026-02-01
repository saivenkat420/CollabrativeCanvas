import "./Toolbar.css";

export const Toolbar = (props) => {
  const {
    color,
    setColor,
    brushSize,
    setBrushSize,
    onClear,
    onUndo,
    tool,
    setTool,
  } = props;
  return (
    <div className="toolbar-container">
      <div className="toolbar-section">
        <button
          className={tool === "pencil" ? "active" : ""}
          onClick={() => setTool("pencil")}
        >
          Pencil
        </button>
        <button
          className={tool === "eraser" ? "active" : ""}
          onClick={() => setTool("eraser")}
        >
          Eraser
        </button>
      </div>
      <div className="toolbar-section">
        <input
          type="color"
          value={color}
          id="color"
          onChange={(e) => setColor(e.target.value)}
        />
        <label htmlFor="color">Color: {color}</label>
        <input
          type="range"
          min="1"
          max="20"
          id="brushSize"
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
        />
        <label htmlFor="brushSize">Brush Size: {brushSize}px</label>
      </div>
      <div className="toolbar-section">
        <button onClick={onUndo}> Undo </button>
        <button onClick={onClear}> Clear </button>
      </div>
    </div>
  );
};
