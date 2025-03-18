import React, { useState, useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const EquationEditor = ({ position, onSave, onCancel }) => {
  const [equation, setEquation] = useState('');
  const previewRef = useRef(null);
  
  useEffect(() => {
    try {
      katex.render(equation || '\\text{Preview}', previewRef.current, {
        throwOnError: false
      });
    } catch (error) {
      console.error('KaTeX error:', error);
    }
  }, [equation]);
  
  const handleSave = () => {
    if (equation.trim()) {
      onSave(equation);
    }
  };

  const insertSymbol = (symbol) => {
    setEquation(prev => prev + symbol);
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const cursorPosition = e.target.selectionStart;
      const textBeforeCursor = equation.substring(0, cursorPosition);
      const textAfterCursor = equation.substring(cursorPosition);
      setEquation(textBeforeCursor + '  ' + textAfterCursor);
      // Set cursor position after inserted tab
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = cursorPosition + 2;
      }, 0);
    }
  };

  const symbolGroups = [
    {
      title: 'Format',
      symbols: [
        { display: 'Bold', latex: '\\mathbf{}' },
        { display: 'Italic', latex: '\\textit{}' },
        { display: '[]', latex: '[]' },
        { display: '()', latex: '()' },
        { display: '{}', latex: '\\{\\}' },
        { display: '|', latex: '|' },
        { display: ':', latex: ':' },
        { display: '.', latex: '.' },
        { display: 'P', latex: '\\mathcal{P}' },
        { display: 'ℵ', latex: '\\aleph' },
        { display: '∠', latex: '\\angle' },
        { display: '∞', latex: '\\infty' },
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
        { display: '∫', latex: '\\int' },
        { display: '∬', latex: '\\iint' },
        { display: '∭', latex: '\\iiint' },
        { display: '∮', latex: '\\oint' },
        { display: '∇', latex: '\\nabla' },
        { display: '∂', latex: '\\partial' },
        { display: '∑', latex: '\\sum' },
        { display: '∏', latex: '\\prod' },
        { display: '∐', latex: '\\coprod' },
        { display: '√', latex: '\\sqrt{}' },
        { display: 'log', latex: '\\log' },
        { display: 'ln', latex: '\\ln' },
        { display: 'sin', latex: '\\sin' },
        { display: 'cos', latex: '\\cos' },
        { display: 'tan', latex: '\\tan' },
        { display: 'cot', latex: '\\cot' },
        { display: 'sec', latex: '\\sec' },
        { display: 'csc', latex: '\\csc' },
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
        { display: '≺', latex: '\\prec' },
        { display: '≻', latex: '\\succ' },
        { display: '⊂', latex: '\\subset' },
        { display: '⊃', latex: '\\supset' },
        { display: '⊆', latex: '\\subseteq' },
        { display: '⊇', latex: '\\supseteq' },
        { display: '∈', latex: '\\in' },
        { display: '∋', latex: '\\ni' },
        { display: '∉', latex: '\\notin' },
        { display: '∪', latex: '\\cup' },
        { display: '∩', latex: '\\cap' },
        { display: '⊎', latex: '\\uplus' },
        { display: '⊕', latex: '\\oplus' },
        { display: '⊗', latex: '\\otimes' },
      ]
    },
    {
      title: 'Matrices',
      symbols: [
        { display: 'Matrix', latex: '\\begin{matrix} a & b \\\\ c & d \\end{matrix}' },
        { display: 'pMatrix', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
        { display: 'bMatrix', latex: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}' },
        { display: 'vMatrix', latex: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}' },
        { display: 'Vmatrix', latex: '\\begin{Vmatrix} a & b \\\\ c & d \\end{Vmatrix}' },
        { display: '...', latex: '\\cdots' },
        { display: '⋮', latex: '\\vdots' },
        { display: '⋱', latex: '\\ddots' },
        { display: '(n r)', latex: '\\binom{n}{r}' },
      ]
    },
    {
      title: 'Arrows',
      symbols: [
        { display: '→', latex: '\\rightarrow' },
        { display: '←', latex: '\\leftarrow' },
        { display: '↔', latex: '\\leftrightarrow' },
        { display: '⇒', latex: '\\Rightarrow' },
        { display: '⇐', latex: '\\Leftarrow' },
        { display: '⇔', latex: '\\Leftrightarrow' },
        { display: '↑', latex: '\\uparrow' },
        { display: '↓', latex: '\\downarrow' },
        { display: '↕', latex: '\\updownarrow' },
        { display: '⇑', latex: '\\Uparrow' },
        { display: '⇓', latex: '\\Downarrow' },
        { display: '⇕', latex: '\\Updownarrow' },
        { display: '↦', latex: '\\mapsto' },
        { display: '↪', latex: '\\hookrightarrow' },
        { display: '↩', latex: '\\hookleftarrow' },
      ]
    },
    {
      title: 'Fractions',
      symbols: [
        { display: 'a/b', latex: '\\frac{a}{b}' },
        { display: 'a÷b', latex: 'a \\div b' },
        { display: 'a/b/c', latex: '\\frac{\\frac{a}{b}}{c}' },
        { display: 'a/(b/c)', latex: '\\frac{a}{\\frac{b}{c}}' },
        { display: 'a+b+c', latex: 'a+b+c' },
        { display: 'a-b-c', latex: 'a-b-c' },
      ]
    },
    {
      title: 'Functions',
      symbols: [
        { display: 'f(x)', latex: 'f(x)' },
        { display: 'f\'(x)', latex: 'f\'(x)' },
        { display: 'f\'\'(x)', latex: 'f\'\'(x)' },
        { display: '∫f(x)dx', latex: '\\int f(x)\\,dx' },
        { display: '∫_a^b', latex: '\\int_{a}^{b}' },
        { display: '∑_i^n', latex: '\\sum_{i=1}^{n}' },
        { display: 'lim', latex: '\\lim_{x \\to \\infty}' },
        { display: 'sup', latex: '\\sup_{x \\in A}' },
        { display: 'inf', latex: '\\inf_{x \\in A}' },
        { display: 'max', latex: '\\max_{x \\in A}' },
        { display: 'min', latex: '\\min_{x \\in A}' },
      ]
    },
    {
      title: 'Sets',
      symbols: [
        { display: '∅', latex: '\\emptyset' },
        { display: 'ℕ', latex: '\\mathbb{N}' },
        { display: 'ℤ', latex: '\\mathbb{Z}' },
        { display: 'ℚ', latex: '\\mathbb{Q}' },
        { display: 'ℝ', latex: '\\mathbb{R}' },
        { display: 'ℂ', latex: '\\mathbb{C}' },
        { display: '∀', latex: '\\forall' },
        { display: '∃', latex: '\\exists' },
        { display: '∄', latex: '\\nexists' },
        { display: '∨', latex: '\\lor' },
        { display: '∧', latex: '\\land' },
        { display: '¬', latex: '\\neg' },
        { display: '⊕', latex: '\\oplus' },
        { display: '⊖', latex: '\\ominus' },
      ]
    },
  ];
  
  return (
    <div 
      className="equation-editor"
      style={{ 
        left: position.x, 
        top: position.y,
      }}
    >
      <div className="equation-toolbar">
        <button className="toolbar-button" onClick={() => setEquation('')}>
          <i className="fas fa-trash"></i>
        </button>
        <button className="toolbar-button" onClick={() => navigator.clipboard.writeText(equation)}>
          <i className="fas fa-copy"></i>
        </button>
        <button className="toolbar-button" onClick={() => {
          navigator.clipboard.readText().then(text => setEquation(prev => prev + text));
        }}>
          <i className="fas fa-paste"></i>
        </button>
      </div>
      
      <div className="equation-preview" ref={previewRef}></div>
      
      <textarea
        value={equation}
        onChange={(e) => setEquation(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter LaTeX equation (e.g., E = mc^2)"
        autoFocus
      />
      
      <div className="symbol-groups">
        {symbolGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="symbol-group">
            <div className="symbol-group-title">{group.title}</div>
            <div className="symbol-buttons">
              {group.symbols.map((symbol, symbolIndex) => (
                <button 
                  key={symbolIndex} 
                  className="symbol-button"
                  onClick={() => insertSymbol(symbol.latex)}
                  title={symbol.latex}
                >
                  {symbol.display}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className="equation-help">
        <small>Define equation with LaTeX markup. <kbd>Tab</kbd> or <kbd>Ctrl+arrows</kbd> to jump between brackets and matrix elements.</small>
      </div>
      
      <div className="equation-buttons">
        <button onClick={handleSave}>Save</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
};

export default EquationEditor;