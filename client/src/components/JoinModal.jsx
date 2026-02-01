import { useState } from "react";
import "./JoinModal.css";

export const JoinModal = ({ onJoin }) => {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please enter your name");
      return;
    }
    
    if (trimmedName.length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }
    
    if (trimmedName.length > 20) {
      setError("Name must be less than 20 characters");
      return;
    }
    
    onJoin(trimmedName);
  };

  return (
    <div className="join-modal-overlay">
      <div className="join-modal">
        <h2>Welcome to Collaborative Canvas</h2>
        <p>Enter your name to start drawing with others</p>
        
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            autoFocus
            maxLength={20}
          />
          
          {error && <span className="error-message">{error}</span>}
          
          <button type="submit">Join Canvas</button>
        </form>
        
        <div className="modal-footer">
          <span>Draw together in real-time!</span>
        </div>
      </div>
    </div>
  );
};
