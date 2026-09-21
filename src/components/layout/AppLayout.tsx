import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth";
import {
  conversationKeys,
  getConversations,
  updateConversation,
  archiveConversation,
  unarchiveConversation,
  deleteConversation,
} from "@/features/conversations";
import { usageKeys, getTokenBalance } from "@/features/usage";
import { memoryKeys, getMemories } from "@/features/memories";
import { NexaMindLogo } from "@/components/ui";
import type { Conversation } from "@/types";

interface GroupedConversations {
  today: Conversation[];
  yesterday: Conversation[];
  last7Days: Conversation[];
  older: Conversation[];
}

const groupConversationsByDate = (convs: Conversation[]): GroupedConversations => {
  const groups: GroupedConversations = {
    today: [],
    yesterday: [],
    last7Days: [],
    older: [],
  };

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const startOf7DaysAgo = startOfToday - 6 * 24 * 60 * 60 * 1000;

  // Sort by most recently updated
  const sorted = [...convs].sort((a, b) => {
    const timeA = new Date(a.updatedAt || a.lastMessageAt || a.createdAt).getTime();
    const timeB = new Date(b.updatedAt || b.lastMessageAt || b.createdAt).getTime();
    return timeB - timeA;
  });

  for (const conv of sorted) {
    const time = new Date(conv.updatedAt || conv.lastMessageAt || conv.createdAt).getTime();
    if (time >= startOfToday) {
      groups.today.push(conv);
    } else if (time >= startOfYesterday) {
      groups.yesterday.push(conv);
    } else if (time >= startOf7DaysAgo) {
      groups.last7Days.push(conv);
    } else {
      groups.older.push(conv);
    }
  }

  return groups;
};

