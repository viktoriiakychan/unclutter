import { useState } from "react";
import { API } from "./constants";

export function useBulkActions(emails, refetchEmails) {
    const [selectedIds, setSelectedIds] = useState([]);

    const [isDeleting, setIsDeleting] = useState(false);
    const [deletingIds, setDeletingIds] = useState([]);

    const [isArchiving, setIsArchiving] = useState(false);
    const [archivingIds, setArchivingIds] = useState([]);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

    function toggleSelect(id) {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    }

    function toggleSelectAll() {
        const allSelected = emails.length > 0 && emails.every((e) => selectedIds.includes(e.id));
        setSelectedIds(allSelected ? [] : emails.map((e) => e.id));
    }

    async function waitUntilGone(ids, onDone, { intervalMs = 30000, maxAttempts = 10 } = {}) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const latest = await refetchEmails();
            const stillPresent = latest?.some((e) => ids.includes(e.id));

            if (!stillPresent) {
                onDone();
                return;
            }
            await new Promise((r) => setTimeout(r, intervalMs));
        }
        onDone();
    }

    async function handleDelete() {
        if (selectedIds.length === 0) return;

        const idsToDelete = selectedIds;
        setDeletingIds(idsToDelete);
        setIsDeleting(true);
        setSelectedIds([]);

        try {
            const res = await fetch(`${API}/trash`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: idsToDelete }),
            });

            if (!res.ok) {
                alert("Failed to delete selected emails.");
                setIsDeleting(false);
                setDeletingIds([]);
                return;
            }

            await waitUntilGone(idsToDelete, () => {
                setIsDeleting(false);
                setDeletingIds([]);
            });
        } catch (err) {
            console.error("Delete failed:", err);
            setIsDeleting(false);
            setDeletingIds([]);
        }
    }

    async function handleArchive() {
        if (selectedIds.length === 0) return;

        const idsArchive = selectedIds;
        setArchivingIds(idsArchive);
        setIsArchiving(true);
        setSelectedIds([]);

        try {
            const res = await fetch(`${API}/archive`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: idsArchive }),
            });

            if (!res.ok) {
                alert("Failed to archive selected emails.");
                setIsArchiving(false);
                setArchivingIds([]);
                return;
            }

            await waitUntilGone(idsArchive, () => {
                setIsArchiving(false);
                setArchivingIds([]);
            });
        } catch (err) {
            console.error("Archive failed:", err);
            setIsArchiving(false);
            setArchivingIds([]);
        }
    }
    const allSelected = emails.length > 0 && emails.every((e) => selectedIds.includes(e.id));

    return {
        selectedIds,
        allSelected,
        isDeleting,
        isArchiving,
        showDeleteConfirm,
        setShowDeleteConfirm,
        showArchiveConfirm,
        setShowArchiveConfirm,
        toggleSelect,
        toggleSelectAll,
        handleDelete,
        handleArchive,
    };
}