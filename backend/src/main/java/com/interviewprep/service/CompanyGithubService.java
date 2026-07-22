package com.interviewprep.service;

import com.interviewprep.service.ExternalDataFetcher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.StringReader;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Fetches real company-wise LeetCode questions from:
 *   https://github.com/hxu296/leetcode-company-wise-problems-2022
 *
 * CSV format: problem_link,problem_name,num_occur
 * Results are cached in-memory per company (TTL: 12 hours).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CompanyGithubService {

    private static final String CSV_BASE =
            "/hxu296/leetcode-company-wise-problems-2022/main/companies/";
    private static final long TTL_MS = 12 * 60 * 60 * 1000L;

    private final ExternalDataFetcher fetcher;

    private final ConcurrentHashMap<String, CacheEntry> questionCache = new ConcurrentHashMap<>();

    public record GithubQuestion(
            String title,
            String url,
            int occurrences,
            int rank
    ) {}

    private record CacheEntry(long fetchedAt, List<GithubQuestion> questions) {}

    // ── Company list ──────────────────────────────────────────────────────────

    public List<String> getCompanyList() {
        return KNOWN_COMPANIES;
    }

    // ── Questions for a company ───────────────────────────────────────────────

    public List<GithubQuestion> getQuestionsForCompany(String company) {
        long now = System.currentTimeMillis();
        CacheEntry entry = questionCache.get(company);
        if (entry != null && (now - entry.fetchedAt()) < TTL_MS) {
            return entry.questions();
        }

        List<GithubQuestion> questions = fetchCsv(company);
        questionCache.put(company, new CacheEntry(now, questions));
        return questions;
    }

    private List<GithubQuestion> fetchCsv(String company) {
        String raw = fetcher.fetchGithubRaw(CSV_BASE + encodeSlug(company) + ".csv");
        if (raw.isBlank()) {
            log.warn("No GitHub CSV found for company: {}", company);
            return List.of();
        }

        List<GithubQuestion> questions = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new StringReader(raw))) {
            String line = reader.readLine(); // skip header
            int rank = 1;
            while ((line = reader.readLine()) != null) {
                String[] parts = line.split(",", 3);
                if (parts.length < 2) continue;
                String url = parts[0].trim();
                String title = parts[1].trim();
                int occurrences = parts.length >= 3 ? parseIntSafe(parts[2].trim()) : 1;
                if (title.isBlank() || url.isBlank()) continue;
                questions.add(new GithubQuestion(title, url, occurrences, rank++));
            }
        } catch (Exception e) {
            log.warn("Failed to parse CSV for {}: {}", company, e.getMessage());
            return List.of();
        }

        // Sort by occurrences descending (most frequently asked first)
        questions.sort(Comparator.comparingInt(GithubQuestion::occurrences).reversed());
        // Re-rank after sort
        List<GithubQuestion> ranked = new ArrayList<>();
        for (int i = 0; i < questions.size(); i++) {
            GithubQuestion q = questions.get(i);
            ranked.add(new GithubQuestion(q.title(), q.url(), q.occurrences(), i + 1));
        }

        log.info("Fetched {} questions for {} from GitHub", ranked.size(), company);
        return Collections.unmodifiableList(ranked);
    }

    private String encodeSlug(String company) {
        // GitHub raw URLs need %20 for spaces
        return company.replace(" ", "%20");
    }

    private int parseIntSafe(String s) {
        try { return Integer.parseInt(s); } catch (NumberFormatException e) { return 1; }
    }

    // ── Hardcoded fallback company list ───────────────────────────────────────

    private static final List<String> KNOWN_COMPANIES = List.of(
            "Adobe", "Airbnb", "Amazon", "Apple", "Atlassian",
            "Bloomberg", "ByteDance", "Citadel", "Coinbase", "Datadog",
            "DoorDash", "Dropbox", "Facebook", "Goldman Sachs", "Google",
            "Intuit", "JPMorgan", "LinkedIn", "Lyft", "Microsoft",
            "Morgan Stanley", "Netflix", "Oracle", "Palantir", "PayPal",
            "Pinterest", "Roblox", "Robinhood", "Salesforce", "Snap",
            "Spotify", "Stripe", "TikTok", "Twilio", "Twitter",
            "Two Sigma", "Uber", "VMware", "Walmart"
    );
}
