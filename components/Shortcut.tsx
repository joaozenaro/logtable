interface ShortcutProps {
    keys: string[];
    label: string;
}

export default function Shortcut({ keys, label }: ShortcutProps) {
    return (
        <span className="flex items-center gap-1 text-xs text-neutral-400 select-none">
            {keys.map((k, i) => (
                <span key={k} className="flex items-center gap-1">
                    <kbd className="rounded border border-neutral-700 bg-neutral-800 px-1.5 py-0.5 font-mono text-[0.65rem] text-neutral-400 leading-none">
                        {k}
                    </kbd>
                    {i < keys.length - 1 && (
                        <span className="text-neutral-600">+</span>
                    )}
                </span>
            ))}
            <span className="ml-1 text-neutral-500">{label}</span>
        </span>
    );
}
