import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { conversationKeys, getConversations, deleteConversation } from '@/features/conversations';
import { usageKeys, getTokenBalance } from '@/features/usage';
import { memoryKeys, getMemories } from '@/features/memories';
import type { Conversation } from '@/types';

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
  const startOf7DaysAgo = startOfToday - 7 * 24 * 60 * 60 * 1000;

  for (const conv of convs) {
    const time = new Date(conv.lastMessageAt || conv.updatedAt || conv.createdAt).getTime();
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

  // 1. Live Conversations
  const { data: conversationsData, isLoading: isLoadingConversations } = useQuery({
    queryKey: conversationKeys.lists(),
    queryFn: () => getConversations({ limit: 50 }),
  });
  const conversations: Conversation[] = conversationsData?.data || [];
  const groupedConvs = groupConversationsByDate(conversations);

  // 2. Live Token Balance
  const { data: balanceData } = useQuery({
    queryKey: usageKeys.balance(),
    queryFn: () => getTokenBalance(),
    refetchInterval: 15000,
  });
  const currentBalance = balanceData?.balance ?? 100;

  // 3. Live Memories Count
  const { data: memoriesData } = useQuery({
    queryKey: memoryKeys.lists(),
    queryFn: () => getMemories(),
    refetchInterval: 20000,
  });
  const activeMemoriesCount = memoriesData?.length ?? 0;

  // Delete conversation mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteConversation(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
      if (location.pathname === `/app/chat/${deletedId}`) {
        navigate('/app');
      }
    },
  });

  const isChatRoute = location.pathname === '/app' || location.pathname.startsWith('/app/chat');
  const activeConvId = location.pathname.startsWith('/app/chat/')
    ? location.pathname.split('/app/chat/')[1]
    : null;

  const getHeaderTitle = () => {
    if (activeConvId) {
      const activeConv = conversations.find((c) => c._id === activeConvId);
      return activeConv ? activeConv.title : '';
    }
    if (location.pathname === '/app/memories') return 'Cognitive Memories';
    if (location.pathname === '/app/settings') return 'Settings & Preferences';
    return '';
  };

  const handleNewChat = () => {
    navigate('/app');
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleDeleteConversation = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Delete this conversation?')) {
      deleteMutation.mutate(id);
    }
  };

  const renderConversationGroup = (title: string, items: Conversation[]) => {
    if (items.length === 0) return null;

    return (
      <div key={title} className="space-y-0.5 py-1">
        <div className="px-3 pt-2 pb-1 text-[11px] font-medium text-[#8e8e8e] select-none">
          {title}
        </div>
        {items.map((chat) => {
          const isCurrent = location.pathname === `/app/chat/${chat._id}`;
          return (
            <Link
              key={chat._id}
              to={`/app/chat/${chat._id}`}
              onClick={() => setMobileMenuOpen(false)}
              className={`group relative flex items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors duration-150 ${
                isCurrent
                  ? 'bg-[#212121] text-[#ececec] font-medium'
                  : 'text-[#b4b4b4] hover:bg-[#212121] hover:text-[#ececec]'
              }`}
            >
              <span className="truncate flex-1 min-w-0 pr-1.5">{chat.title}</span>
              <button
                type="button"
                onClick={(e) => handleDeleteConversation(e, chat._id)}
                className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-1 text-[#8e8e8e] hover:bg-rose-500/15 rounded transition-all flex-shrink-0 cursor-pointer"
                title="Delete chat"
                aria-label="Delete chat"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </Link>
          );
        })}
      </div>
    );
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-[#171717] border-r border-[#262626] select-none">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#262626]">
          <Link
            to="/app"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 group"
          >
            <div className="h-7 w-7 rounded-lg bg-[#2f2f2f] flex items-center justify-center text-white">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight text-[#ececec]">
              NexaMind
            </span>
          </Link>

          {/* Close button for mobile */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden rounded-lg p-1.5 text-[#8e8e8e] hover:text-white hover:bg-[#212121] transition-colors"
            aria-label="Close navigation"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Primary Action: New Chat */}
        <div className="p-3">
          <button
            type="button"
            onClick={handleNewChat}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#212121] hover:bg-[#262626] active:scale-[0.99] text-[#ececec] text-xs font-medium border border-white/[0.08] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-[#ececec]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>New Chat</span>
            </div>
            <span className="text-[10px] text-[#8e8e8e] font-mono">⌘N</span>
          </button>
        </div>

        {/* Conversation History */}
        <div className="px-2 flex-1 min-h-0 overflow-y-auto">
          {isLoadingConversations ? (
            <div className="space-y-2 p-3">
              <div className="h-5 bg-[#212121] rounded animate-pulse w-3/4" />
              <div className="h-5 bg-[#212121] rounded animate-pulse w-5/6" />
              <div className="h-5 bg-[#212121] rounded animate-pulse w-2/3" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-[#8e8e8e]">
              No conversations yet
            </div>
          ) : (
            <div className="space-y-1">
              {renderConversationGroup('Today', groupedConvs.today)}
              {renderConversationGroup('Yesterday', groupedConvs.yesterday)}
              {renderConversationGroup('Previous 7 days', groupedConvs.last7Days)}
              {renderConversationGroup('Older', groupedConvs.older)}
            </div>
          )}
        </div>

        {/* Secondary Navigation: Memories & Settings */}
        <div className="px-2 py-2 border-t border-[#262626] space-y-0.5">
          <NavLink
            to="/app/memories"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-[#212121] text-white'
                  : 'text-[#b4b4b4] hover:bg-[#212121] hover:text-white'
              }`
            }
          >
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 text-[#8e8e8e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span>Memories</span>
            </div>
            {activeMemoriesCount > 0 && (
              <span className="text-[10px] text-[#b4b4b4] bg-[#2f2f2f] px-1.5 py-0.5 rounded-full font-mono">
                {activeMemoriesCount}
              </span>
            )}
          </NavLink>

          <NavLink
            to="/app/settings"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-[#212121] text-white'
                  : 'text-[#b4b4b4] hover:bg-[#212121] hover:text-white'
              }`
            }
          >
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 text-[#8e8e8e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Settings</span>
            </div>
          </NavLink>
        </div>
      </div>

      {/* Account & Usage Footer */}
      <div className="p-3 border-t border-[#262626]">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-7 w-7 rounded-full bg-[#2f2f2f] flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
              {user?.email ? user.email[0].toUpperCase() : 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#ececec] truncate leading-tight">
                {user?.email || 'Nexa User'}
              </p>
              <p className="text-[11px] font-mono text-[#8e8e8e] leading-tight mt-0.5">
                {currentBalance} credits
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Sign out"
            aria-label="Sign out"
            className="rounded-lg p-1.5 text-[#8e8e8e] hover:text-white hover:bg-[#212121] transition-colors flex-shrink-0 cursor-pointer"
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
    <div className="flex h-screen w-screen overflow-hidden bg-[#212121] text-[#ececec] font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-shrink-0 z-20">
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
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#212121]">
        {/* Top Header */}
        <header className="h-14 border-b border-[#2d2d2d] bg-[#212121] flex items-center justify-between px-6 z-10 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden rounded-lg p-1.5 text-[#8e8e8e] hover:text-white hover:bg-[#2f2f2f] transition-colors flex-shrink-0"
              aria-label="Open sidebar menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Title */}
            {getHeaderTitle() ? (
              <h1 className="text-sm font-medium text-[#ececec] tracking-tight truncate">
                {getHeaderTitle()}
              </h1>
            ) : null}
          </div>

          {/* Useful Product Actions - ONLY Delete button, NO duplicate New Chat button */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isChatRoute && activeConvId && (
              <button
                type="button"
                onClick={(e) => handleDeleteConversation(e, activeConvId)}
                title="Delete this conversation"
                aria-label="Delete this conversation"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#8e8e8e] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
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
            )}
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main
          className={`flex-1 flex flex-col min-h-0 bg-[#212121] ${
            isChatRoute ? 'overflow-hidden' : 'overflow-y-auto'
          }`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};
