package com.interviewprep.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * On first startup: pulls real interview data from GitHub and Leetcode,
 * chunks it, embeds it into pgvector, and seeds the static company/tips KB.
 *
 * Subsequent startups skip everything (EXTERNAL_KB already present).
 * Order(2) runs after any DB migrations (Order(1) if any).
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(2)
public class ExternalKnowledgeSeeder implements ApplicationRunner {

    private static final String TECH_HANDBOOK_BASE =
            "/yangshun/tech-interview-handbook/main/apps/website/contents";
    private static final String SYSTEM_DESIGN_README =
            "/donnemartin/system-design-primer/master/README.md";
    private static final String BEHAVIORAL_README =
            "/ashishps1/awesome-behavioral-interviews/main/README.md";

    private final VectorStoreService vectorStore;
    private final ExternalDataFetcher fetcher;
    private final CompanyKnowledgeService companyKB;
    private final TipsKnowledgeService tipsKB;

    @Override
    public void run(ApplicationArguments args) {
        if (vectorStore.hasDocType("EXTERNAL_KB")) {
            log.info("External KB already seeded — skipping.");
            return;
        }

        log.info("=== Seeding external knowledge base (first-time startup) ===");

        seedStaticCompanyKB();
        seedStaticTipsKB();
        seedTechInterviewHandbook();
        seedSystemDesignPrimer();
        seedBehavioralInterviews();
        seedLeetcodeProblems();

        log.info("=== External KB seeding complete ===");
    }

    // ── Static seeds (same as before, kept for reliability) ──────────────────

    private void seedStaticCompanyKB() {
        log.info("Seeding static company KB...");
        store("COMPANY_KB", null, "Company: Google\nGoogle interviews focus heavily on DSA: arrays, graphs, trees, DP. Expect 2-3 Leetcode medium/hard problems. System design covers distributed systems at Google scale. Behavioral questions use STAR. Values: scalability, code quality, googleyness.", Map.of("company", "Google", "source", "static"));
        store("COMPANY_KB", null, "Company: Amazon\nAmazon uses Leadership Principles (LP) in every interview. Expect 2 behavioral LP questions per round. OA: 2 Leetcode medium problems in 90 min plus a debugging round. System design: fault-tolerance and availability. Interviewers ask 'Tell me about a time...' for all 16 LPs.", Map.of("company", "Amazon", "source", "static"));
        store("COMPANY_KB", null, "Company: Meta\nMeta focuses on product sense for non-eng roles. SWE: 2 coding rounds (arrays, strings, graphs), 1 system design (news feed, Instagram scale), 1 behavioral. Values: ship fast and iterate. Coding is on a shared doc, no IDE.", Map.of("company", "Meta", "source", "static"));
        store("COMPANY_KB", null, "Company: Microsoft\nMicrosoft interviews assess approach more than just the answer. 4-5 rounds: 2 coding medium, 1 system design, 1 behavioral growth mindset. Azure cloud concepts matter for cloud roles. Values collaboration and asking clarifying questions.", Map.of("company", "Microsoft", "source", "static"));
        store("COMPANY_KB", null, "Company: Apple\nApple values attention to detail and deep expertise. OA may include C++/Swift for hardware/iOS roles. System design emphasizes privacy by design. Behavioral questions focus on owning your work and making things simpler.", Map.of("company", "Apple", "source", "static"));
        store("COMPANY_KB", null, "Company: Netflix\nNetflix values senior engineers who operate autonomously. Interviews are deep technical dives. They ask about past failures and learnings. System design covers streaming, CDN, recommendation systems. Freedom and responsibility cultural fit is assessed.", Map.of("company", "Netflix", "source", "static"));
        store("COMPANY_KB", null, "Company: Atlassian\nAtlassian uses values-based hiring. Expect questions about open company and collaboration. OA: 2 coding + short written test. Technical rounds include system design and live coding. Values async communication and documentation skills.", Map.of("company", "Atlassian", "source", "static"));
        store("COMPANY_KB", null, "Company: Stripe\nStripe interviews are rigorous. System design at high scale: payments infrastructure, reliability. Coding rounds cover tricky edge cases. Clear communication of tradeoffs is valued.", Map.of("company", "Stripe", "source", "static"));
        store("COMPANY_KB", null, "Company: Uber\nUber interviews cover real-time systems, geospatial problems, distributed systems. OA: 2 Leetcode. System design: ride matching, surge pricing, ETA. Behavioral: building in ambiguity.", Map.of("company", "Uber", "source", "static"));
        store("COMPANY_KB", null, "Company: LinkedIn\nLinkedIn values professional context. System design: social graph, feed ranking, PYMK. Coding: medium difficulty, clean code, test coverage. Behavioral: growth mindset, cross-functional collaboration.", Map.of("company", "LinkedIn", "source", "static"));
    }

