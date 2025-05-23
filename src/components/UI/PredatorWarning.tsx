// Fix 1: PredatorWarning.tsx - correct JSX syntax errors
const PredatorWarning: React.FC<PredatorWarningProps> = ({ nearbyPredators, darkMode }) => {
    // Skip rendering if no predators
    if (!nearbyPredators || nearbyPredators.length === 0) {
        return null;
    }

    // Sort predators by threat level
    const sortedPredators = [...nearbyPredators].sort((a, b) => {
        if (a.distance !== b.distance) return a.distance - b.distance;
        return b.threatLevel - a.threatLevel;
    });

    // Get highest threat level for warning color
    const highestThreat = sortedPredators.reduce(
        (max, pred) => Math.max(max, pred.threatLevel),
        1
    );

    // Get threat level info
    const threatInfo = ThreatLevels[highestThreat];

    return (
        <div className="fixed top-4 right-4 z-50 animate-pulse">
            <div className={`bg-${threatInfo.color} bg-opacity-90 text-white px-4 py-2 rounded-lg shadow-lg border border-white border-opacity-50`}>
                <div className="flex items-center mb-1">
                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h3 className="font-bold text-lg">Predator Alert: {threatInfo.name} Threat</h3>
                </div>

                <div className="mb-2">
                    <p>{sortedPredators[0].creature.info.name} {sortedPredators[0].distance <= 1 ? 'in your tile!' : 'nearby!'}</p>
                </div>

                {sortedPredators.length > 1 && (
                    <div className="text-sm opacity-80">
                        <p>+ {sortedPredators.length - 1} more predators in the area</p>
                    </div>
                )}
            </div>
        </div>
    );
};