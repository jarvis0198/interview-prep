package com.interviewprep.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final int MAX_REQUESTS = 10;
    private static final long WINDOW_MS = 60_000;

    private record WindowState(AtomicInteger count, long windowStart) {}

    private final ConcurrentHashMap<String, WindowState> state = new ConcurrentHashMap<>();

    private static final String[] RATE_LIMITED_PATHS = {
        "/api/questions/generate",
        "/api/resumes/",
        "/api/chat"
    };

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {

        String path = req.getRequestURI();
        boolean shouldLimit = false;
        for (String p : RATE_LIMITED_PATHS) {
            if (path.startsWith(p)) {
                String method = req.getMethod();
                if (path.equals("/api/questions/generate") && "POST".equals(method)) { shouldLimit = true; break; }
                if (path.startsWith("/api/resumes/") && path.endsWith("/score") && "POST".equals(method)) { shouldLimit = true; break; }
                if (path.startsWith("/api/resumes/") && path.endsWith("/suggestions") && "POST".equals(method)) { shouldLimit = true; break; }
                if (path.equals("/api/chat") && "POST".equals(method)) { shouldLimit = true; break; }
            }
        }

        if (!shouldLimit) {
            chain.doFilter(req, res);
            return;
        }

        String key = resolveKey(req);
        long now = System.currentTimeMillis();

        WindowState ws = state.compute(key, (k, existing) -> {
            if (existing == null || now - existing.windowStart() >= WINDOW_MS) {
                return new WindowState(new AtomicInteger(0), now);
            }
            return existing;
        });

        int count = ws.count().incrementAndGet();
        if (count > MAX_REQUESTS) {
            res.setStatus(429);
            res.setContentType("application/json");
            res.getWriter().write("{\"message\":\"Too many requests. Please wait a minute before trying again.\"}");
            return;
        }

        chain.doFilter(req, res);
    }

    private String resolveKey(HttpServletRequest req) {
        String auth = req.getHeader("Authorization");
        if (auth != null && auth.startsWith("Bearer ")) return "token:" + auth.substring(7, Math.min(auth.length(), 40));
        String ip = req.getHeader("X-Forwarded-For");
        if (ip == null) ip = req.getRemoteAddr();
        return "ip:" + ip;
    }
}
