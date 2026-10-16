import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { WorldRenderer } from '../three/WorldRenderer.js';

// React wrapper around the Three.js world. Game state flows in through props;
// clicks and hovers flow back out as hex keys.
const WorldView = forwardRef(({ gameState, movable, path, onHexClick, onHexHover }, ref) => {
    const containerRef = useRef(null);
    const rendererRef = useRef(null);
    const callbacks = useRef({});
    const [error, setError] = useState(null);
    callbacks.current = { onHexClick, onHexHover };

    useEffect(() => {
        let renderer;
        try {
            renderer = new WorldRenderer(containerRef.current, {
                onHexClick: (key) => callbacks.current.onHexClick?.(key),
                onHexHover: (key) => callbacks.current.onHexHover?.(key)
            });
        } catch (e) {
            console.error('Failed to start the 3D renderer', e);
            setError(e.message || String(e));
            return undefined;
        }
        rendererRef.current = renderer;
        if (process.env.NODE_ENV === 'development') window.__world = renderer;
        return () => {
            renderer.dispose();
            rendererRef.current = null;
        };
    }, []);

    useEffect(() => {
        rendererRef.current?.update(gameState, { movable, path });
    }, [gameState, movable, path]);

    useImperativeHandle(ref, () => ({
        rotate: (dir) => rendererRef.current?.rotate(dir),
        zoom: (f) => rendererRef.current?.zoomBy(f),
        center: () => rendererRef.current?.centerOnPlayer(),
        reset: () => rendererRef.current?.resetView()
    }), []);

    return (
        <div ref={containerRef} className="absolute inset-0">
            {error && (
                <div className="absolute inset-0 flex items-center justify-center text-white text-center p-8">
                    <div className="bg-black bg-opacity-80 rounded-xl p-6 border-2 border-red-500 max-w-md">
                        <div className="text-2xl mb-2">🦖💥</div>
                        <div className="font-bold mb-2">Couldn't start the 3D world</div>
                        <div className="text-sm text-gray-300">Your browser needs WebGL enabled to play. ({error})</div>
                    </div>
                </div>
            )}
        </div>
    );
});

WorldView.displayName = 'WorldView';

export default WorldView;
