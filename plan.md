# Solana Forensic Analysis Tool - Development Plan

## 1. Project Goal

To develop a comprehensive Solana analysis tool enabling precise tracking and visualization of on-chain fund movements, wallet analysis, and entity identification, prioritizing user experience and clarity over raw data presentation. This tool aims to serve security researchers, investigators, and compliance teams within the Solana ecosystem and compete for the associated bounty.

## 2. Core Features & Functionalities

Based on the bounty scope and our product definition, the tool will include:

*   **Universal Search:** Entry point for addresses, transactions, programs.
*   **Dashboard View:** Monitoring feeds for general and specific on-chain activity.
*   **Transaction Details View:** Simplified, interpreted view of transaction data (actors, actions, asset flow, status).
*   **Wallet Analysis View:** Hub for analyzing a specific address, including:
    *   Balance & Summary
    *   Funding Source Tracking (with flow visualization link)
    *   Spending Destination Tracking (with flow visualization link)
    *   Interpreted Transaction History
    *   Activity Patterns (visualized)
    *   Entity Connections (informed by history & clustering)
*   **Transaction Flow Visualization View:** Interactive graph tool for fund tracing with:
    *   Filtering (date, amount, token)
    *   Path Highlighting
*   **Entity & Exchange Labeling System:** Backend dataset and heuristics for identifying known entities and common wallet types (exchanges, DeFi, etc.), displayed across the UI.
*   **Transaction Clustering Engine:** Backend analysis to group related transactions and wallets, feeding into "Entity Connections" and potentially flagging unusual movements.

## 3. Target Audience

*   Security Researchers
*   On-chain Investigators
*   Compliance Teams
*   Potentially DeFi power users seeking enhanced transparency.

## 4. Technology Stack

*   **Frontend:** Next.js (React Framework), Tailwind CSS
*   **Theme:** Custom Dark Theme ("Bioluminescent Depths" or similar approved theme)
*   **Visualization Library:** TBD (e.g., React Flow, D3.js, Visx)
*   **State Management:** TBD (e.g., Zustand, Jotai)
*   **Data Fetching (Client):** TBD (e.g., TanStack Query/React Query, SWR)
*   **Data Source (Initial):** Solana JSON RPC API (via libraries like `@solana/web3.js`)
*   **Language:** TypeScript / JavaScript
*   **(Future Consideration):** Dedicated Indexer & Database (PostgreSQL, Graph DB) for performance and advanced analysis.

## 5. Key Screens/Views

1.  **Dashboard / Landing Screen**
2.  **Transaction Details View**
3.  **Wallet Analysis View**
4.  **Transaction Flow Visualization View**
5.  **(Potential) Program Analysis View**

## 6. Development Phases (Iterative Approach)

**Phase 1: Foundation & Core Views (MVP)**

*   **Objective:** Establish the project structure and basic display of raw data.
*   **Tasks:**
    *   Initialize Next.js project with Tailwind CSS & TypeScript.
    *   Implement chosen dark theme basics (`globals.css`, Tailwind config).
    *   Develop utility functions for basic Solana RPC calls (`getBalance`, `getTransaction`, `getSignaturesForAddress`).
    *   Build basic UI shells for Dashboard, Wallet Analysis, and Transaction Details views.
    *   Implement Universal Search bar functionality (navigation based on input type).
    *   Wallet View: Display SOL balance, list raw transaction signatures for address.
    *   Transaction View: Fetch and display raw transaction details (signature, status, block time, fee).
    *   Dashboard: Static layout, potentially placeholder "latest tx" feed.

**Phase 2: Data Interpretation & Labeling Integration**

*   **Objective:** Make the data user-friendly by interpreting common transactions and showing known labels.
*   **Tasks:**
    *   Develop a basic Transaction Parsing/Interpretation engine:
        *   Identify SOL transfers.
        *   Identify SPL Token transfers.
        *   (Stretch) Identify simple swaps via common DEX programs (e.g., Orca, Raydium - by decoding instruction data).
    *   Enhance Transaction Details View: Show interpreted type, simplified asset flow (who sent/received what).
    *   Enhance Wallet Analysis View: Display interpreted transaction history, fetch and display SPL Token balances.
    *   Develop backend/data store for Entity Labeling System (start with a hardcoded map/JSON file of major exchanges & protocols).
    *   Integrate Labeling: Display labels next to addresses in all relevant views.

