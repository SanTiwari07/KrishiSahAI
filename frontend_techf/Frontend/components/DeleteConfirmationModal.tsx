import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    chatTitle: string;
    isDeleting: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    chatTitle,
    isDeleting
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full translate-x-12 -translate-y-12 z-0" />

                <div className="relative z-10">
                    <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-4">
                        <AlertTriangle className="w-6 h-6" />
                    </div>

                    <h3 className="text-xl font-bold text-[#000D0F] mb-2">Delete Chat?</h3>
                    <p className="text-[#6B7878] text-sm mb-6 leading-relaxed">
                        Are you sure you want to delete <span className="font-bold text-[#000D0F]">"{chatTitle}"</span>? This action cannot be undone.
                    </p>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={isDeleting}
                            className="flex-1 py-3 px-4 bg-[#F5F8F8] text-[#6B7878] font-bold rounded-xl hover:bg-[#E0E6E6] transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isDeleting}
                            className="flex-1 py-3 px-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isDeleting ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4" />
                                    <span>Delete</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
