import React from 'react';

const SidebarButtons = ({ setViewer2DModeToMove, setViewer2DModeToDraw, switchViewer2DToTransform }) => {
    return (
        <div style={{ width: '200px', left: 0, top: 0, bottom: 0, backgroundColor: '#f0f0f0' ,position: 'fixed',zIndex: '1'}}>
            <button onClick={setViewer2DModeToDraw}>Draw Mode</button>
            <button onClick={setViewer2DModeToMove}>Move Mode</button>
            <button onClick={switchViewer2DToTransform}>Transform Mode</button>
        </div>
    );
};

export default SidebarButtons;