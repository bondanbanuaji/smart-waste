"use client";

import React, { createContext, useContext, useState } from "react";

interface LayoutContextType {
    isMobileMenuOpen: boolean;
    setMobileMenuOpen: (open: boolean) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: React.ReactNode }) {
    const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <LayoutContext.Provider value={{ isMobileMenuOpen, setMobileMenuOpen }}>
            {children}
        </LayoutContext.Provider>
    );
}

export function useLayout() {
    const context = useContext(LayoutContext);
    if (context === undefined) {
        throw new Error("useLayout must be used within a LayoutProvider");
    }
    return context;
}
