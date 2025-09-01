import { Camera, CameraIcon, Headphones, Cpu, Monitor, Mouse, Battery, HardDrive, Cable, Lightbulb, Grip, Car } from 'lucide-react';
import type { ReactNode } from 'react';

export type CategoryName =
    | 'Camera' | 'Lens' | 'Drone' | 'Audio' | 'Laptop' | 'Monitor' | 'Mouse'
    | 'Batteries' | 'Storage' | 'Cables' | 'Lighting' | 'Tripod' | 'Cars';

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
};

export function getCategoryIcon(name: CategoryName, size?: number): ReactNode {
    const fn = categoryIconMap[name];
    return fn ? fn(size) : null;
}
