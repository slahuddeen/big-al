export const useWeatherSystem = (gameState, setGameState) => {
    const updateWeather = useCallback(() => {
        const seasonWeatherPatterns = {
            spring: ['clear', 'cloudy', 'rainy'],
            summer: ['clear', 'hot', 'stormy'],
            fall: ['cloudy', 'rainy', 'clear'],
            winter: ['cold', 'cloudy', 'clear']
        };

        const possibleWeather = seasonWeatherPatterns[gameState.season];
        const newWeather = possibleWeather[Math.floor(Math.random() * possibleWeather.length)];

        if (newWeather !== gameState.weather) {
            setGameState(prev => ({ ...prev, weather: newWeather }));
            return `The weather has changed to ${newWeather}.`;
        }
        return null;
    }, [gameState.season, gameState.weather, setGameState]);

    const progressSeason = useCallback(() => {
        const seasonOrder = ['spring', 'summer', 'fall', 'winter'];
        const currentIndex = seasonOrder.indexOf(gameState.season);
        const nextSeason = seasonOrder[(currentIndex + 1) % seasonOrder.length];

        setGameState(prev => ({ ...prev, season: nextSeason }));
        return `The season has changed to ${nextSeason}.`;
    }, [gameState.season, setGameState]);

    return { updateWeather, progressSeason };
};
