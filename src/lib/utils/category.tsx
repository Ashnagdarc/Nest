import { Camera, CameraIcon, Headphones, Cpu, Monitor, Mouse, Battery, HardDrive, Cable, Lightbulb, Grip, Car, Box, Puzzle, RotateCcw, Mic } from 'lucide-react';
import type { ReactNode } from 'react';

export type CategoryName =
    | 'Camera' | 'Lens' | 'Drone' | 'Audio' | 'Laptop' | 'Monitor' | 'Mouse'
    | 'Batteries' | 'Storage' | 'Cables' | 'Lighting' | 'Tripod' | 'Cars'
    | 'Accessory' | 'Computer' | 'Microphone' | 'Other' | 'Gimbal';

export const gearCategoryOptions: Array<{ value: CategoryName; label: string }> = [
    { value: 'Camera', label: 'Camera' },
    { value: 'Lens', label: 'Lens' },
    { value: 'Drone', label: 'Drone' },
    { value: 'Audio', label: 'Audio' },
    { value: 'Laptop', label: 'Laptop' },
    { value: 'Monitor', label: 'Monitor' },
    { value: 'Mouse', label: 'Mouse' },
    { value: 'Batteries', label: 'Batteries' },
    { value: 'Storage', label: 'Storage' },
    { value: 'Cables', label: 'Cables' },
    { value: 'Lighting', label: 'Lighting' },
    { value: 'Tripod', label: 'Tripod' },
    { value: 'Gimbal', label: 'Gimbal' },
    { value: 'Accessory', label: 'Accessory' },
    { value: 'Computer', label: 'Computer' },
    { value: 'Microphone', label: 'Microphone' },
    { value: 'Other', label: 'Other' },
    { value: 'Cars', label: 'Cars' },
];

export const categoryIconMap: Record<CategoryName, (size?: number) => ReactNode> = {
    Camera: (s = 14) => <Camera width={s} height={s} />,
    Lens: (s = 14) => <CameraIcon width={s} height={s} />,
    Drone: (s = 14) => <CameraIcon width={s} height={s} />,
    Audio: (s = 14) => <Headphones width={s} height={s} />,
    Laptop: (s = 14) => <Cpu width={s} height={s} />,
    Monitor: (s = 14) => <Monitor width={s} height={s} />,
    Mouse: (s = 14) => <Mouse width={s} height={s} />,
    Batteries: (s = 14) => <Battery width={s} height={s} />,
    Storage: (s = 14) => <HardDrive width={s} height={s} />,
    Cables: (s = 14) => <Cable width={s} height={s} />,
    Lighting: (s = 14) => <Lightbulb width={s} height={s} />,
    Tripod: (s = 14) => <Grip width={s} height={s} />,
    Cars: (s = 14) => <Car width={s} height={s} />,
    Accessory: (s = 14) => <Puzzle width={s} height={s} />,
    Computer: (s = 14) => <Cpu width={s} height={s} />,
    Microphone: (s = 14) => <Mic width={s} height={s} />,
    Other: (s = 14) => <Box width={s} height={s} />,
    Gimbal: (s = 14) => <RotateCcw width={s} height={s} />,
};

export const categoryColorMap: Record<CategoryName, string> = {
    Camera: 'text-blue-600',
    Lens: 'text-indigo-600',
    Drone: 'text-cyan-600',
    Audio: 'text-rose-600',
    Laptop: 'text-emerald-600',
    Monitor: 'text-sky-600',
    Mouse: 'text-zinc-600',
    Batteries: 'text-yellow-600',
    Storage: 'text-purple-600',
    Cables: 'text-gray-600',
    Lighting: 'text-amber-600',
    Tripod: 'text-teal-600',
    Cars: 'text-orange-600',
    Accessory: 'text-gray-600',
    Computer: 'text-slate-600',
    Microphone: 'text-emerald-600',
    Other: 'text-gray-500',
    Gimbal: 'text-fuchsia-600',
};

export function getCategoryIcon(name: CategoryName | string | null | undefined, size?: number): ReactNode {
    const fn = name ? categoryIconMap[name as CategoryName] : undefined;
    return fn ? fn(size) : null;
}

export function getCategoryBadgeClass(name: CategoryName | string | null | undefined): string {
    if (!name) return 'bg-gray-200 text-gray-700';
    const normalized = name.trim().toLowerCase();
    const entry = Object.entries(categoryColorMap).find(([category]) => category.toLowerCase() === normalized);
    if (!entry) return 'bg-gray-200 text-gray-700';

    const [category] = entry;
    switch (category) {
        case 'Camera':
            return 'bg-blue-100 text-blue-800';
        case 'Lens':
            return 'bg-purple-100 text-purple-800';
        case 'Drone':
            return 'bg-cyan-100 text-cyan-800';
        case 'Audio':
            return 'bg-green-100 text-green-800';
        case 'Laptop':
            return 'bg-indigo-100 text-indigo-800';
        case 'Monitor':
            return 'bg-teal-100 text-teal-800';
        case 'Mouse':
            return 'bg-violet-100 text-violet-800';
        case 'Batteries':
            return 'bg-amber-100 text-amber-800';
        case 'Storage':
            return 'bg-stone-100 text-stone-800';
        case 'Cables':
            return 'bg-yellow-100 text-yellow-800';
        case 'Lighting':
            return 'bg-orange-100 text-orange-800';
        case 'Tripod':
            return 'bg-pink-100 text-pink-800';
        case 'Cars':
            return 'bg-red-100 text-red-800';
        case 'Accessory':
            return 'bg-gray-100 text-gray-800';
        case 'Computer':
            return 'bg-slate-100 text-slate-800';
        case 'Microphone':
            return 'bg-emerald-100 text-emerald-800';
        case 'Other':
            return 'bg-gray-200 text-gray-700';
        case 'Gimbal':
            return 'bg-fuchsia-100 text-fuchsia-800';
        default:
            return 'bg-gray-200 text-gray-700';
    }
}