**Phase 3: Visualization & Basic Wallet Analysis**

*   **Objective:** Introduce fund flow visualization and initial wallet behavioural insights.
*   **Tasks:**
    *   Select and integrate a graph visualization library (e.g., React Flow).
    *   Build the Transaction Flow Visualization View component.
    *   Wallet Analysis View:
        *   Add buttons to "Trace Inflows" / "Trace Outflows" that launch the Flow Visualization View (showing N=1 or N=2 hops initially).
        *   Display simple lists of Funding Sources / Spending Destinations based on Tx history.
        *   Implement basic Activity Pattern charts (e.g., Tx frequency over time).

**Phase 4: Advanced Analysis & Bounty Feature Completion**

*   **Objective:** Implement remaining bounty requirements related to analysis and interaction.
*   **Tasks:**
    *   Flow Visualization View:
        *   Implement Filters (date range, amount).
        *   Implement Logic to Highlight Critical Paths (e.g., largest volume).
    *   Wallet Analysis View:
        *   Implement "Entity Connections" section (based on frequent interactions + basic clustering).
    *   Backend Development:
        *   Implement simple Transaction Clustering heuristics (e.g., identify common deposit/withdrawal addresses linked to primary).
        *   Implement Exchange Deposit/Withdrawal Pattern Detection heuristics (inform labeling).
        *   (Optional) Implement basic "Flag unusual movements" feature based on rules/heuristics.
    *   Refine overall UI/UX, responsiveness, and performance (especially RPC usage).

**Phase 5: Deployment, Documentation & Submission**

*   **Objective:** Prepare the project for public access and bounty submission.
*   **Tasks:**
    *   Deploy the web application to a publicly accessible URL (e.g., Vercel, Netlify).
    *   Write comprehensive documentation: Setup guide, Usage guide, Architecture overview.
    *   Ensure the GitHub repository is public, clean, and contains all source code and documentation.
    *   Final testing across different scenarios and browsers.
    *   Create demo materials (walkthrough video, screenshots).
    *   (Bonus) Prepare and post demo on X with sponsor tags.
    *   Submit the project for the bounty.

## 7. Deliverables

*   A fully functional, live Solana forensic analysis tool accessible via a web interface.
*   A public GitHub repository containing all source code.
*   Comprehensive documentation.
*   Support for analyzing any Solana wallet address or transaction via the UI.

## 8. Judging Criteria Focus

*   **Accuracy:** Prioritize correct RPC data fetching and sound interpretation logic. Labeling database accuracy.
*   **Technical Quality:** Clean code, appropriate use of Next.js features, reliable performance within RPC constraints (or justification for indexer if limits are hit). Handle errors gracefully.
*   **Originality:** Differentiate through simplified UX, interpreted views, potentially unique theme/visualization styling (e.g., squiggly lines if revisited).
*   **Rich Media:** Quality/clarity of transaction flow visualizations and activity pattern charts.
*   **User Experience:** Focus on intuitive navigation, clear information hierarchy, and translating technical data into understandable insights.

## 9. Potential Risks & Mitigation

*   **RPC Rate Limits/Performance:** Heavy reliance on public RPCs can be slow or lead to rate limiting for deep analysis.
    *   *Mitigation:* Optimize RPC calls, implement client-side caching (React Query/SWR), introduce "Slow Mode" toggles, clearly state limitations in docs. Defer truly deep/complex analysis if performance prohibits it for MVP. Consider mentioning Indexer as a future improvement.
*   **Transaction Complexity:** Parsing arbitrary Solana transactions/program interactions is complex.
    *   *Mitigation:* Focus interpretation efforts on the most common types (transfers, swaps via major DEXs). Provide raw data access for unrecognized transactions.
*   **Visualization Performance:** Complex flow graphs can become slow.
    *   *Mitigation:* Limit default trace depth, use performant libraries, consider canvas-based renderers for large graphs, optimize data fetching for the visualizer.
*   **Labeling Accuracy:** Maintaining an accurate label dataset is challenging.
    *   *Mitigation:* Start with well-known entities. Be clear about heuristic-based labels (e.g., "Possible Exchange Wallet"). Avoid definitive claims for unlabeled or uncertain addresses.

---

This plan provides a structured approach to building the tool, aligning with the bounty goals and breaking the work into manageable phases. Let me know your thoughts, Product Lead!