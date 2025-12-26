import { Clock, Monitor, User, AlertTriangle, CheckCircle2 } from 'lucide-react';

const TicketSidebar = ({ ticket, user, handleEscalate, setIsCloseModalOpen }) => {
    return (
        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto hidden lg:block h-full">
            <div className="p-6 space-y-8">
                {/* Status Card */}
                <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Current Status</h3>
                    <div className="bg-white border boundary-gray-100 rounded-xl p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">Priority</span>
                            <span className={`text-xs font-bold px-2 py-1 rounded bg-red-100 text-red-600`}>
                                {ticket.priority.toUpperCase()}
                            </span>
                        </div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-red-500 h-full w-3/4"></div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Response time SLA: &lt; 2h</p>
                    </div>
                </div>

                {/* Ticket Info */}
                <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Ticket Details</h3>
                    <ul className="space-y-4">
                        <li className="flex items-start gap-3 text-sm">
                            <Clock className="text-gray-400 mt-0.5" size={16} />
                            <div>
                                <p className="text-gray-900 font-medium">Created</p>
                                <p className="text-gray-500">{new Date(ticket.created_at).toLocaleString()}</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-3 text-sm">
                            <Monitor className="text-gray-400 mt-0.5" size={16} />
                            <div>
                                <p className="text-gray-900 font-medium">Asset ID</p>
                                <p className="text-gray-500">{ticket.device || 'N/A'}</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-3 text-sm">
                            <User className="text-gray-400 mt-0.5" size={16} />
                            <div>
                                <p className="text-gray-900 font-medium">Reported By</p>
                                <p className="text-gray-500">{user?.name || user?.email}</p>
                            </div>
                        </li>
                    </ul>
                </div>

                {/* Actions */}
                <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Support Actions</h3>
                    <div className="space-y-2">
                        <button
                            onClick={handleEscalate}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600 hover:bg-red-100 transition-colors font-medium"
                        >
                            <AlertTriangle size={16} />
                            Escalate to Human
                        </button>

                        {ticket.status !== 'Closed' && (
                            <button
                                onClick={() => setIsCloseModalOpen(true)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-50 border border-green-100 rounded-lg text-sm text-green-700 hover:bg-green-100 transition-colors font-medium mt-2"
                            >
                                <CheckCircle2 size={16} />
                                Close Ticket
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TicketSidebar;
