import React, { useState } from 'react';

const ImageWithFallback = ({
    src,
    fallback,
    alt,
    className = "",
    style = {},
    ...props
}) => {
    const [useImage, setUseImage] = useState(!!src);
    const [imageLoaded, setImageLoaded] = useState(false);

    const handleImageError = () => {
        setUseImage(false);
    };

    const handleImageLoad = () => {
        setImageLoaded(true);
    };

    // If no src provided or image failed to load, show fallback
    if (!src || !useImage) {
        return (
            <span
                className={`${className} select-none pointer-events-none`}
                style={style}
                {...props}
            >
                {fallback}
            </span>
        );
    }

    return (
        <>
            <img
                src={src}
                alt={alt}
                className={`${className} select-none pointer-events-none ${imageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}
                style={style}
                onError={handleImageError}
                onLoad={handleImageLoad}
                {...props}
            />
            {/* Show fallback while image is loading */}
            {!imageLoaded && (
                <span
                    className={`${className} select-none pointer-events-none absolute inset-0 flex items-center justify-center`}
                    style={style}
                >
                    {fallback}
                </span>
            )}
        </>
    );
};

export default ImageWithFallback;