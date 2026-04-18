import React from 'react';
import { MessageSquare, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { ChatSession } from '../src/services/chatService';
import { useLanguage } from '../src/context/LanguageContext';

interface ChatSidebarProps {
    chats: ChatSession[];
    activeChatId: string | null;
    onSelectChat: (id: string) => void;
    onNewChat: () => void;
    onDeleteChat: (chatId: string, chatTitle: string) => void;
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
    const { t } = useLanguage();

    return (
        <>
            {/* Dim overlay — all breakpoints so desktop can tap outside to close; sidebar sits above */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[105] bg-black/50"
                    onClick={onClose}
                    aria-hidden
                />
            )}

            {/* Sidebar Container — slides over content (covers header hamburger); Back always visible */}
            <div
                className={`
                fixed inset-y-0 left-0 z-[110] flex h-full w-[280px] flex-col border-r border-[#E0E6E6] bg-white
                transition-transform duration-300 ease-in-out md:w-72
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}
            >
                <div className="border-b border-[#E0E6E6] p-3 sm:p-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex w-full items-center gap-2 rounded-xl px-2 py-2.5 text-[#002105] transition-colors hover:bg-stone-100 sm:w-auto sm:px-3"
                        aria-label={t.common.back}
                    >
                        <ArrowLeft className="h-5 w-5 shrink-0" />
                        <span className="text-sm font-bold">{t.common.back}</span>
                    </button>
                    <h2 className="mt-1 text-center text-base font-bold text-[#002105] sm:mt-2 sm:text-lg">
                        {t.chat.sidebarTitle}
                    </h2>
                </div>

                <div className="p-4">
                    <button
                        onClick={() => {
                            onNewChat();
                            onClose();
                        }}
                        className="w-full flex items-center justify-center gap-2 p-3 bg-[#1B5E20] text-white rounded-xl hover:bg-[#1B5E20]/90 transition-colors font-medium"
                    >
                        <Plus className="w-5 h-5" />
                        New Chat
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {chats.length === 0 ? (
                        <p className="text-center text-sm text-stone-500 mt-4">No recent chats</p>
                    ) : (
                        chats.map(chat => (
                            <div 
                                key={chat.id}
                                className={`
                                    group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors
                                    ${activeChatId === chat.id 
                                        ? 'bg-[#E8F5E9] text-[#1B5E20]' 
                                        : 'hover:bg-stone-50 text-stone-700'
                                    }
                                `}
                                onClick={() => {
                                    onSelectChat(chat.id);
                                    onClose();
                                }}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <MessageSquare className={`w-5 h-5 flex-shrink-0 ${activeChatId === chat.id ? 'text-[#1B5E20]' : 'text-stone-400'}`} />
                                    <span className="truncate text-sm font-medium">
                                        {chat.title || 'New Chat'}
                                    </span>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteChat(chat.id, chat.title || 'New Chat');
                                        onClose(); // Optional: close sidebar on delete? Maybe not.
                                    }}
                                    className="p-1.5 md:opacity-0 md:group-hover:opacity-100 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                    title="Delete chat"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    );
};
