import React from 'react';
import { TRADE_STATUS } from '../data/gameEvents.js';

const TradePanel = ({ tradeOffers, factions, onAcceptTrade, onRejectTrade }) => {
  if (!tradeOffers || tradeOffers.length === 0) {
    return null;
  }

  // Filter for pending offers only
  const pendingOffers = tradeOffers.filter(offer => offer.status === TRADE_STATUS.PENDING);

  if (pendingOffers.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-gray-900 bg-opacity-95 border-2 border-yellow-600 rounded-lg p-4 w-80 z-40 max-h-[600px] overflow-y-auto">
      <h3 className="text-lg font-bold text-yellow-500 mb-3 flex items-center gap-2">
        <span>🤝</span>
        Trade Offers
        <span className="text-sm bg-yellow-600 text-white px-2 py-0.5 rounded-full">
          {pendingOffers.length}
        </span>
      </h3>

      <div className="space-y-3">
        {pendingOffers.map(offer => {
          const fromFaction = factions.find(f => f.id === offer.fromFactionId);
          if (!fromFaction) return null;

          const turnsLeft = offer.expiresAtTurn - offer.createdTurn;

          return (
            <div key={offer.id} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              {/* From Faction */}
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-700">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
                  style={{ backgroundColor: fromFaction.color }}
                >
                  {fromFaction.speciesEmoji || '👤'}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white">{fromFaction.name}</div>
                  <div className="text-xs text-gray-400">
                    Expires in {turnsLeft} turns
                  </div>
                </div>
              </div>

              {/* Offer Details */}
              <div className="space-y-2 mb-3">
                {/* They Offer */}
                <div className="bg-gray-900 rounded p-2">
                  <div className="text-xs text-green-400 font-semibold mb-1">
                    📦 They Offer:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {offer.offering.food > 0 && (
                      <span className="text-xs bg-green-900 text-green-200 px-2 py-1 rounded">
                        🍖 {offer.offering.food}
                      </span>
                    )}
                    {offer.offering.materials > 0 && (
                      <span className="text-xs bg-green-900 text-green-200 px-2 py-1 rounded">
                        🪵 {offer.offering.materials}
                      </span>
                    )}
                    {offer.offering.water > 0 && (
                      <span className="text-xs bg-green-900 text-green-200 px-2 py-1 rounded">
                        💧 {offer.offering.water}
                      </span>
                    )}
                    {offer.offering.knowledge > 0 && (
                      <span className="text-xs bg-green-900 text-green-200 px-2 py-1 rounded">
                        📚 {offer.offering.knowledge}
                      </span>
                    )}
                  </div>
                </div>

                {/* They Request */}
                <div className="bg-gray-900 rounded p-2">
                  <div className="text-xs text-red-400 font-semibold mb-1">
                    📥 They Request:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {offer.requesting.food > 0 && (
                      <span className="text-xs bg-red-900 text-red-200 px-2 py-1 rounded">
                        🍖 {offer.requesting.food}
                      </span>
                    )}
                    {offer.requesting.materials > 0 && (
                      <span className="text-xs bg-red-900 text-red-200 px-2 py-1 rounded">
                        🪵 {offer.requesting.materials}
                      </span>
                    )}
                    {offer.requesting.water > 0 && (
                      <span className="text-xs bg-red-900 text-red-200 px-2 py-1 rounded">
                        💧 {offer.requesting.water}
                      </span>
                    )}
                    {offer.requesting.knowledge > 0 && (
                      <span className="text-xs bg-red-900 text-red-200 px-2 py-1 rounded">
                        📚 {offer.requesting.knowledge}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => onAcceptTrade(offer.id)}
                  className="flex-1 bg-green-700 hover:bg-green-600 text-white py-2 px-3 rounded-lg text-sm font-semibold transition-colors"
                >
                  ✅ Accept
                </button>
                <button
                  onClick={() => onRejectTrade(offer.id)}
                  className="flex-1 bg-red-700 hover:bg-red-600 text-white py-2 px-3 rounded-lg text-sm font-semibold transition-colors"
                >
                  ❌ Reject
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TradePanel;
