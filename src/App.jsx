import React, { useState, useCallback, useEffect } from 'react';
import { EMOTIONS } from './constants';
import { generatePlaylist, detectEmotionFromImage, detectEmotionFromAudio } from './services/Service';
import EmotionSelector from './components/EmotionSelector';
import PlaylistDisplay from './components/PlaylistDisplay';
import Loader from './components/Loader';
import CameraView from './components/CameraView';
import AudioView from './components/AudioView';
import LibraryView from './components/LibraryView';

const OfflineBanner = () => (<div className="fixed top-0 left-0 right-0 bg-slate-800 border-b border-yellow-500/30 text-center p-2 text-sm text-yellow-300 z-50 flex items-center justify-center shadow-lg" role="status">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728m-2.828-2.828a5 5 0 010-7.072m-2.828-2.828a1 1 0 010-1.414A1 1 0 0111.314 3a1 1 0 011.414 0l.001.001.001.001a1 1 0 010 1.414m-2.828 2.828a1 1 0 010 1.414m-2.829-1.414a5 5 0 000 7.072m-2.828 2.828a9 9 0 0012.728 0M1 1l22 22"/>
        </svg>
        You are currently offline. Some features are unavailable.
    </div>);

const App = () => {
    const [view, setView] = useState('home');
    const [history, setHistory] = useState(['home']);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [currentEmotion, setCurrentEmotion] = useState(null);
    const [playlist, setPlaylist] = useState([]);
    const [userPlaylists, setUserPlaylists] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('emoti_tunes_playlists')) || [];
            return Array.isArray(saved)
                ? saved.map(item => ({
                    ...item,
                    type: item.type || 'playlist',
                    name: item.name || `${item.emotion?.name || 'Saved'} Vibe`,
                    children: item.type === 'folder' ? item.children || [] : undefined
                }))
                : [];
        } catch {
            return [];
        }
    });
    const [, setIsSearchActive] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState(null);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            setError(null);
        };
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        localStorage.setItem('emoti_tunes_playlists', JSON.stringify(userPlaylists));
    }, [userPlaylists]);

    // Navigation Helper
    const navigateTo = useCallback((newView) => {
        if (newView === view) return;
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newView);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        setView(newView);
        setError(null);
        setIsLoading(false);
        if (newView !== 'search') setIsSearchActive(false);
    }, [view, history, historyIndex]);

    const goBack = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setView(history[newIndex]);
        }
    };

    const goForward = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setView(history[newIndex]);
        }
    };

    const handleEmotionSelect = useCallback(async (emotion) => {
        setCurrentEmotion(emotion);
        setLoadingMessage(isOffline ? `Offline mode: using cached ${emotion.name} vibe...` : `Generating ${emotion.name} vibe...`);
        setIsLoading(true);
        setError(null);
        setPlaylist([]);
        navigateTo('playlist');
        try {
            const newPlaylist = await generatePlaylist(emotion.name);
            setPlaylist(newPlaylist);
        }
        catch (err) {
            console.error("Playlist generation error:", err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        }
        finally {
            setIsLoading(false);
        }
    }, [isOffline, navigateTo]);

    const handleReset = useCallback(() => {
        setCurrentEmotion(null);
        setPlaylist([]);
        setError(null);
        setIsLoading(false);
        navigateTo('home');
    }, [navigateTo]);

    const handleSavePlaylist = useCallback(() => {
        if (!playlist.length || !currentEmotion) return;
        const newSavedPlaylist = {
            id: Date.now().toString(),
            type: 'playlist',
            name: `${currentEmotion.name} Vibe ${new Date().toLocaleDateString()}`,
            emotion: currentEmotion,
            songs: [...playlist],
            date: new Date().toLocaleDateString()
        };
        setUserPlaylists(prev => [newSavedPlaylist, ...prev]);
    }, [playlist, currentEmotion]);

    const flattenFolders = (nodes, prefix = '') => {
        return nodes.reduce((acc, node) => {
            if (node.type === 'folder') {
                const label = `${prefix}${node.name}`;
                return [
                    ...acc,
                    { id: node.id, name: label },
                    ...flattenFolders(node.children || [], `${label} / `)
                ];
            }
            return acc;
        }, []);
    };

    const handleAddSongToLibrary = (song, targetFolderId = null) => {
        if (!song?.title) return;
        const newSavedPlaylist = {
            id: Date.now().toString(),
            type: 'playlist',
            name: `${song.title}${song.artist ? ` - ${song.artist}` : ''}`,
            emotion: currentEmotion,
            songs: [{
                id: song.id || Date.now().toString(),
                title: song.title,
                artist: song.artist || 'Unknown Artist',
                youtubeId: song.youtubeId
            }],
            date: new Date().toLocaleDateString()
        };
        setUserPlaylists(prev => addNodeToTree(prev, targetFolderId, newSavedPlaylist));
    };

    const findNodeById = (nodes, nodeId) => {
        for (const node of nodes) {
            if (node.id === nodeId) return node;
            if (node.type === 'folder') {
                const found = findNodeById(node.children || [], nodeId);
                if (found) return found;
            }
        }
        return null;
    };

    const addNodeToTree = (nodes, parentId, newNode) => {
        if (!parentId) return [newNode, ...nodes];
        return nodes.map(node => {
            if (node.type === 'folder') {
                if (node.id === parentId) {
                    return {
                        ...node,
                        children: [newNode, ...(node.children || [])]
                    };
                }
                return {
                    ...node,
                    children: addNodeToTree(node.children || [], parentId, newNode)
                };
            }
            return node;
        });
    };

    const removeNodeFromTree = (nodes, nodeId) => {
        return nodes.reduce((acc, node) => {
            if (node.id === nodeId) return acc;
            if (node.type === 'folder') {
                return [...acc, { ...node, children: removeNodeFromTree(node.children || [], nodeId) }];
            }
            return [...acc, node];
        }, []);
    };

    const renameNodeInTree = (nodes, nodeId, newName) => {
        return nodes.map(node => {
            if (node.id === nodeId) {
                return { ...node, name: newName };
            }
            if (node.type === 'folder') {
                return { ...node, children: renameNodeInTree(node.children || [], nodeId, newName) };
            }
            return node;
        });
    };

    const findNodePath = (nodes, nodeId, currentPath = []) => {
        for (const node of nodes) {
            if (node.id === nodeId) return [...currentPath, node.id];
            if (node.type === 'folder') {
                const path = findNodePath(node.children || [], nodeId, [...currentPath, node.id]);
                if (path) return path;
            }
        }
        return null;
    };

    const moveNodeInTree = (nodes, nodeId, targetFolderId) => {
        if (nodeId === targetFolderId) return nodes;
        const nodeToMove = findNodeById(nodes, nodeId);
        if (!nodeToMove) return nodes;
        if (targetFolderId) {
            const targetPath = findNodePath(nodes, targetFolderId);
            const movingPath = findNodePath(nodes, nodeId);
            if (!targetPath || !movingPath) return nodes;
            if (targetPath.includes(nodeId)) return nodes;
        }
        const withoutNode = removeNodeFromTree(nodes, nodeId);
        return addNodeToTree(withoutNode, targetFolderId, nodeToMove);
    };

    const handleSelectSavedPlaylist = (pl) => {
        setPlaylist(pl.songs);
        setCurrentEmotion(pl.emotion);
        navigateTo('playlist');
    };

    const handleRemovePlaylist = (playlistId) => {
        setUserPlaylists(prev => removeNodeFromTree(prev, playlistId));
    };

    const handleCreateFolder = (folderName, parentId = null) => {
        const newFolder = {
            id: Date.now().toString(),
            type: 'folder',
            name: folderName,
            children: []
        };
        setUserPlaylists(prev => addNodeToTree(prev, parentId, newFolder));
    };

    const handleRenameFolder = (folderId, newName) => {
        setUserPlaylists(prev => renameNodeInTree(prev, folderId, newName));
    };

    const handleMoveItem = (itemId, targetFolderId = null) => {
        setUserPlaylists(prev => moveNodeInTree(prev, itemId, targetFolderId));
    };


    const handleSearch = (query) => {
        setSearchQuery(query);
        if (query.trim().length > 0) {
            setIsSearchActive(true);
            if (view !== 'search') {
                navigateTo('search');
            }
            const results = EMOTIONS.filter(e =>
                e.name.toLowerCase().includes(query.toLowerCase()) || 
                e.description.toLowerCase().includes(query.toLowerCase()) ||
                (e.recommendations && e.recommendations.some(s => 
                    s.title.toLowerCase().includes(query.toLowerCase()) || 
                    s.artist.toLowerCase().includes(query.toLowerCase())
                ))
            );
            setSearchResults(results);
        } else {
            setIsSearchActive(false);
        }
    };

    const handleCapture = useCallback(async (imageData) => {
        setLoadingMessage('Analyzing mood...');
        setIsLoading(true);
        setError(null);
        try {
            const detectedName = await detectEmotionFromImage(imageData); // detectedName will be one of the 7 new emotions
            const matched = EMOTIONS.find(e => e.name.toLowerCase() === detectedName.toLowerCase()) || EMOTIONS[0]; // Search in the updated EMOTIONS
            await handleEmotionSelect(matched);
        } catch (err) {
            setError(err.message);
            setIsLoading(false);
        }
    }, [handleEmotionSelect]);

    const handleAudioCapture = useCallback(async (data) => {
        setLoadingMessage('Analyzing voice...');
        setIsLoading(true);
        setError(null);
        try {
            const detectedName = await detectEmotionFromAudio(data); // detectedName will be one of the 7 new emotions
            const matched = EMOTIONS.find(e => e.name.toLowerCase() === detectedName.toLowerCase()) || EMOTIONS[0]; // Search in the updated EMOTIONS
            await handleEmotionSelect(matched);
        } catch (err) {
            setError(err.message);
            setIsLoading(false);
        }
    }, [handleEmotionSelect]);

    const renderContent = () => {
        if (isLoading) return <Loader message={loadingMessage} emotion={currentEmotion}/>;
        if (error) return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0a0a12] text-center animate-in fade-in duration-500">
                <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-8 border border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.2)] animate-pulse">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                </div>
                <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-4 leading-none">Vibe Interrupted</h2>
                <p className="text-red-400 text-sm font-black uppercase tracking-widest max-w-md opacity-60 mb-10">{error}</p>
                <button onClick={handleReset} className="px-10 py-5 bg-white text-black rounded-2xl font-black uppercase text-xs tracking-[0.3em] hover:scale-105 transition-all shadow-2xl active:scale-95">Reset Vibe Check</button>
            </div>
        );

        switch (view) {
            case 'camera': return <CameraView onCapture={handleCapture} onClose={goBack} onError={setError}/>;
            case 'mic': return <AudioView onCapture={handleAudioCapture} onClose={goBack} onError={setError}/>;
            case 'playlist': return (
                <PlaylistDisplay 
                    playlist={playlist} 
                    emotion={currentEmotion} 
                    onRefresh={handleEmotionSelect} 
                    onReset={handleReset}
                    onSave={handleSavePlaylist}
                    onAddSong={handleAddSongToLibrary}
                    folderOptions={[{ id: null, name: 'Root' }, ...flattenFolders(userPlaylists)]}
                />
            );
            case 'library': return <LibraryView 
                playlists={userPlaylists} 
                onSelectPlaylist={handleSelectSavedPlaylist} 
                onCreateFirstVibe={() => navigateTo('camera')} 
                onRemovePlaylist={handleRemovePlaylist} 
                onCreateFolder={handleCreateFolder}
                onRenameFolder={handleRenameFolder}
                onMoveItem={handleMoveItem}
            />;
            case 'search': return (
                <div className="flex-1 p-10 bg-[#0a0a12] overflow-y-auto">
                    <div className="max-w-5xl mx-auto">
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-8 italic">
                            Results for <span className="text-cyan-400">"{searchQuery}"</span>
                        </h2>
                        
                        {searchResults.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {searchResults.map((emotion) => (
                                    <div 
                                        key={emotion.name}
                                        onClick={() => handleEmotionSelect(emotion)}
                                        className="bg-[#1a1a2e]/40 border border-white/10 p-8 rounded-[2rem] hover:bg-[#1a1a2e] transition-all cursor-pointer group hover:scale-[1.02] active:scale-95"
                                    >
                                        <div className="flex items-center space-x-6">
                                            <div className={`w-16 h-16 rounded-3xl bg-black/40 flex items-center justify-center shadow-2xl group-hover:rotate-6 transition-transform ${emotion.color}`}>
                                                <emotion.icon size={32} />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-xl font-black uppercase tracking-tight text-white">{emotion.name}</h3>
                                                <p className="text-[10px] text-cyan-400/60 font-black uppercase tracking-[0.2em] mt-1 group-hover:text-cyan-400 transition-colors">Start Vibe Session</p>
                                            </div>
                                        </div>
                                        <p className="mt-6 text-xs font-medium text-white/40 leading-relaxed uppercase tracking-wider line-clamp-2">{emotion.description}</p>
                                        

                                        {emotion.recommendations && (
                                            <div className="mt-6 pt-6 border-t border-white/5 space-y-3">
                                                <div className="flex items-center space-x-2">
                                                    <svg className="w-3 h-3 text-cyan-400" fill="currentColor" viewBox="0 0 20 20"><path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3V7.82l8-1.6V11.114A4.369 4.369 0 0015 11c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3V3z"/></svg>
                                                    <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Spotify-style Previews</span>
                                                </div>
                                                <div className="space-y-2">
                                                    {emotion.recommendations.map(song => (
                                                        <div key={song.title} className="flex items-center space-x-3 p-2 rounded-xl hover:bg-white/5 transition-colors group/track">
                                                            <div className="w-8 h-8 bg-black/40 rounded flex items-center justify-center text-cyan-400 group-hover/track:bg-cyan-400 group-hover/track:text-black transition-all">
                                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"/></svg>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[10px] font-bold text-white truncate">{song.title}</p>
                                                                <p className="text-[8px] font-medium text-white/40 truncate uppercase tracking-wider">{song.artist}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-32 opacity-20 text-center">
                                <div className="w-24 h-24 mb-8"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg></div>
                                <p className="font-black uppercase text-sm tracking-[0.4em]">No matching vibes found</p>
                            </div>
                        )}
                    </div>
                </div>
            );
            default: return <EmotionSelector emotions={EMOTIONS} onSelect={handleEmotionSelect} onOpenCamera={() => navigateTo('camera')} onOpenMic={() => navigateTo('mic')} isOffline={isOffline}/>;
        }
    };

    return (
        <div className="flex h-screen bg-black text-white overflow-hidden font-sans">
            {isOffline && <OfflineBanner />}

            {/* Sidebar */}
            <div className="w-72 bg-[#080b1a] border-r border-white/10 flex flex-col pt-10 px-6 z-40 shadow-2xl transition-colors duration-500">
                <div className="flex items-center space-x-4 mb-14 px-2 hover:scale-105 transition-transform cursor-pointer group" onClick={() => navigateTo('home')}>
                    <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-cyan-400 rounded-2xl flex items-center justify-center shadow-[0_10px_30px_rgba(139,92,246,0.3)] group-hover:rotate-12 transition-all">
                        <img src="/logo.png" className="w-7 h-7" alt="" />
                    </div>
                    <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">Emoti<br/><span className="text-cyan-400">Tunes</span></h1>
                </div>

                <nav className="space-y-4 flex-1">
                    <button onClick={() => navigateTo('home')} className={`w-full flex items-center space-x-5 px-5 py-4 rounded-2xl transition-all group ${view === 'home' ? 'bg-white/5 text-cyan-400' : 'text-violet-200/40 hover:text-white hover:bg-white/5'}`}>
                        <div className={`w-6 h-6 ${view === 'home' ? 'text-cyan-400' : 'text-current transition-colors'} group-hover:scale-110`}><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg></div>
                        <span className="font-black uppercase text-xs tracking-[0.2em]">Home</span>
                    </button>
                    <button onClick={() => navigateTo('library')} className={`w-full flex items-center space-x-5 px-5 py-4 rounded-2xl transition-all group ${view === 'library' ? 'bg-white/5 text-cyan-400' : 'text-violet-200/40 hover:text-white hover:bg-white/5'}`}>
                        <div className={`w-6 h-6 ${view === 'library' ? 'text-cyan-400' : 'text-current transition-colors'} group-hover:scale-110`}><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg></div>
                        <span className="font-black uppercase text-xs tracking-[0.2em]">Library</span>
                    </button>
                </nav>


            </div>

            {/* Main Area */}
            <div className="flex-1 flex flex-col relative overflow-hidden h-full">
                {/* Header (Sticky Search Area) */}
                <header className="h-24 px-10 flex items-center justify-between z-50 bg-[#080b1a]/80 backdrop-blur-3xl border-b border-white/10 sticky top-0 left-0 right-0 transition-colors duration-500">
                    <div className="flex items-center space-x-4">
                        <button onClick={goBack} disabled={historyIndex === 0} className="w-12 h-12 rounded-2xl bg-[#1a1a2e] flex items-center justify-center text-white/40 hover:text-white hover:scale-110 active:scale-95 transition-all border border-white/10 shadow-xl disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M15 19l-7-7 7-7"/></svg>
                        </button>
                        <button onClick={goForward} disabled={historyIndex === history.length - 1} className="w-12 h-12 rounded-2xl bg-[#1a1a2e] flex items-center justify-center text-white/40 hover:text-white hover:scale-110 active:scale-95 transition-all border border-white/10 shadow-xl disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M9 5l7 7-7 7"/></svg>
                        </button>
                    </div>


                    <div className="flex items-center space-x-4">
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                placeholder="Search moods, artists, tracks..."
                                className="w-80 min-w-[240px] bg-[#0f1223] border border-white/10 rounded-full py-3 px-5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                            />
                        </div>
                    </div>
                </header>

                <main className="flex-1 w-full bg-[#0a0a12] flex flex-col relative overflow-y-auto scrollbar-hide z-10 transition-all duration-500">
                    <div className="flex-1 flex flex-col min-h-full">
                        {renderContent()}
                    </div>
                </main>
            </div>

        </div>
    );
};

export default App;
