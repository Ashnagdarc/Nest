import { Input } from '@/components/ui/input';

interface AdvancedSearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    children?: React.ReactNode; // For extra filters
}

export default function AdvancedSearchBar({ value, onChange, placeholder, children }: AdvancedSearchBarProps) {
    return (
        <div className="flex items-center gap-2 mb-4">
            <Input
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder || 'Search...'}
                className="max-w-xs"
            />
            {children}
        </div>
    );
} 