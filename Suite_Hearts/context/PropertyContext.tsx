import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Property, searchProperties } from '../lib/datafiniti';

interface PropertyContextType {
  properties: Property[];
  loading: boolean;
  error: string | null;
  selectedPropertyId: string | null;
  setSelectedPropertyId: (id: string | null) => void;
  refreshProperties: () => Promise<void>;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export function PropertyProvider({ children }: { children: ReactNode }) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  // Fetch properties ONCE on mount
  // Never refetch on re-render, never fetch inside render functions
  const fetchProperties = async () => {
    console.log('[PropertyContext] Starting property fetch...');
    try {
      setLoading(true);
      setError(null);
      console.log('[PropertyContext] Calling searchProperties...');
      // Note: searchProperties makes 5 separate API calls (2 SF + 3 other cities)
      // The num_records parameter is overridden in individual calls (1 per call)
      const data = await searchProperties();
      console.log('[PropertyContext] Properties fetched successfully:', data.length);
      setProperties(data);
      if (data.length === 0) {
        console.warn('Warning [PropertyContext] No properties returned from API');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch properties';
      setError(errorMessage);
      console.error('Error [PropertyContext] Error fetching properties:', err);
      if (err instanceof Error) {
        console.error('Error [PropertyContext] Error details:', {
          message: err.message,
          stack: err.stack,
        });
      }
      // Set empty array on error so app doesn't break
      setProperties([]);
    } finally {
      setLoading(false);
      console.log('[PropertyContext] Property fetch complete');
    }
  };

  useEffect(() => {
    // Fetch once on mount
    fetchProperties();
  }, []); // Empty dependency array ensures this runs only once

  const refreshProperties = async () => {
    await fetchProperties();
  };

  return (
    <PropertyContext.Provider
      value={{
        properties,
        loading,
        error,
        selectedPropertyId,
        setSelectedPropertyId,
        refreshProperties,
      }}
    >
      {children}
    </PropertyContext.Provider>
  );
}

export function useProperties() {
  const context = useContext(PropertyContext);
  if (context === undefined) {
    throw new Error('useProperties must be used within a PropertyProvider');
  }
  return context;
}

