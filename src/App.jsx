import React from 'react'
import BigAlGame from './components/BigAlGame.tsx'
// Remove the CSS import entirely
import './content/terrains/basicTerrains';

function App() {
    return (
        <div className="App">
            <BigAlGame />
        </div>
    )
}

export default App