    private void seedStaticTipsKB() {
        log.info("Seeding static tips KB...");
        store("TIPS_KB", null, "Category: DSA\nFor array/string problems: brute force O(n²) first, then optimize with two pointers or sliding window to O(n). Ask about constraints: sorted? duplicates? in-place?", Map.of("category", "DSA", "source", "static"));
        store("TIPS_KB", null, "Category: DSA\nFor tree problems: BFS (queue) vs DFS (recursive/stack). Most reduce to: traverse all nodes, or find path root to leaf. Base case: null node.", Map.of("category", "DSA", "source", "static"));
        store("TIPS_KB", null, "Category: DSA\nDynamic programming: identify overlapping subproblems. Draw recursion tree first, then memoize. Patterns: 0/1 knapsack, LCS, LIS, coin change.", Map.of("category", "DSA", "source", "static"));
        store("TIPS_KB", null, "Category: System Design\nFramework: (1) Clarify requirements + scale, (2) Estimate QPS/storage/bandwidth, (3) High-level design, (4) Deep dive critical components, (5) Identify bottlenecks.", Map.of("category", "System Design", "source", "static"));
        store("TIPS_KB", null, "Category: Behavioral\nSTAR method: Situation (brief context), Task (your role), Action (steps YOU took — use 'I' not 'we'), Result (quantifiable outcome + learning).", Map.of("category", "Behavioral", "source", "static"));
        store("TIPS_KB", null, "Category: SQL\nSQL fundamentals: master JOINs, GROUP BY with HAVING, window functions (ROW_NUMBER, RANK, LAG/LEAD), subqueries vs CTEs, EXPLAIN for optimization.", Map.of("category", "SQL", "source", "static"));
    }

    // ── External: Tech Interview Handbook ────────────────────────────────────

    private void seedTechInterviewHandbook() {
        log.info("Fetching tech-interview-handbook...");
        String[] files = {
            "behavioral-interview-questions.md",
            "coding-interview-techniques.md",
            "system-design.md",
            "interview-formats-top-companies.md",
            "negotiation.md",
            "coding-interview-cheatsheet.md",
            "self-introduction.md",
        };
        for (String file : files) {
            String content = fetcher.fetchGithubRaw(TECH_HANDBOOK_BASE + "/" + file);
            if (content.isBlank()) continue;
            String category = inferCategory(file);
            chunkAndStore(content, "EXTERNAL_KB", category, "tech-interview-handbook/" + file);
            log.info("  Indexed: {}", file);
        }
    }

    // ── External: System Design Primer ───────────────────────────────────────

    private void seedSystemDesignPrimer() {
        log.info("Fetching system-design-primer README...");
        String content = fetcher.fetchGithubRaw(SYSTEM_DESIGN_README);
        if (content.isBlank()) {
            log.warn("  system-design-primer not available");
            return;
        }
        // Split on H2 headings so each section is its own chunk
        String[] sections = content.split("(?m)^## ");
        int stored = 0;
        for (String section : sections) {
            if (section.trim().length() < 100) continue;
            String chunk = "## " + section.trim();
            // Keep chunks ≤ 1500 chars for embedding quality
            for (String part : splitByLength(chunk, 1500)) {
                store("EXTERNAL_KB", null, part, Map.of("category", "System Design", "source", "system-design-primer"));
                stored++;
            }
        }
        log.info("  Indexed system-design-primer: {} chunks", stored);
    }