export const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Dropdown action menu state
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isArchivedExpanded, setIsArchivedExpanded] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-focus input when editing
  useEffect(() => {
    if (editingChatId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingChatId]);

  // 1. Live Conversations from Backend
  const {
    data: conversationsData,
    isLoading: isLoadingConversations,
    isError: isConversationsError,
    refetch: refetchConversations,
  } = useQuery({
    queryKey: conversationKeys.lists(),
    queryFn: () => getConversations({ limit: 100 }),
  });

  const allConversations = useMemo<Conversation[]>(
    () => conversationsData?.data || [],
    [conversationsData?.data],
  );
  const activeConversations = useMemo(
    () => allConversations.filter((c) => c.status !== "ARCHIVED"),
    [allConversations],
  );
  const archivedConversations = useMemo(
    () => allConversations.filter((c) => c.status === "ARCHIVED"),
    [allConversations],
  );
  const groupedConvs = useMemo(
    () => groupConversationsByDate(activeConversations),
    [activeConversations],
  );

  // 2. Live Token Balance
  const { data: balanceData, isLoading: isBalanceLoading, isError: isBalanceError } = useQuery({
    queryKey: usageKeys.balance(),
    queryFn: () => getTokenBalance(),
    refetchInterval: 15000,
  });

  // 3. Live Memories Count
  const { data: memoriesData } = useQuery({
    queryKey: memoryKeys.lists(),
    queryFn: () => getMemories(),
    refetchInterval: 20000,
  });
  const activeMemoriesCount = memoriesData?.length ?? 0;

  const isChatRoute = location.pathname === "/app" || location.pathname.startsWith("/app/chat");
  const activeConvId = location.pathname.startsWith("/app/chat/")
    ? location.pathname.split("/app/chat/")[1]
    : null;

  // Mutations for conversation actions
  const renameMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      updateConversation(id, { title }),
    onSuccess: (updated) => {
      queryClient.setQueryData(conversationKeys.detail(updated._id), updated);
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
      setEditingChatId(null);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => archiveConversation(id),
    onSuccess: (_, archivedId) => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: conversationKeys.detail(archivedId) });
      if (activeConvId === archivedId) {
        navigate("/app");
      }
      setActiveMenuId(null);
    },
  });

  const unarchiveMutation = useMutation({
    mutationFn: (id: string) => unarchiveConversation(id),
    onSuccess: (_, unarchivedId) => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: conversationKeys.detail(unarchivedId) });
      setActiveMenuId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteConversation(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
      if (activeConvId === deletedId) {
        navigate("/app");
      }
      setActiveMenuId(null);
    },
  });

  const handleNewChat = useCallback(() => {
    if (location.pathname === "/app") {
      setMobileMenuOpen(false);
      const composerInput = document.querySelector<HTMLTextAreaElement>("textarea");
      composerInput?.focus();
      return;
    }

    navigate("/app");
    setMobileMenuOpen(false);
    setTimeout(() => {
      const composerInput = document.querySelector<HTMLTextAreaElement>("textarea");
      composerInput?.focus();
    }, 50);
  }, [navigate, location.pathname]);

  // Keyboard shortcut Cmd+N / Ctrl+N for new chat
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        handleNewChat();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [handleNewChat]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleStartRename = (e: React.MouseEvent, chat: Conversation) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingChatId(chat._id);
    setEditTitle(chat.title);
    setActiveMenuId(null);
  };

  const handleSaveRename = (e: React.FormEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const trimmed = editTitle.trim();
    if (trimmed && trimmed.length <= 200) {
      renameMutation.mutate({ id, title: trimmed });
    } else {
      setEditingChatId(null);
    }
  };

  const handleArchiveConversation = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    archiveMutation.mutate(id);
  };

  const handleUnarchiveConversation = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    unarchiveMutation.mutate(id);
  };

  const handleDeleteConversation = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveMenuId(null);
    setDeleteConfirmId(id);
  };

  const getHeaderTitle = () => {
    if (activeConvId) {
      const activeConv = allConversations.find((c) => c._id === activeConvId);
      return activeConv ? activeConv.title : "";
    }
    if (location.pathname === "/app/memories") return "Cognitive Memories";
    if (location.pathname === "/app/settings") return "Settings & Preferences";
    return "";
  };

  const renderConversationItem = (chat: Conversation) => {
    const isCurrent = activeConvId === chat._id;
    const isEditing = editingChatId === chat._id;
    const isMenuOpen = activeMenuId === chat._id;

    if (isEditing) {
      return (
        <form
          key={chat._id}
          onSubmit={(e) => handleSaveRename(e, chat._id)}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[#1e1e26] border border-white/20"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            ref={editInputRef}
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setEditingChatId(null);
            }}
            className="flex-1 min-w-0 bg-transparent text-sm text-white focus:outline-none"
            placeholder="Conversation title"
            maxLength={200}
          />
          <button
            type="submit"
            disabled={renameMutation.isPending || !editTitle.trim()}
            className="p-1 rounded text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 cursor-pointer disabled:opacity-40"
            title="Save title"
            aria-label="Save title"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setEditingChatId(null)}
            className="p-1 rounded text-[#9e9ea8] hover:text-white hover:bg-[#2a2a34] cursor-pointer"
            title="Cancel"
            aria-label="Cancel"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </form>
      );
    }

    return (
      <div key={chat._id} className="relative group">
        <Link
          to={`/app/chat/${chat._id}`}
          onClick={() => setMobileMenuOpen(false)}
          aria-current={isCurrent ? "page" : undefined}
          className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-[13px] transition-colors duration-150 ${isCurrent
              ? "bg-white/[0.07] text-[#f0f0f5] font-medium"
              : "text-[#c0c0cc] hover:bg-white/[0.05] hover:text-[#f0f0f5]"
            }`}
        >
          <span className="truncate flex-1 min-w-0 pr-1 text-left" title={chat.title}>
            {chat.title}
          </span>

          {/* Action options trigger */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setActiveMenuId(isMenuOpen ? null : chat._id);
            }}
            className={`p-1 rounded text-[#9e9ea8] hover:text-white hover:bg-white/[0.08] transition-all flex-shrink-0 cursor-pointer ${isMenuOpen || isCurrent ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`}
            title="Options"
            aria-label="Conversation options"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
              />
            </svg>
          </button>
        </Link>

        {/* Dropdown Action Menu */}
        {isMenuOpen && (
          <div
            ref={menuRef}
            className="absolute right-2 top-8 z-30 w-36 rounded-xl bg-[#1e1e26] border border-white/[0.12] shadow-xl py-1 text-[13px] text-[#e8e8f0] animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={(e) => handleStartRename(e, chat)}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.07] hover:text-white text-left transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-[#9e9ea8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Rename</span>
            </button>

            {chat.status === "ARCHIVED" ? (
              <button
                type="button"
                onClick={(e) => handleUnarchiveConversation(e, chat._id)}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.07] hover:text-white text-left transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 text-[#9e9ea8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <span>Unarchive</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => handleArchiveConversation(e, chat._id)}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.07] hover:text-white text-left transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 text-[#9e9ea8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <span>Archive</span>
              </button>
            )}

            <div className="h-px bg-white/10 my-1" />

            <button
              type="button"
              onClick={(e) => handleDeleteConversation(e, chat._id)}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 text-left transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderConversationGroup = (title: string, items: Conversation[]) => {
    if (items.length === 0) return null;

    return (
      <div key={title} className="space-y-0.5 py-1">
        <div className="px-3 pt-3 pb-1.5 text-[11px] font-semibold text-[#7878a0] uppercase tracking-widest select-none text-left">
          {title}
        </div>
        {items.map((chat) => renderConversationItem(chat))}
      </div>
    );
  };

  const sidebarContent = (
    <div className="flex h-full w-full flex-col justify-between bg-[#0f0f13] border-r border-white/[0.07] select-none overflow-hidden box-border">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-3 py-3">
          <Link
            to="/app"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center group cursor-pointer"
          >
            <NexaMindLogo size="md" />
          </Link>

          <div className="flex items-center gap-1">
            {/* Sidebar collapse button — desktop only */}
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="hidden md:flex rounded-lg p-1.5 text-[#9090b0] hover:text-white hover:bg-white/[0.07] transition-colors"
              aria-label="Collapse sidebar"
              title="Close sidebar"
            >
              {/* Panel / sidebar-collapse icon */}
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v18" />
              </svg>
            </button>
            {/* Close button for mobile */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden rounded-lg p-1.5 text-[#9e9ea8] hover:text-white hover:bg-white/[0.06] transition-colors"
              aria-label="Close navigation"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ChatGPT-style: New chat + Search chats */}
        <div className="px-2 pb-1 space-y-0.5">
          {/* New chat */}
          <button
            type="button"
            onClick={handleNewChat}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#c8c8e0] hover:bg-white/[0.07] hover:text-white text-sm font-normal transition-all cursor-pointer group"
          >
            <svg className="w-4.5 h-4.5 flex-shrink-0 opacity-80 group-hover:opacity-100" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>New chat</span>
          </button>

          {/* Search chats */}
          <button
            type="button"
            onClick={() => {
              setIsSearchActive((prev) => !prev);
              setSearchQuery("");
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-normal transition-all cursor-pointer group ${
              isSearchActive
                ? "bg-white/[0.07] text-white"
                : "text-[#c8c8e0] hover:bg-white/[0.07] hover:text-white"
            }`}
          >
            <svg className="w-4.5 h-4.5 flex-shrink-0 opacity-80 group-hover:opacity-100" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <span>Search chats</span>
          </button>

          {/* Search input — appears when Search chats is active */}
          {isSearchActive && (
            <div className="px-1 pt-1 pb-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") { setIsSearchActive(false); setSearchQuery(""); } }}
                placeholder="Search conversations..."
                className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-[#e8e8f0] placeholder-[#60608a] focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
              />
            </div>
          )}
        </div>

        {/* Conversation History */}
        <div className="px-2 flex-1 min-h-0 overflow-y-auto">
          {isLoadingConversations ? (
            <div className="space-y-2.5 p-3">
              <div className="h-3 bg-white/[0.06] rounded animate-pulse w-20 mb-3" />
              <div className="h-8 bg-white/[0.04] rounded-lg animate-pulse w-full" />
              <div className="h-8 bg-white/[0.04] rounded-lg animate-pulse w-5/6" />
              <div className="h-8 bg-white/[0.04] rounded-lg animate-pulse w-3/4" />
              <div className="h-3 bg-white/[0.06] rounded animate-pulse w-24 mt-4 mb-3" />
              <div className="h-8 bg-white/[0.04] rounded-lg animate-pulse w-full" />
            </div>
          ) : isConversationsError ? (
            <div className="px-3 py-6 text-center space-y-2">
              <p className="text-xs text-rose-300/80">Failed to load conversations</p>
              <button
                type="button"
                onClick={() => refetchConversations()}
                className="px-2.5 py-1 text-xs rounded bg-white/[0.08] hover:bg-white/[0.12] text-[#e8e8f0] transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : activeConversations.length === 0 && archivedConversations.length === 0 ? (
            <div className="px-3 py-10 text-center text-sm text-[#7878a0]">
              No conversations yet
            </div>
          ) : searchQuery.trim() ? (
            /* Search results */
            <div className="space-y-0.5 py-1">
              <div className="px-3 pt-3 pb-1.5 text-[11px] font-semibold text-[#7878a0] uppercase tracking-widest select-none text-left">
                Results
              </div>
              {activeConversations.filter((c) =>
                c.title.toLowerCase().includes(searchQuery.toLowerCase())
              ).length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-[#7878a0]">No matches found</div>
              ) : (
                activeConversations
                  .filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((chat) => renderConversationItem(chat))
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {renderConversationGroup("Today", groupedConvs.today)}
              {renderConversationGroup("Yesterday", groupedConvs.yesterday)}
              {renderConversationGroup("Previous 7 Days", groupedConvs.last7Days)}
              {renderConversationGroup("Older", groupedConvs.older)}

              {/* Archived Conversations Collapsible Section */}
              {archivedConversations.length > 0 && (
                <div className="pt-3 border-t border-white/[0.06] mt-3">
                  <button
                    type="button"
                    onClick={() => setIsArchivedExpanded(!isArchivedExpanded)}
                    className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-[#7878a0] hover:text-[#c0c0cc] transition-colors cursor-pointer"
                  >
                    <span>Archived ({archivedConversations.length})</span>
                    <svg
                      className={`w-3.5 h-3.5 transition-transform ${isArchivedExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isArchivedExpanded && (
                    <div className="space-y-0.5 mt-1">
                      {archivedConversations.map((chat) => renderConversationItem(chat))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Secondary Navigation: Memories & Settings */}
        <div className="px-2 py-2.5 border-t border-white/[0.07] space-y-0.5">
          <NavLink
            to="/app/memories"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${isActive
                ? "bg-white/[0.08] text-white"
                : "text-[#9090b0] hover:bg-white/[0.05] hover:text-[#e8e8f0]"
              }`
            }
          >
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span>Memories</span>
            </div>
            {activeMemoriesCount > 0 && (
              <span className="text-[10px] text-[#a1a1aa] bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 rounded-full font-mono">
                {activeMemoriesCount}
              </span>
            )}
          </NavLink>

          <NavLink
            to="/app/settings"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${isActive
                ? "bg-white/[0.08] text-white"
                : "text-[#9090b0] hover:bg-white/[0.05] hover:text-[#e8e8f0]"
              }`
            }
          >
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Settings</span>
            </div>
          </NavLink>
        </div>
      </div>

      {/* Account & Usage Footer */}
      <div className="p-3.5 border-t border-white/[0.07]">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-700 to-indigo-800 border border-white/15 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {(user?.name || user?.email || "U")[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#f0f0f8] truncate leading-tight" title={user?.name || user?.email || "Nexa User"}>
                {user?.name || user?.email || "Nexa User"}
              </p>
              <p className="text-[11px] font-mono text-[#7878a0] leading-tight mt-0.5">
                {isBalanceLoading ? "Loading..." : isBalanceError ? "Unavailable" : `${balanceData?.balance ?? 0} credits`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Sign out"
            aria-label="Sign out"
            className="rounded-lg p-1.5 text-[#9090b0] hover:text-white hover:bg-white/[0.06] transition-colors flex-shrink-0 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#16161a] text-[#e8e8f0] font-sans">
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex w-64 min-w-[16rem] max-w-[16rem] flex-shrink-0 overflow-hidden box-border transition-all duration-300 ${sidebarCollapsed ? 'md:hidden' : ''}`}>
        {sidebarContent}
      </aside>

      {/* Mobile Slide-over Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 flex-shrink-0 z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#16161a]">
        {/* Top Header */}
        <header className="h-14 border-b border-white/[0.07] bg-[#16161a]/90 backdrop-blur-md flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {/* Expand sidebar button — desktop only, shown when collapsed */}
            {sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="hidden md:flex rounded-lg p-1.5 text-[#9090b0] hover:text-white hover:bg-white/[0.07] transition-colors flex-shrink-0"
                aria-label="Open sidebar"
                title="Open sidebar"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v18" />
                </svg>
              </button>
            )}
            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden rounded-lg p-1.5 text-[#9090b0] hover:text-white hover:bg-white/[0.06] transition-colors flex-shrink-0"
              aria-label="Open sidebar menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Title */}
            {getHeaderTitle() ? (
              <h1 className="text-[15px] font-semibold text-[#f0f0f8] tracking-tight truncate" title={getHeaderTitle()}>
                {getHeaderTitle()}
              </h1>
            ) : null}
          </div>

          {/* Useful Product Actions for Active Chat: Rename, Archive, Delete */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isChatRoute && activeConvId && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    const activeConv = allConversations.find((c) => c._id === activeConvId);
                    if (activeConv) {
                      handleStartRename(e, activeConv);
                    }
                  }}
                  title="Rename this conversation"
                  aria-label="Rename this conversation"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#9090b0] hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  <span className="hidden sm:inline">Rename</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => handleArchiveConversation(e, activeConvId)}
                  title="Archive this conversation"
                  aria-label="Archive this conversation"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#9090b0] hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                    />
                  </svg>
                  <span className="hidden sm:inline">Archive</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => handleDeleteConversation(e, activeConvId)}
                  title="Delete this conversation"
                  aria-label="Delete this conversation"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#a1a1aa] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  <span className="hidden sm:inline">Delete</span>
                </button>
              </>
            )}
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main
          className={`flex-1 flex flex-col min-h-0 bg-[#16161a] ${isChatRoute ? "overflow-hidden" : "overflow-y-auto"
            }`}
        >
          <Outlet />
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDeleteConfirmId(null)}
          />
          {/* Modal Card */}
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-[#1a1a22] border border-white/[0.12] shadow-2xl shadow-black/60 p-6 animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-base font-semibold text-white mb-1">Delete chat?</h2>
            <p className="text-sm text-[#9090b0] mb-6 leading-relaxed">
              This will permanently delete{" "}
              <span className="text-[#c8c8e0] font-medium">
                {allConversations.find((c) => c._id === deleteConfirmId)?.title || "this conversation"}
              </span>
              . This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-[#c8c8e0] bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] hover:border-white/[0.15] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteMutation.mutate(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-rose-600 hover:bg-rose-500 border border-rose-500/50 hover:border-rose-400/60 transition-all cursor-pointer disabled:opacity-60 shadow-sm shadow-rose-900/40"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
