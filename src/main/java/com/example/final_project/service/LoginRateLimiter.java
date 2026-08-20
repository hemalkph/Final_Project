package com.example.final_project.service;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

/**
 * In-memory sliding-window rate limiter for the login endpoint, keyed by
 * client IP. Single-instance only, matching this app's deployment model
 * (same in-memory pattern NotificationService uses for its SSE emitters) —
 * a distributed deployment would need a shared store (e.g. Redis) instead.
 */
@Component
public class LoginRateLimiter {

    private static final int MAX_ATTEMPTS = 5;
    private static final long WINDOW_MILLIS = 60_000; // 1 minute

    private final Map<String, Deque<Long>> attemptsByKey = new ConcurrentHashMap<>();

    /**
     * Records an attempt for the given key and returns true if it's within
     * the allowed rate, false if the caller should be rejected.
     */
    public boolean tryAcquire(String key) {
        Deque<Long> attempts = attemptsByKey.computeIfAbsent(key, k -> new ConcurrentLinkedDeque<>());
        long now = Instant.now().toEpochMilli();
        long windowStart = now - WINDOW_MILLIS;

        synchronized (attempts) {
            while (!attempts.isEmpty() && attempts.peekFirst() < windowStart) {
                attempts.pollFirst();
            }
            if (attempts.size() >= MAX_ATTEMPTS) {
                return false;
            }
            attempts.addLast(now);
            return true;
        }
    }
}
