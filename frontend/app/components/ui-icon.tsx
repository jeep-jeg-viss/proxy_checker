"use client";

import type { LucideIcon, LucideProps } from "lucide-react";

type UiIconProps = Omit<LucideProps, "size" | "strokeWidth"> & {
    icon: LucideIcon;
    size?: number;
    strokeWidth?: number;
};

export function UiIcon({
    icon: Icon,
    size = 14,
    strokeWidth = 1.8,
    style,
    ...rest
}: UiIconProps) {
    return (
        <Icon
            aria-hidden="true"
            size={size}
            strokeWidth={strokeWidth}
            style={{ flexShrink: 0, ...style }}
            {...rest}
        />
    );
}
