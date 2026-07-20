"use client";

import { useMemo, useState } from "react";
import {
    Typography,
    IconButton,
    ListItemText,
    List,
    ListItem,
    TextField,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";

export type Entry = {
    key: string;
    description: string;
};

interface ListEditorProps {
    items: Entry[];
    onItemsChange: (items: Entry[]) => void;
}

export default function ListEditor({ items, onItemsChange }: ListEditorProps) {
    const [newKey, setNewKey] = useState("");
    const [newDesc, setNewDesc] = useState("");

    const existingKeys = useMemo(
        () => new Set(items.map((i) => i.key.toLowerCase())),
        [items],
    );

    const trimmedKey = newKey.trim();
    const isDuplicate =
        trimmedKey.length > 0 && existingKeys.has(trimmedKey.toLowerCase());
    const canAdd = trimmedKey.length > 0 && !isDuplicate;

    const handleAdd = () => {
        if (!canAdd) return;
        onItemsChange([
            ...items,
            { key: trimmedKey, description: newDesc.trim() },
        ]);
        setNewKey("");
        setNewDesc("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleAdd();
        }
    };

    return (
        <div className="flex-1 min-h-0 px-4 pb-4 flex flex-col">
            <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, color: "text.secondary", mb: 1 }}
            >
                Autocomplete suggestions
            </Typography>

            <div className="flex items-end gap-1">
                <TextField
                    label="Key"
                    variant="standard"
                    size="small"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    onKeyDown={handleKeyDown}
                    error={isDuplicate}
                    helperText={isDuplicate ? "Already exists" : undefined}
                    sx={{ flex: 2 }}
                />
                <TextField
                    label="Hint"
                    variant="standard"
                    size="small"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    onKeyDown={handleKeyDown}
                    sx={{ flex: 3 }}
                />
                <IconButton
                    size="small"
                    onClick={handleAdd}
                    disabled={!canAdd}
                    color="primary"
                >
                    <AddIcon fontSize="small" />
                </IconButton>
            </div>

            <div className="flex-1 min-h-0 mt-1">
                <List dense className="h-full overflow-y-auto overflow-clip">
                    {items.map((item, i) => (
                        <ListItem
                            key={i}
                            disableGutters
                            secondaryAction={
                                <IconButton
                                    edge="end"
                                    aria-label="delete"
                                    size="small"
                                    onClick={() =>
                                        onItemsChange(
                                            items.filter((_, j) => j !== i),
                                        )
                                    }
                                >
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            }
                        >
                            <ListItemText
                                primary={item.key}
                                secondary={item.description || undefined}
                            />
                        </ListItem>
                    ))}
                    {items.length === 0 && (
                        <Typography
                            variant="caption"
                            sx={{
                                color: "text.disabled",
                                display: "block",
                                mt: 1,
                                textAlign: "center",
                            }}
                        >
                            No suggestions yet
                        </Typography>
                    )}
                </List>
            </div>
        </div>
    );
}
