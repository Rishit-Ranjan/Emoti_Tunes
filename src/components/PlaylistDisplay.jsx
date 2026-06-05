import React, { useState } from 'react';

const PlaylistDisplay = ({ playlist, emotion, onRefresh, onSave, onAddSong, folderOptions = [] }) => {
    const [selectedFolderId, setSelectedFolderId] = useState(null);

    const handleAddSong = (song) => {
        if (onAddSong) onAddSong(song, selectedFolderId);
    };

    const getYouTubeLink = (song) => song?.youtubeId ? `https://youtube.com/watch?v=${song.youtubeId}` : null;
    const getSpotifyLink = (song) => `https://open.spotify.com/search/${encodeURIComponent(song?.title + ' ' + (song?.artist || ''))}`;

    const handleRefresh = () => {
        if (onRefresh) onRefresh(emotion);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="pt-8 pb-6 px-8 md:px-12 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl ${emotion?.color || 'bg-violet-600'}`}>
                        <emotion.icon size={24} />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-white leading-none">{emotion?.name || 'Vibe Playlist'}</h1>
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-violet-400">{playlist.length} Sonic Elements</p>
                    </div>
                </div>
                <button 
                    onClick={handleRefresh}
                    className="group flex items-center space-x-2 px-6 py-3 bg-white/5 backdrop-blur-sm hover:bg-white/10 border border-white/20 hover:border-cyan-400 rounded-2xl text-sm font-black uppercase tracking-[0.2em] text-white hover:text-cyan-400 shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_30px_rgba(34,211,238,0.2)] transition-all duration-300 hover:scale-[1.05] active:scale-95"
                    title="Generate New Playlist"
                >
                    <svg className="w-4 h-4 group-hover:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                    <span>New Vibe</span>
                </button>
                <button
                    onClick={onSave}
                    disabled={!playlist || playlist.length === 0}
                    className="group flex items-center space-x-2 px-6 py-3 bg-cyan-600/10 hover:bg-cyan-600/20 border border-cyan-400/20 rounded-2xl text-sm font-black uppercase tracking-[0.2em] text-cyan-200 hover:text-white transition-all duration-300 disabled:opacity-40"
                >
                    <span>Save</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-4">
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-[40px_1fr_1fr] md:grid-cols-[40px_3fr_2fr_140px] gap-6 text-sm font-black uppercase tracking-[0.3em] text-white/50 mb-6">
                        <div>#</div>
                        <div>Title</div>
                        <div className="hidden md:block">Artist</div>
                        <div className="text-right">Listen</div>
                    </div>
                    {folderOptions.length > 0 && (
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs uppercase tracking-[0.2em] text-white/70 mb-4">
                            <div className="font-black text-white/60">Add selected songs to</div>
                            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#12121e] px-3 py-2 text-xs text-white">
                                <span className="hidden sm:inline">Folder</span>
                                <select
                                    value={selectedFolderId ?? ''}
                                    onChange={(e) => setSelectedFolderId(e.target.value || null)}
                                    className="bg-transparent outline-none"
                                >
                                    {folderOptions.map(folder => (
                                        <option key={folder.id ?? 'root'} value={folder.id ?? ''}>
                                            {folder.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    )}
                </div>
                
                {playlist.map((song, index) => (
                    <div key={index} className="group bg-white/5 backdrop-blur-sm hover:bg-white/10 border border-white/10 hover:border-cyan-400/50 rounded-2xl p-6 md:p-8 transition-all duration-300 hover:shadow-[0_10px_40px_rgba(0,0,0,0.3)] hover:scale-[1.02] cursor-pointer">
                        <div className="grid grid-cols-[40px_1fr_1fr_140px] md:gap-8 items-center h-full">
                            <div className="text-center font-black text-xl text-cyan-400">{index + 1}</div>
                            <div className="space-y-1">
                                <div className="text-xl md:text-2xl font-black text-white truncate leading-tight">{song.title}</div>
                                <div className="text-xs font-black uppercase tracking-wider text-violet-300">{song.artist}</div>
                            </div>
                            <div className="text-xs font-black text-white/60 uppercase tracking-wider truncate">AI Vibe Match</div>
                            <div className="flex space-x-3 justify-end">
                                {getYouTubeLink(song) && (
                                    <a href={getYouTubeLink(song)} target="_blank" rel="noopener noreferrer" className="group/link flex items-center space-x-1 px-4 py-2.5 bg-gradient-to-r from-red-600/20 to-red-500/20 backdrop-blur-sm border border-red-400/30 hover:border-red-400 hover:from-red-600/40 hover:to-red-500/40 text-xs font-black uppercase tracking-[0.2em] text-white hover:text-red-200 shadow-[0_4px_20px_rgba(239,68,68,0.2)] hover:shadow-[0_8px_30px_rgba(239,68,68,0.3)] transition-all duration-300 hover:scale-105 active:scale-95 rounded-xl" title={`YouTube: ${song.title}`}>
                                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.433L15.818 12zm-1.36-7.415L15.818 12 8.185 15.568V8.153z"/></svg>
                                        <span>Play</span>
                                    </a>
                                )}
                                <a href={getSpotifyLink(song)} target="_blank" rel="noopener noreferrer" className="group/link flex items-center px-4 py-2.5 bg-gradient-to-r from-green-600/20 to-green-500/20 backdrop-blur-sm border border-green-400/30 hover:border-green-400 hover:from-green-600/40 hover:to-green-500/40 text-xs font-black uppercase tracking-[0.2em] text-white hover:text-green-200 shadow-[0_4px_20px_rgba(34,197,94,0.2)] hover:shadow-[0_8px_30px_rgba(34,197,94,0.3)] transition-all duration-300 hover:scale-105 active:scale-95 rounded-xl" title={`Spotify: ${song.title}`}>
                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.5 17.3c-.2.3-.5.4-.8.2-2.7-1.7-6.2-2.1-10.2-1.2-.4.1-.7-.2-.8-.5-.1-.4.2-.7.5-.8 4.3-1 8.2-.5 11.3 1.4.3.2.4.6.2.9zm1.5-3.3c-.3.4-.8.5-1.2.3-3.1-1.9-7.8-2.5-11.5-1.3-.5.1-1-.2-1.1-.7-.1-.5.2-1 .7-1.1 4.2-1.3 9.4-.6 13 1.6.4.2.5.8.1 1.2zm.1-3.4C15.1 8.2 8.4 8 4.5 9.2c-.6.2-1.2-.2-1.4-.7-.2-.6.2-1.2.7-1.4 4.4-1.3 11.7-1.1 16.3 1.6.5.3.7 1 .4 1.5-.3.5-1 .7-1.5.4z"/>
                                    </svg>
                                    <span>Spotify</span>
                                </a>
                                {onAddSong && (
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            handleAddSong(song);
                                        }}
                                        className="inline-flex items-center px-4 py-2.5 bg-white/10 border border-white/15 text-xs font-black uppercase tracking-[0.2em] text-white hover:bg-white/15 transition-all duration-300 hover:scale-[1.02] rounded-xl"
                                    >
                                        Add
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PlaylistDisplay;
