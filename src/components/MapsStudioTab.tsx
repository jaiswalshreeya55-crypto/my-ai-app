import React, { useState } from 'react';
import {
  MapPin,
  Search,
  ExternalLink,
  Navigation,
  Sparkles,
  RefreshCw,
  Compass,
  Star,
  Map as MapIcon,
  Bookmark,
  Check,
} from 'lucide-react';
import { User, db } from '../firebase.ts';
import { doc, setDoc } from 'firebase/firestore';
import { MarkdownRenderer } from '../utils/markdown.tsx';
import { MapPlace } from '../types.ts';

interface MapsStudioTabProps {
  user: User | null;
  onSaveCreation?: (item: any) => void;
}

const SAMPLE_MAP_QUERIES = [
  'What are the best specialty coffee shops and quiet cafes near Tokyo Station?',
  'Top rated authentic Italian pasta restaurants with outdoor seating in San Francisco',
  'Scenic hiking trails and viewpoints near Banff National Park',
  'Best art museums, contemporary galleries, and cultural centers in Paris',
];

export const MapsStudioTab: React.FC<MapsStudioTabProps> = ({ user, onSaveCreation }) => {
  const [query, setQuery] = useState('');
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [responseMarkdown, setResponseMarkdown] = useState<string | null>(null);
  const [places, setPlaces] = useState<MapPlace[]>([]);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setUseCurrentLocation(true);
        },
        (err) => {
          console.warn('Geolocation error:', err);
          setError('Could not retrieve current location. Searching globally.');
        }
      );
    }
  };

  const handleSearch = async (targetQuery?: string) => {
    const q = targetQuery || query;
    if (!q.trim()) return;

    try {
      setIsLoading(true);
      setError(null);
      setResponseMarkdown(null);
      setPlaces([]);
      setSavedSuccess(false);

      const res = await fetch('/api/maps-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q.trim(),
          latLng: useCurrentLocation && coords ? coords : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to search places with Google Maps');
      }

      setResponseMarkdown(data.text);
      setPlaces(data.places || []);
    } catch (err: any) {
      console.error('Maps Grounding error:', err);
      setError(err?.message || 'Error executing Google Maps grounding search');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToFirestore = async () => {
    if (!responseMarkdown || !user) return;
    try {
      const creationId = `map-${Date.now()}`;
      const creationRef = doc(db, 'users', user.uid, 'creations', creationId);
      const payload = {
        id: creationId,
        userId: user.uid,
        type: 'maps',
        title: query.slice(0, 50),
        prompt: query.trim(),
        metadata: JSON.stringify({ placesCount: places.length, model: 'gemini-3.5-flash' }),
        createdAt: new Date().toISOString(),
      };
      await setDoc(creationRef, payload);
      setSavedSuccess(true);
      if (onSaveCreation) onSaveCreation(payload);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      console.error('Save to Firestore error:', err);
      setError('Could not save to Firestore: ' + err.message);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Banner */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-emerald-800 via-teal-800 to-indigo-900 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold mb-3">
              <MapPin className="w-3.5 h-3.5 text-emerald-300" />
              <span>gemini-3.5-flash (with googleMaps tool)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Google Maps Grounding Studio</h2>
            <p className="text-teal-100 text-sm mt-1 max-w-xl">
              Real-time geospatial intelligence, verified venue locations, reviews, and interactive Google Maps links powered directly by Gemini Maps tools.
            </p>
          </div>
        </div>
      </div>

      {/* Search Input Card */}
      <div className="rounded-2xl border border-teal-100 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="E.g., Find the highest rated ramen shops with late night hours in Kyoto..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-teal-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </div>

          <button
            type="button"
            onClick={handleGetLocation}
            className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              useCurrentLocation
                ? 'bg-teal-50 border-teal-400 text-teal-700'
                : 'border-slate-200 hover:bg-slate-50 text-slate-600'
            }`}
            title="Use device coordinates for proximity retrieval"
          >
            <Navigation className={`w-3.5 h-3.5 ${useCurrentLocation ? 'text-teal-600' : ''}`} />
            <span>{useCurrentLocation ? 'Near Me Active' : 'Use My GPS'}</span>
          </button>

          <button
            onClick={() => handleSearch()}
            disabled={isLoading || !query.trim()}
            className="px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md hover:from-teal-700 hover:to-emerald-700 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Grounding with Maps...</span>
              </>
            ) : (
              <>
                <Compass className="w-4 h-4" />
                <span>Search Maps</span>
              </>
            )}
          </button>
        </div>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap gap-2 pt-1">
          {SAMPLE_MAP_QUERIES.map((sq, i) => (
            <button
              key={i}
              onClick={() => {
                setQuery(sq);
                handleSearch(sq);
              }}
              className="text-xs px-3 py-1.5 rounded-full border border-teal-100 bg-teal-50/60 hover:bg-teal-100 text-teal-800 transition"
            >
              📍 {sq}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            {error}
          </div>
        )}
      </div>

      {/* Results View */}
      {responseMarkdown && (
        <div className="space-y-6">
          {/* Grounded Venue Cards extracted from groundingChunks */}
          {places.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Verified Google Maps Locations ({places.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {places.map((place, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-teal-100 bg-white hover:border-teal-300 shadow-xs hover:shadow-sm transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{place.title}</h4>
                        <span className="p-1 rounded-md bg-emerald-50 text-emerald-700">
                          <MapIcon className="w-3.5 h-3.5" />
                        </span>
                      </div>
                      {place.snippet && (
                        <p className="text-xs text-slate-500 line-clamp-2 italic mb-3">
                          "{place.snippet}"
                        </p>
                      )}
                    </div>
                    <a
                      href={place.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs transition"
                    >
                      <span>Open on Google Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Gemini Insights */}
          <div className="rounded-2xl border border-teal-100 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-teal-50 pb-3">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Geospatial Report & Details
              </span>
              {user && (
                <button
                  onClick={handleSaveToFirestore}
                  disabled={savedSuccess}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    savedSuccess
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {savedSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Saved to Firestore</span>
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>Save Location Findings</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <MarkdownRenderer content={responseMarkdown} />
          </div>
        </div>
      )}
    </div>
  );
};
