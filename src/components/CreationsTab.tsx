import React, { useState, useEffect } from 'react';
import {
  Bookmark,
  Image as ImageIcon,
  Film,
  Music,
  MapPin,
  MessageSquare,
  Sparkles,
  Trash2,
  ExternalLink,
  Download,
  Filter,
  Cloud,
} from 'lucide-react';
import { User, db } from '../firebase.ts';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { UserCreationItem } from '../types.ts';

interface CreationsTabProps {
  user: User | null;
}

export const CreationsTab: React.FC<CreationsTabProps> = ({ user }) => {
  const [creations, setCreations] = useState<UserCreationItem[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setCreations([]);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'users', user.uid, 'creations'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: UserCreationItem[] = [];
        snapshot.forEach((doc) => {
          items.push(doc.data() as UserCreationItem);
        });
        setCreations(items);
        setLoading(false);
      },
      (error) => {
        console.warn('Firestore creations snapshot error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'creations', id));
    } catch (e) {
      console.warn('Delete error:', e);
    }
  };

  const filteredCreations =
    filterType === 'all'
      ? creations
      : creations.filter((item) => item.type === filterType);

  const getIconForType = (type: string) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="w-4 h-4 text-purple-600" />;
      case 'video':
        return <Film className="w-4 h-4 text-indigo-600" />;
      case 'music':
        return <Music className="w-4 h-4 text-fuchsia-600" />;
      case 'maps':
        return <MapPin className="w-4 h-4 text-teal-600" />;
      case 'chat':
        return <MessageSquare className="w-4 h-4 text-blue-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-purple-600" />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-purple-950 to-indigo-950 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-purple-300 text-xs font-semibold mb-3">
              <Cloud className="w-3.5 h-3.5" />
              <span>Firebase Firestore Persistence</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Your Studio Creations</h2>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              All your AI-generated visuals, Veo animations, Lyria music, and grounded solutions saved securely in your personal cloud collection.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap items-center gap-2 pb-1">
        {['all', 'image', 'video', 'music', 'maps', 'chat'].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize transition ${
              filterType === type
                ? 'bg-purple-600 text-white shadow-xs'
                : 'border border-purple-100 bg-white text-slate-600 hover:bg-purple-50'
            }`}
          >
            {type === 'all' ? 'All Creations' : type}
          </button>
        ))}
      </div>

      {!user ? (
        <div className="rounded-3xl border border-purple-100 bg-white p-12 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
            <Bookmark className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Sign in to Access Persistent Creations</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Connect your Google account via the button in the top right to store and retrieve your generated videos, images, and music tracks anywhere.
          </p>
        </div>
      ) : loading ? (
        <div className="rounded-3xl border border-purple-100 bg-white p-12 text-center text-slate-500 text-xs">
          Loading your saved creations from Firestore...
        </div>
      ) : filteredCreations.length === 0 ? (
        <div className="rounded-3xl border border-purple-100 bg-white p-12 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-700">No creations saved under "{filterType}" yet</p>
          <p className="text-xs text-slate-400">
            Generate an image, video, music clip, or chat session and click "Save to Firestore"!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCreations.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-purple-100 bg-white p-4 shadow-xs hover:border-purple-300 transition flex flex-col justify-between space-y-3 group"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px]">
                    {getIconForType(item.type)}
                    <span>{item.type}</span>
                  </div>
                  <span className="text-[10px]">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{item.title}</h4>
                <p className="text-xs text-slate-500 line-clamp-2 mt-1">{item.prompt}</p>

                {item.outputUrl && item.type === 'image' && (
                  <div className="mt-3 rounded-xl overflow-hidden border border-purple-100 bg-slate-50">
                    <img src={item.outputUrl} alt={item.title} className="w-full h-36 object-cover" />
                  </div>
                )}

                {item.outputUrl && item.type === 'video' && (
                  <div className="mt-3 rounded-xl overflow-hidden bg-black">
                    <video src={item.outputUrl} controls className="w-full h-36 object-contain" />
                  </div>
                )}

                {item.outputUrl && item.type === 'music' && (
                  <div className="mt-3 p-2 rounded-xl bg-purple-50/50 border border-purple-100">
                    <audio src={item.outputUrl} controls className="w-full h-8" />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-purple-50">
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-xs text-slate-400 hover:text-rose-600 flex items-center gap-1 transition"
                  title="Delete from Firestore"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>

                {item.outputUrl && (
                  <a
                    href={item.outputUrl}
                    download={`ai-studio-${item.type}-${item.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
