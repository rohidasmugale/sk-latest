// frontend/src/context/SiteContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { siteService, Site } from "@/services/SiteService";

const STORAGE_KEY = "selectedSite";

interface SiteContextValue {
    sites: Site[];
    selectedSite: string; // "all" or a site _id
    setSelectedSite: (siteId: string) => void;
    isLoadingSites: boolean;
    getSiteName: (siteId: string) => string | undefined;
    getSiteDisplayName: () => string;
    resolveSiteName: (siteId: string) => string | undefined;
    refreshSites: () => Promise<void>;
}

const SiteContext = createContext<SiteContextValue | null>(null);

export const SiteProvider = ({ children }: { children: ReactNode }) => {
    const [sites, setSites] = useState<Site[]>([]);
    const [isLoadingSites, setIsLoadingSites] = useState(false);

    // Persist selection across navigation/refresh, same way RoleContext-style
    // contexts in this app tend to work.
    const [selectedSite, setSelectedSiteState] = useState<string>(() => {
        try {
            return localStorage.getItem(STORAGE_KEY) || "all";
        } catch {
            return "all";
        }
    });

    const fetchSites = async () => {
        try {
            setIsLoadingSites(true);
            const sitesData = await siteService.getAllSites();
            setSites(sitesData || []);
        } catch (error) {
            console.error("Error fetching sites:", error);
            setSites([]);
        } finally {
            setIsLoadingSites(false);
        }
    };

    useEffect(() => {
        fetchSites();
    }, []);

    const setSelectedSite = (siteId: string) => {
        setSelectedSiteState(siteId);
        try {
            localStorage.setItem(STORAGE_KEY, siteId);
        } catch {
            // ignore storage errors (e.g. private browsing)
        }
    };

    const getSiteName = (siteId: string): string | undefined => {
        if (siteId === "all") return undefined;
        return sites.find((s) => s._id === siteId)?.name;
    };

    // Same behavior HRMS.tsx used to have locally.
    const resolveSiteName = (siteId: string): string | undefined => getSiteName(siteId);

    const getSiteDisplayName = (): string => {
        if (selectedSite === "all") return "All Sites";
        const site = sites.find((s) => s._id === selectedSite);
        return site ? site.name : "Unknown Site";
    };

    return (
        <SiteContext.Provider
            value={{
                sites,
                selectedSite,
                setSelectedSite,
                isLoadingSites,
                getSiteName,
                getSiteDisplayName,
                resolveSiteName,
                refreshSites: fetchSites,
            }}
        >
            {children}
        </SiteContext.Provider>
    );
};

export const useSite = (): SiteContextValue => {
    const ctx = useContext(SiteContext);
    if (!ctx) {
        throw new Error("useSite must be used within a SiteProvider");
    }
    return ctx;
};