import React, { useMemo, useState } from 'react';

const LibraryView = ({ playlists, onSelectPlaylist, onCreateFirstVibe, onRemovePlaylist, onCreateFolder, onRenameFolder, onMoveItem }) => {
    const [path, setPath] = useState([]);
    const [moveItemId, setMoveItemId] = useState(null);

    const findFolderByPath = (items, pathIds) => {
        let current = null;
        let children = items;
        for (const id of pathIds) {
            const next = children.find(entry => entry.id === id && entry.type === 'folder');
            if (!next) return null;
            current = next;
            children = next.children || [];
        }
        return current;
    };

    const currentFolder = useMemo(() => findFolderByPath(playlists, path), [playlists, path]);
    const currentItems = currentFolder ? currentFolder.children || [] : playlists;

    const breadcrumbNodes = useMemo(() => {
        const crumbs = [{ id: null, name: 'Root' }];
        let children = playlists;
        for (const id of path) {
            const next = children.find(entry => entry.id === id && entry.type === 'folder');
            if (!next) break;
            crumbs.push({ id: next.id, name: next.name });
            children = next.children || [];
        }
        return crumbs;
    }, [playlists, path])

    const countNodes = (items) => {
        return items.reduce((sum, node) => {
            if (node.type === 'folder') {
                return sum + 1 + countNodes(node.children || []);
            }
            return sum + 1;
        }, 0);
    };

    const totalCount = countNodes(playlists);
    const currentFolderTitle = currentFolder ? currentFolder.name : 'Root Library';

    const revealFolder = (folderId) => {
        setPath(prev => [...prev, folderId]);
        setMoveItemId(null);
    };

    const jumpToBreadcrumb = (index) => {
        setPath(prev => prev.slice(0, index));
        setMoveItemId(null);
    };

    const handleCreateFolderClick = () => {
        const name = window.prompt('Folder name');
        if (!name?.trim()) return;
        onCreateFolder(name.trim(), currentFolder?.id || null);
    };

    const handleRenameFolderClick = () => {
        if (!currentFolder) return;
        const name = window.prompt('New folder name', currentFolder.name);
        if (!name?.trim()) return;
        onRenameFolder(currentFolder.id, name.trim());
    };

    const handleMoveHereClick = () => {
        if (!moveItemId) return;
        onMoveItem(moveItemId, currentFolder?.id || null);
        setMoveItemId(null);
    };

    const renderActionButtons = (item) => {
        return (
            <div className="mt-4 flex flex-wrap gap-3">
                {item.type === 'playlist' ? (
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onSelectPlaylist(item);
                        }}
                        className="inline-flex items-center justify-center rounded-full border border-cyan-500/20 bg-cyan-500/10 text-cyan-300 text-[10px] font-black uppercase tracking-[0.25em] px-4 py-3 transition hover:bg-cyan-500/20"
                    >
                        Open
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            revealFolder(item.id);
                        }}
                        className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 text-white text-[10px] font-black uppercase tracking-[0.25em] px-4 py-3 transition hover:bg-white/10"
                    >
                        Open Folder
                    </button>
                )}
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onRemovePlaylist(item.id);
                    }}
                    className="inline-flex items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 text-red-300 text-[10px] font-black uppercase tracking-[0.25em] px-4 py-3 transition hover:bg-red-500/20"
                >
                    Remove
                </button>
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        setMoveItemId(item.id);
                    }}
                    className="inline-flex items-center justify-center rounded-full border border-violet-500/20 bg-violet-500/10 text-violet-200 text-[10px] font-black uppercase tracking-[0.25em] px-4 py-3 transition hover:bg-violet-500/20"
                >
                    {moveItemId === item.id ? 'Moving...' : 'Move'}
                </button>
                {item.type === 'folder' && (
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            const name = window.prompt('Rename folder', item.name);
                            if (!name?.trim()) return;
                            onRenameFolder(item.id, name.trim());
                        }}
                        className="inline-flex items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-200 text-[10px] font-black uppercase tracking-[0.25em] px-4 py-3 transition hover:bg-amber-500/20"
                    >
                        Rename
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="flex-1 overflow-y-auto bg-[#0a0a12] animate-in fade-in duration-700">
            <div className="pt-32 pb-12 px-8">
                <div className="flex flex-col gap-6 md:flex-row md:items-end justify-between mb-12">
                    <div>
                        <h2 className="text-6xl md:text-8xl font-black text-white tracking-tighter uppercase leading-none mb-4 drop-shadow-2xl">Your Library</h2>
                        <div className="flex flex-wrap items-center gap-3 text-cyan-400 font-bold uppercase tracking-[0.2em] text-xs">
                            <span className="w-8 h-1 bg-cyan-600 rounded-full"></span>
                            <span>{totalCount} Library Items</span>
                            <span>&bull;</span>
                            <span>{currentItems.length} items in {currentFolderTitle}</span>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={handleCreateFolderClick}
                            className="bg-violet-600 hover:bg-violet-500 text-white font-black px-6 py-2 rounded-full uppercase tracking-[0.2em] text-xs transition-all shadow-[0_15px_40px_rgba(139,92,246,0.3)]"
                        >
                            New Folder
                        </button>
                        {currentFolder && (
                            <button
                                onClick={handleRenameFolderClick}
                                className="bg-amber-500/90 hover:bg-amber-400 text-black font-black px-5 py-3 rounded-full uppercase tracking-[0.2em] text-xs transition-all shadow-[0_15px_40px_rgba(251,191,36,0.3)]"
                            >
                                Rename Folder
                            </button>
                        )}
                        <button
                            onClick={onCreateFirstVibe}
                            className="bg-cyan-500 hover:bg-cyan-400 text-black font-black px-6 py-3 rounded-full uppercase tracking-[0.2em] text-xs transition-all shadow-[0_15px_40px_rgba(34,211,238,0.3)]"
                        >
                            Create Vibe
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-10 text-[10px] uppercase tracking-[0.3em] font-black text-white/40">
                    {breadcrumbNodes.map((crumb, index) => (
                        <button
                            key={crumb.id ?? 'root'}
                            type="button"
                            onClick={() => jumpToBreadcrumb(index)}
                            className="inline-flex items-center gap-2 text-white/70 hover:text-white"
                        >
                            {index > 0 && <span>/</span>}
                            {crumb.name}
                        </button>
                    ))}
                </div>

                {moveItemId && (
                    <div className="mb-8 rounded-[2rem] border border-violet-500/30 bg-violet-500/10 p-6 text-sm text-violet-100">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <span className="font-black uppercase tracking-[0.2em]">Move mode active</span>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleMoveHereClick}
                                    className="rounded-full bg-cyan-500 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-black hover:bg-cyan-400 transition"
                                >
                                    Move Here
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMoveItemId(null)}
                                    className="rounded-full border border-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-white hover:bg-white/10 transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {currentItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-6 bg-white/5 rounded-[3rem] border-2 border-dashed border-white/5">
                        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center text-white/20">
                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                        </div>
                        <div className="text-center">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight">Empty folder</h3>
                            <p className="text-white/40 font-bold uppercase tracking-widest text-[10px] mt-2 leading-relaxed">Add playlists or folders to organize your vibes.</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {currentItems.map(item => (
                            <div key={item.id} className="group bg-[#12121e] p-6 rounded-[2.5rem] hover:bg-[#1a1a2e] transition-all shadow-xl border border-white/5 hover:border-violet-500/30">
                                <div className="relative overflow-hidden rounded-3xl mb-6 bg-[#0a0a12] shadow-2xl">
                                    <div className="w-full aspect-square bg-gradient-to-br from-violet-700/20 to-cyan-700/10 flex items-center justify-center text-white/40">
                                        <span className="text-5xl">{item.type === 'folder' ? '📁' : '🎶'}</span>
                                    </div>
                                    <div className="absolute top-4 left-4 rounded-full bg-black/60 px-3 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-white/80 border border-white/10">
                                        {item.type}
                                    </div>
                                </div>
                                <h3 className="font-black text-white uppercase tracking-tight text-xl truncate leading-none mb-2">{item.name}</h3>
                                {item.type === 'playlist' && (
                                    <p className="text-[10px] font-black text-violet-300/30 uppercase tracking-[0.2em] mb-4">{item.songs.length} tracks</p>
                                )}
                                {item.type === 'folder' && (
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4">{item.children?.length || 0} items inside</p>
                                )}
                                {renderActionButtons(item)}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LibraryView;