    // ── External: Behavioral Interviews ──────────────────────────────────────

    private void seedBehavioralInterviews() {
        log.info("Fetching awesome-behavioral-interviews...");
        String content = fetcher.fetchGithubRaw(BEHAVIORAL_README);
        if (content.isBlank()) {
            log.warn("  behavioral-interviews not available");
            return;
        }
        chunkAndStore(content, "EXTERNAL_KB", "Behavioral", "awesome-behavioral-interviews");
        log.info("  Indexed behavioral interviews");
    }

    // ── External: Leetcode Problems ───────────────────────────────────────────

    private void seedLeetcodeProblems() {
        log.info("Fetching Leetcode problems (public API)...");
        List<Map<String, Object>> problems = fetcher.fetchLeetcodeProblems(800);
        if (problems.isEmpty()) {
            log.warn("  Leetcode problems not available");
            return;
        }

        // Group into batches by topic tag, create one KB entry per tag group
        Map<String, List<Map<String, Object>>> byTag = problems.stream()
                .flatMap(p -> ((List<String>) p.get("tags")).stream()
                        .map(tag -> Map.entry(tag, p)))
                .collect(Collectors.groupingBy(
                        Map.Entry::getKey,
                        Collectors.mapping(Map.Entry::getValue, Collectors.toList())
                ));

        for (Map.Entry<String, List<Map<String, Object>>> entry : byTag.entrySet()) {
            String tag = entry.getKey();
            List<Map<String, Object>> tagged = entry.getValue();

            StringBuilder sb = new StringBuilder();
            sb.append("Leetcode problems tagged: ").append(tag).append("\n\n");
            for (Map<String, Object> p : tagged) {
                double acc = (double) p.get("acceptance");
                sb.append(String.format("- %s [%s]%s\n",
                        p.get("title"),
                        p.get("difficulty"),
                        acc > 0 ? " acceptance: " + acc + "%" : ""
                ));
            }

            store("EXTERNAL_KB", null, sb.toString(),
                    Map.of("category", "DSA", "tag", tag, "source", "leetcode-api"));
        }
        log.info("  Indexed {} Leetcode problems across {} topic tags", problems.size(), byTag.size());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void chunkAndStore(String content, String docType, String category, String source) {
        // Split on blank lines or markdown headings
        String[] raw = content.split("(?m)(^#{1,3} .+|\\n{2,})");
        for (String chunk : raw) {
            String trimmed = chunk.trim();
            if (trimmed.length() < 80) continue;
            for (String part : splitByLength(trimmed, 1200)) {
                store(docType, null, part, Map.of("category", category, "source", source));
            }
        }
    }

    private List<String> splitByLength(String text, int maxLen) {
        List<String> parts = new java.util.ArrayList<>();
        if (text.length() <= maxLen) {
            parts.add(text);
            return parts;
        }
        // Split at sentence boundaries where possible
        String[] sentences = text.split("(?<=\\.) ");
        StringBuilder current = new StringBuilder();
        for (String sentence : sentences) {
            if (current.length() + sentence.length() > maxLen && current.length() > 0) {
                parts.add(current.toString().trim());
                current = new StringBuilder();
            }
            current.append(sentence).append(" ");
        }
        if (current.length() > 0) parts.add(current.toString().trim());
        return parts;
    }

    private void store(String docType, Long sourceId, String content, Map<String, Object> metadata) {
        try {
            vectorStore.store(docType, sourceId, content, metadata);
        } catch (Exception e) {
            log.warn("Failed to store chunk: {}", e.getMessage());
        }
    }

    private String inferCategory(String filename) {
        if (filename.contains("behavioral")) return "Behavioral";
        if (filename.contains("system")) return "System Design";
        if (filename.contains("coding") || filename.contains("algorithm")) return "DSA";
        if (filename.contains("negotiation")) return "HR";
        if (filename.contains("interview-formats")) return "Company";
        return "General";
    }
}
