"use client";

import { create } from "zustand";
import type { ComposeState, MailDetail, MailFilter, MailSummary, MailView } from "@/types/mail";
import { emptyCompose, emptyFilters } from "@/types/mail";

type MailStore = {
  currentView: MailView;
  emails: MailSummary[];
  selectedEmail?: MailDetail;
  selectedEmailId?: string;
  filters: MailFilter;
  searchQuery: string;
  composeState: ComposeState;
  isAssistantOpen: boolean;
  loadingLabel?: string;
  error?: string;
  userEmail?: string;
  setView: (view: MailView) => void;
  setEmails: (emails: MailSummary[]) => void;
  setSelectedEmail: (email?: MailDetail) => void;
  setFilters: (filters: Partial<MailFilter>) => void;
  setSearchQuery: (query: string) => void;
  openCompose: (compose?: Partial<ComposeState>) => void;
  updateCompose: (compose: Partial<ComposeState>) => void;
  setAssistantOpen: (open: boolean) => void;
  setLoading: (label?: string) => void;
  setError: (error?: string) => void;
  setUserEmail: (email?: string) => void;
};

export const useMailStore = create<MailStore>((set) => ({
  currentView: "inbox",
  emails: [],
  selectedEmail: undefined,
  selectedEmailId: undefined,
  filters: emptyFilters,
  searchQuery: "",
  composeState: emptyCompose,
  isAssistantOpen: true,
  loadingLabel: undefined,
  error: undefined,
  userEmail: undefined,
  setView: (currentView) => set({ currentView, error: undefined }),
  setEmails: (emails) => set({ emails, loadingLabel: undefined, error: undefined }),
  setSelectedEmail: (selectedEmail) => set({ selectedEmail, selectedEmailId: selectedEmail?.id, currentView: selectedEmail ? "detail" : "inbox" }),
  setFilters: (partial) => set((state) => ({ filters: { ...state.filters, ...partial } })),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  openCompose: (compose) => set({ currentView: "compose", composeState: { ...emptyCompose, ...compose }, error: undefined }),
  updateCompose: (compose) => set((state) => ({ composeState: { ...state.composeState, ...compose } })),
  setAssistantOpen: (isAssistantOpen) => set({ isAssistantOpen }),
  setLoading: (loadingLabel) => set({ loadingLabel }),
  setError: (error) => set({ error, loadingLabel: undefined }),
  setUserEmail: (userEmail) => set({ userEmail }),
}));
