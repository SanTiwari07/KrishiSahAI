import React from 'react';
import { MessageSquare, Plus, Trash2, X } from 'lucide-react';
import { ChatSession } from '../pages/Chatbot';

interface ChatSidebarProps {
    chats: ChatSession[];
    activeChatId: string | null;
    onSelectChat: (id: string) => void;
    onNewChat: () => void;
    onDeleteChat: (id: string, title: string) => void;
    isOpen: boolean;
    onClose: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
    chats,
    activeChatId,
    onSelectChat,
    onNewChat,
    onDeleteChat,
    isOpen,
    onClose
}) => {
    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Container */}
            <div className={`
                absolute md:relative inset-y-0 left-0 z-40
                w-[280px] lg:w-[320px] bg-[#F5F8F8] border-r border-[#E0E6E6]
                transform transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                flex flex-col h-full
            `}>
                {/* Header */}
                <div className="p-4 border-b border-[#E0E6E6] flex items-center justify-between">
                    <button
                        onClick={() => {
                            onNewChat();
                            if (window.innerWidth < 768) onClose();
                        }}
                        className="flex-1 flex items-center justify-center gap-2 bg-[#043744] text-white px-4 py-3 rounded-xl hover:bg-[#000D0F] transition-all shadow-md font-bold"
                    >
                        <Plus className="w-5 h-5" />
                        <span>New Chat</span>
                    </button>
                    <button
                        onClick={onClose}
                        className="md:hidden p-2 text-[#6B7878] hover:bg-white rounded-lg ml-2"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Chat List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {chats.length === 0 ? (
                        <div className="text-center text-[#6B7878] mt-8 text-sm px-4">
                            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No chat history</p>
                            <p className="text-xs mt-1 opacity-60">Start a new conversation to get advice</p>
                        </div>
                    ) : (
                        chats.map((chat) => (
                            <div
                                key={chat.id}
                                className={`
                                    group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border
                                    ${activeChatId === chat.id
                                        ? 'bg-white border-[#E0E6E6] shadow-sm'
                                        : 'bg-transparent border-transparent hover:bg-white/50 hover:border-[#E0E6E6]'}
                                `}
                                onClick={() => {
                                    onSelectChat(chat.id);
                                    if (window.innerWidth < 768) onClose();
                                }}
                            >
                                <MessageSquare className={`w-5 h-5 flex-shrink-0 ${activeChatId === chat.id ? 'text-[#043744]' : 'text-[#6B7878]'}`} />
                                <div className="flex-1 min-w-0">
                                    <h3 className={`text-sm font-medium truncate ${activeChatId === chat.id ? 'text-[#000D0F]' : 'text-[#6B7878]'}`}>
                                        {chat.title}
                                    </h3>
                                    <p className="text-xs text-[#6B7878] opacity-70">
                                        {new Date(chat.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteChat(chat.id, chat.title);
                                    }}
                                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Delete chat"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer/Profile */}
                <div className="p-4 border-t border-[#E0E6E6] bg-[#FAFCFC]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#043744] flex items-center justify-center text-white font-bold text-xs">
                            FG
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-[#000D0F] truncate">Farmer Guest</p>
                            <p className="text-xs text-[#6B7878]">Free Plan</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
