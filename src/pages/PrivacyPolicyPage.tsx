import React from 'react';
import { Link } from 'react-router-dom';
import { NexaMindLogo } from '@/components/ui';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-200 font-sans antialiased selection:bg-indigo-500/30 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#0b0f19]/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg p-1">
            <NexaMindLogo size="md" />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-xs sm:text-sm font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/app"
              className="text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 px-3.5 py-1.5 rounded-lg shadow-sm shadow-indigo-900/40 border border-indigo-400/30 transition-all"
            >
              Open Workspace
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
        
        {/* Document Header & Status Banner */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Draft Policy &bull; Pending Legal Finalization
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              Verified Against Codebase (Web &amp; Extension v0.2.x)
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            NexaMind Privacy Policy
          </h1>

          <p className="text-sm text-slate-400 leading-relaxed max-w-3xl">
            This document outlines the data-handling practices implemented in the NexaMind web application, backend services, and official VS Code extension. It is based directly on current codebase behavior and technical controls. This draft has not been reviewed by legal counsel and requires owner finalization before formal legal adoption.
          </p>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200/90 text-xs sm:text-sm leading-relaxed space-y-1.5">
            <div className="font-bold flex items-center gap-2 text-amber-300">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Notice for Users and Reviewers
            </div>
            <p>
              NexaMind processes developer prompts, workspace excerpts, and account information to provide AI-assisted software engineering. We do not claim zero data retention, automated secret-purging guarantees, or unverified AI-provider non-training commitments. Please review the specific technical sections below.
            </p>
          </div>
        </section>

        {/* 1. Information Collected and Processed */}
        <section className="space-y-4 pt-6 border-t border-white/[0.08]">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 text-xs font-mono flex items-center justify-center font-bold">1</span>
            Information Collected &amp; Processed
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-4 rounded-xl bg-[#121726] border border-white/[0.08] space-y-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Account &amp; Identity Information
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                When registering, we process your email address, display name, and password (salted and hashed with bcrypt). If using Google Sign-In, we store your Google ID, associated email, and avatar URL. Account role and status (ACTIVE, SUSPENDED, DISABLED) are recorded in the database.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#121726] border border-white/[0.08] space-y-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Workspace Code &amp; Diagnostics
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Through the VS Code extension, only active editor context is collected: the relative file path, language identifier, active selection or bounded window around the cursor (up to 150 lines, capped at 24,000 characters by default), and up to 5 editor diagnostics. We do not perform full-repository scans.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#121726] border border-white/[0.08] space-y-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                Prompts, Messages &amp; Attachments
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                User prompts, chat queries, and agent edit requests are submitted to the backend. Files uploaded in the web chat (PDFs, text files, images) are stored via Cloudinary, and text contents are chunked with embeddings into MongoDB for retrieval-augmented generation (RAG).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#121726] border border-white/[0.08] space-y-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Billing &amp; Subscription Data
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Subscriptions and credit purchases are processed via Polar.sh. We persist Polar customer IDs, subscription IDs, plan codes, and credit transaction ledgers. Credit card details are handled directly by Polar and payment processors; NexaMind never stores cardholder PANs.
              </p>
            </div>
          </div>
        </section>

        {/* 2. Sensitive File Filtering & Limitations */}
        <section className="space-y-4 pt-6 border-t border-white/[0.08]">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 text-xs font-mono flex items-center justify-center font-bold">2</span>
            Sensitive-File Filtering &amp; Critical Limitations
          </h2>

          <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <p>
              To reduce accidental exposure of credentials, the NexaMind VS Code extension executes pre-flight filtering in <code className="text-indigo-300 bg-white/[0.06] px-1.5 py-0.5 rounded font-mono text-[11px]">secret.filter.ts</code> before sending workspace data:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
              <li><strong className="text-slate-200">Blocked Directory Segments:</strong> Files inside <code className="text-slate-300 font-mono text-[11px]">.git</code>, <code className="text-slate-300 font-mono text-[11px]">node_modules</code>, <code className="text-slate-300 font-mono text-[11px]">dist</code>, <code className="text-slate-300 font-mono text-[11px]">build</code>, <code className="text-slate-300 font-mono text-[11px]">.next</code>, <code className="text-slate-300 font-mono text-[11px]">.cache</code>, <code className="text-slate-300 font-mono text-[11px]">.gemini</code>, <code className="text-slate-300 font-mono text-[11px]">.vscode</code>, and <code className="text-slate-300 font-mono text-[11px]">coverage</code> are automatically excluded.</li>
              <li><strong className="text-slate-200">Sensitive Filename Patterns:</strong> Files matching <code className="text-slate-300 font-mono text-[11px]">.env*</code>, <code className="text-slate-300 font-mono text-[11px]">id_rsa*</code>, <code className="text-slate-300 font-mono text-[11px]">*.pem</code>, <code className="text-slate-300 font-mono text-[11px]">*.key</code>, <code className="text-slate-300 font-mono text-[11px]">*.p12</code>, <code className="text-slate-300 font-mono text-[11px]">*.keystore</code>, or containing &quot;secret&quot;, &quot;credential&quot;, &quot;service-account&quot;, or &quot;token&quot; are blocked.</li>
              <li><strong className="text-slate-200">Header Scans:</strong> Files with content matching <code className="text-slate-300 font-mono text-[11px]">-----BEGIN ... PRIVATE KEY-----</code> are rejected.</li>
              <li><strong className="text-slate-200">Size Ceiling:</strong> Single files exceeding 100 KB are excluded from workspace context payloads.</li>
            </ul>

            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-200 text-xs leading-relaxed space-y-1">
              <div className="font-bold text-rose-300 flex items-center gap-1.5">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Important Limitation Warning
              </div>
              <p>
                Heuristic pattern matching <strong>cannot guarantee</strong> the detection or eradication of all sensitive data. Secrets embedded inside code comments, custom configuration files, database connection strings, or non-standard environment filenames might not trigger filters. You are solely responsible for ensuring you do not select or transmit proprietary secrets, API keys, or confidential tokens to NexaMind.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Third-Party AI Providers & Inference */}
        <section className="space-y-4 pt-6 border-t border-white/[0.08]">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 text-xs font-mono flex items-center justify-center font-bold">3</span>
            Third-Party AI Inference &amp; Processing
          </h2>

          <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <p>
              NexaMind utilizes external Large Language Model (LLM) APIs to generate code recommendations, agent tool plans, and chat responses:
            </p>
            <div className="p-4 rounded-xl bg-[#121726] border border-white/[0.08] space-y-2">
              <div className="font-semibold text-white">Inference Architecture</div>
              <p className="text-xs text-slate-400 leading-relaxed">
                In the deployed production environment, backend services forward sanitized prompts, tool calls, and bounded code context to <strong>Groq Cloud</strong> (<code className="text-slate-300 font-mono text-[11px]">api.groq.com</code>) using OpenAI-compatible completion endpoints. In local self-hosted configurations, an <strong>Ollama</strong> instance may be utilized instead.
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Data transmitted to third-party inference providers is governed by the terms of service, privacy practices, and retention policies of those respective providers. <strong>NexaMind makes no independent legal representation regarding third-party model training or retention commitments</strong> without an executed enterprise Data Processing Agreement (DPA).
              </p>
            </div>
          </div>
        </section>

        {/* 4. Persistence, Retention, Logs, and Deletion */}
        <section className="space-y-4 pt-6 border-t border-white/[0.08]">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 text-xs font-mono flex items-center justify-center font-bold">4</span>
            Persistence, Retention, Logs &amp; Deletion
          </h2>

          <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <div className="p-4 rounded-xl bg-[#121726] border border-white/[0.08] space-y-2">
              <h3 className="text-sm font-semibold text-white">Conversation Persistence &amp; Message Storage</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                When interactions are linked to a <code className="text-slate-300 font-mono text-[11px]">conversationId</code> (such as web chat sessions), prompts and model outputs are stored in MongoDB in the <code className="text-slate-300 font-mono text-[11px]">messages</code> and <code className="text-slate-300 font-mono text-[11px]">conversations</code> collections. Token usage metrics and message roles are recorded for credit accounting.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#121726] border border-white/[0.08] space-y-2">
              <h3 className="text-sm font-semibold text-white">Deletion Behavior in Current Implementation</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong>Conversations &amp; Messages:</strong> When a user explicitly deletes a conversation, all associated message documents in the database are permanently purged. Cloudinary external assets and semantic vector chunks are deleted before the conversation record is soft-deleted. The conversation record is minimally preserved with a <code className="text-slate-300 font-mono text-[11px]">deletedAt</code> timestamp for audit and idempotent re-deletion, with message counts reset to 0, leaf message pointers cleared, and cached conversation summaries purged. External deletion failures (e.g., Cloudinary downtime) halt the workflow, preserve the attachment record, and propagate an error so the operation can be retried without leaving orphaned files or falsely reporting completion.
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong>Memories:</strong> Users can manually delete stored cognitive memories via the Memories dashboard (<code className="text-slate-300 font-mono text-[11px]">/app/memories</code>), which immediately removes the record from the database.
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong>Retention Rules:</strong> There are currently no automated time-to-live (TTL) expiry scripts configured to hard-purge database records. Data persists in MongoDB until explicitly modified or deleted.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#121726] border border-white/[0.08] space-y-2">
              <h3 className="text-sm font-semibold text-white">Service Logs &amp; Telemetry</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Backend HTTP requests are logged to standard output via Morgan (<code className="text-slate-300 font-mono text-[11px]">morgan(&quot;dev&quot;)</code>). These logs contain request method, URL path, HTTP status, and response time, and are captured by the hosting infrastructure (Render) subject to their standard log retention lifecycle.
              </p>
            </div>
          </div>
        </section>

        {/* 5. Authentication, Tokens & Credential Security */}
        <section className="space-y-4 pt-6 border-t border-white/[0.08]">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 text-xs font-mono flex items-center justify-center font-bold">5</span>
            Authentication Credentials &amp; Session Security
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-4 rounded-xl bg-[#121726] border border-white/[0.08] space-y-2">
              <h3 className="text-sm font-semibold text-white">Web Application</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Session tokens utilize short-lived JWT access tokens and long-lived refresh tokens. Refresh tokens are stored in an <code className="text-slate-300 font-mono text-[11px]">HttpOnly</code>, <code className="text-slate-300 font-mono text-[11px]">SameSite: Lax</code>, <code className="text-slate-300 font-mono text-[11px]">Secure</code> cookie (<code className="text-slate-300 font-mono text-[11px]">nexamind_rt</code>) to mitigate cross-site scripting (XSS) extraction.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#121726] border border-white/[0.08] space-y-2">
              <h3 className="text-sm font-semibold text-white">VS Code Extension &amp; PKCE</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Extension login implements RFC 7636 Proof Key for Code Exchange (PKCE with S256). Single-use authorization codes expire within 5 minutes. Tokens are stored locally within the operating system keychain via <code className="text-slate-300 font-mono text-[11px]">vscode.SecretStorage</code> rather than unencrypted settings files.
              </p>
            </div>
          </div>
        </section>

        {/* 6. Security Controls & System Boundaries */}
        <section className="space-y-4 pt-6 border-t border-white/[0.08]">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 text-xs font-mono flex items-center justify-center font-bold">6</span>
            Security Controls &amp; Limitations
          </h2>

          <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <ul className="list-disc list-inside space-y-1.5 text-slate-400 pl-2">
              <li><strong className="text-slate-200">Encryption in Transit:</strong> All communications between the extension, web frontend, backend APIs, and AI inference providers require HTTPS / TLS encryption.</li>
              <li><strong className="text-slate-200">Webview Content Security Policy (CSP):</strong> The VS Code extension enforces a strict per-render nonce-based CSP, restricting script execution and network targets.</li>
              <li><strong className="text-slate-200">Cross-Origin Controls:</strong> The backend enforces an explicit CORS allowlist matching authorized frontend domains.</li>
              <li><strong className="text-slate-200">Rate Limiting:</strong> Memory and token-based rate limiters protect authentication and generative endpoints against brute-force attacks.</li>
            </ul>

            <div className="p-3.5 rounded-xl bg-[#121726] border border-white/[0.08] text-xs text-slate-400 leading-relaxed">
              <strong className="text-slate-200 block mb-1">Security Disclaimer:</strong>
              While we implement industry-standard transport security and input isolation, no electronic transmission over the Internet or computer storage system can be guaranteed 100% secure.
            </div>
          </div>
        </section>

        {/* 7. User Choices and Controls */}
        <section className="space-y-4 pt-6 border-t border-white/[0.08]">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 text-xs font-mono flex items-center justify-center font-bold">7</span>
            User Choices &amp; Controls
          </h2>

          <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <p>You can manage and constrain your data flow through the following controls:</p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-400 pl-2">
              <li><strong className="text-slate-200">Disable Diagnostics Context:</strong> Set <code className="text-slate-300 font-mono text-[11px]">nexamind.includeDiagnostics: false</code> in VS Code settings to prevent compiler errors from being transmitted.</li>
              <li><strong className="text-slate-200">Context Character Budget:</strong> Adjust <code className="text-slate-300 font-mono text-[11px]">nexamind.maxContextChars</code> (1,000–30,000) to limit code payload volume.</li>
              <li><strong className="text-slate-200">Conversation &amp; Message Deletion:</strong> Explicitly deleting a conversation permanently purges its messages, file attachments, and vector chunks, and wipes conversation summaries.</li>
              <li><strong className="text-slate-200">Manage Memories:</strong> Review and delete accumulated AI memories at <Link to="/app/memories" className="text-indigo-400 underline hover:text-indigo-300">/app/memories</Link>.</li>
              <li><strong className="text-slate-200">Session Termination:</strong> Logging out immediately revokes active refresh tokens on the backend and purges local credentials.</li>
            </ul>
          </div>
        </section>

        {/* 8. Required Owner Decisions (Explicitly Unresolved) */}
        <section className="space-y-4 pt-6 border-t border-white/[0.08]">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-amber-600/30 border border-amber-500/40 text-amber-400 text-xs font-mono flex items-center justify-center font-bold">8</span>
            Owner Decisions Required Before Public Finalization
          </h2>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-3 text-xs sm:text-sm text-amber-200/90 leading-relaxed">
            <p>
              Before this policy can be considered legally binding or finalized for public regulatory compliance (such as GDPR, CCPA, or UK DPA), the project owners must resolve the following business and legal decisions:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-amber-100 pl-2">
              <li><strong>Legal Entity &amp; Jurisdiction:</strong> Formally specify the registered operating company name, country of incorporation, and governing legal jurisdiction.</li>
              <li><strong>Privacy Contact &amp; DPO Email:</strong> Designate and verify a dedicated inbox (e.g., <code className="font-mono text-amber-300">privacy@nexamind.ai</code>) for data subject access requests (DSARs).</li>
              <li><strong>Data Retention Schedules:</strong> Establish formal timeframes for archiving and purging soft-deleted conversation stubs, Polar transaction records, and server logs (note: active message documents are now permanently deleted upon explicit conversation deletion, but historical soft-deleted conversations created prior to v0.2.1 contain orphaned message records requiring database migration).</li>
              <li><strong>Account &amp; Data Deletion Procedure:</strong> Implement a self-service &quot;Delete Account&quot; workflow or provide clear documented instructions for users requesting full database erasure.</li>
              <li><strong>AI Provider Agreements:</strong> Execute formal enterprise Data Processing Agreements (DPAs) with LLM inference vendors (e.g., Groq) confirming log retention timelines and zero-training commitments.</li>
            </ol>
          </div>
        </section>

        {/* 9. Contact & Changes */}
        <section className="space-y-4 pt-6 border-t border-white/[0.08]">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 text-xs font-mono flex items-center justify-center font-bold">9</span>
            Contact &amp; Policy Updates
          </h2>

          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            As NexaMind evolves, this privacy document will be revised to reflect changes in architecture, storage policies, or regulatory registrations. Since formal contact channels have not yet been assigned by the project owners, direct operational inquiries to the official repository administrators.
          </p>
          <p className="text-xs text-slate-500">
            Last updated: October 2026 &bull; Draft Revision 0.2.1
          </p>
        </section>

        {/* Bottom Back Button */}
        <div className="pt-8 border-t border-white/[0.08] flex items-center justify-between">
          <Link
            to="/"
            className="text-xs sm:text-sm font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-2"
          >
            &larr; Return to Workspace
          </Link>
          <Link
            to="/login"
            className="text-xs sm:text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Sign In &rarr;
          </Link>
        </div>

      </main>
    </div>
  );
};
