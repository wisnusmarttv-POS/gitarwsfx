import React, { useState, useEffect } from 'react';
import './index.css';

// Minimal App for Debugging
function App() {
    const [count, setCount] = useState(0);

    useEffect(() => {
        console.log('AppDebug Mounted');
        alert('APP DEBUG MOUNTED');
    }, []);

    return (
        <div className="app-editor-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'white' }}>
            <h1>DEBUG MODE ACTIVE</h1>
            <p>App Component Loaded Successfully</p>
            <button onClick={() => setCount(c => c + 1)} style={{ padding: 20, fontSize: 20 }}>
                Test Interaction: {count}
            </button>
        </div>
    );
}

export default App;
