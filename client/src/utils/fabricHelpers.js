import { fabric } from 'fabric';

// Create a free drawing brush
export const createPenBrush = (canvas, color, width) => {
  if (!canvas) return;
  
  // Make sure we're using PencilBrush
  canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
  canvas.freeDrawingBrush.color = color;
  canvas.freeDrawingBrush.width = width;
  
  // Ensure drawing mode is enabled
  canvas.isDrawingMode = true;
  
  console.log('Pen brush created with color:', color, 'width:', width);
};

// Create an eraser brush
export const createEraserBrush = (canvas, width) => {
  canvas.freeDrawingBrush = new fabric.EraserBrush(canvas);
  canvas.freeDrawingBrush.width = width * 2; // Make eraser slightly larger
};

// Add text to canvas
export const addText = (canvas, options = {}) => {
  const text = new fabric.IText('Text', {
    left: options.left || canvas.width / 2,
    top: options.top || canvas.height / 2,
    fontFamily: options.fontFamily || 'Arial',
    fontSize: options.fontSize || 20,
    fill: options.fill || '#000000',
    editable: true
  });
  
  canvas.add(text);
  canvas.setActiveObject(text);
  text.enterEditing();
  
  return text;
};

// Add a rectangle
export const addRectangle = (canvas, options = {}) => {
  const rect = new fabric.Rect({
    left: options.left || canvas.width / 2 - 50,
    top: options.top || canvas.height / 2 - 50,
    width: options.width || 100,
    height: options.height || 100,
    fill: options.fill || 'transparent',
    stroke: options.stroke || '#000000',
    strokeWidth: options.strokeWidth || 2
  });
  
  canvas.add(rect);
  canvas.setActiveObject(rect);
  
  return rect;
};

// Add a circle
export const addCircle = (canvas, options = {}) => {
  const circle = new fabric.Circle({
    left: options.left || canvas.width / 2 - 50,
    top: options.top || canvas.height / 2 - 50,
    radius: options.radius || 50,
    fill: options.fill || 'transparent',
    stroke: options.stroke || '#000000',
    strokeWidth: options.strokeWidth || 2
  });
  
  canvas.add(circle);
  canvas.setActiveObject(circle);
  
  return circle;
};

// Add a line
export const addLine = (canvas, options = {}) => {
  const line = new fabric.Line([
    options.x1 || canvas.width / 2 - 50,
    options.y1 || canvas.height / 2,
    options.x2 || canvas.width / 2 + 50,
    options.y2 || canvas.height / 2
  ], {
    stroke: options.stroke || '#000000',
    strokeWidth: options.strokeWidth || 2
  });
  
  canvas.add(line);
  canvas.setActiveObject(line);
  
  return line;
};

// Add an arrow
export const addArrow = (canvas, options = {}) => {
  const x1 = options.x1 || canvas.width / 2 - 50;
  const y1 = options.y1 || canvas.height / 2;
  const x2 = options.x2 || canvas.width / 2 + 50;
  const y2 = options.y2 || canvas.height / 2;
  
  const line = new fabric.Line([x1, y1, x2, y2], {
    stroke: options.stroke || '#000000',
    strokeWidth: options.strokeWidth || 2
  });
  
  // Calculate angle for the arrow head
  const angle = Math.atan2(y2 - y1, x2 - x1);
  
  // Create arrow head
  const headSize = options.headSize || 15;
  const triangle = new fabric.Triangle({
    left: x2,
    top: y2,
    pointType: 'arrow_start',
    angle: (angle * 180 / Math.PI) + 90,
    width: headSize,
    height: headSize,
    fill: options.stroke || '#000000'
  });
  
  // Group the line and arrow head
  const arrow = new fabric.Group([line, triangle], {
    left: Math.min(x1, x2),
    top: Math.min(y1, y2)
  });
  
  canvas.add(arrow);
  canvas.setActiveObject(arrow);
  
  return arrow;
};

// Add an image
export const addImage = (canvas, url, options = {}) => {
  fabric.Image.fromURL(url, (img) => {
    // Scale image to fit within canvas if needed
    const maxWidth = canvas.width * 0.8;
    const maxHeight = canvas.height * 0.8;
    
    if (img.width > maxWidth || img.height > maxHeight) {
      const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
      img.scale(scale);
    }
    
    img.set({
      left: options.left || canvas.width / 2 - (img.width * img.scaleX) / 2,
      top: options.top || canvas.height / 2 - (img.height * img.scaleY) / 2
    });
    
    canvas.add(img);
    canvas.setActiveObject(img);
  });
};

// Add a PDF page as an image
export const addPdfPage = (canvas, pdfData, pageNumber, options = {}) => {
  // This is a placeholder - actual PDF rendering would require pdf.js
  // For now, we'll just add a placeholder rectangle
  const rect = new fabric.Rect({
    left: options.left || canvas.width / 2 - 150,
    top: options.top || canvas.height / 2 - 200,
    width: options.width || 300,
    height: options.height || 400,
    fill: '#f0f0f0',
    stroke: '#cccccc',
    strokeWidth: 1
  });
  
  const text = new fabric.Text(`PDF Page ${pageNumber}`, {
    left: rect.left + rect.width / 2,
    top: rect.top + rect.height / 2,
    originX: 'center',
    originY: 'center',
    fill: '#999999'
  });
  
  const group = new fabric.Group([rect, text], {
    left: rect.left,
    top: rect.top
  });
  
  canvas.add(group);
  return group;
};

// Create a laser pointer effect
export const createLaserPointer = (canvas, x, y, color = '#ff0000') => {
  const pointer = new fabric.Circle({
    left: x,
    top: y,
    radius: 5,
    fill: color,
    opacity: 0.7,
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false
  });
  
  canvas.add(pointer);
  
  // Animate the pointer to fade out
  const fadeOut = () => {
    pointer.animate('opacity', 0, {
      duration: 1000,
      onChange: canvas.renderAll.bind(canvas),
      onComplete: () => {
        canvas.remove(pointer);
      }
    });
  };
  
  setTimeout(fadeOut, 1000);
  
  return pointer;
};

// Convert canvas to JSON for saving/sharing
export const canvasToJson = (canvas) => {
  return canvas.toJSON(['id', 'selectable']);
};

// Load canvas from JSON
export const loadCanvasFromJson = (canvas, json) => {
  if (!json) return;
  
  canvas.loadFromJSON(json, canvas.renderAll.bind(canvas));
};

// Export canvas as image
export const exportCanvasAsImage = (canvas, format = 'png') => {
  return canvas.toDataURL({
    format: format,
    quality: 0.8
  });
};

// Clear canvas
export const clearCanvas = (canvas) => {
  canvas.clear();
  canvas.setBackgroundColor('#ffffff', canvas.renderAll.bind(canvas));
};