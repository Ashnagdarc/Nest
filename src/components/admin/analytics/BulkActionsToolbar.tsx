import { Button } from '@/components/ui/button';

interface BulkActionsToolbarProps {
    selectedIds: (string | number)[];
    actions: { label: string; value: string }[];
    onAction: (action: string) => void;
}

export default function BulkActionsToolbar({ selectedIds, actions, onAction }: BulkActionsToolbarProps) {
    if (selectedIds.length === 0) return null;
    return (
        <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-muted-foreground">{selectedIds.length} selected</span>
            {actions.map(action => (
                <Button
                    key={action.value}
                    size="sm"
                    variant="secondary"
                    onClick={() => onAction(action.value)}
                >
                    {action.label}
                </Button>
            ))}
        </div>
    );
} 