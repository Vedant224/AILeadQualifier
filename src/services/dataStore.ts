/**
 * In-Memory Data Store
 * 
 * Provides centralized storage and management for application data
 * including offers, leads, and scoring results. This implementation
 * uses in-memory storage suitable for the assignment scope.
 */

import { Offer, OfferPayload, Lead, LeadData, ScoredLead } from '../models';

/**
 * Data store interface defining storage operations
 * 
 * This interface provides a clean abstraction for data storage
 * that could be easily replaced with a database implementation.
 */
export interface IDataStore {
  // Offer management
  setOffer(offer: OfferPayload): void;
  getOffer(): Offer | null;
  hasOffer(): boolean;
  
  // Lead management
  setLeads(leads: LeadData[]): void;
  getLeads(): Lead[];
  getLeadCount(): number;
  hasLeads(): boolean;
  
  // Scored results management
  setScoredResults(results: ScoredLead[]): void;
  getScoredResults(): ScoredLead[];
  hasScoredResults(): boolean;
  
  // Utility operations
  clearAll(): void;
  getStorageStats(): StorageStats;
}

/**
 * Storage statistics interface
 * 
 * Provides insights into current storage usage and state
 * for monitoring and debugging purposes.
 */
export interface StorageStats {
  /** Whether offer data is present */
  hasOffer: boolean;
  
  /** Number of leads currently stored */
  leadCount: number;
  
  /** Number of scored results available */
  scoredResultCount: number;
  
  /** Timestamp of last data update */
  lastUpdated: Date;
  
  /** Estimated memory usage in bytes */
  estimatedMemoryUsage: number;
}

/**
 * In-memory data store implementation
 * 
 * Singleton class that manages all application data in memory.
 * Provides thread-safe operations and data validation.
 */
class DataStore implements IDataStore {
  /** Current offer data */
  private offer: Offer | null = null;
  
  /** Array of uploaded leads */
  private leads: Lead[] = [];
  
  /** Array of scored lead results */
  private scoredResults: ScoredLead[] = [];
  
  /** Timestamp of last data modification */
  private lastUpdated: Date = new Date();
  
  /**
   * Sets the current offer data
   * 
   * Stores offer information that will be used as context
   * for lead scoring and AI analysis.
   * 
   * @param offerPayload - Offer data from API request
   */
  setOffer(offerPayload: OfferPayload): void {
    try {
      // Create offer object with timestamp
      this.offer = {
        ...offerPayload,
        created_at: new Date()
      };
      
      this.lastUpdated = new Date();
      
      console.log(`📝 Offer stored: "${offerPayload.name}"`);
    } catch (error) {
      console.error('Error storing offer:', error);
      throw new Error('Failed to store offer data');
    }
  }
  
  /**
   * Retrieves the current offer data
   * 
   * @returns Current offer or null if no offer is set
   */
  getOffer(): Offer | null {
    return this.offer;
  }
  
  /**
   * Checks if offer data is available
   * 
   * @returns True if offer data exists
   */
  hasOffer(): boolean {
    return this.offer !== null;
  }
  
  /**
   * Sets the leads data from CSV upload
   * 
   * Replaces existing leads with new data and adds timestamps.
   * Clears any existing scored results since leads have changed.
   * 
   * @param leadsData - Array of lead data from CSV parsing
   */
  setLeads(leadsData: LeadData[]): void {
    try {
      // Convert lead data to Lead objects with timestamps
      this.leads = leadsData.map(leadData => ({
        ...leadData,
        uploaded_at: new Date()
      }));
      
      // Clear existing scored results since leads have changed
      this.scoredResults = [];
      
      this.lastUpdated = new Date();
      
      console.log(`👥 ${this.leads.length} leads stored`);
    } catch (error) {
      console.error('Error storing leads:', error);
      throw new Error('Failed to store leads data');
    }
  }
  
  /**
   * Retrieves all stored leads
   * 
   * @returns Array of lead objects
   */
  getLeads(): Lead[] {
    return [...this.leads]; // Return copy to prevent external modification
  }
  
  /**
   * Gets the count of stored leads
   * 
   * @returns Number of leads currently stored
   */
  getLeadCount(): number {
    return this.leads.length;
  }
  
  /**
   * Checks if leads data is available
   * 
   * @returns True if leads exist
   */
  hasLeads(): boolean {
    return this.leads.length > 0;
  }
  
  /**
   * Sets the scored results after lead scoring
   * 
   * Stores the complete scoring results including rule-based
   * and AI analysis for all processed leads.
   * 
   * @param results - Array of scored lead results
   */
  setScoredResults(results: ScoredLead[]): void {
    try {
      // Validate that results correspond to current leads
      if (results.length > this.leads.length) {
        throw new Error('Scored results count exceeds available leads');
      }
      
      this.scoredResults = [...results]; // Store copy
      this.lastUpdated = new Date();
      
      console.log(`📊 ${results.length} scored results stored`);
    } catch (error) {
      console.error('Error storing scored results:', error);
      throw new Error('Failed to store scored results');
    }
  }
  
  /**
   * Retrieves all scored results
   * 
   * @returns Array of scored lead objects
   */
  getScoredResults(): ScoredLead[] {
    return [...this.scoredResults]; // Return copy to prevent external modification
  }
  
  /**
   * Checks if scored results are available
   * 
   * @returns True if scored results exist
   */
  hasScoredResults(): boolean {
    return this.scoredResults.length > 0;
  }
  
  /**
   * Clears all stored data
   * 
   * Resets the data store to initial state.
   * Useful for testing or when starting fresh.
   */
  clearAll(): void {
    this.offer = null;
    this.leads = [];
    this.scoredResults = [];
    this.lastUpdated = new Date();
    
    console.log('🗑️ All data cleared from store');
  }
  
  /**
   * Gets current storage statistics
   * 
   * Provides insights into storage state and memory usage
   * for monitoring and debugging purposes.
   * 
   * @returns Storage statistics object
   */
  getStorageStats(): StorageStats {
    // Rough estimation of memory usage
    const offerSize = this.offer ? JSON.stringify(this.offer).length * 2 : 0;
    const leadsSize = JSON.stringify(this.leads).length * 2;
    const resultsSize = JSON.stringify(this.scoredResults).length * 2;
    
    return {
      hasOffer: this.hasOffer(),
      leadCount: this.getLeadCount(),
      scoredResultCount: this.scoredResults.length,
      lastUpdated: this.lastUpdated,
      estimatedMemoryUsage: offerSize + leadsSize + resultsSize
    };
  }
}

/**
 * Singleton instance of the data store
 * 
 * Ensures consistent data access across the application
 * while maintaining a single source of truth.
 */
const dataStore = new DataStore();

export default dataStore;