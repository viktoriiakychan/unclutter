import { useState } from "react";
import { timeAgo } from "../utils/helpers";

export default function BulkActionsPreview({ title, emails, action = "delete", onCancel, onConfirm }) {
    // every email starts ticked, i.e. will be deleted
    const [keepIds, setKeepIds] = useState([]);   // ids the user unticked

    const ACTIONS = {
        delete:  { verb: "moved to Trash", button: "Delete",  color: "bg-red-600 hover:bg-red-700" },
        archive: { verb: "archived",       button: "Archive", color: "bg-gray-700 hover:bg-gray-800" },
    };

    const a = ACTIONS[action];

    const toDelete = emails.filter((e) => !keepIds.includes(e.id));

    function toggle(id) {
        setKeepIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    }

    const allChecked = keepIds.length ===0; // whether every email is ticked
    
    function toggleAll(){
        if(allChecked){
            setKeepIds(emails.map((e) => e.id)); // untick all
        }
        else{
            setKeepIds([]); // keep nothing = tick all
        }
    }



    return (
        <div
            className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-4"
            onClick={onCancel}   // click the dark background to close
        >
            <div
                className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}   // clicks inside the box don't close it
            >
                {/* header */}
                <div className="p-5 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        {toDelete.length} of {emails.length} emails will be {a.verb}. Untick any you want to keep.
                    </p>
                </div>

                {/* select / deselect all */}
                <label className="flex items-center gap-3 px-5 py-2 border-b border-gray-200 bg-gray-50 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={toggleAll}
                        className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-600">
                        {allChecked ? "Deselect all" : "Select all"}
                    </span>
                </label>

                {/* scrollable list */}
                <ul className="overflow-y-auto flex-1 divide-y divide-gray-100">
                    {emails.map((email) => {
                        const checked = !keepIds.includes(email.id);
                        return (
                            <li key={email.id}>
                                <label className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-gray-50">
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggle(email.id)}
                                        className="w-4 h-4 rounded border-gray-300"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className={`text-sm truncate ${email.unread ? "font-medium text-gray-900" : "text-gray-600"}`}>
                                            {email.subject || "(no subject)"}
                                        </div>
                                        <div className="text-xs text-gray-400 truncate">{email.sender_email}</div>
                                    </div>
                                    <span className="text-xs text-gray-400 shrink-0">{timeAgo(email.internal_date)}</span>
                                </label>
                            </li>
                        );
                    })}
                </ul>

                {/* footer */}
                <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button
                        className={`px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-40 ${a.color}`}
                        disabled={toDelete.length === 0}
                        onClick={() => onConfirm(toDelete.map((e) => e.id))}
                    >
                        {a.button} {toDelete.length} emails
                    </button>
                </div>
            </div>
        </div>
    );
}