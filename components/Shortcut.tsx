interface ShortcutProps {
    keys: string[];
    label: string;
}

export default function Shortcut({ keys, label }: ShortcutProps) {
    return (
        <span className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 select-none">
            {keys.map((k, i) => (
                <span key={k} className="flex items-center gap-1">
                    <kbd className="rounded border border-neutral-300 dark:border-neutral-700 px-1.5 py-0.5 font-mono text-[0.65rem] leading-none shadow-sm">
                        {k}
                    </kbd>
                    {i < keys.length - 1 && (
                        <span className="text-neutral-400 dark:text-neutral-600">
                            +
                        </span>
                    )}
                </span>
            ))}
            <span className="ml-1 text-neutral-400 dark:text-neutral-500">
                {label}
            </span>
        </span>
    );
}
