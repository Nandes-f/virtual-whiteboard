import React, { useState, useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import '../styles/EquationEditor.css';

const EquationEditor = ({ position, onSubmit, onClose }) => {
  const [equation, setEquation] = useState('');
  const [error, setError] = useState(null);
  const previewRef = useRef(null);
  const textareaRef = useRef(null);
  const editorRef = useRef(null);
  
  // Keep editor within viewport bounds
  useEffect(() => {
    if (editorRef.current) {
      const rect = editorRef.current.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      let left = position.x;
      let top = position.y;
      
      // Adjust horizontal position
      if (left + rect.width > windowWidth - 20) {
        left = windowWidth - rect.width - 20;
      }
      
      // Adjust vertical position
      if (top + rect.height > windowHeight - 20) {
        top = windowHeight - rect.height - 20;
      }
      
      editorRef.current.style.left = `${Math.max(10, left)}px`;
      editorRef.current.style.top = `${Math.max(10, top)}px`;
    }
  }, [position]);
  
  // Focus textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);
  
  // Render preview with KaTeX
  useEffect(() => {
    if (!previewRef.current) return;
    
    try {
      katex.render(equation || '\\text{Preview}', previewRef.current, {
        throwOnError: false,
        displayMode: true
      });
      setError(null);
    } catch (err) {
      setError(err.message);
      // Still render as much as possible even with errors
      try {
        katex.render(equation || '\\text{Preview}', previewRef.current, {
          throwOnError: false,
          displayMode: true,
          strict: false
        });
      } catch (e) {
      }
    }
  }, [equation]);
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (equation.trim()) {
      onSubmit(equation);
    } else {
      onClose();
    }
  };

  // Insert symbol at cursor position
  const insertSymbol = (symbol) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newEquation = equation.substring(0, start) + symbol + equation.substring(end);
    
    setEquation(newEquation);
    
    // Set cursor position after the inserted symbol
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + symbol.length;
    }, 0);
  };
  
  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      insertSymbol('  ');
    } else if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSubmit(e);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Common math symbols to display in editor
  const symbolGroups = [
    {
      title: 'Format',
      symbols: [
        { display: 'Bold', latex: '\\mathbf{}' },
        { display: 'Italic', latex: '\\textit{}' },
        { display: 'Text', latex: '\\text{}' },
        { display: '[]', latex: '[]' },
        { display: '()', latex: '()' },
        { display: '{}', latex: '\\{\\}' },
        { display: '|', latex: '|' },
        { display: 'Sub', latex: '_{x}' },
        { display: 'Sup', latex: '^{x}' },
      ]
    },
    {
      title: 'Greek',
      symbols: [
        { display: 'α', latex: '\\alpha' },
        { display: 'β', latex: '\\beta' },
        { display: 'γ', latex: '\\gamma' },
        { display: 'Γ', latex: '\\Gamma' },
        { display: 'δ', latex: '\\delta' },
        { display: 'Δ', latex: '\\Delta' },
        { display: 'ε', latex: '\\epsilon' },
        { display: 'ζ', latex: '\\zeta' },
        { display: 'η', latex: '\\eta' },
        { display: 'θ', latex: '\\theta' },
        { display: 'Θ', latex: '\\Theta' },
        { display: 'ι', latex: '\\iota' },
        { display: 'κ', latex: '\\kappa' },
        { display: 'λ', latex: '\\lambda' },
        { display: 'Λ', latex: '\\Lambda' },
        { display: 'μ', latex: '\\mu' },
        { display: 'ν', latex: '\\nu' },
        { display: 'ξ', latex: '\\xi' },
        { display: 'Ξ', latex: '\\Xi' },
        { display: 'π', latex: '\\pi' },
        { display: 'Π', latex: '\\Pi' },
        { display: 'ρ', latex: '\\rho' },
        { display: 'σ', latex: '\\sigma' },
        { display: 'Σ', latex: '\\Sigma' },
        { display: 'τ', latex: '\\tau' },
        { display: 'υ', latex: '\\upsilon' },
        { display: 'Υ', latex: '\\Upsilon' },
        { display: 'φ', latex: '\\phi' },
        { display: 'Φ', latex: '\\Phi' },
        { display: 'χ', latex: '\\chi' },
        { display: 'ψ', latex: '\\psi' },
        { display: 'Ψ', latex: '\\Psi' },
        { display: 'ω', latex: '\\omega' },
        { display: 'Ω', latex: '\\Omega' },
      ]
    },
    {
      title: 'Operators',
      symbols: [
        { display: '+', latex: '+' },
        { display: '-', latex: '-' },
        { display: '×', latex: '\\times' },
        { display: '÷', latex: '\\div' },
        { display: '±', latex: '\\pm' },
        { display: '∓', latex: '\\mp' },
        { display: '·', latex: '\\cdot' },
        { display: '∗', latex: '\\ast' },
        { display: '∘', latex: '\\circ' },
        { display: '⊕', latex: '\\oplus' },
        { display: '⊗', latex: '\\otimes' },
        { display: '∧', latex: '\\wedge' },
        { display: '∨', latex: '\\vee' },
        { display: '∩', latex: '\\cap' },
        { display: '∪', latex: '\\cup' },
      ]
    },
    {
      title: 'Calculus',
      symbols: [
        { display: '∫', latex: '\\int' },
        { display: '∬', latex: '\\iint' },
        { display: '∭', latex: '\\iiint' },
        { display: '∮', latex: '\\oint' },
        { display: '∇', latex: '\\nabla' },
        { display: '∂', latex: '\\partial' },
        { display: 'lim', latex: '\\lim_{x \\to a}' },
        { display: 'd/dx', latex: '\\frac{d}{dx}' },
        { display: '∑', latex: '\\sum' },
        { display: '∏', latex: '\\prod' },
      ]
    },
    {
      title: 'Relations',
      symbols: [
        { display: '=', latex: '=' },
        { display: '≠', latex: '\\neq' },
        { display: '<', latex: '<' },
        { display: '>', latex: '>' },
        { display: '≤', latex: '\\leq' },
        { display: '≥', latex: '\\geq' },
        { display: '≈', latex: '\\approx' },
        { display: '≡', latex: '\\equiv' },
        { display: '∼', latex: '\\sim' },
        { display: '≃', latex: '\\simeq' },
        { display: '∝', latex: '\\propto' },
        { display: '⊂', latex: '\\subset' },
        { display: '⊃', latex: '\\supset' },
        { display: '⊆', latex: '\\subseteq' },
        { display: '⊇', latex: '\\supseteq' },
        { display: '∈', latex: '\\in' },
        { display: '∉', latex: '\\notin' },
        { display: '∋', latex: '\\ni' },
      ]
    },
    {
      title: 'Functions',
      symbols: [
        { display: 'sin', latex: '\\sin' },
        { display: 'cos', latex: '\\cos' },
        { display: 'tan', latex: '\\tan' },
        { display: 'csc', latex: '\\csc' },
        { display: 'sec', latex: '\\sec' },
        { display: 'cot', latex: '\\cot' },
        { display: 'arcsin', latex: '\\arcsin' },
        { display: 'arccos', latex: '\\arccos' },
        { display: 'arctan', latex: '\\arctan' },
        { display: 'sinh', latex: '\\sinh' },
        { display: 'cosh', latex: '\\cosh' },
        { display: 'tanh', latex: '\\tanh' },
        { display: 'ln', latex: '\\ln' },
        { display: 'log', latex: '\\log' },
        { display: 'exp', latex: '\\exp' },
        { display: 'max', latex: '\\max' },
        { display: 'min', latex: '\\min' },
      ]
    },
    {
      title: 'Fractions & Roots',
      symbols: [
        { display: 'a/b', latex: '\\frac{a}{b}' },
        { display: '√', latex: '\\sqrt{}' },
        { display: '∛', latex: '\\sqrt[3]{}' },
        { display: '∜', latex: '\\sqrt[4]{}' },
        { display: 'n√', latex: '\\sqrt[n]{}' },
        { display: 'binom', latex: '\\binom{n}{k}' },
      ]
    },
    {
      title: 'Brackets',
      symbols: [
        { display: '()', latex: '\\left( \\right)' },
        { display: '[]', latex: '\\left[ \\right]' },
        { display: '{}', latex: '\\left\\{ \\right\\}' },
        { display: '⟨⟩', latex: '\\left\\langle \\right\\rangle' },
        { display: '|x|', latex: '\\left| \\right|' },
        { display: '‖x‖', latex: '\\left\\| \\right\\|' },
        { display: '⌈x⌉', latex: '\\left\\lceil \\right\\rceil' },
        { display: '⌊x⌋', latex: '\\left\\lfloor \\right\\rfloor' },
      ]
    },
    {
      title: 'Arrows',
      symbols: [
        { display: '←', latex: '\\leftarrow' },
        { display: '→', latex: '\\rightarrow' },
        { display: '↔', latex: '\\leftrightarrow' },
        { display: '⇐', latex: '\\Leftarrow' },
        { display: '⇒', latex: '\\Rightarrow' },
        { display: '⇔', latex: '\\Leftrightarrow' },
        { display: '↑', latex: '\\uparrow' },
        { display: '↓', latex: '\\downarrow' },
        { display: '↕', latex: '\\updownarrow' },
        { display: '⟹', latex: '\\Longrightarrow' },
        { display: '⟸', latex: '\\Longleftarrow' },
      ]
    },
    {
      title: 'Matrices',
      symbols: [
        { display: '2×2', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
        { display: '3×3', latex: '\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}' },
        { display: '[2×2]', latex: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}' },
        { display: '{2×2}', latex: '\\begin{Bmatrix} a & b \\\\ c & d \\end{Bmatrix}' },
        { display: '|2×2|', latex: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}' },
      ]
    },
    {
      title: 'Special',
      symbols: [
        { display: '∞', latex: '\\infty' },
        { display: '…', latex: '\\ldots' },
        { display: '⋯', latex: '\\cdots' },
        { display: '⋮', latex: '\\vdots' },
        { display: '⋱', latex: '\\ddots' },
        { display: 'ℝ', latex: '\\mathbb{R}' },
        { display: 'ℕ', latex: '\\mathbb{N}' },
        { display: 'ℤ', latex: '\\mathbb{Z}' },
        { display: 'ℚ', latex: '\\mathbb{Q}' },
        { display: 'ℂ', latex: '\\mathbb{C}' },
        { display: '∀', latex: '\\forall' },
        { display: '∃', latex: '\\exists' },
        { display: '∄', latex: '\\nexists' },
        { display: '¬', latex: '\\neg' },
        { display: '∴', latex: '\\therefore' },
        { display: '∵', latex: '\\because' },
      ]
    },
  ];
  
  // Render each symbol group with a set of buttons
  const renderSymbolGroups = () => {
    return symbolGroups.map((group, index) => (
      <div key={index} className="symbol-group">
        <h4>{group.title}</h4>
        <div className="symbols-container">
          {group.symbols.map((symbol, idx) => (
            <button
              key={idx}
              type="button"
              className="symbol-button"
              title={symbol.latex}
              onClick={() => insertSymbol(symbol.latex)}
            >
              {symbol.display}
            </button>
          ))}
        </div>
      </div>
    ));
  };
  
  return (
    <div 
      ref={editorRef}
      className="equation-editor"
      style={{ 
        left: position.x, 
        top: position.y,
      }}
    >
      <div className="equation-editor-header">
        <h3>Equation Editor</h3>
        <button 
          type="button" 
          className="close-button"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      
      <div className="equation-preview" ref={previewRef}></div>
      
      {error && (
        <div className="equation-error">
          <small>{error}</small>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          className="equation-input"
          value={equation}
          onChange={(e) => setEquation(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter LaTeX equation (e.g. \frac{x}{y} for x/y)"
          rows={3}
        />
        
        <div className="symbol-groups-container">
          {renderSymbolGroups()}
        </div>
        
        <div className="equation-editor-footer">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary-button">
            Insert Equation
          </button>
        </div>
      </form>
    </div>
  );
};

export default EquationEditor;