import React from 'react';
import { ChromePicker } from 'react-color';

const ColorPicker = ({ color, onChange }) => {
  return (
    <ChromePicker 
      color={color}
      onChange={onChange}
      disableAlpha={true}
    />
  );
};

export default ColorPicker;