import React, { useState } from 'react';
import { FaTimes } from 'react-icons/fa';

const FileUpload = ({ onUpload, onClose, acceptedTypes = 'image/*,.pdf' }) => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    if (!selectedFile) {
      setFile(null);
      return;
    }
    
    // Check file type
    const fileType = selectedFile.type;
    if (fileType.startsWith('image/') || fileType === 'application/pdf') {
      setFile(selectedFile);
      setError('');
    } else {
      setFile(null);
      setError('Please select an image or PDF file.');
    }
  };
  
  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first.');
      return;
    }
    
    setLoading(true);
    
    try {
      // Read file as data URL
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const fileData = {
          name: file.name,
          type: file.type,
          size: file.size,
          data: e.target.result
        };
        
        onUpload(fileData);
        setLoading(false);
        onClose();
      };
      
      reader.onerror = () => {
        setError('Error reading file.');
        setLoading(false);
      };
      
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Error uploading file: ' + err.message);
      setLoading(false);
    }
  };
  
  return (
    <div className="file-upload-modal">
      <div className="file-upload-content">
        <div className="file-upload-header">
          <h2>Upload File</h2>
          <button className="close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        
        <div className="file-upload-body">
          <input 
            type="file" 
            accept={acceptedTypes}
            onChange={handleFileChange}
          />
          
          {file && (
            <div className="file-preview">
              <p>Selected file: {file.name}</p>
              {file.type.startsWith('image/') && (
                <img 
                  src={URL.createObjectURL(file)} 
                  alt="Preview" 
                  style={{ maxWidth: '100%', maxHeight: '200px' }}
                />
              )}
              {file.type === 'application/pdf' && (
                <div className="pdf-preview">
                  <p>PDF file selected (preview not available)</p>
                </div>
              )}
            </div>
          )}
          
          {error && <p className="error-message">{error}</p>}
          
          <div className="file-upload-actions">
            <button 
              onClick={handleUpload} 
              disabled={!file || loading}
            >
              {loading ? 'Uploading...' : 'Upload'}
            </button>
            <button onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;