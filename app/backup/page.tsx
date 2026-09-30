import BackupForm from "./BackupForm";

export default function BackupPage() {
    return (
        <div className="p-8 max-w-2xl mx-auto w-full">
            <h1 className="text-2xl font-bold mb-6">Export / Import</h1>
            <BackupForm />
        </div>
    );
}
